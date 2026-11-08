import type { NewTradeOffer, TradeLists, TradeOptions } from '@/features/trade/types/trade';
import { apiGet, apiPost } from '@/utils/api';

export const tradeApi = {
  list: () => apiGet<TradeLists>('/game/trades'),
  options: (userID?: string) =>
    apiGet<TradeOptions>(userID ? `/game/trades/options?user_id=${encodeURIComponent(userID)}` : '/game/trades/options'),
  create: (offer: NewTradeOffer) => apiPost<{ ok: true }>('/game/trades', offer),
  accept: (id: string) => apiPost<{ ok: true }>(`/game/trades/${id}/accept`, {}),
  decline: (id: string) => apiPost<{ ok: true }>(`/game/trades/${id}/decline`, {}),
  cancel: (id: string) => apiPost<{ ok: true }>(`/game/trades/${id}/cancel`, {}),
};
