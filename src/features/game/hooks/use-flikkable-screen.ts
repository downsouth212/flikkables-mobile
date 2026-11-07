import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useGameStore } from '@/features/game/store/game-store';
import type { Flikkable, Journey } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';

export function useFlikkableScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cached = useGameStore((s) => [...s.mine, ...s.holding].find((f) => f.id === id) ?? null);
  const [flikkable, setFlikkable] = useState<Flikkable | null>(cached);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gameApi
      .detail(id)
      .then((d) => {
        setFlikkable(d.flikkable);
        setJourneys(d.journeys);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Couldn’t load this Flikkable.'));
  }, [id]);

  const totalKm = journeys.reduce((sum, j) => sum + (j.distance_km || 0), 0);
  const cities = new Set(journeys.map((j) => j.place).filter(Boolean)).size;

  return { flikkable, journeys, error, totalKm, cities, back: () => router.back() };
}
