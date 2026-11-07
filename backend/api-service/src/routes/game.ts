import { Hono } from 'hono'
import { and, desc, eq, inArray, ne, or } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { createDb } from '../db/client'
import { flikkables, journeys, postcards, profiles, type FlikkableRow, type ProfileRow } from '../db/schema'
import { CITIES, type City } from '../game-cities'
import { newlyAi, NewlyAiError } from '../platform/ai'
import { adminRole, loadSettings } from '../game-admin'

export const gameRoutes = new Hono<HonoEnv>()
gameRoutes.use('/game/*', authMiddleware)
gameRoutes.use('/game/*', async (c, next) => {
  if (c.req.method === 'GET' || c.req.path === '/game/me') return next()
  const [p] = await db(c).select({ locked: profiles.locked }).from(profiles).where(eq(profiles.user_id, c.get('userId')))
  if (p?.locked) return c.json({ error: 'This account is paused by the Flikkables team.' }, 403)
  return next()
})

const RETURN_WAIT_HOURS = 8
export const SYSTEM_OWNER_ID = 'flikkables-team'
const STARTER_EMOJIS = ['🦊', '🐼', '🐸', '🦉', '🐙', '🐢', '🦄', '🐧', '🦋', '🐨']
const RARITY_BONUS: Record<string, number> = { common: 0, uncommon: 0, rare: 2, epic: 5, legendary: 10 }
const RETURN_BONUS: Record<string, number> = { common: 0, uncommon: 0, rare: 5, epic: 10, legendary: 20 }

function db(c: { env: HonoEnv['Bindings'] }) {
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

function pickCity(excludeName?: string): City {
  const pool = CITIES.filter((city) => `${city.name}, ${city.country}` !== excludeName)
  const weights = pool.map((city) => Math.log10(city.population))
  let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0)
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return pool[i]!
  }
  return pool[pool.length - 1]!
}

export function rollRarity() {
  const roll = Math.random() * 100
  if (roll < 2) return 'legendary'
  if (roll < 10) return 'epic'
  if (roll < 25) return 'rare'
  if (roll < 50) return 'uncommon'
  return 'common'
}

function flickStamps(rarity: string, km: number, population: number) {
  let stamps = 1 + Math.ceil(km / 1000)
  if (population >= 1_000_000) stamps += 3
  return stamps + (RARITY_BONUS[rarity] ?? 0)
}

function returnReadyAt(f: FlikkableRow) {
  if (!f.last_flicked_at) return null
  return new Date(f.last_flicked_at.getTime() + RETURN_WAIT_HOURS * 3600_000)
}

function serialize(f: FlikkableRow) {
  return { ...f, return_ready_at: returnReadyAt(f)?.toISOString() ?? null }
}

async function requireProfile(c: { env: HonoEnv['Bindings']; get: (key: 'userId') => string }): Promise<ProfileRow | undefined> {
  const [profile] = await db(c).select().from(profiles).where(eq(profiles.user_id, c.get('userId')))
  return profile
}

function todayKey(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400_000).toISOString().slice(0, 10)
}

gameRoutes.get('/game/state', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [profile] = await d.select().from(profiles).where(eq(profiles.user_id, userId))
  const role = await adminRole(c)
  if (!profile) return c.json({ profile: null, mine: [], holding: [], role })
  const email = c.get('email')?.toLowerCase() ?? null
  if (email && profile.email !== email) await d.update(profiles).set({ email }).where(eq(profiles.user_id, userId))
  const rows = await d
    .select()
    .from(flikkables)
    .where(or(eq(flikkables.owner_id, userId), eq(flikkables.picked_up_by, userId)))
    .orderBy(desc(flikkables.created_at))
  return c.json({
    profile,
    mine: rows.filter((r) => r.owner_id === userId).map(serialize),
    holding: rows.filter((r) => r.owner_id !== userId).map(serialize),
    role,
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
  const emoji = STARTER_EMOJIS[Math.floor(Math.random() * STARTER_EMOJIS.length)]!
  const [starter] = await d
    .insert(flikkables)
    .values({
      owner_id: userId,
      owner_name: name,
      name: 'Pip',
      emoji,
      rarity: 'uncommon',
      current_lat: body.home_lat,
      current_lng: body.home_lng,
      current_place: homeName,
      home_lat: body.home_lat,
      home_lng: body.home_lng,
    })
    .returning()
  if (!starter) throw new Error('insert failed')
  await d.insert(journeys).values({
    flikkable_id: starter.id,
    event: 'created',
    place: homeName,
    lat: body.home_lat,
    lng: body.home_lng,
    by_user_id: userId,
    by_name: name,
  })
  return c.json({ profile })
})

gameRoutes.post('/game/flikkables', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const body = await c.req.json<{ name?: string; emoji?: string }>()
  const name = (body.name ?? '').trim().slice(0, 20)
  const emoji = (body.emoji ?? '').trim().slice(0, 8)
  if (name.length < 1) return c.json({ error: 'Give your Flikkable a name.' }, 400)
  if (!emoji) return c.json({ error: 'Pikk a creature.' }, 400)
  const d = db(c)
  const owned = await d.select({ id: flikkables.id }).from(flikkables).where(eq(flikkables.owner_id, userId))
  const { max_owned } = await loadSettings(c.env)
  if (owned.length >= max_owned) return c.json({ error: `You can keep up to ${max_owned} Flikkables.` }, 400)
  const [created] = await d
    .insert(flikkables)
    .values({
      owner_id: userId,
      owner_name: profile.display_name,
      name,
      emoji,
      rarity: rollRarity(),
      current_lat: profile.home_lat,
      current_lng: profile.home_lng,
      current_place: profile.home_name,
      home_lat: profile.home_lat,
      home_lng: profile.home_lng,
    })
    .returning()
  if (!created) throw new Error('insert failed')
  await d.insert(journeys).values({
    flikkable_id: created.id,
    event: 'created',
    place: profile.home_name,
    lat: profile.home_lat,
    lng: profile.home_lng,
    by_user_id: userId,
    by_name: profile.display_name,
  })
  return c.json({ flikkable: serialize(created) })
})

gameRoutes.get('/game/flikkables/:id', async (c) => {
  const id = c.req.param('id')
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, id))
  if (!f) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const [trail, cards] = await Promise.all([
    d.select().from(journeys).where(eq(journeys.flikkable_id, id)).orderBy(desc(journeys.created_at)).limit(60),
    d.select().from(postcards).where(eq(postcards.flikkable_id, id)).orderBy(desc(postcards.created_at)).limit(30),
  ])
  return c.json({ flikkable: serialize(f), journeys: trail, postcards: cards })
})

gameRoutes.post('/game/flikkables/:id/flick', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const body = await c.req.json<{ lat?: number; lng?: number; power?: number }>()
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const isOwnerAtHome = f.owner_id === userId && f.status === 'home'
  const isHolder = f.status === 'picked_up' && f.picked_up_by === userId
  if (!isOwnerAtHome && !isHolder) return c.json({ error: `${f.name} is not in your hands right now.` }, 400)

  const fromLat = typeof body.lat === 'number' ? body.lat : f.current_lat
  const fromLng = typeof body.lng === 'number' ? body.lng : f.current_lng
  const city = pickCity(f.current_place)
  const place = `${city.name}, ${city.country}`
  const spot = offset(city.lat, city.lng, (Math.random() - 0.5) * 100)
  const landing = offset(spot.lat, spot.lng, (Math.random() * 50 + 50) / 1000)
  const km = haversineKm(fromLat, fromLng, landing.lat, landing.lng)
  const stamps = flickStamps(f.rarity, km, city.population)
  const places = f.places.includes(place) ? f.places : [...f.places, place]

  const [updated] = await d
    .update(flikkables)
    .set({
      status: 'landed',
      current_lat: landing.lat,
      current_lng: landing.lng,
      current_place: place,
      total_km: f.total_km + km,
      places,
      picked_up_by: null,
      picked_up_by_name: null,
      picked_up_at: null,
      last_flicked_at: new Date(),
    })
    .where(eq(flikkables.id, f.id))
    .returning()
  if (!updated) throw new Error('update failed')
  await Promise.all([
    d.insert(journeys).values({
      flikkable_id: f.id,
      event: 'flicked',
      place,
      lat: landing.lat,
      lng: landing.lng,
      distance_km: km,
      stamps,
      by_user_id: userId,
      by_name: profile.display_name,
    }),
    d
      .update(profiles)
      .set({ stamps: profile.stamps + stamps, flick_count: profile.flick_count + 1 })
      .where(eq(profiles.user_id, userId)),
  ])
  return c.json({
    flikkable: serialize(updated),
    landing: { place, city: city.name, country: city.country, lat: landing.lat, lng: landing.lng, from_lat: fromLat, from_lng: fromLng, km, stamps, population: city.population },
  })
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
    .select({ place: flikkables.current_place, lat: flikkables.current_lat, lng: flikkables.current_lng, emoji: flikkables.emoji })
    .from(flikkables)
    .where(eq(flikkables.status, 'landed'))
    .orderBy(desc(flikkables.last_flicked_at))
    .limit(200)
  return c.json({ nearby, roaming, pickup_radius_km: settings.pickup_radius_m / 1000, radius_km: NEARBY_RADIUS_KM })
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
  const [updated] = await d
    .update(flikkables)
    .set({ status: 'picked_up', picked_up_by: userId, picked_up_by_name: profile.display_name, picked_up_at: new Date() })
    .where(and(eq(flikkables.id, f.id), eq(flikkables.status, 'landed')))
    .returning()
  if (!updated) return c.json({ error: 'Someone else got there first.' }, 409)
  await Promise.all([
    d.insert(journeys).values({
      flikkable_id: f.id,
      event: 'picked_up',
      place: f.current_place,
      lat: f.current_lat,
      lng: f.current_lng,
      by_user_id: userId,
      by_name: profile.display_name,
    }),
    d.update(profiles).set({ picked_up_count: profile.picked_up_count + 1 }).where(eq(profiles.user_id, userId)),
  ])
  return c.json({ flikkable: serialize(updated) })
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
    return c.json({ error: `${f.name} is still exploring. Back in about ${hours} h, or sooner if someone pikks it up.` }, 400)
  }
  const stamps = isHolder && !isOwner ? Math.ceil(f.total_km / 200) + (RETURN_BONUS[f.rarity] ?? 0) : 0
  const [updated] = await d
    .update(flikkables)
    .set({
      // Team drops have no owner to go home to, so they land back at their drop spot for the next player.
      status: f.owner_id === SYSTEM_OWNER_ID ? 'landed' : 'home',
      current_lat: f.home_lat,
      current_lng: f.home_lng,
      current_place: f.owner_id === SYSTEM_OWNER_ID ? (f.places[0] ?? 'Home') : 'Home',
      times_returned: f.times_returned + 1,
      picked_up_by: null,
      picked_up_by_name: null,
      picked_up_at: null,
    })
    .where(eq(flikkables.id, f.id))
    .returning()
  if (!updated) throw new Error('update failed')
  const writes: Promise<unknown>[] = [
    d.insert(journeys).values({
      flikkable_id: f.id,
      event: 'returned',
      place: 'Home',
      lat: f.home_lat,
      lng: f.home_lng,
      stamps,
      by_user_id: userId,
      by_name: profile.display_name,
    }),
  ]
  if (stamps > 0) writes.push(d.update(profiles).set({ stamps: profile.stamps + stamps }).where(eq(profiles.user_id, userId)))
  await Promise.all(writes)
  return c.json({ flikkable: serialize(updated), stamps })
})

gameRoutes.post('/game/claim-daily', async (c) => {
  const userId = c.get('userId')
  const profile = await requireProfile(c)
  if (!profile) return c.json({ error: 'Finish setting up first.' }, 400)
  const today = todayKey()
  if (profile.last_claim_day === today) return c.json({ error: 'Already claimed today. Come back tomorrow.' }, 400)
  const streak = profile.last_claim_day === todayKey(-1) ? profile.streak + 1 : 1
  const stamps = 5 + Math.min(streak, 7) * 2
  const [updated] = await db(c)
    .update(profiles)
    .set({ streak, last_claim_day: today, stamps: profile.stamps + stamps })
    .where(eq(profiles.user_id, userId))
    .returning()
  return c.json({ profile: updated, stamps })
})

gameRoutes.get('/game/leaderboard', async (c) => {
  const rows = await db(c)
    .select({ user_id: profiles.user_id, display_name: profiles.display_name, stamps: profiles.stamps, flick_count: profiles.flick_count })
    .from(profiles)
    .orderBy(desc(profiles.stamps))
    .limit(25)
  return c.json({ leaders: rows })
})

gameRoutes.get('/game/journal', async (c) => {
  const userId = c.get('userId')
  const rows = await db(c)
    .select({
      id: journeys.id,
      event: journeys.event,
      place: journeys.place,
      distance_km: journeys.distance_km,
      stamps: journeys.stamps,
      created_at: journeys.created_at,
      flikkable_id: journeys.flikkable_id,
      name: flikkables.name,
      emoji: flikkables.emoji,
    })
    .from(journeys)
    .innerJoin(flikkables, eq(flikkables.id, journeys.flikkable_id))
    .where(and(eq(journeys.by_user_id, userId), inArray(journeys.event, ['flicked', 'picked_up', 'returned'])))
    .orderBy(desc(journeys.created_at))
    .limit(40)
  return c.json({ entries: rows })
})

gameRoutes.post('/game/flikkables/:id/postcard', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, c.req.param('id')))
  if (!f) return c.json({ error: 'That Flikkable is gone.' }, 404)
  if (f.owner_id !== userId && f.picked_up_by !== userId) return c.json({ error: 'Only its owner can ask for postcards.' }, 403)
  if (f.status === 'home' || f.current_place === 'Home') return c.json({ error: `${f.name} is home. Flikk it somewhere first.` }, 400)
  const [already] = await d
    .select()
    .from(postcards)
    .where(and(eq(postcards.flikkable_id, f.id), eq(postcards.place, f.current_place), ne(postcards.status, 'failed')))
  if (already) return c.json({ postcard: already })
  const prompt = `A high-quality travel postcard still in the style of a modern 3D animated family feature film. In the foreground, a small adorable round ${emojiNoun(f.emoji)} character named ${f.name}, with a big expressive face, large sparkling eyes, soft detailed fur or skin and a joyful open smile, poses like a delighted tourist taking a selfie. Behind it stands the most iconic landmark of ${f.current_place}, rendered as a lush, colorful animated-movie set. Cinematic warm lighting, soft depth of field, rich saturated colors, polished studio-quality character animation look, crisp and detailed. No text, no letters, no words, no logos.`
  try {
    const job = await newlyAi(c.env, userId).generate(
      { model: 'image', prompt, width: 1024, height: 1024 },
      `postcard-${f.id}-${f.places.length}-${f.total_km.toFixed(0)}`,
    )
    const [card] = await d
      .insert(postcards)
      .values({ flikkable_id: f.id, user_id: userId, place: f.current_place, job_id: job.id, status: job.status })
      .returning()
    return c.json({ postcard: card })
  } catch (err) {
    if (err instanceof NewlyAiError) return c.json({ error: 'Postcards are unavailable right now. Try again in a bit.' }, 503)
    throw err
  }
})

gameRoutes.get('/game/postcards/:id', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [card] = await d.select().from(postcards).where(eq(postcards.id, c.req.param('id')))
  if (!card) return c.json({ error: 'Postcard not found.' }, 404)
  if (card.status === 'succeeded' || card.status === 'failed') return c.json({ postcard: card })
  const job = await newlyAi(c.env, card.user_id).get(card.job_id)
  const status = job.status === 'cancelled' ? 'failed' : job.status
  const error = job.error === 'safety_flagged' ? 'This postcard couldn’t be drawn.' : job.error
  const [updated] = await d.update(postcards).set({ status, error }).where(eq(postcards.id, card.id)).returning()
  void userId
  return c.json({ postcard: updated })
})

gameRoutes.get('/game/postcards/:id/image', async (c) => {
  const d = db(c)
  const [card] = await d.select().from(postcards).where(eq(postcards.id, c.req.param('id')))
  if (!card || card.status !== 'succeeded') return c.json({ error: 'Not ready.' }, 404)
  const res = await newlyAi(c.env, card.user_id).output(card.job_id)
  return new Response(res.body, {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
  })
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
  await d
    .update(flikkables)
    .set({ status: 'landed', picked_up_by: null, picked_up_by_name: null, picked_up_at: null })
    .where(eq(flikkables.picked_up_by, userId))
  await d.delete(profiles).where(eq(profiles.user_id, userId))
  return c.json({ ok: true })
})

const EMOJI_NOUNS: Record<string, string> = {
  '🐶': 'puppy', '🐱': 'kitten', '🐭': 'mouse', '🐹': 'hamster', '🐰': 'bunny', '🦊': 'fox', '🐻': 'bear', '🐼': 'panda',
  '🐨': 'koala', '🐯': 'tiger', '🦁': 'lion', '🐮': 'cow', '🐷': 'piglet', '🐸': 'frog', '🐵': 'monkey', '🐔': 'chicken',
  '🐧': 'penguin', '🐦': 'bird', '🐤': 'chick', '🦆': 'duck', '🦅': 'eagle', '🦉': 'owl', '🦇': 'bat', '🐺': 'wolf',
  '🐗': 'boar', '🐴': 'pony', '🦄': 'unicorn', '🐝': 'bee', '🐛': 'caterpillar', '🦋': 'butterfly', '🐌': 'snail', '🐞': 'ladybug',
  '🐢': 'turtle', '🐍': 'snake', '🦎': 'lizard', '🦖': 't-rex', '🦕': 'long-necked dinosaur', '🐙': 'octopus', '🦑': 'squid', '🦐': 'shrimp',
  '🦀': 'crab', '🐡': 'pufferfish', '🐠': 'tropical fish', '🐟': 'fish', '🐬': 'dolphin', '🐳': 'whale', '🐋': 'blue whale', '🦈': 'shark',
}

function emojiNoun(emoji: string) {
  return EMOJI_NOUNS[emoji] ?? 'creature'
}
