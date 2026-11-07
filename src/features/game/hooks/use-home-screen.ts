import { useFocusEffect, useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
import { useCallback, useRef, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useAuth } from '@/contexts/AuthContext';
import { getFix } from '@/features/game/hooks/use-location';
import { useGameStore } from '@/features/game/store/game-store';
import type { FlickTarget, Flikkable, PlaceKind, StreakResult } from '@/features/game/types/game';
import { rewardsApi } from '@/features/game/utils/game-api';
import { applyFilter, DEFAULT_FILTER, type AwayFilter } from '@/features/game/utils/away-filter';

const HOUR = 3600_000;

export function returnWaitMs(f: Flikkable) {
  if (f.status === 'picked_up') return 0;
  if (!f.last_flicked_at) return 0;
  const cooldown = (f.is_flikkstar ? 4 : 8) * HOUR;
  return Math.max(0, new Date(f.last_flicked_at).getTime() + cooldown - Date.now());
}

function message(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

export function useHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const profile = useGameStore((s) => s.profile);
  const mine = useGameStore((s) => s.mine);
  const holding = useGameStore((s) => s.holding);
  const online = useGameStore((s) => s.online);
  const selectedID = useGameStore((s) => s.selectedID);
  const lastLanding = useGameStore((s) => s.lastLanding);
  const store = useGameStore.getState;

  const [tab, setTab] = useState<'home' | 'away'>('home');
  const [refreshing, setRefreshing] = useState(false);
  const [saying, setSaying] = useState<string | undefined>(undefined);
  const [targetOpen, setTargetOpen] = useState(false);
  const [returning, setReturning] = useState<Flikkable | null>(null);
  const [returnBusy, setReturnBusy] = useState(false);
  const [cityInfo, setCityInfo] = useState<Flikkable | null>(null);
  const [filter, setFilter] = useState<AwayFilter>(DEFAULT_FILTER);
  const [streak, setStreak] = useState<StreakResult | null>(null);
  const pendingFlick = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);
  const streakChecked = useRef(false);

  const myID = user?.id;
  const gardenIDs = new Set(profile?.garden_ids ?? []);
  const atHome = mine.filter((f) => f.status === 'home');
  const garden = atHome.filter((f) => gardenIDs.has(f.id));
  const airport = atHome.filter((f) => !gardenIDs.has(f.id));
  const travelling = [...mine.filter((f) => f.status !== 'home'), ...holding];
  const away = applyFilter(travelling, filter, myID);
  const selected = airport.find((f) => f.id === selectedID) ?? null;

  const load = useCallback(async () => {
    if (!myID) return;
    await useGameStore.getState().refresh(myID);
    if (streakChecked.current) return;
    streakChecked.current = true;
    const result = await rewardsApi.streak();
    if (!result.reward) return;
    setStreak(result);
    await useGameStore.getState().refresh(myID);
  }, [myID]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const reload = async () => {
    setRefreshing(true);
    await load().catch(() => undefined);
    setRefreshing(false);
  };

  const fail = (err: unknown) => {
    Presets.System.notificationError();
    toast.show({ label: message(err), variant: 'danger' });
  };

  // The swipe flings the character away, then the web asks where it should go.
  const onFlick = (line: string) => {
    setSaying(line);
    setTargetOpen(true);
    return new Promise<void>((resolve, reject) => {
      pendingFlick.current = { resolve, reject };
    });
  };

  const chooseTarget = async (target: FlickTarget | null) => {
    setTargetOpen(false);
    const pending = pendingFlick.current;
    pendingFlick.current = null;
    if (!target || !selected) {
      pending?.resolve();
      return;
    }
    try {
      const from = target.kind === 'random' ? await getFix().catch(() => ({})) : {};
      await store().flick(selected.id, from, 'launch', target);
      Presets.System.notificationSuccess();
      pending?.resolve();
    } catch (err) {
      fail(err);
      pending?.reject(err instanceof Error ? err : new Error(message(err)));
    }
  };

  const confirmReturn = async () => {
    if (!returning) return;
    setReturnBusy(true);
    try {
      const stamps = await store().sendHome(returning.id);
      Presets.System.notificationSuccess();
      toast.show({ label: `${returning.name} is home! +${stamps} stamps`, variant: 'success' });
      setReturning(null);
    } catch (err) {
      fail(err);
    } finally {
      setReturnBusy(false);
    }
  };

  const openAway = (f: Flikkable) => {
    if (f.status === 'landed') {
      setCityInfo(f);
      return;
    }
    setReturning(f);
  };

  return {
    myID,
    profile,
    online,
    tab,
    setTab,
    refreshing,
    reload,
    atHome,
    garden,
    airport,
    travelling,
    away,
    filter,
    setFilter,
    selected,
    saying,
    onFlick,
    targetOpen,
    chooseTarget,
    lastLanding,
    closeLanding: () => store().clearLanding(),
    returning,
    returnBusy,
    setReturning,
    confirmReturn,
    cityInfo,
    setCityInfo,
    openAway,
    streak,
    closeStreak: () => setStreak(null),
    create: () => router.push('/create'),
    openPlace: (kind: PlaceKind) => router.push({ pathname: '/place/[kind]', params: { kind } }),
    openJourney: (id: string) => router.push({ pathname: '/flikkable/[id]', params: { id } }),
    openRewards: () => router.push('/rewards'),
    openTrophies: () => router.push('/trophies'),
    openAccount: () => router.push('/account'),
  };
}
