import { API_URL } from '@/lib/auth';
import { apiDelete, apiGet, apiPost } from '@/utils/api';

import type {
  Flikkable,
  GameState,
  JournalEntry,
  Journey,
  Landing,
  Leader,
  NearbyResult,
  Postcard,
  Profile,
} from '@/features/game/types/game';

export const gameApi = {
  state: () => apiGet<GameState>('/game/state'),
  saveProfile: (body: { display_name: string; home_lat: number; home_lng: number; home_name: string }) =>
    apiPost<{ profile: Profile }>('/game/profile', body),
  create: (body: { name: string; emoji: string }) => apiPost<{ flikkable: Flikkable }>('/game/flikkables', body),
  detail: (id: string) =>
    apiGet<{ flikkable: Flikkable; journeys: Journey[]; postcards: Postcard[] }>(`/game/flikkables/${id}`),
  flick: (id: string, body: { lat?: number; lng?: number }) =>
    apiPost<{ flikkable: Flikkable; landing: Landing }>(`/game/flikkables/${id}/flick`, body),
  pickup: (id: string, body: { lat: number; lng: number }) =>
    apiPost<{ flikkable: Flikkable }>(`/game/flikkables/${id}/pickup`, body),
  sendHome: (id: string) => apiPost<{ flikkable: Flikkable; stamps: number }>(`/game/flikkables/${id}/return`, {}),
  nearby: (lat: number, lng: number) => apiGet<NearbyResult>(`/game/nearby?lat=${lat}&lng=${lng}`),
  claimDaily: () => apiPost<{ profile: Profile; stamps: number }>('/game/claim-daily', {}),
  leaderboard: () => apiGet<{ leaders: Leader[] }>('/game/leaderboard'),
  journal: () => apiGet<{ entries: JournalEntry[] }>('/game/journal'),
  requestPostcard: (id: string) => apiPost<{ postcard: Postcard }>(`/game/flikkables/${id}/postcard`, {}),
  postcard: (id: string) => apiGet<{ postcard: Postcard }>(`/game/postcards/${id}`),
  deleteMe: () => apiDelete<{ ok: boolean }>('/game/me'),
};

export function postcardImageURL(id: string) {
  return `${API_URL}/game/postcards/${id}/image`;
}
