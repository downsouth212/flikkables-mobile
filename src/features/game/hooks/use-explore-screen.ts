import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useAuth } from '@/contexts/AuthContext';
import { getFix, type Fix } from '@/features/game/hooks/use-location';
import { useGameStore } from '@/features/game/store/game-store';
import type { NearbyFlikkable, NearbyResult } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';

export function useExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const holding = useGameStore((s) => s.holding);
  const upsert = useGameStore((s) => s.upsert);
  const refresh = useGameStore((s) => s.refresh);
  const flick = useGameStore((s) => s.flick);
  const lastLanding = useGameStore((s) => (s.lastLanding?.origin === 'explore' ? s.lastLanding : null));
  const clearLanding = useGameStore((s) => s.clearLanding);
  const [fix, setFix] = useState<Fix | null>(null);
  const [result, setResult] = useState<NearbyResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NearbyFlikkable | null>(null);
  const [busyID, setBusyID] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const scan = async () => {
    setScanning(true);
    setError(null);
    try {
      const next = await getFix();
      setFix(next);
      const found = await gameApi.nearby(next.lat, next.lng);
      setResult(found);
      setSelected((prev) => found.nearby.find((f) => f.id === prev?.id) ?? found.nearby[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t scan around you.');
    } finally {
      setScanning(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void scan();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const pickup = async (f: NearbyFlikkable) => {
    if (!fix) return;
    setBusyID(f.id);
    setError(null);
    try {
      const { flikkable } = await gameApi.pickup(f.id, fix);
      upsert(flikkable);
      Presets.System.notificationSuccess();
      setNotice(`You picked up ${flikkable.name}. Flick it onward or send it home to ${flikkable.owner_name}.`);
      await scan();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t pick it up.');
    } finally {
      setBusyID(null);
    }
  };

  const sendHome = async (id: string) => {
    setBusyID(id);
    setError(null);
    try {
      const { flikkable, stamps } = await gameApi.sendHome(id);
      upsert(flikkable);
      Presets.System.notificationSuccess();
      setNotice(`${flikkable.name} is home with ${flikkable.owner_name}. You earned ${stamps} stamps.`);
      if (user) await refresh(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send it home.');
    } finally {
      setBusyID(null);
    }
  };

  const flickOnward = async (id: string) => {
    setBusyID(id);
    setError(null);
    try {
      await flick(id, fix ?? {}, 'explore');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The flick didn’t go through.');
    } finally {
      setBusyID(null);
    }
  };

  return {
    fix,
    result,
    scanning,
    error,
    notice,
    selected,
    setSelected,
    busyID,
    holding,
    scan,
    pickup,
    sendHome,
    flickOnward,
    lastLanding,
    closeLanding: clearLanding,
    open: (id: string) => router.push({ pathname: '/flikkable/[id]', params: { id } }),
  };
}
