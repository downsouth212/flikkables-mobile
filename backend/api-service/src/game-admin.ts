import { and, eq, isNull } from 'drizzle-orm'
import type { HonoEnv } from './env'
import { createDb } from './db/client'
import { admins, gameSettings } from './db/schema'

export type AdminRole = 'master' | 'admin'

export interface GameSettings {
  pickup_radius_m: number
  nearby_radius_km: number
  max_owned: number
  show_guilds: number
  show_map: number
  show_races: number
}

export const DEFAULT_SETTINGS: GameSettings = { pickup_radius_m: 50, nearby_radius_km: 25, max_owned: 12, show_guilds: 0, show_map: 0, show_races: 0 }

interface Ctx {
  env: HonoEnv['Bindings']
  get(key: 'userId'): string
  get(key: 'email'): string | undefined
}

// An admin row is keyed by email and bound to the first account that signs in
// with it; after that only that account id carries the role.
export async function adminRole(c: Ctx): Promise<AdminRole | null> {
  const d = createDb(c.env.DATABASE_URL)
  const userId = c.get('userId')
  const [bound] = await d.select().from(admins).where(eq(admins.user_id, userId))
  if (bound) return bound.role as AdminRole
  const email = c.get('email')?.trim().toLowerCase()
  if (!email) return null
  const [claimed] = await d
    .update(admins)
    .set({ user_id: userId })
    .where(and(eq(admins.email, email), isNull(admins.user_id)))
    .returning()
  return claimed ? (claimed.role as AdminRole) : null
}

export async function loadSettings(env: HonoEnv['Bindings']): Promise<GameSettings> {
  const rows = await createDb(env.DATABASE_URL).select().from(gameSettings)
  const merged: GameSettings = { ...DEFAULT_SETTINGS }
  for (const row of rows) {
    if (row.key in merged && typeof row.value === 'number') merged[row.key as keyof GameSettings] = row.value
  }
  return merged
}

export async function loadBattles(env: HonoEnv['Bindings']): Promise<Record<string, boolean>> {
  const [row] = await createDb(env.DATABASE_URL).select().from(gameSettings).where(eq(gameSettings.key, 'enabled_battles'))
  return row && typeof row.value === 'object' && row.value !== null ? (row.value as Record<string, boolean>) : {}
}
