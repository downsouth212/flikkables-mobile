export interface OwnerCard {
  user_id: string;
  display_name: string;
  country: string | null;
  home_name: string;
  joined_at: string | null;
  flikkables: number;
  total_km: number;
  rank: number | null;
  players: number;
}

export interface CityInfo {
  place: string;
  population: number | null;
  attractions: string[];
}
