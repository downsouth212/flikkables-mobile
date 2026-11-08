import type { AdminRole, Profile } from '@/features/game/types/game';

export interface GameSettings {
  pickup_radius_m: number;
  nearby_radius_km: number;
  max_owned: number;
  show_guilds: number;
  show_map: number;
  show_races: number;
}

export type Battles = Record<string, boolean>;

export interface AdminPlayer extends Profile {
  email: string | null;
  locked: boolean;
  role: AdminRole | null;
  last_seen_at: string | null;
}

export interface AdminEntry {
  email: string;
  role: AdminRole;
  claimed: boolean;
  created_at: string;
}

export interface AdminOverview {
  me: { user_id: string; role: AdminRole };
  settings: GameSettings;
  defaults: GameSettings;
  battles: Battles;
  totals: { players: number; flikkables: number; landed: number };
  players: AdminPlayer[];
  admins: AdminEntry[];
}

export type DropSpot = 'here' | 'city';
