import { apiDelete, apiGet, apiPost } from '@/utils/api';

import type { FriendRequestStatus, FriendSearchResult, FriendsList } from '@/features/friends/types/friends';

export const friendsApi = {
  list: () => apiGet<FriendsList>('/game/friends'),
  search: (q: string) => apiGet<{ players: FriendSearchResult[] }>(`/game/friends/search?q=${encodeURIComponent(q)}`),
  request: (userID: string) =>
    apiPost<{ ok: boolean; status: FriendRequestStatus }>('/game/friends/request', { user_id: userID }),
  accept: (id: string) => apiPost<{ ok: boolean }>(`/game/friends/${id}/accept`, {}),
  remove: (id: string) => apiDelete<{ ok: boolean }>(`/game/friends/${id}`),
  block: (userID: string) => apiPost<{ ok: boolean }>('/game/blocks', { user_id: userID }),
  unblock: (userID: string) => apiDelete<{ ok: boolean }>(`/game/blocks/${userID}`),
  setAllow: (allow: boolean) => apiPost<{ ok: boolean }>('/game/friends/settings', { allow_friend_requests: allow }),
};
