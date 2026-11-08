import { Hono, type Context } from 'hono'
import { and, eq, ilike, inArray, notInArray, or } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { blockedUsers, friendships, profiles } from '../db/schema'
import { notify } from './notifications'
import { db } from './game'

type Ctx = Context<HonoEnv>

export const friendRoutes = new Hono<HonoEnv>()
friendRoutes.use('/game/friends', authMiddleware)
friendRoutes.use('/game/friends/*', authMiddleware)
friendRoutes.use('/game/blocks', authMiddleware)
friendRoutes.use('/game/blocks/*', authMiddleware)

function between(a: string, b: string) {
  return or(
    and(eq(friendships.requester_id, a), eq(friendships.addressee_id, b)),
    and(eq(friendships.requester_id, b), eq(friendships.addressee_id, a)),
  )
}

function blockedBetween(a: string, b: string) {
  return or(
    and(eq(blockedUsers.blocker_id, a), eq(blockedUsers.blocked_id, b)),
    and(eq(blockedUsers.blocker_id, b), eq(blockedUsers.blocked_id, a)),
  )
}

/** Everyone blocked by me or who blocked me. */
export async function blockedIdsFor(c: Ctx, userId: string) {
  const rows = await db(c)
    .select({ blocker_id: blockedUsers.blocker_id, blocked_id: blockedUsers.blocked_id })
    .from(blockedUsers)
    .where(or(eq(blockedUsers.blocker_id, userId), eq(blockedUsers.blocked_id, userId)))
  return rows.map((r) => (r.blocker_id === userId ? r.blocked_id : r.blocker_id))
}

async function myName(c: Ctx, userId: string) {
  const [p] = await db(c).select({ display_name: profiles.display_name }).from(profiles).where(eq(profiles.user_id, userId))
  return p?.display_name ?? null
}

friendRoutes.get('/game/friends', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const rels = await d
    .select()
    .from(friendships)
    .where(or(eq(friendships.requester_id, userId), eq(friendships.addressee_id, userId)))
  const blocks = await d.select().from(blockedUsers).where(eq(blockedUsers.blocker_id, userId))
  const [me] = await d.select({ allow: profiles.allow_friend_requests }).from(profiles).where(eq(profiles.user_id, userId))

  const otherIds = [
    ...rels.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)),
    ...blocks.map((b) => b.blocked_id),
  ]
  const people = otherIds.length
    ? await d
        .select({ user_id: profiles.user_id, display_name: profiles.display_name, home_name: profiles.home_name })
        .from(profiles)
        .where(inArray(profiles.user_id, otherIds))
    : []
  const byId = new Map(people.map((p) => [p.user_id, p]))
  const row = (id: string, otherId: string, created_at: Date) => {
    const p = byId.get(otherId)
    return { id, user_id: otherId, display_name: p?.display_name ?? 'Player', home_name: p?.home_name ?? '', created_at }
  }

  const friends = rels
    .filter((r) => r.status === 'accepted')
    .map((r) => row(r.id, r.requester_id === userId ? r.addressee_id : r.requester_id, r.created_at))
  const incoming = rels
    .filter((r) => r.status === 'pending' && r.addressee_id === userId)
    .map((r) => row(r.id, r.requester_id, r.created_at))
  const sent = rels
    .filter((r) => r.status === 'pending' && r.requester_id === userId)
    .map((r) => row(r.id, r.addressee_id, r.created_at))
  const blocked = blocks.map((b) => row(b.id, b.blocked_id, b.created_at))

  return c.json({ friends, incoming, sent, blocked, allow_friend_requests: me?.allow ?? true })
})

friendRoutes.get('/game/friends/search', async (c) => {
  const userId = c.get('userId')
  const q = (c.req.query('q') ?? '').trim().replace(/[%_]/g, '')
  if (q.length < 2) return c.json({ players: [] })
  const d = db(c)
  const rels = await d
    .select({ requester_id: friendships.requester_id, addressee_id: friendships.addressee_id })
    .from(friendships)
    .where(or(eq(friendships.requester_id, userId), eq(friendships.addressee_id, userId)))
  const excluded = [
    userId,
    ...rels.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id)),
    ...(await blockedIdsFor(c, userId)),
  ]
  const players = await d
    .select({ user_id: profiles.user_id, display_name: profiles.display_name, home_name: profiles.home_name })
    .from(profiles)
    .where(
      and(
        ilike(profiles.display_name, `%${q}%`),
        notInArray(profiles.user_id, excluded),
        eq(profiles.allow_friend_requests, true),
      ),
    )
    .limit(10)
  return c.json({ players })
})

friendRoutes.post('/game/friends/request', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ user_id?: string }>().catch(() => ({}) as { user_id?: string })
  const otherId = typeof body.user_id === 'string' ? body.user_id : ''
  if (!otherId) return c.json({ error: 'Choose a player to add.' }, 400)
  if (otherId === userId) return c.json({ error: 'You can’t add yourself as a friend.' }, 400)
  const d = db(c)
  const [other] = await d
    .select({ user_id: profiles.user_id, allow: profiles.allow_friend_requests })
    .from(profiles)
    .where(eq(profiles.user_id, otherId))
  if (!other) return c.json({ error: 'That player couldn’t be found.' }, 404)
  const [block] = await d.select({ id: blockedUsers.id }).from(blockedUsers).where(blockedBetween(userId, otherId))
  if (block) return c.json({ error: "You can't send this request." }, 403)
  const name = await myName(c, userId)
  if (!name) return c.json({ error: 'Finish setting up first.' }, 400)

  const [existing] = await d.select().from(friendships).where(between(userId, otherId))
  if (existing && existing.status === 'pending' && existing.requester_id === otherId) {
    await d.update(friendships).set({ status: 'accepted', responded_at: new Date() }).where(eq(friendships.id, existing.id))
    await notify(c, [
      {
        user_id: otherId,
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        message: `${name} accepted your friend request`,
        related_user_id: userId,
        related_user_name: name,
      },
    ])
    return c.json({ ok: true, status: 'accepted' })
  }
  if (!other.allow) return c.json({ error: "This player isn't accepting friend requests." }, 403)
  if (existing) return c.json({ error: 'You’re already connected with this player.' }, 409)

  const inserted = await d
    .insert(friendships)
    .values({ requester_id: userId, addressee_id: otherId })
    .onConflictDoNothing()
    .returning({ id: friendships.id })
  if (!inserted.length) return c.json({ error: 'You’re already connected with this player.' }, 409)
  await notify(c, [
    {
      user_id: otherId,
      type: 'friend_request_sent',
      title: 'Friend Request',
      message: `${name} sent you a friend request`,
      related_user_id: userId,
      related_user_name: name,
    },
  ])
  return c.json({ ok: true, status: 'pending' })
})

friendRoutes.post('/game/friends/settings', async (c) => {
  const body = await c.req.json<{ allow_friend_requests?: unknown }>().catch(() => ({}) as { allow_friend_requests?: unknown })
  if (typeof body.allow_friend_requests !== 'boolean') return c.json({ error: 'Choose on or off for friend requests.' }, 400)
  await db(c)
    .update(profiles)
    .set({ allow_friend_requests: body.allow_friend_requests })
    .where(eq(profiles.user_id, c.get('userId')))
  return c.json({ ok: true })
})

friendRoutes.post('/game/friends/:id/accept', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [row] = await d.select().from(friendships).where(eq(friendships.id, c.req.param('id')))
  if (!row || row.addressee_id !== userId || row.status !== 'pending') {
    return c.json({ error: 'That friend request is no longer waiting.' }, 404)
  }
  await d.update(friendships).set({ status: 'accepted', responded_at: new Date() }).where(eq(friendships.id, row.id))
  const name = (await myName(c, userId)) ?? 'A player'
  await notify(c, [
    {
      user_id: row.requester_id,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted',
      message: `${name} accepted your friend request`,
      related_user_id: userId,
      related_user_name: name,
    },
  ])
  return c.json({ ok: true })
})

friendRoutes.delete('/game/friends/:id', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [row] = await d.select().from(friendships).where(eq(friendships.id, c.req.param('id')))
  if (!row || (row.requester_id !== userId && row.addressee_id !== userId)) {
    return c.json({ error: 'That friend couldn’t be found.' }, 404)
  }
  await d.delete(friendships).where(eq(friendships.id, row.id))
  return c.json({ ok: true })
})

friendRoutes.post('/game/blocks', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ user_id?: string }>().catch(() => ({}) as { user_id?: string })
  const otherId = typeof body.user_id === 'string' ? body.user_id : ''
  if (!otherId) return c.json({ error: 'Choose a player to block.' }, 400)
  if (otherId === userId) return c.json({ error: 'You can’t block yourself.' }, 400)
  const d = db(c)
  await d.insert(blockedUsers).values({ blocker_id: userId, blocked_id: otherId }).onConflictDoNothing()
  await d.delete(friendships).where(between(userId, otherId))
  return c.json({ ok: true })
})

friendRoutes.delete('/game/blocks/:user_id', async (c) => {
  await db(c)
    .delete(blockedUsers)
    .where(and(eq(blockedUsers.blocker_id, c.get('userId')), eq(blockedUsers.blocked_id, c.req.param('user_id'))))
  return c.json({ ok: true })
})
