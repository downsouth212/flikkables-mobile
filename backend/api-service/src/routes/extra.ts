import { Hono, type Context } from 'hono'
import { and, desc, eq, ne, or } from 'drizzle-orm'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { admins, characterTemplates, flikkables, postcards, profiles, templateUnlocks, type CharacterTemplateRow, type PostcardRow } from '../db/schema'
import { adminRole } from '../game-admin'
import { aiMedia, newlyAi, NewlyAiError } from '../platform/ai'
import { NewlyEmailError, sendEmail } from '../platform/email'
import { db } from './game'

const AUTH_URL = 'https://auth-607304eb-c9a0-43e5-81da-53dd783f24f7-dev.api.newlyapp.com'
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export const extraRoutes = new Hono<HonoEnv>()
extraRoutes.use('/game/*', authMiddleware)
extraRoutes.use('/admin/*', authMiddleware)

type Ctx = Context<HonoEnv>

async function requireAdmin(c: Ctx) {
  return (await adminRole(c)) !== null
}

function settle(status: string) {
  return status === 'cancelled' ? 'failed' : status
}

async function refreshPostcards(c: Ctx, rows: PostcardRow[]) {
  const d = db(c)
  return Promise.all(
    rows.map(async (row) => {
      if (row.status === 'succeeded' || row.status === 'failed') return row
      try {
        const job = await newlyAi(c.env, row.user_id).get(row.job_id)
        const error = job.error === 'safety_flagged' ? 'This photo couldn’t be turned into a postcard.' : job.error
        const [updated] = await d.update(postcards).set({ status: settle(job.status), error }).where(eq(postcards.id, row.id)).returning()
        return updated ?? row
      } catch {
        return row
      }
    }),
  )
}

// A busy AI service is retried on the next refresh; anything else is a real failure.
function retryable(err: unknown) {
  return !(err instanceof NewlyAiError) || err.status === 429 || err.status === 409 || err.status >= 500
}

async function startTemplateJob(c: Ctx, row: CharacterTemplateRow) {
  const d = db(c)
  try {
    const job = await newlyAi(c.env, 'templates').generate(
      { model: 'image', prompt: row.prompt, width: 1024, height: 1024 },
      `tpl-${row.id}`,
    )
    const [updated] = await d
      .update(characterTemplates)
      .set({ job_id: job.id, status: settle(job.status), error: null })
      .where(eq(characterTemplates.id, row.id))
      .returning()
    return updated ?? row
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 200) : 'Image generation failed.'
    const [updated] = await d
      .update(characterTemplates)
      .set(retryable(err) ? { error: null } : { status: 'failed', error: message })
      .where(eq(characterTemplates.id, row.id))
      .returning()
    return updated ?? row
  }
}

async function refreshTemplates(c: Ctx, rows: CharacterTemplateRow[]) {
  const d = db(c)
  const out: CharacterTemplateRow[] = []
  // One at a time, so queued images start as the AI service frees up.
  for (const row of rows) {
    if (row.status === 'succeeded' || row.status === 'failed') {
      out.push(row)
      continue
    }
    if (!row.job_id) {
      out.push(await startTemplateJob(c, row))
      continue
    }
    try {
      const job = await newlyAi(c.env, 'templates').get(row.job_id)
      const [updated] = await d
        .update(characterTemplates)
        .set({ status: settle(job.status), error: job.error })
        .where(eq(characterTemplates.id, row.id))
        .returning()
      out.push(updated ?? row)
    } catch {
      out.push(row)
    }
  }
  return out
}

// ---------- Postcards ----------

extraRoutes.post('/game/postcards', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const form = await c.req.formData()
  const photo = form.get('photo')
  const flikkableID = String(form.get('flikkable_id') ?? '')
  const location = String(form.get('location_name') ?? '').trim().slice(0, 80) || 'Somewhere'
  if (!(photo instanceof File)) return c.json({ error: 'Take a photo first.' }, 400)
  const [f] = await d.select().from(flikkables).where(eq(flikkables.id, flikkableID))
  if (!f) return c.json({ error: 'That Flikkable is gone.' }, 404)
  const [me] = await d.select().from(profiles).where(eq(profiles.user_id, userId))
  const prompt = `Transform every person's face in this photo into a Disney/Pixar 3D animated CGI style, with big expressive eyes and soft smooth skin. Keep all hair, clothing, bodies and the background exactly as they are, photorealistic. Add a travel postcard decorative border on the left. Stamp "${location}" at the bottom. Add a small "${f.emoji}" sticker in the top corner.`
  try {
    const ref = await aiMedia(photo)
    const job = await newlyAi(c.env, userId).generate(
      { model: 'image', prompt, media: [ref], width: 768, height: 1024 },
      `selfie-${f.id.slice(0, 8)}-${Date.now()}`,
    )
    const [card] = await d
      .insert(postcards)
      .values({
        flikkable_id: f.id,
        user_id: userId,
        user_name: me?.display_name ?? 'A player',
        owner_id: f.owner_id,
        character_name: f.name,
        character_emoji: f.emoji,
        place: location,
        job_id: job.id,
        status: job.status,
      })
      .returning()
    return c.json({ postcard: card })
  } catch (err) {
    if (err instanceof NewlyAiError) return c.json({ error: 'Postcards are unavailable right now. Try again in a bit.' }, 503)
    if (err instanceof Error) return c.json({ error: err.message }, 400)
    throw err
  }
})

extraRoutes.get('/game/postcards', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const rows = await d
    .select()
    .from(postcards)
    .where(or(eq(postcards.user_id, userId), and(eq(postcards.owner_id, userId), eq(postcards.sent_to_owner, true), ne(postcards.user_id, userId))))
    .orderBy(desc(postcards.created_at))
    .limit(200)
  const fresh = await refreshPostcards(c, rows)
  return c.json({
    mine: fresh.filter((p) => p.user_id === userId && p.status !== 'failed'),
    received: fresh.filter((p) => p.user_id !== userId && p.status === 'succeeded'),
  })
})

extraRoutes.get('/game/postcards/:id', async (c) => {
  const [row] = await db(c).select().from(postcards).where(eq(postcards.id, c.req.param('id')))
  if (!row) return c.json({ error: 'Postcard not found.' }, 404)
  const [fresh] = await refreshPostcards(c, [row])
  return c.json({ postcard: fresh })
})

extraRoutes.get('/game/postcards/:id/image', async (c) => {
  const [row] = await db(c).select().from(postcards).where(eq(postcards.id, c.req.param('id')))
  if (!row || row.status !== 'succeeded') return c.json({ error: 'Not ready.' }, 404)
  const res = await newlyAi(c.env, row.user_id).output(row.job_id)
  return new Response(res.body, {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/png', 'Cache-Control': 'private, max-age=86400' },
  })
})

extraRoutes.post('/game/postcards/:id/send', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [row] = await d.select().from(postcards).where(eq(postcards.id, c.req.param('id')))
  if (!row || row.user_id !== userId) return c.json({ error: 'Postcard not found.' }, 404)
  if (row.owner_id === userId) return c.json({ error: 'This one is yours already.' }, 400)
  const [updated] = await d.update(postcards).set({ sent_to_owner: true, sent_at: new Date() }).where(eq(postcards.id, row.id)).returning()
  return c.json({ postcard: updated })
})

// ---------- Templates (players) ----------

extraRoutes.get('/game/templates', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [rows, unlocks] = await Promise.all([
    d.select().from(characterTemplates).where(eq(characterTemplates.status, 'succeeded')).orderBy(desc(characterTemplates.created_at)).limit(100),
    d.select().from(templateUnlocks).where(eq(templateUnlocks.user_id, userId)),
  ])
  const unlocked = new Set(unlocks.map((u) => u.template_id))
  return c.json({
    templates: rows
      .filter((t) => t.is_published || unlocked.has(t.id))
      .map((t) => ({ ...t, unlocked: unlocked.has(t.id) })),
  })
})

extraRoutes.get('/game/templates/:id/image', async (c) => {
  const [row] = await db(c).select().from(characterTemplates).where(eq(characterTemplates.id, c.req.param('id')))
  if (!row || row.status !== 'succeeded') return c.json({ error: 'Not ready.' }, 404)
  const res = await newlyAi(c.env, 'templates').output(row.job_id)
  return new Response(res.body, {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'image/png', 'Cache-Control': 'private, max-age=604800' },
  })
})

extraRoutes.post('/game/templates/:id/unlock', async (c) => {
  const userId = c.get('userId')
  const d = db(c)
  const [t] = await d.select().from(characterTemplates).where(eq(characterTemplates.id, c.req.param('id')))
  if (!t) return c.json({ error: 'That character is gone.' }, 404)
  const [already] = await d
    .select()
    .from(templateUnlocks)
    .where(and(eq(templateUnlocks.user_id, userId), eq(templateUnlocks.template_id, t.id)))
  if (already) return c.json({ ok: true })
  const [me] = await d.select().from(profiles).where(eq(profiles.user_id, userId))
  if (!me) return c.json({ error: 'Finish setting up first.' }, 400)
  if (me.stamps < t.stamp_cost) return c.json({ error: `Not enough stamps! You need ${t.stamp_cost} but have ${me.stamps}` }, 400)
  await d.update(profiles).set({ stamps: me.stamps - t.stamp_cost }).where(eq(profiles.user_id, userId))
  await d.insert(templateUnlocks).values({ user_id: userId, template_id: t.id })
  return c.json({ ok: true })
})

// ---------- Templates (admin) ----------

extraRoutes.get('/admin/templates', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error: 'Admins only.' }, 403)
  const rows = await db(c).select().from(characterTemplates).orderBy(desc(characterTemplates.created_at)).limit(200)
  return c.json({ templates: await refreshTemplates(c, rows) })
})

extraRoutes.post('/admin/templates/generate', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error: 'Admins only.' }, 403)
  const body = await c.req.json<{ style?: string; count?: number }>()
  const style = (body.style ?? '').trim().slice(0, 300)
  const count = Math.max(1, Math.min(10, Math.round(body.count ?? 5)))
  if (!style) return c.json({ error: 'Please enter a style description' }, 400)
  const ai = newlyAi(c.env, 'templates')
  const stamp = Date.now()
  let names: string[] = []
  try {
    let text = ''
    const stream = ai.streamText(
      {
        prompt: `Generate ${count} unique, creative 1-2 word names for characters in a travel/adventure game. Style: ${style}. Make them fun and memorable. Reply with only a JSON array of strings.`,
        maxTokens: 300,
      },
      `tplnames-${stamp}`,
    )
    for await (const chunk of stream) text += chunk
    const match = text.match(/\[[\s\S]*\]/)
    names = match ? (JSON.parse(match[0]) as unknown[]).filter((n): n is string => typeof n === 'string') : []
  } catch {
    names = []
  }
  const d = db(c)
  // Save every requested character first, then start as many images as the AI service accepts now.
  const rows = await d
    .insert(characterTemplates)
    .values(
      Array.from({ length: count }, (_, i) => ({
        name: (names[i] ?? `Character ${i + 1}`).slice(0, 24),
        description: 'A Flikkable ready for adventure!',
        prompt: `Single character only, ${style}, unique design ${i + 1}, vibrant colors, white background, square format, one character centered`,
        rarity: RARITIES[Math.floor(Math.random() * RARITIES.length)]!,
        job_id: '',
        status: 'queued',
      })),
    )
    .returning()
  const created: CharacterTemplateRow[] = []
  for (const row of rows) created.push(await startTemplateJob(c, row))
  return c.json({ templates: created })
})

extraRoutes.patch('/admin/templates/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error: 'Admins only.' }, 403)
  const body = await c.req.json<{ is_published?: boolean; is_locked?: boolean; stamp_cost?: number; name?: string }>()
  const set: Partial<CharacterTemplateRow> = {}
  if (typeof body.is_published === 'boolean') set.is_published = body.is_published
  if (typeof body.is_locked === 'boolean') set.is_locked = body.is_locked
  if (typeof body.stamp_cost === 'number' && body.stamp_cost >= 0) set.stamp_cost = Math.round(Math.min(body.stamp_cost, 100000))
  if (typeof body.name === 'string' && body.name.trim()) set.name = body.name.trim().slice(0, 24)
  const [row] = await db(c).update(characterTemplates).set(set).where(eq(characterTemplates.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'Template not found.' }, 404)
  return c.json({ template: row })
})

extraRoutes.delete('/admin/templates/:id', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error: 'Admins only.' }, 403)
  const id = c.req.param('id')
  const d = db(c)
  await d.delete(templateUnlocks).where(eq(templateUnlocks.template_id, id))
  await d.delete(characterTemplates).where(eq(characterTemplates.id, id))
  return c.json({ ok: true })
})

// ---------- Users (admin) ----------

extraRoutes.post('/admin/invite', async (c) => {
  const role = await adminRole(c)
  if (!role) return c.json({ error: 'Admins only.' }, 403)
  const body = await c.req.json<{ email?: string; role?: 'user' | 'admin' }>()
  const email = (body.email ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'Please enter an email' }, 400)
  if (body.role === 'admin') {
    if (role !== 'master') return c.json({ error: 'Only the master admin can invite admins.' }, 403)
    const [player] = await db(c).select({ user_id: profiles.user_id }).from(profiles).where(eq(profiles.email, email))
    await db(c)
      .insert(admins)
      .values({ email, role: 'admin', granted_by: c.get('email') ?? c.get('userId'), user_id: player?.user_id ?? null })
      .onConflictDoNothing()
  }
  try {
    await sendEmail(c.env, {
      to: email,
      subject: 'You’re invited to play Flikkables',
      text: `You’ve been invited to play Flikkables${body.role === 'admin' ? ' as an admin' : ''}.\n\nGet the Flikkables app and sign up with this email address (${email}) to start flikking characters around the world.`,
    })
  } catch (err) {
    const reason = err instanceof NewlyEmailError ? err.message : 'The invitation email couldn’t be sent.'
    return c.json({ ok: true, emailed: false, reason })
  }
  return c.json({ ok: true, emailed: true })
})

extraRoutes.post('/admin/dummy', async (c) => {
  if (!(await requireAdmin(c))) return c.json({ error: 'Admins only.' }, 403)
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>()
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const name = (body.name ?? '').trim().slice(0, 24)
  if (!email || !password || !name) return c.json({ error: 'Please fill in all fields' }, 400)
  if (password.length < 8) return c.json({ error: 'Password needs at least 8 characters.' }, 400)
  const res = await fetch(`${AUTH_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = (await res.json().catch(() => ({}))) as { user?: { id: string }; message?: string }
  if (!res.ok || !data.user) return c.json({ error: data.message ?? 'Couldn’t create that user.' }, 400)
  return c.json({ ok: true, user_id: data.user.id })
})
