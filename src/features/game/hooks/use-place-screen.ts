import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
import { useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { usePlaceItems } from '@/features/game/hooks/use-place-items';
import { useGameStore } from '@/features/game/store/game-store';
import type { Flikkable, PlaceKind } from '@/features/game/types/game';
import { gameApi } from '@/features/game/utils/game-api';

function message(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

export function usePlaceScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ kind: string }>();
  const kind: PlaceKind = params.kind === 'airport' ? 'airport' : 'garden';
  const other: PlaceKind = kind === 'garden' ? 'airport' : 'garden';
  const profile = useGameStore((s) => s.profile);
  const mine = useGameStore((s) => s.mine);
  const myID = useGameStore((s) => s.userID) ?? undefined;
  const { items } = usePlaceItems(kind);
  const [openID, setOpenID] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const gardenIDs = new Set(profile?.garden_ids ?? []);
  const atHome = mine.filter((f) => f.status === 'home');
  const characters = atHome.filter((f) => (kind === 'garden' ? gardenIDs.has(f.id) : !gardenIDs.has(f.id)));
  const open = characters.find((f) => f.id === openID) ?? null;
  const placed = items.filter((i) => i.is_placed).map((i) => ({ id: i.id, emoji: i.decoration.emoji, name: i.decoration.name, x: i.x, y: i.y }));

  const run = async (work: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await work();
      Presets.System.notificationSuccess();
      if (success) toast.show({ label: success, variant: 'success' });
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: message(err), variant: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const moveOne = (f: Flikkable) =>
    run(async () => {
      await useGameStore.getState().move([f.id], other);
      setOpenID(null);
    });

  const moveAll = () =>
    run(async () => {
      await useGameStore.getState().move(
        characters.map((f) => f.id),
        other,
      );
      setBulkOpen(false);
    });

  const feed = (f: Flikkable) => run(() => useGameStore.getState().feed(f.id));
  const treat = (f: Flikkable) => run(() => useGameStore.getState().feed(f.id), `${f.name} loved the treat! 🍪`);

  const pet = async (f: Flikkable) => {
    try {
      const { flikkable, boosted } = await gameApi.pet(f.id);
      useGameStore.getState().upsert(flikkable);
      if (boosted) toast.show({ label: `${f.name} is happier 💖`, variant: 'success' });
    } catch {
      // Petting is a feel-good gesture; a failed happiness boost isn't worth an error.
    }
  };
  const away = mine.filter((f) => f.status !== 'home');

  const selectForFlick = (f: Flikkable) => {
    useGameStore.getState().select(f.id);
    setOpenID(null);
    router.back();
  };

  return {
    kind,
    myID,
    characters,
    placed,
    open,
    setOpenID,
    bulkOpen,
    setBulkOpen,
    busy,
    moveOne,
    moveAll,
    feed,
    treat,
    pet,
    away,
    selectForFlick,
    play: (f: Flikkable) => {
      setOpenID(null);
      router.push({ pathname: '/play/[id]', params: { id: f.id } });
    },
    openShop: () => router.push({ pathname: '/shop/[kind]', params: { kind } }),
    openCustomize: () => router.push({ pathname: '/customize/[kind]', params: { kind } }),
    openJourney: (id: string) => {
      setOpenID(null);
      router.push({ pathname: '/flikkable/[id]', params: { id } });
    },
  };
}
