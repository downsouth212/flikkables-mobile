import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useGameStore } from '@/features/game/store/game-store';
import type { RankingPeriod, RankingType, Rankings } from '@/features/leaderboard/types/leaderboard';
import { leaderboardApi } from '@/features/leaderboard/utils/leaderboard-api';

export const RANKING_TYPES = ['flikkrs', 'pikkrs'] as const;
export const RANKING_PERIODS = ['daily', 'weekly', 'all'] as const;

export function useLeaderboardScreen() {
  const myID = useGameStore((s) => s.profile?.user_id ?? null);
  const [type, setType] = useState<RankingType>('flikkrs');
  const [period, setPeriod] = useState<RankingPeriod>('all');
  const [data, setData] = useState<Rankings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    leaderboardApi
      .rankings(type, period)
      .then(setData)
      .catch(() => setData({ leaders: [], me: null }))
      .finally(() => setLoading(false));
  };

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, period]),
  );

  const me = data?.me ?? null;
  const myName = useGameStore((s) => s.profile?.display_name ?? '');

  return {
    type,
    setType,
    period,
    setPeriod,
    loading,
    leaders: data?.leaders ?? [],
    me,
    myID,
    myRow: me && me.rank > 20 && myID ? { ...me, user_id: myID, display_name: myName } : null,
  };
}
