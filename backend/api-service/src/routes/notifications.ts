import { Hono } from 'hono'
import { and, desc, eq, gt } from 'drizzle-orm'
import type { Context } from 'hono'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { notifications } from '../db/schema'
import { db } from './game'

const EXPIRY_MS = 30 * 86400_000

export interface NewNotification {
  user_id: string
  type: string
  title: string
  message: string
  related_user_id?: string | null
  related_user_name?: string | null
  metadata?: Record<string, unknown>
}

/** Best effort: a failed notification never fails the game action that caused it. */
export async function notify(c: Context<HonoEnv>, items: NewNotification[]) {
  if (!items.length) return
  try {
    await db(c).insert(notifications).values(items.map((n) => ({ ...n, expires_at: new Date(Date.now() + EXPIRY_MS) })))
  } catch (err) {
    console.error('notify failed', err)
  }
}

export const notificationRoutes = new Hono<HonoEnv>()
notificationRoutes.use('/game/notifications', authMiddleware)
notificationRoutes.use('/game/notifications/*', authMiddleware)

notificationRoutes.get('/game/notifications', async (c) => {
  const rows = await db(c)
    .select()
    .from(notifications)
    .where(and(eq(notifications.user_id, c.get('userId')), gt(notifications.expires_at, new Date())))
    .orderBy(desc(notifications.created_at))
    .limit(50)
  return c.json({ notifications: rows, unread: rows.filter((n) => !n.read).length })
})

notificationRoutes.post('/game/notifications/read-all', async (c) => {
  await db(c).update(notifications).set({ read: true }).where(eq(notifications.user_id, c.get('userId')))
  return c.json({ ok: true })
})

notificationRoutes.post('/game/notifications/:id/read', async (c) => {
  await db(c)
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, c.req.param('id')), eq(notifications.user_id, c.get('userId'))))
  return c.json({ ok: true })
})

notificationRoutes.delete('/game/notifications/:id', async (c) => {
  await db(c).delete(notifications).where(and(eq(notifications.id, c.req.param('id')), eq(notifications.user_id, c.get('userId'))))
  return c.json({ ok: true })
})

notificationRoutes.delete('/game/notifications', async (c) => {
  await db(c).delete(notifications).where(eq(notifications.user_id, c.get('userId')))
  return c.json({ ok: true })
})
