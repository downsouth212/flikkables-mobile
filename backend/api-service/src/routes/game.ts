import { Hono } from 'hono'
import { and, desc, eq, gt, gte, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { createDb } from '../db/client'
import { blockedUsers, characterTemplates, flikkables, friendships, journeys, postcards, profiles, templateUnlocks, tradeOffers, trophies, userItems, type CharacterTemplateRow, type FlikkableRow, type ProfileRow } from '../db/schema'
import { CITIES, type City } from '../game-cities'
import { adminRole, loadSettings } from '../game-admin'
import { notify } from './notifications'
import { catchUpMood, continentFor, dayKey, isCapital, levelFor, MILESTONES, progressQuest, type NewTrophy, type QuestState } from '../game-rules'

export const gameRoutes = new Hono<HonoEnv>()
gameRoutes.use('/game/*', authMiddleware)
gameRoutes.use('/game/*', async (c, next) => {
  if (c.req.method === 'GET' || c.req.path === '/game/me') return next()
  const [p] = await db(c).select({ locked: profiles.locked }).from(profiles).where(eq(profiles.user_id, c.get('userId')))
  if (p?.locked) return c.json({ error: 'This account is paused by the Flikkables team.' }, 403)
  return next()
})

export const SYSTEM_OWNER_ID = 'flikkables-team'
const RARITY_BONUS: Record<string, number> = { common: 0, uncommon: 0, rare: 2, epic: 5, legendary: 10 }
const RETURN_BONUS: Record<string, number> = { common: 0, uncommon: 0, rare: 5, epic: 10, legendary: 20 }
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export function db(c: { env: HonoEnv['Bindings'] }) {
  return createDb(c.env.DATABASE_URL)
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number) {
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dl = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function offset(lat: number, lng: number, km: number) {
  const angle = Math.random() * Math.PI * 2
  const nLat = lat + (km / 111) * Math.cos(angle)
  const nLng = lng + (km / (111 * Math.cos((nLat * Math.PI) / 180))) * Math.sin(angle)
  return { lat: Math.max(-85, Math.min(85, nLat)), lng: ((nLng + 540) % 360) - 180 }
}

// Population-weighted, as the web's flick picked its city.
function pickCity(excludeName?: string): City {
  const pool = CITIES.filter((city) => `${city.name}, ${city.country}` !== excludeName)
  let roll = Math.random() * pool.reduce((sum, city) => sum + city.population, 0)
  for (const city of pool) {
    roll -= city.population
    if (roll <= 0) return city
  }
  return pool[pool.length - 1]!
}

// The web rolled each rarity at 20%.
export function rollRarity() {
  return RARITIES[Math.floor(Math.random() * RARITIES.length)]!
}

function flickStamps(f: FlikkableRow, km: number, population: number) {
  let stamps = 1 + Math.ceil(km / 1000)
  if (population >= 1_000_000) stamps += 3
  stamps += RARITY_BONUS[f.rarity] ?? 0
  return f.is_flikkstar ? Math.ceil(stamps * 1.2) : stamps
}

function returnWaitHours(f: FlikkableRow) {
  return f.is_flikkstar ? 4 : 8
}

function returnReadyAt(f: FlikkableRow) {
  if (!f.last_flicked_at) return null
  return new Date(f.last_flicked_at.getTime() + returnWaitHours(f) * 3600_000)
}

export function serialize(f: FlikkableRow) {
  return { ...f, return_ready_at: returnReadyAt(f)?.toISOString() ?? null }
}

async function requireProfile(c: { env: HonoEnv['Bindings']; get: (key: 'userId') => string }): Promise<ProfileRow | undefined> {
  const [profile] = await db(c).select().from(profiles).where(eq(profiles.user_id, c.get('userId')))
  return profile
}

// Daily quest counters live on the profile and start over each UTC day.
export function dailyQuest(p: ProfileRow) {
  if (p.dq_day === dayKey()) return { dq_day: p.dq_day, dq_flicked: p.dq_flicked, dq_returned: p.dq_returned, dq_flikk_claimed: p.dq_flikk_claimed, dq_return_claimed: p.dq_return_claimed }
  return { dq_day: dayKey(), dq_flicked: 0, dq_returned: 0, dq_flikk_claimed: false, dq_return_claimed: false }
}

export async function saveTrophies(c: { env: HonoEnv['Bindings'] }, userId: string, list: (NewTrophy | null)[]) {
  const rows = list.filter((t): t is NewTrophy => t !== null)
  if (rows.length === 0) return []
  await db(c).insert(trophies).values(rows.map((t) => ({ ...t, user_id: userId })))
  return rows
}

function countryOf(place: string) {
  return place.split(',').pop()?.trim() ?? place
}

gameRoutes.get('/game/state', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [profile] = await d.select().from(profiles).where(eq(profiles.user_id, userId))
  const role = await adminRole(c)
  if (!profile) return c.json({ profile: null, mine: [], holding: [], role, online: 0 })
  const email = c.get('email')?.toLowerCase() ?? null
  let rows = await d
    .select()
    .from(flikkables)
    .where(or(eq(flikkables.owner_id, userId), eq(flikkables.picked_up_by, userId)))
    .orderBy(desc(flikkables.created_at))

  const today = dayKey()
  let garden = profile.garden_ids
  const moodUpdates = rows
    .filter((f) => f.owner_id === userId)
    .map((f) => ({ f, next: catchUpMood(f, today) }))
    .filter((u) => u.next !== null)
  for (const { f, next } of moodUpdates) {
    if (!next) continue
    await d.update(flikkables).set({ happiness: next.happiness, mood_day: next.mood_day }).where(eq(flikkables.id, f.id))
    // A sad Flikkable waiting at the airport goes back to the garden.
    if (next.sad && f.status === 'home' && !garden.includes(f.id)) garden = [...garden, f.id]
  }
  if (moodUpdates.length > 0) {
    rows = rows.map((f) => {
      const u = moodUpdates.find((m) => m.f.id === f.id)?.next
      return u ? { ...f, happiness: u.happiness, mood_day: u.mood_day } : f
    })
  }
  const ownedIds = new Set(rows.filter((f) => f.owner_id === userId).map((f) => f.id))
  garden = garden.filter((id) => ownedIds.has(id))

  const startOfDay = new Date(`${today}T00:00:00Z`)
  const startOfWeek = new Date(startOfDay.getTime() - ((startOfDay.getUTCDay() + 6) % 7) * 86400_000)
  const [[stampTotals], [online], [updated]] = await Promise.all([
    d
      .select({
        day: sql<number>`coalesce(sum(case when ${journeys.created_at} >= ${startOfDay.toISOString()} then ${journeys.stamps} else 0 end), 0)::int`,
        week: sql<number>`coalesce(sum(${journeys.stamps}), 0)::int`,
      })
      .from(journeys)
      .where(and(eq(journeys.by_user_id, userId), gte(journeys.created_at, startOfWeek))),
    d.select({ n: sql<number>`count(*)::int` }).from(profiles).where(gt(profiles.last_seen_at, new Date(Date.now() - 5 * 60_000))),
    d
      .update(profiles)
      .set({ last_seen_at: new Date(), garden_ids: garden, ...dailyQuest(profile), ...(email && profile.email !== email ? { email } : {}) })
      .where(eq(profiles.user_id, userId))
      .returning(),
  ])
  const p = updated ?? profile
  return c.json({
    profile: {
      ...p,
      level: levelFor(p.total_km),
      flikkables_km: rows.filter((r) => r.owner_id === userId).reduce((sum, r) => sum + r.total_km, 0),
      stamps_today: stampTotals?.day ?? 0, stamps_week: stampTotals?.week ?? 0 },
    mine: rows.filter((r) => r.owner_id === userId).map(serialize),
    holding: rows.filter((r) => r.owner_id !== userId).map(serialize),
    role,
    online: Math.max(online?.n ?? 1, 1),
  })
})

gameRoutes.post('/game/profile', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ display_name?: string; home_lat?: number; home_lng?: number; home_name?: string }>()
  const name = (body.display_name ?? '').trim().slice(0, 24)
  if (name.length < 2) return c.json({ error: 'Pikk a name with at least 2 letters.' }, 400)
  if (typeof body.home_lat !== 'number' || typeof body.home_lng !== 'number') {
    return c.json({ error: 'Set your home spot first.' }, 400)
  }
  const homeName = (body.home_name ?? 'Home').trim().slice(0, 60) || 'Home'
  const d = db(c)
  const [existing] = await d.select().from(profiles).where(eq(profiles.user_id, userId))
  if (existing) {
    const [updated] = await d
      .update(profiles)
      .set({ display_name: name, home_lat: body.home_lat, home_lng: body.home_lng, home_name: homeName })
      .where(eq(profiles.user_id, userId))
      .returning()
    return c.json({ profile: updated })
  }
  const [profile] = await d
    .insert(profiles)
    .values({
      user_id: userId,
      display_name: name,
      home_lat: body.home_lat,
      home_lng: body.home_lng,
      home_name: homeName,
      email: c.get('email')?.toLowerCase() ?? null,
    })
    .returning()
  return c.json({ profile })
})

gameRoutes.post('/game/flikkables', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const body = await c.req.json<{ name?: string; emoji?: string; lat?: number; lng?: number; template_id?: string }>()
  const name = (body.name ?? '').trim().slice(0, 20)
  const d = db(c)
  let template: CharacterTemplateRow | undefined
  if (body.template_id) {
    ;[template] = await d.select().from(characterTemplates).where(eq(characterTemplates.id, body.template_id))
    if (!template || template.status !== 'succeeded') return c.json({ error: 'That template is gone.' }, 404)
    const [unlock] = await d.select().from(templateUnlocks).where(and(eq(templateUnlocks.user_id, userId), eq(templateUnlocks.template_id, template.id)))
    if (!template.is_published && !unlock) return c.json({ error: 'That template isn’t available.' }, 403)
    if (template.is_locked && !unlock) return c.json({ error: 'Unlock this Flikkstar first.' }, 403)
    if (profile.stamps < 10) return c.json({ error: `Not enough stamps! You need 10 but have ${profile.stamps}` }, 400)
  }
  const emoji = template ? '⭐' : (body.emoji ?? '').trim().slice(0, 8)
  if (name.length < 1) return c.json({ error: 'Please enter a name for your Flikkable' }, 400)
  if (!emoji) return c.json({ error: 'Choose an Emoji' }, 400)
  const owned = await d.select({ id: flikkables.id, rarity: flikkables.rarity }).from(flikkables).where(eq(flikkables.owner_id, userId))
  const { max_owned } = await loadSettings(c.env)
  if (owned.length >= max_owned) return c.json({ error: `You can keep up to ${max_owned} Flikkables.` }, 400)
  const lat = typeof body.lat === 'number' ? body.lat : profile.home_lat
  const lng = typeof body.lng === 'number' ? body.lng : profile.home_lng
  const [created] = await d
    .insert(flikkables)
    .values({
      owner_id: userId,
      owner_name: profile.display_name,
      name,
      emoji,
      rarity: template?.rarity ?? rollRarity(),
      template_id: template?.id ?? null,
      is_flikkstar: Boolean(template),
      current_lat: lat,
      current_lng: lng,
      current_place: profile.home_name,
      home_lat: profile.home_lat,
      home_lng: profile.home_lng,
      happiness: 5,
      mood_day: dayKey(),
    })
    .returning()
  if (!created) throw new Error('insert failed')
  const rarities = new Set([...owned.map((o) => o.rarity), created.rarity])
  const quest = progressQuest(profile.quests, 'rarity_collector', { atLeast: rarities.size })
  await Promise.all([
    d.insert(journeys).values({ flikkable_id: created.id, event: 'created', place: profile.home_name, lat, lng, by_user_id: userId, by_name: profile.display_name }),
    d
      .update(profiles)
      .set({ garden_ids: [...profile.garden_ids, created.id], quests: quest.state, ...(template ? { stamps: profile.stamps - 10 } : {}) })
      .where(eq(profiles.user_id, userId)),
  ])
  const earned = await saveTrophies(c, userId, [quest.trophy])
  return c.json({ flikkable: serialize(created), trophies: earned })
})

gameRoutes.delete('/game/flikkables/:id', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f || f.owner_id !== userId) return c.json({ error: 'That Flikkable is gone.' }, 404)
  if (f.status !== 'home') return c.json({ error: `${f.name} is out exploring.` }, 400)
  await d.delete(journeys).where(eq(journeys.flikkable_id, f.id))
  await d.delete(postcards).where(eq(postcards.flikkable_id, f.id))
  await d.delete(flikkables).where(eq(flikkables.id, f.id))
  await d
    .update(tradeOffers)
    .set({ status: 'cancelled', responded_at: new Date() })
    .where(and(eq(tradeOffers.status, 'pending'), or(eq(tradeOffers.offered_id, f.id), eq(tradeOffers.requested_id, f.id))))
  await d
    .update(profiles)
    .set({ garden_ids: sql`coalesce((select jsonb_agg(x) from jsonb_array_elements(${profiles.garden_ids}) x where x <> to_jsonb(${f.id}::text)), '[]'::jsonb)` })
    .where(eq(profiles.user_id, userId))
  return c.json({ ok: true })
})

gameRoutes.get('/game/flikkables/:id', async (c) => {
  const id = c.req.param('id')
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, id))
  if (!f) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const trail = await d.select().from(journeys).where(eq(journeys.flikkable_id, id)).orderBy(desc(journeys.created_at)).limit(60)
  return c.json({ flikkable: serialize(f), journeys: trail })
})

// Garden <-> airport. A Flikkable at home and not in the garden is at the airport.
gameRoutes.post('/game/garden', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const body = await c.req.json<{ ids?: string[]; to?: 'garden' | 'airport' }>()
  const ids = body.ids ?? []
  const rows = ids.length ? await db(c).select().from(flikkables).where(and(inArray(flikkables.id, ids), eq(flikkables.owner_id, userId), eq(flikkables.status, 'home'))) : []
  let garden = profile.garden_ids
  if (body.to === 'garden') garden = [...new Set([...garden, ...rows.map((r) => r.id)])]
  if (body.to === 'airport') {
    const ready = rows.filter((r) => r.happiness >= 3).map((r) => r.id)
    if (ready.length === 0 && rows.length > 0) return c.json({ error: 'Character too sad to travel' }, 400)
    garden = garden.filter((id) => !ready.includes(id))
  }
  const [updated] = await db(c).update(profiles).set({ garden_ids: garden }).where(eq(profiles.user_id, userId)).returning()
  return c.json({ garden_ids: updated?.garden_ids ?? garden })
})

gameRoutes.post('/game/flikkables/:id/feed', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f || f.owner_id !== userId) return c.json({ error: 'That Flikkable is gone.' }, 404)
  if (f.last_fed_at && dayKey(f.last_fed_at) === dayKey()) return c.json({ error: 'Your Flikkable was already fed! Come back tomorrow' }, 400)
  if (profile.stamps < 1) return c.json({ error: 'Insufficient stamps' }, 400)
  const [updated] = await d.update(flikkables).set({ happiness: 5, last_fed_at: new Date() }).where(eq(flikkables.id, f.id)).returning()
  await d.update(profiles).set({ stamps: profile.stamps - 1 }).where(eq(profiles.user_id, userId))
  return c.json({ flikkable: updated ? serialize(updated) : null })
})

gameRoutes.post('/game/flikkables/:id/play', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f || f.owner_id !== userId) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const [updated] = await d.update(flikkables).set({ happiness: Math.min(f.happiness + 1, 5) }).where(eq(flikkables.id, f.id)).returning()
  return c.json({ flikkable: updated ? serialize(updated) : null })
})

gameRoutes.get('/game/players', async (c) => {
  const q = (c.req.query('q') ?? '').trim()
  if (q.length < 2) return c.json({ players: [] })
  const rows = await db(c)
    .select({ user_id: profiles.user_id, display_name: profiles.display_name, home_name: profiles.home_name })
    .from(profiles)
    .where(
      and(
        ilike(profiles.display_name, `%${q.replace(/[%_]/g, '')}%`),
        ne(profiles.user_id, c.get('userId')),
        sql`not exists (select 1 from ${blockedUsers} where (${blockedUsers.blocker_id} = ${c.get('userId')} and ${blockedUsers.blocked_id} = ${profiles.user_id}) or (${blockedUsers.blocked_id} = ${c.get('userId')} and ${blockedUsers.blocker_id} = ${profiles.user_id}))`,
      ),
    )
    .limit(10)
  return c.json({ players: rows })
})

gameRoutes.post('/game/flikkables/:id/flick', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const body = await c.req.json<{ lat?: number; lng?: number; target_user_id?: string; city?: string }>()
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const isOwnerAtHome = f.owner_id === userId && f.status === 'home'
  const isHolder = f.status === 'picked_up' && f.picked_up_by === userId
  if (!isOwnerAtHome && !isHolder) return c.json({ error: `${f.name} is not in your hands right now.` }, 400)
  if (isOwnerAtHome && profile.garden_ids.includes(f.id)) return c.json({ error: `Move ${f.name} to the airport first.` }, 400)

  const fromLat = typeof body.lat === 'number' ? body.lat : f.current_lat
  const fromLng = typeof body.lng === 'number' ? body.lng : f.current_lng
  let city = pickCity(f.current_place)
  let place = `${city.name}, ${city.country}`
  let spot = offset(city.lat, city.lng, Math.random() * 50)
  if (body.city) {
    const chosen = CITIES.find((x) => `${x.name}, ${x.country}` === body.city)
    if (chosen) {
      city = chosen
      place = body.city
      spot = offset(city.lat, city.lng, Math.random() * 50)
    }
  }
  if (body.target_user_id) {
    const [target] = await d.select().from(profiles).where(eq(profiles.user_id, body.target_user_id))
    if (!target) return c.json({ error: 'That player could not be found.' }, 404)
    place = target.home_name
    spot = offset(target.home_lat, target.home_lng, Math.random() * 50)
    city = { name: target.home_name, country: countryOf(target.home_name), lat: target.home_lat, lng: target.home_lng, population: 0 }
  }
  const landing = offset(spot.lat, spot.lng, (Math.random() * 50 + 50) / 1000)
  const km = haversineKm(fromLat, fromLng, landing.lat, landing.lng)
  const stamps = flickStamps(f, km, city.population)
  const places = f.places.includes(place) ? f.places : [...f.places, place]
  const totalKm = f.total_km + km

  const [updated] = await d
    .update(flikkables)
    .set({
      status: 'landed',
      current_lat: landing.lat,
      current_lng: landing.lng,
      current_place: place,
      total_km: totalKm,
      places,
      picked_up_by: null,
      picked_up_by_name: null,
      picked_up_at: null,
      last_flicked_at: new Date(),
    })
    .where(eq(flikkables.id, f.id))
    .returning()
  if (!updated) throw new Error('update failed')

  const dq = dailyQuest(profile)
  dq.dq_flicked += 1
  let quests: QuestState = profile.quests
  const earned: (NewTrophy | null)[] = []
  const step = (id: string, update: Parameters<typeof progressQuest>[2]) => {
    const r = progressQuest(quests, id, update)
    quests = r.state
    earned.push(r.trophy)
  }
  step('speed_flicker', { atLeast: dq.dq_flicked })
  step('world_traveler', { atLeast: new Set(places.map(countryOf)).size })
  step('distance_champion', { atLeast: Math.floor(totalKm) })
  step('continental_tour', { seen: continentFor(landing.lat, landing.lng) })
  if (isCapital(city.name)) step('lucky_landing', { seen: city.name })

  const userKm = profile.total_km + km
  const milestone = MILESTONES.find((m) => userKm >= m && !profile.milestones.includes(m)) ?? null
  const levelBefore = levelFor(profile.total_km)
  await Promise.all([
    d.insert(journeys).values({ flikkable_id: f.id, event: 'flicked', place, lat: landing.lat, lng: landing.lng, distance_km: km, stamps, by_user_id: userId, by_name: profile.display_name }),
    d
      .update(profiles)
      .set({
        stamps: profile.stamps + stamps,
        flick_count: profile.flick_count + 1,
        total_km: userKm,
        quests,
        ...dq,
        milestones: milestone ? [...profile.milestones, ...MILESTONES.filter((m) => userKm >= m && !profile.milestones.includes(m))] : profile.milestones,
      })
      .where(eq(profiles.user_id, userId)),
  ])
  const trophiesEarned = await saveTrophies(c, userId, earned)
  return c.json({
    flikkable: serialize(updated),
    landing: { place, city: city.name, country: city.country, lat: landing.lat, lng: landing.lng, from_lat: fromLat, from_lng: fromLng, km, stamps, population: city.population },
    milestone,
    level_up: levelFor(userKm) > levelBefore ? levelFor(userKm) : null,
    trophies: trophiesEarned,
  })
})

gameRoutes.post('/game/flikkables/:id/pickup', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const body = await c.req.json<{ lat?: number; lng?: number }>()
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') return c.json({ error: 'Location needed.' }, 400)
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f || f.status !== 'landed') return c.json({ error: 'Someone else got there first.' }, 409)
  if (f.owner_id === userId) return c.json({ error: 'You can’t pikk up your own Flikkable.' }, 400)
  const dist = haversineKm(body.lat, body.lng, f.current_lat, f.current_lng)
  const { pickup_radius_m } = await loadSettings(c.env)
  if (dist * 1000 > pickup_radius_m) {
    return c.json({ error: `You’re ${Math.round(dist * 1000)} m away. Get within ${pickup_radius_m} m.` }, 400)
  }
  const pickers = f.pickers.includes(userId) ? f.pickers : [...f.pickers, userId]
  const [updated] = await d
    .update(flikkables)
    .set({ status: 'picked_up', picked_up_by: userId, picked_up_by_name: profile.display_name, picked_up_at: new Date(), pickers })
    .where(and(eq(flikkables.id, f.id), eq(flikkables.status, 'landed')))
    .returning()
  if (!updated) return c.json({ error: 'Someone else got there first.' }, 409)
  const mine = f.rarity === 'legendary' ? progressQuest(profile.quests, 'rare_encounter', { add: 1 }) : { state: profile.quests, trophy: null }
  await Promise.all([
    d.insert(journeys).values({ flikkable_id: f.id, event: 'picked_up', place: f.current_place, lat: f.current_lat, lng: f.current_lng, by_user_id: userId, by_name: profile.display_name }),
    d.update(profiles).set({ picked_up_count: profile.picked_up_count + 1, quests: mine.state }).where(eq(profiles.user_id, userId)),
  ])
  const [owner] = await d.select().from(profiles).where(eq(profiles.user_id, f.owner_id))
  if (owner) {
    const theirs = progressQuest(owner.quests, 'social_butterfly', { seen: userId })
    await d.update(profiles).set({ quests: theirs.state }).where(eq(profiles.user_id, owner.user_id))
    await saveTrophies(c, owner.user_id, [theirs.trophy])
  }
  if (f.owner_id !== SYSTEM_OWNER_ID) {
    await notify(c, [{
      user_id: f.owner_id,
      type: 'flick_landed',
      title: `${f.name} was picked up!`,
      message: `${profile.display_name} picked up ${f.name} in ${f.current_place}`,
      related_user_id: userId,
      related_user_name: profile.display_name,
      metadata: { flikkable_id: f.id },
    }])
  }
  const earned = await saveTrophies(c, userId, [mine.trophy])
  return c.json({ flikkable: serialize(updated), trophies: earned })
})

gameRoutes.post('/game/flikkables/:id/return', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const isHolder = f.status === 'picked_up' && f.picked_up_by === userId
  const isOwner = f.owner_id === userId
  if (!isHolder && !isOwner) return c.json({ error: 'Only its owner or whoever is holding it can send it home.' }, 403)
  if (f.status === 'home') return c.json({ error: `${f.name} is already home.` }, 400)
  const readyAt = returnReadyAt(f)
  const ownerWaiting = !isHolder && f.status === 'landed' && readyAt && readyAt.getTime() > Date.now()
  if (ownerWaiting) {
    const hours = Math.ceil((readyAt.getTime() - Date.now()) / 3600_000)
    return c.json({ error: `${hours}h remaining before ${f.name} can return home.` }, 400)
  }
  const stamps = !isOwner ? Math.ceil(f.total_km / 200) + (RETURN_BONUS[f.rarity] ?? 0) : 0
  const teamDrop = f.owner_id === SYSTEM_OWNER_ID
  const [updated] = await d
    .update(flikkables)
    .set({
      // Team drops have no owner to go home to, so they land back at their drop spot for the next player.
      status: teamDrop ? 'landed' : 'home',
      current_lat: f.home_lat,
      current_lng: f.home_lng,
      current_place: teamDrop ? (f.places[0] ?? 'Home') : 'Home',
      times_returned: f.times_returned + 1,
      picked_up_by: null,
      picked_up_by_name: null,
      picked_up_at: null,
      happiness: 1,
    })
    .where(eq(flikkables.id, f.id))
    .returning()
  if (!updated) throw new Error('update failed')
  const dq = dailyQuest(profile)
  dq.dq_returned += 1
  await Promise.all([
    d.insert(journeys).values({ flikkable_id: f.id, event: 'returned', place: 'Home', lat: f.home_lat, lng: f.home_lng, stamps, by_user_id: userId, by_name: profile.display_name }),
    d.update(profiles).set({ stamps: profile.stamps + stamps, returned_count: profile.returned_count + 1, ...dq }).where(eq(profiles.user_id, userId)),
  ])
  const [owner] = teamDrop ? [] : await d.select().from(profiles).where(eq(profiles.user_id, f.owner_id))
  if (owner) {
    const theirs = progressQuest(owner.quests, 'homecoming', { atLeast: f.times_returned + 1 })
    await d.update(profiles).set({ quests: theirs.state }).where(eq(profiles.user_id, owner.user_id))
    await saveTrophies(c, owner.user_id, [theirs.trophy])
  }
  const km = Math.round(f.total_km)
  await notify(c, [
    ...(isHolder ? [{
      user_id: userId,
      type: 'character_returned',
      title: `${f.name} returned home!`,
      message: `${f.name} made it back home and earned ${stamps} stamps. It traveled ${km}km.`,
      metadata: { flikkable_id: f.id },
    }] : []),
    ...(owner && !isOwner ? [{
      user_id: owner.user_id,
      type: 'character_returned',
      title: `${f.name} is back home!`,
      message: `${profile.display_name} returned ${f.name} safely home after traveling ${km}km!`,
      related_user_id: userId,
      related_user_name: profile.display_name,
      metadata: { flikkable_id: f.id },
    }] : []),
  ])
  return c.json({ flikkable: serialize(updated), stamps })
})

gameRoutes.get('/game/leaderboard', async (c) => {
  const rows = await db(c)
    .select({ user_id: profiles.user_id, display_name: profiles.display_name, stamps: profiles.stamps, flick_count: profiles.flick_count })
    .from(profiles)
    .orderBy(desc(profiles.stamps))
    .limit(25)
  return c.json({ leaders: rows })
})

gameRoutes.get('/game/rankings', async (c) => {
  const userId = c.get('userId')
  const type = c.req.query('type') === 'pikkrs' ? 'pikkrs' : 'flikkrs'
  const periodParam = c.req.query('period')
  const period = periodParam === 'daily' || periodParam === 'weekly' ? periodParam : 'all'
  const startOfDay = new Date(`${dayKey()}T00:00:00Z`)
  const startOfWeek = new Date(startOfDay.getTime() - ((startOfDay.getUTCDay() + 6) % 7) * 86400_000)
  const conditions = [eq(journeys.event, type === 'flikkrs' ? 'flicked' : 'picked_up')]
  if (type === 'flikkrs' && period === 'daily') conditions.push(gte(journeys.created_at, startOfDay))
  if (type === 'flikkrs' && period === 'weekly') conditions.push(gte(journeys.created_at, startOfWeek))
  const value =
    type === 'flikkrs' ? sql<number>`round(coalesce(sum(${journeys.distance_km}), 0))::int` : sql<number>`count(*)::int`
  // Flikkrs rank by the km travelled by every Flikkable they own, whoever flicked it.
  const rows =
    type === 'flikkrs' && period === 'all'
      ? await db(c)
          .select({
            user_id: flikkables.owner_id,
            display_name: profiles.display_name,
            value: sql<number>`round(coalesce(sum(${flikkables.total_km}), 0))::int`,
            count: sql<number>`count(*)::int`,
          })
          .from(flikkables)
          .innerJoin(profiles, eq(profiles.user_id, flikkables.owner_id))
          .groupBy(flikkables.owner_id, profiles.display_name)
      : type === 'flikkrs'
        ? await db(c)
            .select({ user_id: flikkables.owner_id, display_name: profiles.display_name, value, count: sql<number>`count(*)::int` })
            .from(journeys)
            .innerJoin(flikkables, eq(flikkables.id, journeys.flikkable_id))
            .innerJoin(profiles, eq(profiles.user_id, flikkables.owner_id))
            .where(and(...conditions))
            .groupBy(flikkables.owner_id, profiles.display_name)
        : await db(c)
            .select({ user_id: journeys.by_user_id, display_name: profiles.display_name, value, count: sql<number>`count(*)::int` })
            .from(journeys)
            .innerJoin(profiles, eq(profiles.user_id, journeys.by_user_id))
            .where(and(...conditions))
            .groupBy(journeys.by_user_id, profiles.display_name)
  const ranked = rows
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.display_name.localeCompare(b.display_name) || a.user_id.localeCompare(b.user_id))
    .map((r, i) => ({ rank: i + 1, user_id: r.user_id, display_name: r.display_name, value: r.value, count: type === 'flikkrs' ? r.count : null }))
  const mine = ranked.find((r) => r.user_id === userId)
  return c.json({ leaders: ranked.slice(0, 20), me: mine ? { rank: mine.rank, value: mine.value, count: mine.count } : null })
})

gameRoutes.get('/game/nearby', async (c) => {
  const userId = c.get('userId')
  const lat = Number(c.req.query('lat'))
  const lng = Number(c.req.query('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return c.json({ error: 'Location needed.' }, 400)
  const d = db(c)
  const settings = await loadSettings(c.env)
  const NEARBY_RADIUS_KM = settings.nearby_radius_km
  const latSpan = NEARBY_RADIUS_KM / 111
  const landed = await d
    .select()
    .from(flikkables)
    .where(and(eq(flikkables.status, 'landed'), ne(flikkables.owner_id, userId)))
    .limit(500)
  const nearby = landed
    .filter((f) => Math.abs(f.current_lat - lat) <= latSpan)
    .map((f) => ({
      ...serialize(f),
      distance_km: haversineKm(lat, lng, f.current_lat, f.current_lng),
      bearing: bearingDeg(lat, lng, f.current_lat, f.current_lng),
    }))
    .filter((f) => f.distance_km <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.distance_km - b.distance_km)
  const roaming = await d
    .select({
      id: flikkables.id,
      place: flikkables.current_place,
      lat: flikkables.current_lat,
      lng: flikkables.current_lng,
      emoji: flikkables.emoji,
      name: flikkables.name,
      owner_id: flikkables.owner_id,
      owner_name: flikkables.owner_name,
      rarity: flikkables.rarity,
      status: flikkables.status,
      total_km: flikkables.total_km,
      places: flikkables.places,
      happiness: flikkables.happiness,
    })
    .from(flikkables)
    .where(eq(flikkables.status, 'landed'))
    .orderBy(desc(flikkables.last_flicked_at))
    .limit(200)
  return c.json({ nearby, roaming, pickup_radius_km: settings.pickup_radius_m / 1000, radius_km: NEARBY_RADIUS_KM })
})


gameRoutes.delete('/game/me', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const owned = await d.select({ id: flikkables.id }).from(flikkables).where(eq(flikkables.owner_id, userId))
  const ids = owned.map((o) => o.id)
  if (ids.length > 0) {
    await d.delete(journeys).where(inArray(journeys.flikkable_id, ids))
    await d.delete(postcards).where(inArray(postcards.flikkable_id, ids))
    await d.delete(flikkables).where(inArray(flikkables.id, ids))
  }
  await d.delete(userItems).where(eq(userItems.user_id, userId))
  await d.delete(trophies).where(eq(trophies.user_id, userId))
  await d.delete(friendships).where(or(eq(friendships.requester_id, userId), eq(friendships.addressee_id, userId)))
  await d.delete(blockedUsers).where(or(eq(blockedUsers.blocker_id, userId), eq(blockedUsers.blocked_id, userId)))
  await d.delete(tradeOffers).where(or(eq(tradeOffers.from_user_id, userId), eq(tradeOffers.to_user_id, userId)))
  await d
    .update(flikkables)
    .set({ status: 'landed', picked_up_by: null, picked_up_by_name: null, picked_up_at: null })
    .where(eq(flikkables.picked_up_by, userId))
  await d.delete(profiles).where(eq(profiles.user_id, userId))
  return c.json({ ok: true })
})

