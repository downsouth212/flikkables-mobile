import { apiDelete, apiGet, apiPatch, apiPost } from '@/utils/api';

import type { AdminOverview, Battles, GameSettings } from '@/features/admin/types/admin';
import type { CharacterTemplate } from '@/features/postcards/types/postcard';

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
  saveBattles: (battles: Battles) => apiPost<{ battles: Battles }>('/admin/battles', battles),
  invite: (email: string, role: 'user' | 'admin') =>
    apiPost<{ ok: boolean; emailed: boolean; reason?: string }>('/admin/invite', { email, role }),
  dummy: (body: { email: string; password: string; name: string }) =>
    apiPost<{ ok: boolean; user_id: string }>('/admin/dummy', body),
  templates: () => apiGet<{ templates: CharacterTemplate[] }>('/admin/templates'),
  generateTemplates: (style: string, count: number) =>
    apiPost<{ templates: CharacterTemplate[] }>('/admin/templates/generate', { style, count }),
  updateTemplate: (id: string, body: Partial<Pick<CharacterTemplate, 'is_published' | 'is_locked' | 'stamp_cost' | 'name'>>) =>
    apiPatch<{ template: CharacterTemplate }>(`/admin/templates/${id}`, body),
  removeTemplate: (id: string) => apiDelete<{ ok: boolean }>(`/admin/templates/${id}`),
  clearDrops: () => apiDelete<{ removed: number }>('/admin/drops'),
};
