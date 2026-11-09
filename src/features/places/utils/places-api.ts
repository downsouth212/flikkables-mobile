import type { CityInfo, OwnerCard } from '@/features/places/types/places';
import { apiGet } from '@/utils/api';

export const placesApi = {
  owner: (userID: string) => apiGet<{ owner: OwnerCard }>(`/game/owners/${encodeURIComponent(userID)}`),
  city: (place: string) => apiGet<{ city: CityInfo }>(`/game/city?place=${encodeURIComponent(place)}`),
};
