import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { getFix } from '@/features/game/hooks/use-location';
import { useGameStore } from '@/features/game/store/game-store';

export const MAX_OWNED = 12;

export function useLaunchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useGameStore((s) => s.profile);
  const mine = useGameStore((s) => s.mine);
  const selectedID = useGameStore((s) => s.selectedID);
  const select = useGameStore((s) => s.select);
  const flick = useGameStore((s) => s.flick);
  const refresh = useGameStore((s) => s.refresh);
  const lastLanding = useGameStore((s) => (s.lastLanding?.origin === 'launch' ? s.lastLanding : null));
  const clearLanding = useGameStore((s) => s.clearLanding);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saying, setSaying] = useState<string | undefined>(undefined);

  const atHome = mine.filter((f) => f.status === 'home');
  const away = mine.filter((f) => f.status !== 'home');
  const selected = atHome.find((f) => f.id === selectedID) ?? atHome[0] ?? null;

  useFocusEffect(
    useCallback(() => {
      if (user) refresh(user.id).catch(() => undefined);
    }, [user, refresh]),
  );

  const reload = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await refresh(user.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t refresh.');
    } finally {
      setRefreshing(false);
    }
  };

  const launch = async (line: string) => {
    if (!selected) return;
    setError(null);
    setSaying(line);
    const from = await getFix().catch(() => ({}));
    try {
      await flick(selected.id, from, 'launch');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The flikk didn’t go through. Try again.');
      throw err;
    }
  };

  return {
    profile,
    atHome,
    away,
    selected,
    select,
    error,
    refreshing,
    reload,
    launch,
    lastLanding,
    saying,
    canCreate: mine.length < MAX_OWNED,
    create: () => router.push('/create'),
    open: (id: string) => router.push({ pathname: '/flikkable/[id]', params: { id } }),
    closeLanding: clearLanding,
  };
}
