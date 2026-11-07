import { useFocusEffect } from 'expo-router';
import { useToast } from 'heroui-native';
import { useCallback, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useGameStore } from '@/features/game/store/game-store';
import type { Trophy } from '@/features/game/types/game';
import { rewardsApi } from '@/features/game/utils/game-api';

export function useTrophiesScreen() {
  const { toast } = useToast();
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [selected, setSelected] = useState<Trophy | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    rewardsApi
      .trophies()
      .then((r) => setTrophies(r.trophies))
      .catch(() => undefined);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const exchange = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await rewardsApi.exchange(selected.id);
      const userID = useGameStore.getState().profile?.user_id;
      if (userID) await useGameStore.getState().refresh(userID);
      Presets.System.notificationSuccess();
      setSelected(null);
      await load();
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: err instanceof Error ? err.message : 'Something went wrong. Try again.', variant: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return {
    trophies,
    ready: trophies.filter((t) => !t.exchanged),
    exchanged: trophies.filter((t) => t.exchanged),
    selected,
    setSelected,
    busy,
    exchange,
  };
}
