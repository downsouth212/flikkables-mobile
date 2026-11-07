import { Hono } from 'hono'
import { and, asc, desc, eq } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { decorations, profiles, trophies, userItems } from '../db/schema'
import { DAILY_REWARDS, dayKey, daysBetween, levelFor, rollSpin, SPIN_SEGMENTS } from '../game-rules'
import { dailyQuest, db } from './game'

export const rewardRoutes = new Hono<HonoEnv>()
rewardRoutes.use('/rewards/*', authMiddleware)

async function me(c: { env: HonoEnv['Bindings']; get: (key: 'userId') => string }) {
  const [p] = await db(c).select().from(profiles).where(eq(profiles.user_id, c.get('userId')))
  return p
}

rewardRoutes.use('/rewards/*', async (c, next) => {
  if (c.req.method === 'GET') return next()
  const p = await me(c)
  if (!p) return c.json({ error: 'Finish setting up first.' }, 400)
  if (p.locked) return c.json({ error: 'This account is paused by the Flikkables team.' }, 403)
  return next()
})

// Shop + customizer: the catalog for one place (garden or airport) and what the player owns there.
rewardRoutes.get('/rewards/shop/:kind', async (c) => {
  const kind = c.req.param('kind')
  const d = db(c)
  const [catalog, items] = await Promise.all([
    d.select().from(decorations).where(eq(decorations.kind, kind)).orderBy(asc(decorations.stamp_cost)),
    d.select().from(userItems).where(and(eq(userItems.user_id, c.get('userId')), eq(userItems.kind, kind))).orderBy(asc(userItems.created_at)),
  ])
  return c.json({ catalog, items })
})

rewardRoutes.post('/rewards/shop/buy', async (c) => {
  const userId = c.get('userId')
  const { decoration_id } = await c.req.json<{ decoration_id?: string }>()
  const d = db(c)
  const p = (await me(c))!
  const [item] = await d.select().from(decorations).where(eq(decorations.id, decoration_id ?? ''))
  if (!item) return c.json({ error: 'That item is no longer in the shop.' }, 404)
  if (item.locked || levelFor(p.total_km) < item.level_requirement) return c.json({ error: `Level ${item.level_requirement} required` }, 400)
  const [owned] = await d.select().from(userItems).where(and(eq(userItems.user_id, userId), eq(userItems.decoration_id, item.id)))
  if (owned) return c.json({ error: 'Already owned' }, 400)
  if (p.stamps < item.stamp_cost) return c.json({ error: 'Not enough stamps!' }, 400)
  await d.update(profiles).set({ stamps: p.stamps - item.stamp_cost }).where(eq(profiles.user_id, userId))
  await d.insert(userItems).values({ user_id: userId, decoration_id: item.id, kind: item.kind })
  return c.json({ ok: true, stamps: p.stamps - item.stamp_cost })
})

rewardRoutes.post('/rewards/items/:id', async (c) => {
  const body = await c.req.json<{ placed?: boolean; x?: number; y?: number }>()
  const clamp = (v: number | undefined) => Math.max(5, Math.min(95, v ?? 50))
  const [row] = await db(c)
    .update(userItems)
    .set({ is_placed: body.placed === true, x: clamp(body.x), y: clamp(body.y) })
    .where(and(eq(userItems.id, c.req.param('id')), eq(userItems.user_id, c.get('userId'))))
    .returning()
  return c.json({ item: row ?? null })
})

rewardRoutes.delete('/rewards/items/:id', async (c) => {
  await db(c).delete(userItems).where(and(eq(userItems.id, c.req.param('id')), eq(userItems.user_id, c.get('userId'))))
  return c.json({ ok: true })
})

// StreakTracker: runs once per day when Home opens.
rewardRoutes.post('/rewards/streak', async (c) => {
  const p = (await me(c))!
  const today = dayKey()
  const base = { streak: p.streak, longest: p.longest_streak, cycle: p.streak_cycle, total_logins: p.total_logins }
  if (p.last_claim_day === today) return c.json({ ...base, reward: null })
  const diff = p.last_claim_day ? daysBetween(p.last_claim_day, today) : null
  let streak = 1
  let cycle = 1
  let bonus = 0
  let reset = diff !== null && diff > 1
  if (diff === 1) {
    streak = p.streak + 1
    cycle = (p.streak_cycle % 7) + 1
    if (streak % 30 === 0) bonus = 200
    reset = false
  }
  const stamps = (diff === 1 ? DAILY_REWARDS[cycle - 1]! : 5) + bonus
  const longest = Math.max(p.longest_streak, streak)
  await db(c)
    .update(profiles)
    .set({ streak, streak_cycle: cycle, longest_streak: longest, last_claim_day: today, total_logins: p.total_logins + 1, stamps: p.stamps + stamps })
    .where(eq(profiles.user_id, p.user_id))
  return c.json({ streak, longest, cycle, total_logins: p.total_logins + 1, reward: { stamps, bonus, reset } })
})

rewardRoutes.post('/rewards/daily-quest', async (c) => {
  const { quest } = await c.req.json<{ quest?: 'flikk' | 'return' }>()
  const p = (await me(c))!
  const dq = dailyQuest(p)
  if (quest === 'flikk' && dq.dq_flicked >= 5 && !dq.dq_flikk_claimed) dq.dq_flikk_claimed = true
  else if (quest === 'return' && dq.dq_returned >= 1 && !dq.dq_return_claimed) dq.dq_return_claimed = true
  else return c.json({ error: 'That quest is not ready yet.' }, 400)
  await db(c).update(profiles).set({ ...dq, stamps: p.stamps + 20 }).where(eq(profiles.user_id, p.user_id))
  return c.json({ ok: true, stamps: 20 })
})

rewardRoutes.post('/rewards/spin', async (c) => {
  const userId = c.get('userId')
  const p = (await me(c))!
  if (p.last_spin_day === dayKey()) return c.json({ error: 'Come Back Tomorrow!' }, 400)
  const d = db(c)
  const index = rollSpin()
  const seg = SPIN_SEGMENTS[index]!
  let stamps = 0
  let prize = ''
  if (seg.type === 'stamps') {
    stamps = seg.value
    prize = `${seg.value} stamps`
  }
  if (seg.type === 'garden') {
    const [catalog, owned] = await Promise.all([
      d.select().from(decorations).where(and(eq(decorations.kind, 'garden'), eq(decorations.locked, false))),
      d.select({ id: userItems.decoration_id }).from(userItems).where(eq(userItems.user_id, userId)),
    ])
    const ownedIds = new Set(owned.map((o) => o.id))
    const choices = catalog.filter((x) => !ownedIds.has(x.id))
    const pick = choices[Math.floor(Math.random() * choices.length)]
    if (pick) {
      await d.insert(userItems).values({ user_id: userId, decoration_id: pick.id, kind: 'garden' })
      prize = `${pick.emoji} ${pick.name}`
    } else {
      stamps = 10
      prize = '10 stamps (no new decorations)'
    }
  }
  // Flikkstar templates arrive with the admin tools; until then the web's fallback applies.
  if (seg.type === 'flikkstar') {
    stamps = 50
    prize = '50 stamps (all unlocked)'
  }
  await d.update(profiles).set({ stamps: p.stamps + stamps, last_spin_day: dayKey(), last_spin_prize: prize }).where(eq(profiles.user_id, userId))
  return c.json({ index, prize, stamps })
})

rewardRoutes.get('/rewards/trophies', async (c) => {
  const rows = await db(c).select().from(trophies).where(eq(trophies.user_id, c.get('userId'))).orderBy(desc(trophies.created_at))
  return c.json({ trophies: rows })
})

rewardRoutes.post('/rewards/trophies/:id/exchange', async (c) => {
  const p = (await me(c))!
  const [row] = await db(c)
    .update(trophies)
    .set({ exchanged: true })
    .where(and(eq(trophies.id, c.req.param('id')), eq(trophies.user_id, p.user_id), eq(trophies.exchanged, false)))
    .returning()
  if (!row) return c.json({ error: 'That trophy was already exchanged.' }, 400)
  await db(c).update(profiles).set({ stamps: p.stamps + 10 }).where(eq(profiles.user_id, p.user_id))
  return c.json({ ok: true, stamps: 10 })
})

