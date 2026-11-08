import { apiDelete, apiGet, apiPost } from '@/utils/api';
import type { GameNotification } from '@/features/notifications/types/notification';

export const notificationApi = {
  list: () => apiGet<{ notifications: GameNotification[]; unread: number }>('/game/notifications'),
  markRead: (id: string) => apiPost<{ ok: boolean }>(`/game/notifications/${id}/read`, {}),
  markAllRead: () => apiPost<{ ok: boolean }>('/game/notifications/read-all', {}),
  dismiss: (id: string) => apiDelete<{ ok: boolean }>(`/game/notifications/${id}`),
  clearAll: () => apiDelete<{ ok: boolean }>('/game/notifications'),
};

export function timeAgo(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
