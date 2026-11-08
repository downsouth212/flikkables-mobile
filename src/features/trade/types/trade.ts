import type { Rarity } from '@/features/game/types/game';

export interface TradeFlikkable {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  total_km: number;
  cities: number;
}

export interface TradePlayer {
  user_id: string;
  display_name: string;
}

export interface TradeOffer {
  id: string;
  created_at: string;
  stamp_amount: number | null;
  from: TradePlayer;
  to: TradePlayer;
  offered: TradeFlikkable;
  requested: TradeFlikkable | null;
}

export interface TradeLists {
  incoming: TradeOffer[];
  outgoing: TradeOffer[];
}

export interface TradeOptions {
  mine: TradeFlikkable[];
  theirs: TradeFlikkable[];
}

export interface NewTradeOffer {
  offered_id: string;
  requested_id?: string;
  to_user_id?: string;
  stamp_amount?: number;
}
