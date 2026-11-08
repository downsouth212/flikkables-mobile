import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useAuth } from '@/contexts/AuthContext';
import { getFix, placeName, type Fix } from '@/features/game/hooks/use-location';
import { useGameStore } from '@/features/game/store/game-store';
import type { Flikkable, NearbyFlikkable, NearbyResult, Rarity, RoamingPin } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';
import { usePostcards } from '@/features/postcards/hooks/use-postcards';

export const EXPLORE_TABS = ['nearby', 'carrying', 'postcards', 'global'] as const;
export const SORTS = ['distance', 'rarity', 'name', 'owner'] as const;
const RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

export function useExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const holding = useGameStore((s) => s.holding);
  const upsert = useGameStore((s) => s.upsert);
  const refresh = useGameStore((s) => s.refresh);
  const flick = useGameStore((s) => s.flick);
  const lastLanding = useGameStore((s) => (s.lastLanding?.origin === 'explore' ? s.lastLanding : null));
  const clearLanding = useGameStore((s) => s.clearLanding);
  const postcards = usePostcards();
  const [tab, setTab] = useState<(typeof EXPLORE_TABS)[number]>('nearby');
  const [fix, setFix] = useState<Fix | null>(null);
  const [place, setPlace] = useState('');
  const [result, setResult] = useState<NearbyResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NearbyFlikkable | null>(null);
  const [busyID, setBusyID] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hideMine, setHideMine] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]>('distance');
  const [asc, setAsc] = useState(true);
  const [returning, setReturning] = useState<Flikkable | null>(null);
  const [roamer, setRoamer] = useState<RoamingPin | null>(null);

  const scan = async () => {
    setScanning(true);
    setLocationError(null);
    try {
      const next = await getFix();
      setFix(next);
      placeName(next).then(setPlace).catch(() => undefined);
      setResult(await gameApi.nearby(next.lat, next.lng));
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'Couldn’t find your location.');
    } finally {
      setScanning(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void scan();
      void postcards.load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const dir = asc ? 1 : -1;
  const nearby = (result?.nearby ?? [])
    .filter((f) => !hideMine || f.owner_id !== user?.id)
    .sort((a, b) => {
      if (sort === 'rarity') return (RANK[a.rarity] - RANK[b.rarity]) * dir;
      if (sort === 'name') return a.name.localeCompare(b.name) * dir;
      if (sort === 'owner') return a.owner_name.localeCompare(b.owner_name) * dir;
      return (a.distance_km - b.distance_km) * dir;
    });

  const pickup = async (f: NearbyFlikkable) => {
    if (!fix) return;
    setBusyID(f.id);
    setError(null);
    try {
      const { flikkable } = await gameApi.pickup(f.id, fix);
      upsert(flikkable);
      Presets.System.notificationSuccess();
      setSelected(null);
      setNotice(`You pikked up ${flikkable.name}!`);
      await scan();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t pikk it up.');
    } finally {
      setBusyID(null);
    }
  };

  const sendHome = async (f: Flikkable, withPostcard: boolean) => {
    setReturning(null);
    setBusyID(f.id);
    setError(null);
    try {
      const card = withPostcard ? postcards.unsentFor(f.id) : null;
      if (card) await postcards.send(card.id);
      const { flikkable, stamps } = await gameApi.sendHome(f.id);
      upsert(flikkable);
      Presets.System.notificationSuccess();
      setNotice(`${flikkable.name} returned to ${flikkable.owner_name}! You earned ${stamps} stamps.`);
      if (user) await refresh(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t return it.');
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
      setError(err instanceof Error ? err.message : 'The flikk didn’t go through.');
    } finally {
      setBusyID(null);
    }
  };

  const selfie = async (f: Flikkable) => {
    setSelected(null);
    await postcards.takeSelfie(f.id, place || 'Somewhere');
  };

  return {
    tab,
    setTab,
    fix,
    place,
    result,
    nearby,
    scanning,
    locationError,
    error,
    notice,
    selected,
    setSelected,
    busyID,
    holding,
    hideMine,
    setHideMine,
    sort,
    setSort,
    asc,
    setAsc,
    returning,
    setReturning,
    roamer,
    setRoamer,
    showRoamer: (key: string) => setRoamer(result?.roaming.find((p) => p.id === key) ?? null),
    postcards,
    scan,
    pickup,
    sendHome,
    flickOnward,
    selfie,
    lastLanding,
    closeLanding: clearLanding,
    open: (id: string) => router.push({ pathname: '/flikkable/[id]', params: { id } }),
  };
}
