import type { Flikkable, Rarity } from '@/features/game/types/game';

// The web CharacterFilter: sort, direction and three filters over the Away list.
export type SortKey = 'recent' | 'km' | 'cities' | 'rarity';
export type Continent = 'all' | 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania' | 'Antarctica';
export type PickedFilter = 'all' | 'me' | 'others' | 'none';

export interface AwayFilter {
  sort: SortKey;
  ascending: boolean;
  continent: Continent;
  rarity: Rarity | 'all';
  picked: PickedFilter;
}

export const DEFAULT_FILTER: AwayFilter = { sort: 'recent', ascending: false, continent: 'all', rarity: 'all', picked: 'all' };

export const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Last Flikkd/Returned',
  km: 'Total KM Traveled',
  cities: 'Cities Visited',
  rarity: 'Rarity Level',
};

export const CONTINENTS: Continent[] = ['all', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];
export const PICKED_LABEL: Record<PickedFilter, string> = { all: 'All', me: 'Picked by Me', others: 'Picked by Others', none: 'Not Picked Up' };

const RARITY_RANK: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

export function continentOf(lat: number, lng: number): Continent | null {
  if (lat < -60) return 'Antarctica';
  if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) return 'Africa';
  if (lat >= -47 && lat <= 81 && lng >= 25 && lng <= 180) return 'Asia';
  if (lat >= 36 && lat <= 71 && lng >= -25 && lng <= 40) return 'Europe';
  if (lat >= 15 && lat <= 72 && lng >= -170 && lng <= -52) return 'North America';
  if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) return 'South America';
  if (lat >= -47 && lat <= 0 && lng >= 110 && lng <= 180) return 'Oceania';
  return null;
}

export function isFiltered(filter: AwayFilter) {
  return filter.continent !== 'all' || filter.rarity !== 'all' || filter.picked !== 'all';
}

export function applyFilter(list: Flikkable[], filter: AwayFilter, myID: string | undefined) {
  const value = (f: Flikkable) => {
    if (filter.sort === 'km') return f.total_km || 0;
    if (filter.sort === 'cities') return new Set(f.places ?? []).size;
    if (filter.sort === 'rarity') return RARITY_RANK[f.rarity];
    return new Date(f.last_flicked_at ?? f.created_at).getTime();
  };
  return list
    .filter((f) => filter.continent === 'all' || continentOf(f.current_lat, f.current_lng) === filter.continent)
    .filter((f) => filter.rarity === 'all' || f.rarity === filter.rarity)
    .filter((f) => {
      if (filter.picked === 'me') return f.status === 'picked_up' && f.picked_up_by === myID;
      if (filter.picked === 'others') return f.status === 'picked_up' && f.picked_up_by !== myID;
      if (filter.picked === 'none') return f.status !== 'picked_up';
      return true;
    })
    .sort((a, b) => (filter.ascending ? value(a) - value(b) : value(b) - value(a)));
}
