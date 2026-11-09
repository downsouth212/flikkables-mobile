import { Hono } from 'hono'
import { and, eq, sql } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { flikkables, gardenPlants, profiles } from '../db/schema'
import { CITIES } from '../game-cities'
import { KV } from '../platform/kv'
import { newlyAi } from '../platform/ai'
import { db, serialize } from './game'

export const placeRoutes = new Hono<HonoEnv>()
placeRoutes.use('/game/owners/*', authMiddleware)
placeRoutes.use('/game/city', authMiddleware)
placeRoutes.use('/game/garden/*', authMiddleware)
placeRoutes.use('/game/flikkables/:id/pet', authMiddleware)

// The country part of the home place picked at sign-up, e.g. "Manila, Philippines" → "Philippines".
function countryOf(place: string) {
  const parts = place.split(',').map((p) => p.trim()).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1]! : null
}

placeRoutes.get('/game/owners/:id', async (c) => {
  const id = c.req.param('id')
  const d = db(c)
  const [owner] = await d
    .select({ user_id: profiles.user_id, display_name: profiles.display_name, home_name: profiles.home_name, created_at: profiles.created_at })
    .from(profiles)
    .where(eq(profiles.user_id, id))
  const [any] = owner ? [] : await d.select({ owner_name: flikkables.owner_name }).from(flikkables).where(eq(flikkables.owner_id, id)).limit(1)
  if (!owner && !any) return c.json({ error: 'That player is gone.' }, 404)
  const totals = await d
    .select({ owner_id: flikkables.owner_id, km: sql<number>`coalesce(sum(${flikkables.total_km}), 0)::float8`, n: sql<number>`count(*)::int` })
    .from(flikkables)
    .groupBy(flikkables.owner_id)
  const ranked = totals.filter((t) => Math.round(t.km) > 0).sort((a, b) => b.km - a.km)
  const mine = totals.find((t) => t.owner_id === id)
  const rank = ranked.findIndex((t) => t.owner_id === id)
  return c.json({
    owner: {
      user_id: id,
      display_name: owner?.display_name ?? any?.owner_name ?? 'Flikkables',
      country: owner ? countryOf(owner.home_name) : null,
      home_name: owner?.home_name ?? 'Worldwide',
      joined_at: owner?.created_at ?? null,
      flikkables: mine?.n ?? 0,
      total_km: Math.round(mine?.km ?? 0),
      rank: rank >= 0 ? rank + 1 : null,
      players: ranked.length,
    },
  })
})

interface CityInfo {
  place: string
  population: number | null
  attractions: string[]
}

placeRoutes.get('/game/city', async (c) => {
  const place = (c.req.query('place') ?? '').trim().slice(0, 120)
  if (!place) return c.json({ error: 'Which city?' }, 400)
  const kv = new KV(db(c))
  const key = `city:v1:${place.toLowerCase()}`
  const cached = await kv.get<CityInfo>(key)
  if (cached) return c.json({ city: cached })

  const cityName = place.split(',')[0]!.trim().toLowerCase()
  const known = CITIES.find((x) => x.name.toLowerCase() === cityName)
  let population = known?.population ?? null
  let attractions: string[] = []
  try {
    let text = ''
    const stream = newlyAi(c.env, 'city-info').streamText(
      {
        prompt: `For the place "${place}", give the top 5 tourist attractions people rate highest in Google reviews, and the city's approximate population. Reply with JSON only, no prose: {"attractions": ["name", ...], "population": number}`,
        maxTokens: 300,
      },
      `flikkables-city-${place.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100)}`,
    )
    for await (const part of stream) text += part
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    const parsed = JSON.parse(json) as { attractions?: unknown; population?: unknown }
    if (Array.isArray(parsed.attractions)) {
      attractions = parsed.attractions.filter((a): a is string => typeof a === 'string').map((a) => a.slice(0, 80)).slice(0, 5)
    }
    if (population === null && typeof parsed.population === 'number' && parsed.population > 0) population = Math.round(parsed.population)
  } catch {
    // Show what we know; the attractions are tried again next time.
    return c.json({ city: { place, population, attractions: [] } })
  }
  const info: CityInfo = { place, population, attractions }
  if (attractions.length > 0) await kv.set(key, info)
  return c.json({ city: info })
})

// ---------- Garden beds ----------

export const GARDEN_BEDS = 6
const GROW_HOURS = 24
const PICK_STAMPS = 3
const FLOWERS = ['🌷', '🌻', '🌹', '🌼', '🪻', '🌺']

function plantView(p: { bed: number; flower: string; planted_at: Date }) {
  const ready = new Date(p.planted_at.getTime() + GROW_HOURS * 3600_000)
  return { bed: p.bed, flower: p.flower, planted_at: p.planted_at.toISOString(), ready_at: ready.toISOString() }
}

placeRoutes.get('/game/garden/plants', async (c) => {
  const rows = await db(c).select().from(gardenPlants).where(eq(gardenPlants.user_id, c.get('userId')))
  return c.json({ plants: rows.map(plantView), beds: GARDEN_BEDS, grow_hours: GROW_HOURS, pick_stamps: PICK_STAMPS })
})

placeRoutes.post('/game/garden/plants', async (c) => {
  const body = await c.req.json<{ bed?: number }>()
  const bed = Math.round(body.bed ?? -1)
  if (bed < 0 || bed >= GARDEN_BEDS) return c.json({ error: 'Pick an empty flower bed.' }, 400)
  const flower = FLOWERS[Math.floor(Math.random() * FLOWERS.length)]!
  const [row] = await db(c)
    .insert(gardenPlants)
    .values({ user_id: c.get('userId'), bed, flower })
    .onConflictDoNothing()
    .returning()
  if (!row) return c.json({ error: 'Something is already growing there.' }, 409)
  return c.json({ plant: plantView(row) })
})

placeRoutes.post('/game/garden/plants/:bed/pick', async (c) => {
  const userId = c.get('userId')
  const bed = Number(c.req.param('bed'))
  const d = db(c)
  const [row] = await d.select().from(gardenPlants).where(and(eq(gardenPlants.user_id, userId), eq(gardenPlants.bed, bed)))
  if (!row) return c.json({ error: 'Nothing is growing there.' }, 404)
  if (Date.now() < row.planted_at.getTime() + GROW_HOURS * 3600_000) return c.json({ error: 'Still growing. Come back when it blooms.' }, 400)
  const [gone] = await d.delete(gardenPlants).where(eq(gardenPlants.id, row.id)).returning()
  if (!gone) return c.json({ error: 'Already picked.' }, 409)
  const [p] = await d
    .update(profiles)
    .set({ stamps: sql`${profiles.stamps} + ${PICK_STAMPS}` })
    .where(eq(profiles.user_id, userId))
    .returning({ stamps: profiles.stamps })
  return c.json({ stamps_awarded: PICK_STAMPS, stamps: p?.stamps ?? null, flower: row.flower })
})

// A pet cheers a Flikkable up by one heart, at most once an hour each.
placeRoutes.post('/game/flikkables/:id/pet', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const d = db(c)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, id))
  if (!f || f.owner_id !== userId) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const kv = new KV(d)
  const key = `pet:${id}`
  if (await kv.get<boolean>(key)) return c.json({ flikkable: serialize(f), boosted: false })
  await kv.set(key, true, { ttlSeconds: 3600 })
  const [updated] = await d.update(flikkables).set({ happiness: Math.min(f.happiness + 1, 5) }).where(eq(flikkables.id, id)).returning()
  return c.json({ flikkable: serialize(updated ?? f), boosted: true })
})
