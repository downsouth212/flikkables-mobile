import { apiDelete, apiGet, apiPost } from '@/utils/api';

import type { AdminOverview, GameSettings } from '@/features/admin/types/admin';

export const adminApi = {
  overview: () => apiGet<AdminOverview>('/admin/overview'),
  saveSettings: (body: Partial<GameSettings>) => apiPost<{ settings: GameSettings }>('/admin/settings', body),
  lock: (userID: string, locked: boolean) => apiPost(`/admin/players/${userID}/lock`, { locked }),
  moveHome: (userID: string, body: { lat: number; lng: number; name: string }) =>
    apiPost(`/admin/players/${userID}/home`, body),
  resetPlayer: (userID: string) => apiDelete(`/admin/players/${userID}`),
  addAdmin: (email: string) => apiPost('/admin/admins', { email }),
  removeAdmin: (email: string) => apiDelete(`/admin/admins/${encodeURIComponent(email)}`),
  drop: (body: { lat: number; lng: number; count: number; radius_m: number; place?: string }) =>
    apiPost<{ dropped: number; place: string }>('/admin/drop', body),
  clearDrops: () => apiDelete<{ removed: number }>('/admin/drops'),
};
