import { apiGet } from '@/utils/api';

import type { RankingPeriod, RankingType, Rankings } from '@/features/leaderboard/types/leaderboard';

export const leaderboardApi = {
  rankings: (type: RankingType, period: RankingPeriod) => apiGet<Rankings>(`/game/rankings?type=${type}&period=${period}`),
};
