import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useGameStore } from '@/features/game/store/game-store';
import type { Flikkable, Journey, Postcard } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';
import { getBearerToken } from '@/utils/api';

export function useFlikkableScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cached = useGameStore((s) => [...s.mine, ...s.holding].find((f) => f.id === id) ?? null);
  const upsert = useGameStore((s) => s.upsert);
  const myID = useGameStore((s) => s.userID);
  const [flikkable, setFlikkable] = useState<Flikkable | null>(cached);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const load = async () => {
    try {
      const d = await gameApi.detail(id);
      setFlikkable(d.flikkable);
      setJourneys(d.journeys);
      setPostcards(d.postcards);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t load this Flikkable.');
    }
  };

  useEffect(() => {
    void load();
    void getBearerToken().then(setToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pending = postcards.some((p) => p.status === 'queued' || p.status === 'running');

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(async () => {
      const updated = await Promise.all(
        postcards.map((p) =>
          p.status === 'queued' || p.status === 'running'
            ? gameApi.postcard(p.id).then((r) => r.postcard).catch(() => p)
            : Promise.resolve(p),
        ),
      );
      setPostcards(updated);
    }, 4000);
    return () => clearInterval(timer);
  }, [pending, postcards]);

  const requestPostcard = async () => {
    setRequesting(true);
    setError(null);
    try {
      const { postcard } = await gameApi.requestPostcard(id);
      setPostcards((prev) => [postcard, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t make a postcard.');
    } finally {
      setRequesting(false);
    }
  };

  useEffect(() => {
    if (flikkable && cached && flikkable.id === cached.id && flikkable !== cached) upsert(flikkable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flikkable]);

  const hasPostcardHere = postcards.some(
    (p) => p.place === flikkable?.current_place && p.status !== 'failed',
  );

  return {
    flikkable,
    journeys,
    postcards,
    error,
    token,
    myID,
    requesting,
    canRequestPostcard: flikkable !== null && flikkable.status !== 'home' && !hasPostcardHere,
    requestPostcard,
    back: () => router.back(),
  };
}
