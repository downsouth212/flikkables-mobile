import { Hono, type Context } from 'hono'
import { and, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { flikkables, profiles, tradeOffers, type FlikkableRow, type TradeOfferRow } from '../db/schema'
import { progressQuest } from '../game-rules'
import { notify } from './notifications'
import { blockedIdsFor } from './friends'
import { db, saveTrophies } from './game'

type Ctx = Context<HonoEnv>

export const tradeRoutes = new Hono<HonoEnv>()
tradeRoutes.use('/game/trades', authMiddleware)
tradeRoutes.use('/game/trades/*', authMiddleware)

function summary(f: FlikkableRow) {
  return { id: f.id, name: f.name, emoji: f.emoji, rarity: f.rarity, total_km: f.total_km, cities: f.places.length }
}

/** Ids of every Flikkable tied up in a pending offer. */
async function lockedIds(c: Ctx) {
  const rows = await db(c)
    .select({ offered_id: tradeOffers.offered_id, requested_id: tradeOffers.requested_id })
    .from(tradeOffers)
    .where(eq(tradeOffers.status, 'pending'))
  const ids = new Set<string>()
  for (const r of rows) {
    ids.add(r.offered_id)
    if (r.requested_id) ids.add(r.requested_id)
  }
  return ids
}

async function availableFor(c: Ctx, ownerId: string) {
  const [rows, locked] = await Promise.all([
    db(c).select().from(flikkables).where(and(eq(flikkables.owner_id, ownerId), eq(flikkables.status, 'home'))),
    lockedIds(c),
  ])
  return rows.filter((f) => !locked.has(f.id))
}

async function nameOf(c: Ctx, userId: string) {
  const [p] = await db(c).select({ display_name: profiles.display_name }).from(profiles).where(eq(profiles.user_id, userId))
  return p?.display_name ?? null
}

function wantedLabel(offer: TradeOfferRow, requested: FlikkableRow | undefined, unit: 'stamps' | 'Stamps') {
  if (offer.stamp_amount !== null) return `${offer.stamp_amount} ${unit}`
  return requested?.name ?? 'a Flikkable'
}

/** garden_ids with `remove` taken out and `add` appended. */
function gardenSwap(remove: string | null, add: string | null): SQL {
  let expr: SQL = sql`${profiles.garden_ids}`
  if (remove) expr = sql`coalesce((select jsonb_agg(x) from jsonb_array_elements(${expr}) x where x <> to_jsonb(${remove}::text)), '[]'::jsonb)`
  if (add) expr = sql`(${expr}) || jsonb_build_array(${add}::text)`
  return expr
}

tradeRoutes.get('/game/trades', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const offers = await d
    .select()
    .from(tradeOffers)
    .where(and(eq(tradeOffers.status, 'pending'), or(eq(tradeOffers.from_user_id, userId), eq(tradeOffers.to_user_id, userId))))
    .orderBy(desc(tradeOffers.created_at))
  const fIds = [...new Set(offers.flatMap((o) => (o.requested_id ? [o.offered_id, o.requested_id] : [o.offered_id])))]
  const uIds = [...new Set(offers.flatMap((o) => [o.from_user_id, o.to_user_id]))]
  const [fRows, pRows] = await Promise.all([
    fIds.length ? d.select().from(flikkables).where(inArray(flikkables.id, fIds)) : Promise.resolve([]),
    uIds.length
      ? d.select({ user_id: profiles.user_id, display_name: profiles.display_name }).from(profiles).where(inArray(profiles.user_id, uIds))
      : Promise.resolve([]),
  ])
  const fById = new Map(fRows.map((f) => [f.id, f]))
  const pById = new Map(pRows.map((p) => [p.user_id, p]))
  const person = (id: string) => ({ user_id: id, display_name: pById.get(id)?.display_name ?? 'Player' })
  const shaped = offers
    .filter((o) => fById.has(o.offered_id) && (!o.requested_id || fById.has(o.requested_id)))
    .map((o) => {
      const offered = fById.get(o.offered_id)
      const requested = o.requested_id ? fById.get(o.requested_id) : undefined
      return {
        id: o.id,
        created_at: o.created_at,
        stamp_amount: o.stamp_amount,
        from: person(o.from_user_id),
        to: person(o.to_user_id),
        offered: offered ? summary(offered) : null,
        requested: requested ? summary(requested) : null,
        to_user_id: o.to_user_id,
      }
    })
  return c.json({
    incoming: shaped.filter((o) => o.to_user_id === userId).map(({ to_user_id: _, ...o }) => o),
    outgoing: shaped.filter((o) => o.to_user_id !== userId).map(({ to_user_id: _, ...o }) => o),
  })
})

tradeRoutes.get('/game/trades/options', async (c) => {
  const userId = c.get('userId')
  const other = c.req.query('user_id')
  const mine = await availableFor(c, userId)
  if (!other || other === userId) return c.json({ mine: mine.map(summary), theirs: [] })
  const blocked = await blockedIdsFor(c, userId)
  if (blocked.includes(other)) return c.json({ mine: mine.map(summary), theirs: [] })
  const theirs = await availableFor(c, other)
  return c.json({ mine: mine.map(summary), theirs: theirs.map(summary) })
})

tradeRoutes.post('/game/trades', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const body = await c.req.json<{ offered_id?: string; requested_id?: string; to_user_id?: string; stamp_amount?: number }>()
  if (!body.offered_id) return c.json({ error: 'Pick one of your Flikkables to offer.' }, 400)
  const stampTrade = !body.requested_id
  if (stampTrade && (!body.to_user_id || body.stamp_amount === undefined)) {
    return c.json({ error: 'Pick a player and a number of stamps.' }, 400)
  }
  if (stampTrade && (!Number.isInteger(body.stamp_amount) || (body.stamp_amount ?? 0) < 1 || (body.stamp_amount ?? 0) > 10000)) {
    return c.json({ error: 'Stamps must be a whole number from 1 to 10000.' }, 400)
  }

  const locked = await lockedIds(c)
  const [offered] = await d.select().from(flikkables).where(eq(flikkables.id, body.offered_id))
  if (!offered || offered.owner_id !== userId || offered.status !== 'home' || locked.has(offered.id)) {
    return c.json({ error: 'That Flikkable isn’t available to trade.' }, 400)
  }

  let requested: FlikkableRow | undefined
  if (!stampTrade && body.requested_id) {
    ;[requested] = await d.select().from(flikkables).where(eq(flikkables.id, body.requested_id))
    if (!requested || requested.owner_id === userId || requested.status !== 'home' || locked.has(requested.id)) {
      return c.json({ error: 'Their Flikkable isn’t available to trade.' }, 400)
    }
  }
  const toUserId = requested ? requested.owner_id : (body.to_user_id ?? '')
  if (toUserId === userId) return c.json({ error: 'You can’t trade with yourself.' }, 400)
  const [recipient] = await d.select({ user_id: profiles.user_id }).from(profiles).where(eq(profiles.user_id, toUserId))
  if (!recipient) return c.json({ error: 'That player doesn’t exist.' }, 404)
  const blocked = await blockedIdsFor(c, userId)
  if (blocked.includes(toUserId)) return c.json({ error: "You can't trade with this player." }, 403)

  const [offer] = await d
    .insert(tradeOffers)
    .values({
      from_user_id: userId,
      to_user_id: toUserId,
      offered_id: offered.id,
      requested_id: requested?.id ?? null,
      stamp_amount: stampTrade ? (body.stamp_amount ?? null) : null,
    })
    .returning()
  if (!offer) throw new Error('insert failed')

  const me = (await nameOf(c, userId)) ?? 'A player'
  await notify(c, [
    {
      user_id: toUserId,
      type: 'trade_received',
      title: `${me} sent a trade offer!`,
      message: `${me} wants to trade ${offered.name} for ${wantedLabel(offer, requested, 'stamps')}.`,
      related_user_id: userId,
      related_user_name: me,
    },
  ])
  return c.json({ ok: true })
})

tradeRoutes.post('/game/trades/:id/accept', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [offer] = await d.select().from(tradeOffers).where(eq(tradeOffers.id, c.req.param('id')))
  if (!offer || offer.to_user_id !== userId) return c.json({ error: 'That trade offer is gone.' }, 404)
  if (offer.status !== 'pending') return c.json({ error: 'This offer is no longer available.' }, 409)

  const ids = offer.requested_id ? [offer.offered_id, offer.requested_id] : [offer.offered_id]
  const rows = await d.select().from(flikkables).where(inArray(flikkables.id, ids))
  const offered = rows.find((f) => f.id === offer.offered_id)
  const requested = offer.requested_id ? rows.find((f) => f.id === offer.requested_id) : undefined
  const offeredOk = offered && offered.owner_id === offer.from_user_id && offered.status === 'home'
  const requestedOk = !offer.requested_id || (requested && requested.owner_id === userId && requested.status === 'home')
  if (!offered || !offeredOk || !requestedOk) {
    await d.update(tradeOffers).set({ status: 'cancelled', responded_at: new Date() }).where(eq(tradeOffers.id, offer.id))
    return c.json({ error: 'This trade is no longer possible.' }, 409)
  }

  const [[mine], [theirs]] = await Promise.all([
    d.select().from(profiles).where(eq(profiles.user_id, userId)),
    d.select().from(profiles).where(eq(profiles.user_id, offer.from_user_id)),
  ])
  if (!mine || !theirs) return c.json({ error: 'This trade is no longer possible.' }, 409)
  const stamps = offer.stamp_amount ?? 0
  if (stamps > 0 && mine.stamps < stamps) {
    return c.json({ error: `You need ${stamps} stamps but only have ${mine.stamps}.` }, 400)
  }

  const [claimed] = await d
    .update(tradeOffers)
    .set({ status: 'accepted', responded_at: new Date() })
    .where(and(eq(tradeOffers.id, offer.id), eq(tradeOffers.status, 'pending')))
    .returning()
  if (!claimed) return c.json({ error: 'This offer is no longer available.' }, 409)

  const requestedId = requested?.id ?? null
  await d.batch([
    d.update(flikkables).set({ owner_id: userId, owner_name: mine.display_name }).where(eq(flikkables.id, offered.id)),
    ...(requested
      ? [d.update(flikkables).set({ owner_id: theirs.user_id, owner_name: theirs.display_name }).where(eq(flikkables.id, requested.id))]
      : []),
    d
      .update(profiles)
      .set({ garden_ids: gardenSwap(requestedId, offered.id), ...(stamps > 0 ? { stamps: sql`${profiles.stamps} - ${stamps}` } : {}) })
      .where(eq(profiles.user_id, userId)),
    d
      .update(profiles)
      .set({ garden_ids: gardenSwap(offered.id, requestedId), ...(stamps > 0 ? { stamps: sql`${profiles.stamps} + ${stamps}` } : {}) })
      .where(eq(profiles.user_id, theirs.user_id)),
  ])

  for (const p of [mine, theirs]) {
    const q = progressQuest(p.quests, 'trade_master', { add: 1 })
    await d.update(profiles).set({ quests: q.state }).where(eq(profiles.user_id, p.user_id))
    await saveTrophies(c, p.user_id, [q.trophy])
  }

  await notify(c, [
    {
      user_id: theirs.user_id,
      type: 'trade_accepted',
      title: `${mine.display_name} accepted the trade!`,
      message: `${offered.name} is on its way in exchange for ${wantedLabel(offer, requested, 'Stamps')}.`,
      related_user_id: userId,
      related_user_name: mine.display_name,
    },
  ])
  return c.json({ ok: true })
})

tradeRoutes.post('/game/trades/:id/decline', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [offer] = await d.select().from(tradeOffers).where(eq(tradeOffers.id, c.req.param('id')))
  if (!offer || offer.to_user_id !== userId) return c.json({ error: 'That trade offer is gone.' }, 404)
  const [updated] = await d
    .update(tradeOffers)
    .set({ status: 'declined', responded_at: new Date() })
    .where(and(eq(tradeOffers.id, offer.id), eq(tradeOffers.status, 'pending')))
    .returning()
  if (!updated) return c.json({ error: 'This offer is no longer available.' }, 409)
  const [requested] = offer.requested_id ? await d.select().from(flikkables).where(eq(flikkables.id, offer.requested_id)) : []
  const me = (await nameOf(c, userId)) ?? 'A player'
  await notify(c, [
    {
      user_id: offer.from_user_id,
      type: 'trade_declined',
      title: `${me} declined the trade`,
      message: `The trade offer for ${wantedLabel(offer, requested, 'Stamps')} was declined.`,
      related_user_id: userId,
      related_user_name: me,
    },
  ])
  return c.json({ ok: true })
})

tradeRoutes.post('/game/trades/:id/cancel', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [offer] = await d.select().from(tradeOffers).where(eq(tradeOffers.id, c.req.param('id')))
  if (!offer || offer.from_user_id !== userId) return c.json({ error: 'That trade offer is gone.' }, 404)
  const [updated] = await d
    .update(tradeOffers)
    .set({ status: 'cancelled', responded_at: new Date() })
    .where(and(eq(tradeOffers.id, offer.id), eq(tradeOffers.status, 'pending')))
    .returning()
  if (!updated) return c.json({ error: 'This offer is no longer available.' }, 409)
  return c.json({ ok: true })
})
