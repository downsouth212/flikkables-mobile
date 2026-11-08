export type RankingType = 'flikkrs' | 'pikkrs';
export type RankingPeriod = 'daily' | 'weekly' | 'all';

export interface RankedPlayer {
  rank: number;
  user_id: string;
  display_name: string;
  value: number;
  count: number | null;
}

export interface MyRank {
  rank: number;
  value: number;
  count: number | null;
}

export interface Rankings {
  leaders: RankedPlayer[];
  me: MyRank | null;
}
