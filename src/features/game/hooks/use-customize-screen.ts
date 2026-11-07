import { useLocalSearchParams } from 'expo-router';
import { useToast } from 'heroui-native';
import { useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { usePlaceItems, type OwnedItem } from '@/features/game/hooks/use-place-items';
import { useGameStore } from '@/features/game/store/game-store';
import type { PlaceKind } from '@/features/game/types/game';
import { rewardsApi } from '@/features/game/utils/game-api';

export function useCustomizeScreen() {
  const { toast } = useToast();
  const params = useLocalSearchParams<{ kind: string }>();
  const kind: PlaceKind = params.kind === 'airport' ? 'airport' : 'garden';
  const profile = useGameStore((s) => s.profile);
  const mine = useGameStore((s) => s.mine);
  const { items, setItems, load } = usePlaceItems(kind);
  const [selected, setSelected] = useState<OwnedItem | null>(null);
  const [editing, setEditing] = useState<OwnedItem | null>(null);

  const gardenIDs = new Set(profile?.garden_ids ?? []);
  const characters = mine.filter((f) => f.status === 'home' && (kind === 'garden' ? gardenIDs.has(f.id) : !gardenIDs.has(f.id)));
  const inventory = items.filter((i) => !i.is_placed);
  const placed = items.filter((i) => i.is_placed);
  const scene = placed.map((i) => ({ id: i.id, emoji: i.decoration.emoji, name: i.decoration.name, x: i.x, y: i.y }));

  const act = async (work: () => Promise<unknown>, label: string) => {
    try {
      await work();
      Presets.System.notificationSuccess();
      toast.show({ label, variant: 'success' });
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: err instanceof Error ? err.message : 'Something went wrong. Try again.', variant: 'danger' });
    }
    await load().catch(() => undefined);
  };

  const place = (x: number, y: number) => {
    const item = selected;
    if (!item) return;
    setSelected(null);
    setItems(items.map((i) => (i.id === item.id ? { ...i, is_placed: true, x, y } : i)));
    act(() => rewardsApi.placeItem(item.id, { placed: true, x, y }), 'Item placed!');
  };

  const removeItem = (item: OwnedItem) => {
    setEditing(null);
    act(() => rewardsApi.placeItem(item.id, { placed: false }), 'Item removed');
  };

  const deleteItem = (item: OwnedItem) => {
    setEditing(null);
    setItems(items.filter((i) => i.id !== item.id));
    act(() => rewardsApi.deleteItem(item.id), 'Item deleted');
  };

  return {
    kind,
    characters,
    inventory,
    scene,
    selected,
    toggle: (item: OwnedItem) => setSelected(selected?.id === item.id ? null : item),
    place,
    editing,
    edit: (id: string) => setEditing(placed.find((i) => i.id === id) ?? null),
    closeEdit: () => setEditing(null),
    removeItem,
    deleteItem,
  };
}
