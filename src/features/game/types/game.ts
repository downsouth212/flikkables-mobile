export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type FlikkableStatus = 'home' | 'landed' | 'picked_up';
export type JourneyEvent = 'created' | 'flicked' | 'picked_up' | 'returned';

export interface Profile {
  user_id: string;
  display_name: string;
  home_lat: number;
  home_lng: number;
  home_name: string;
  stamps: number;
  picked_up_count: number;
  flick_count: number;
  streak: number;
  last_claim_day: string | null;
  level: number;
  /** Km travelled by every Flikkable this player owns. */
  flikkables_km?: number;
  stamps_today: number;
  stamps_week: number;
  returned_count: number;
  total_km: number;
  garden_ids: string[];
  longest_streak: number;
  total_logins: number;
  streak_cycle: number;
  last_spin_day: string | null;
  last_spin_prize: string | null;
  dq_day: string | null;
  dq_flicked: number;
  dq_returned: number;
  dq_flikk_claimed: boolean;
  dq_return_claimed: boolean;
  milestones: number[];
}

export interface Flikkable {
  id: string;
  owner_id: string;
  owner_name: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  status: FlikkableStatus;
  current_lat: number;
  current_lng: number;
  current_place: string;
  home_lat: number;
  home_lng: number;
  total_km: number;
  places: string[];
  times_returned: number;
  picked_up_by: string | null;
  picked_up_by_name: string | null;
  picked_up_at: string | null;
  last_flicked_at: string | null;
  return_ready_at: string | null;
  happiness: number;
  last_fed_at: string | null;
  is_flikkstar: boolean;
  template_id: string | null;
  pickers: string[];
  created_at: string;
}

export interface NearbyFlikkable extends Flikkable {
  distance_km: number;
  bearing: number;
}

export interface Journey {
  id: string;
  flikkable_id: string;
  event: JourneyEvent;
  place: string;
  lat: number;
  lng: number;
  distance_km: number;
  stamps: number;
  by_user_id: string;
  by_name: string;
  created_at: string;
}

export interface Landing {
  place: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  from_lat: number;
  from_lng: number;
  km: number;
  stamps: number;
  population: number;
}

export type AdminRole = 'master' | 'admin';

export interface GameState {
  profile: Profile | null;
  mine: Flikkable[];
  holding: Flikkable[];
  role: AdminRole | null;
  online: number;
}

export interface Leader {
  user_id: string;
  display_name: string;
  stamps: number;
  flick_count: number;
}

export interface RoamingPin {
  id: string;
  place: string;
  lat: number;
  lng: number;
  emoji: string;
  name: string;
  owner_name: string;
  rarity: Rarity;
  status: FlikkableStatus;
  total_km: number;
  places: string[];
  happiness: number;
}

export interface NearbyResult {
  nearby: NearbyFlikkable[];
  roaming: RoamingPin[];
  pickup_radius_km: number;
  radius_km: number;
}

export interface City {
  name: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
}

export type PlaceKind = 'garden' | 'airport';

export interface Decoration {
  id: string;
  kind: PlaceKind;
  name: string;
  emoji: string;
  category: string;
  stamp_cost: number;
  happiness_boost: number;
  description: string | null;
  level_requirement: number;
  locked: boolean;
}

export interface UserItem {
  id: string;
  decoration_id: string;
  kind: PlaceKind;
  is_placed: boolean;
  x: number;
  y: number;
}

export interface Trophy {
  id: string;
  quest_id: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  stamps_value: number;
  exchanged: boolean;
  created_at: string;
}

export interface Player {
  user_id: string;
  display_name: string;
  home_name: string;
}

export interface FlickResult {
  flikkable: Flikkable;
  landing: Landing;
  milestone: number | null;
  level_up: number | null;
  trophies: Trophy[];
}

export interface StreakResult {
  streak: number;
  longest: number;
  cycle: number;
  total_logins: number;
  reward: { stamps: number; bonus: number; reset: boolean } | null;
}

export type FlickTarget =
  | { kind: 'random' }
  | { kind: 'player'; userID: string; name: string }
  | { kind: 'city'; city: string };
