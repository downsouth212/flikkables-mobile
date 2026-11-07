import { Hono } from 'hono'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { createDb } from '../db/client'
import { admins, flikkables, gameSettings, journeys, postcards, profiles } from '../db/schema'
import { adminRole, DEFAULT_SETTINGS, loadSettings, type AdminRole, type GameSettings } from '../game-admin'
import { CITIES } from '../game-cities'
import { haversineKm, offset, rollRarity, SYSTEM_OWNER_ID } from './game'

type AdminEnv = HonoEnv & { Variables: HonoEnv['Variables'] & { role: AdminRole } }

export const adminRoutes = new Hono<AdminEnv>()
adminRoutes.use('/admin/*', authMiddleware)
adminRoutes.use('/admin/*', async (c, next) => {
  const role = await adminRole(c)
  if (!role) return c.json({ error: 'Admins only.' }, 403)
  c.set('role', role)
  return next()
})

const DROP_EMOJIS = ['🦊', '🐼', '🐸', '🦉', '🐙', '🐢', '🦄', '🐧', '🦋', '🐨', '🐳', '🦁', '🐯', '🐝', '🦖']
const DROP_NAMES = ['Scout', 'Pebble', 'Comet', 'Mochi', 'Ziggy', 'Bean', 'Nimbus', 'Waffles', 'Pippa', 'Rocket', 'Sprout', 'Tango']

function db(c: { env: HonoEnv['Bindings'] }) {
  return createDb(c.env.DATABASE_URL)
}

function nearestPlace(lat: number, lng: number) {
  let best = CITIES[0]!
  let bestKm = Infinity
  for (const city of CITIES) {
    const km = haversineKm(lat, lng, city.lat, city.lng)
    if (km < bestKm) {
      best = city
      bestKm = km
    }
  }
  return bestKm < 60 ? `${best.name}, ${best.country}` : 'Somewhere wild'
}

adminRoutes.get('/admin/overview', async (c) => {
  const d = db(c)
  const [players, adminRows, settings, counts] = await Promise.all([
    d.select().from(profiles).orderBy(desc(profiles.created_at)).limit(500),
    d.select().from(admins).orderBy(admins.created_at),
    loadSettings(c.env),
    d
      .select({ status: flikkables.status, n: sql<number>`count(*)::int` })
      .from(flikkables)
      .groupBy(flikkables.status),
  ])
  const roleByUser = new Map(adminRows.filter((a) => a.user_id).map((a) => [a.user_id!, a.role]))
  return c.json({
    me: { user_id: c.get('userId'), role: c.get('role') },
    settings,
    defaults: DEFAULT_SETTINGS,
    totals: {
      players: players.length,
      flikkables: counts.reduce((sum, r) => sum + r.n, 0),
      landed: counts.find((r) => r.status === 'landed')?.n ?? 0,
    },
    players: players.map((p) => ({ ...p, role: roleByUser.get(p.user_id) ?? null })),
    admins: adminRows.map((a) => ({ email: a.email, role: a.role, claimed: a.user_id !== null, created_at: a.created_at })),
  })
})

adminRoutes.post('/admin/settings', async (c) => {
  const body = await c.req.json<Partial<GameSettings>>()
  const limits: Record<keyof GameSettings, [number, number]> = {
    pickup_radius_m: [10, 5000],
    nearby_radius_km: [1, 500],
    max_owned: [1, 100],
  }
  const d = db(c)
  for (const key of Object.keys(limits) as (keyof GameSettings)[]) {
    const value = body[key]
    if (value === undefined) continue
    const [min, max] = limits[key]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      return c.json({ error: `${key.replaceAll('_', ' ')} must be between ${min} and ${max}.` }, 400)
    }
    await d
      .insert(gameSettings)
      .values({ key, value: Math.round(value) })
      .onConflictDoUpdate({ target: gameSettings.key, set: { value: Math.round(value), updated_at: new Date() } })
  }
  return c.json({ settings: await loadSettings(c.env) })
})

adminRoutes.post('/admin/players/:id/lock', async (c) => {
  const id = c.req.param('id')
  if (id === c.get('userId')) return c.json({ error: 'You can’t pause your own account.' }, 400)
  const body = await c.req.json<{ locked?: boolean }>()
  const [updated] = await db(c)
    .update(profiles)
    .set({ locked: body.locked === true })
    .where(eq(profiles.user_id, id))
    .returning()
  if (!updated) return c.json({ error: 'No player with that id.' }, 404)
  return c.json({ player: updated })
})

adminRoutes.post('/admin/players/:id/home', async (c) => {
  const body = await c.req.json<{ lat?: number; lng?: number; name?: string }>()
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number' || Math.abs(body.lat) > 90 || Math.abs(body.lng) > 180) {
    return c.json({ error: 'Pick a place on the map first.' }, 400)
  }
  const name = (body.name ?? '').trim().slice(0, 60) || nearestPlace(body.lat, body.lng)
  const id = c.req.param('id')
  const d = db(c)
  const [updated] = await d
    .update(profiles)
    .set({ home_lat: body.lat, home_lng: body.lng, home_name: name })
    .where(eq(profiles.user_id, id))
    .returning()
  if (!updated) return c.json({ error: 'No player with that id.' }, 404)
  await d
    .update(flikkables)
    .set({ home_lat: body.lat, home_lng: body.lng })
    .where(eq(flikkables.owner_id, id))
  await d
    .update(flikkables)
    .set({ current_lat: body.lat, current_lng: body.lng, current_place: name })
    .where(sql`${flikkables.owner_id} = ${id} and ${flikkables.status} = 'home'`)
  return c.json({ player: updated })
})

adminRoutes.delete('/admin/players/:id', async (c) => {
  const id = c.req.param('id')
  if (id === c.get('userId')) return c.json({ error: 'Use Delete my account on your own Passport instead.' }, 400)
  const d = db(c)
  const [target] = await d.select({ user_id: admins.user_id, role: admins.role }).from(admins).where(eq(admins.user_id, id))
  if (target?.role === 'master') return c.json({ error: 'The master admin can’t be reset.' }, 403)
  const owned = await d.select({ id: flikkables.id }).from(flikkables).where(eq(flikkables.owner_id, id))
  const ids = owned.map((o) => o.id)
  if (ids.length > 0) {
    await d.delete(journeys).where(inArray(journeys.flikkable_id, ids))
    await d.delete(postcards).where(inArray(postcards.flikkable_id, ids))
    await d.delete(flikkables).where(inArray(flikkables.id, ids))
  }
  await d
    .update(flikkables)
    .set({ status: 'landed', picked_up_by: null, picked_up_by_name: null, picked_up_at: null })
    .where(eq(flikkables.picked_up_by, id))
  await d.delete(profiles).where(eq(profiles.user_id, id))
  return c.json({ ok: true })
})

adminRoutes.post('/admin/admins', async (c) => {
  if (c.get('role') !== 'master') return c.json({ error: 'Only the master admin can add admins.' }, 403)
  const body = await c.req.json<{ email?: string }>()
  const email = (body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'That doesn’t look like an email.' }, 400)
  const [player] = await db(c).select({ user_id: profiles.user_id }).from(profiles).where(eq(profiles.email, email))
  await db(c)
    .insert(admins)
    .values({ email, role: 'admin', granted_by: c.get('email') ?? c.get('userId'), user_id: player?.user_id ?? null })
    .onConflictDoNothing()
  return c.json({ ok: true })
})

adminRoutes.delete('/admin/admins/:email', async (c) => {
  if (c.get('role') !== 'master') return c.json({ error: 'Only the master admin can remove admins.' }, 403)
  const email = decodeURIComponent(c.req.param('email')).toLowerCase()
  const d = db(c)
  const [row] = await d.select().from(admins).where(eq(admins.email, email))
  if (!row) return c.json({ error: 'Not an admin.' }, 404)
  if (row.role === 'master') return c.json({ error: 'The master admin can’t be removed.' }, 403)
  await d.delete(admins).where(eq(admins.email, email))
  return c.json({ ok: true })
})

adminRoutes.post('/admin/drop', async (c) => {
  const body = await c.req.json<{ lat?: number; lng?: number; count?: number; radius_m?: number; place?: string }>()
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') return c.json({ error: 'Pick where to drop them.' }, 400)
  const count = Math.max(1, Math.min(20, Math.round(body.count ?? 5)))
  const radiusM = Math.max(10, Math.min(5000, Math.round(body.radius_m ?? 500)))
  const place = (body.place ?? '').trim().slice(0, 60) || nearestPlace(body.lat, body.lng)
  const by = c.get('userId')
  const d = db(c)
  const values = Array.from({ length: count }, () => {
    const spot = offset(body.lat!, body.lng!, (Math.random() * radiusM) / 1000)
    return {
      owner_id: SYSTEM_OWNER_ID,
      owner_name: 'Flikkables',
      name: DROP_NAMES[Math.floor(Math.random() * DROP_NAMES.length)]!,
      emoji: DROP_EMOJIS[Math.floor(Math.random() * DROP_EMOJIS.length)]!,
      rarity: rollRarity(),
      status: 'landed',
      current_lat: spot.lat,
      current_lng: spot.lng,
      current_place: place,
      home_lat: spot.lat,
      home_lng: spot.lng,
      places: [place],
      last_flicked_at: new Date(),
    }
  })
  const created = await d.insert(flikkables).values(values).returning()
  await d.insert(journeys).values(
    created.map((f) => ({
      flikkable_id: f.id,
      event: 'created',
      place,
      lat: f.current_lat,
      lng: f.current_lng,
      by_user_id: by,
      by_name: 'Flikkables',
    })),
  )
  return c.json({ dropped: created.length, place })
})

adminRoutes.delete('/admin/drops', async (c) => {
  const d = db(c)
  const drops = await d.select({ id: flikkables.id }).from(flikkables).where(eq(flikkables.owner_id, SYSTEM_OWNER_ID))
  const ids = drops.map((f) => f.id)
  if (ids.length > 0) {
    await d.delete(journeys).where(inArray(journeys.flikkable_id, ids))
    await d.delete(postcards).where(inArray(postcards.flikkable_id, ids))
    await d.delete(flikkables).where(inArray(flikkables.id, ids))
  }
  return c.json({ removed: ids.length })
})
