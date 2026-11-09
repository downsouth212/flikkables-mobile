import { apiDelete, apiGet, apiPost } from '@/utils/api';

import type { GardenPlant, GardenPlants, PickResult } from '@/features/game/types/garden';
import type {
  Decoration,
  FlickResult,
  Flikkable,
  GameState,
  Journey,
  Leader,
  NearbyResult,
  PlaceKind,
  Player,
  Profile,
  StreakResult,
  Trophy,
  UserItem,
} from '@/features/game/types/game';

export const gameApi = {
  state: () => apiGet<GameState>('/game/state'),
  saveProfile: (body: { display_name: string; home_lat: number; home_lng: number; home_name: string }) =>
    apiPost<{ profile: Profile }>('/game/profile', body),
  create: (body: { name: string; emoji: string; template_id?: string }) =>
    apiPost<{ flikkable: Flikkable; trophies: Trophy[] }>('/game/flikkables', body),
  remove: (id: string) => apiDelete<{ ok: boolean }>(`/game/flikkables/${id}`),
  detail: (id: string) => apiGet<{ flikkable: Flikkable; journeys: Journey[] }>(`/game/flikkables/${id}`),
  move: (ids: string[], to: PlaceKind) => apiPost<{ garden_ids: string[] }>('/game/garden', { ids, to }),
  feed: (id: string) => apiPost<{ flikkable: Flikkable }>(`/game/flikkables/${id}/feed`, {}),
  play: (id: string) => apiPost<{ flikkable: Flikkable }>(`/game/flikkables/${id}/play`, {}),
  pet: (id: string) => apiPost<{ flikkable: Flikkable; boosted: boolean }>(`/game/flikkables/${id}/pet`, {}),
  plants: () => apiGet<GardenPlants>('/game/garden/plants'),
  plant: (bed: number) => apiPost<{ plant: GardenPlant }>('/game/garden/plants', { bed }),
  pick: (bed: number) => apiPost<PickResult>(`/game/garden/plants/${bed}/pick`, {}),
  players: (q: string) => apiGet<{ players: Player[] }>(`/game/players?q=${encodeURIComponent(q)}`),
  flick: (id: string, body: { lat?: number; lng?: number; target_user_id?: string; city?: string }) =>
    apiPost<FlickResult>(`/game/flikkables/${id}/flick`, body),
  pickup: (id: string, body: { lat: number; lng: number }) =>
    apiPost<{ flikkable: Flikkable; trophies: Trophy[] }>(`/game/flikkables/${id}/pickup`, body),
  sendHome: (id: string) => apiPost<{ flikkable: Flikkable; stamps: number }>(`/game/flikkables/${id}/return`, {}),
  nearby: (lat: number, lng: number) => apiGet<NearbyResult>(`/game/nearby?lat=${lat}&lng=${lng}`),
  leaderboard: () => apiGet<{ leaders: Leader[] }>('/game/leaderboard'),
  deleteMe: () => apiDelete<{ ok: boolean }>('/game/me'),
};

export const rewardsApi = {
  shop: (kind: PlaceKind) => apiGet<{ catalog: Decoration[]; items: UserItem[] }>(`/rewards/shop/${kind}`),
  buy: (decorationID: string) => apiPost<{ ok: boolean; stamps: number }>('/rewards/shop/buy', { decoration_id: decorationID }),
  placeItem: (id: string, body: { placed: boolean; x?: number; y?: number }) =>
    apiPost<{ item: UserItem | null }>(`/rewards/items/${id}`, body),
  deleteItem: (id: string) => apiDelete<{ ok: boolean }>(`/rewards/items/${id}`),
  streak: () => apiPost<StreakResult>('/rewards/streak', {}),
  claimQuest: (quest: 'flikk' | 'return') => apiPost<{ ok: boolean; stamps: number }>('/rewards/daily-quest', { quest }),
  spin: () => apiPost<{ index: number; prize: string; stamps: number }>('/rewards/spin', {}),
  trophies: () => apiGet<{ trophies: Trophy[] }>('/rewards/trophies'),
  exchange: (id: string) => apiPost<{ ok: boolean; stamps: number }>(`/rewards/trophies/${id}/exchange`, {}),
};
