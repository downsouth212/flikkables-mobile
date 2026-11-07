import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/lib/auth';
import { confirmDelete } from '@/lib/confirm';
import { useGameStore } from '@/features/game/store/game-store';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import type { JournalEntry, Leader } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function usePassportScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profile = useGameStore((s) => s.profile);
  const setProfile = useGameStore((s) => s.setProfile);
  const mine = useGameStore((s) => s.mine);
  const role = useGameStore((s) => s.role);
  const refresh = useGameStore((s) => s.refresh);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Re-reading game state picks up an admin role granted since the last launch.
      if (user) refresh(user.id).catch(() => undefined);
      const [j, l] = await Promise.all([gameApi.journal(), gameApi.leaderboard()]);
      setJournal(j.entries);
      setLeaders(l.leaders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load your passport.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const claimDaily = async () => {
    setClaiming(true);
    try {
      const result = await gameApi.claimDaily();
      setProfile(result.profile);
      setClaimed(result.stamps);
      Presets.System.notificationSuccess();
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t claim today’s stamp.');
    } finally {
      setClaiming(false);
    }
  };

  const deleteAccount = () =>
    confirmDelete({
      title: 'Delete your account?',
      message: 'Your Flikkables, journeys and stamps are deleted for good. Other players won’t see them again.',
      confirmLabel: 'Delete account',
      onConfirm: async () => {
        try {
          await gameApi.deleteMe();
          await authClient.deleteUser();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Couldn’t delete your account.');
          return;
        }
        await signOut();
      },
    });

  const totalKm = mine.reduce((sum, f) => sum + f.total_km, 0);
  const cities = new Set(mine.flatMap((f) => f.places)).size;

  return {
    user,
    profile,
    journal,
    leaders,
    loading,
    load,
    error,
    claiming,
    claimed,
    claimedToday: profile?.last_claim_day === today(),
    claimDaily,
    totalKm,
    cities,
    signOut: () => void signOut(),
    deleteAccount,
    role,
    theme,
    setTheme,
    openAdmin: () => router.push('/admin'),
    open: (id: string) => router.push({ pathname: '/flikkable/[id]', params: { id } }),
  };
}
