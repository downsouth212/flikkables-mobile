import { File } from 'expo-file-system';

import { API_URL } from '@/lib/auth';
import { apiGet, apiPost, getBearerToken } from '@/utils/api';
import type { CharacterTemplate, Postcard } from '@/features/postcards/types/postcard';

export const postcardImageURL = (id: string) => `${API_URL}/game/postcards/${id}/image`;
export const templateImageURL = (id: string) => `${API_URL}/game/templates/${id}/image`;

export const postcardApi = {
  list: () => apiGet<{ mine: Postcard[]; received: Postcard[] }>('/game/postcards'),
  get: (id: string) => apiGet<{ postcard: Postcard }>(`/game/postcards/${id}`),
  send: (id: string) => apiPost<{ postcard: Postcard }>(`/game/postcards/${id}/send`, {}),
  create: async (photoURI: string, flikkableID: string, locationName: string) => {
    const form = new FormData();
    form.append('photo', new File(photoURI));
    form.append('flikkable_id', flikkableID);
    form.append('location_name', locationName);
    const token = await getBearerToken();
    const res = await fetch(`${API_URL}/game/postcards`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as { postcard?: Postcard; error?: string };
    if (!res.ok || !data.postcard) throw new Error(data.error ?? 'Couldn’t make that postcard.');
    return data.postcard;
  },
};

export const templateApi = {
  list: () => apiGet<{ templates: CharacterTemplate[] }>('/game/templates'),
  unlock: (id: string) => apiPost<{ ok: boolean }>(`/game/templates/${id}/unlock`, {}),
};
