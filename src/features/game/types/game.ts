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

export interface Postcard {
  id: string;
  flikkable_id: string;
  place: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string | null;
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
}

export interface JournalEntry {
  id: string;
  event: JourneyEvent;
  place: string;
  distance_km: number;
  stamps: number;
  created_at: string;
  flikkable_id: string;
  name: string;
  emoji: string;
}

export interface Leader {
  user_id: string;
  display_name: string;
  stamps: number;
  flick_count: number;
}

export interface RoamingPin {
  place: string;
  lat: number;
  lng: number;
  emoji: string;
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
