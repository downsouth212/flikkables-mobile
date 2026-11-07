import { useLocalSearchParams } from 'expo-router';
import { useToast } from 'heroui-native';
import { useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { usePlaceItems } from '@/features/game/hooks/use-place-items';
import { useGameStore } from '@/features/game/store/game-store';
import type { Decoration, PlaceKind } from '@/features/game/types/game';
import { rewardsApi } from '@/features/game/utils/game-api';

export const SHOP_TABS: Record<PlaceKind, { id: string; label: string }[]> = {
  garden: [
    { id: 'background', label: 'Themes' },
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
    { id: 'interactive', label: 'Special' },
  ],
  airport: [
    { id: 'seating', label: 'Seating' },
    { id: 'displays', label: 'Displays' },
    { id: 'amenities', label: 'Amenities' },
    { id: 'decorative', label: 'Decor' },
  ],
};

export function useShopScreen() {
  const { toast } = useToast();
  const params = useLocalSearchParams<{ kind: string }>();
  const kind: PlaceKind = params.kind === 'airport' ? 'airport' : 'garden';
  const profile = useGameStore((s) => s.profile);
  const { catalog, items, load } = usePlaceItems(kind);
  const tabs = SHOP_TABS[kind];
  const [tab, setTab] = useState(tabs[0]!.id);
  const [buying, setBuying] = useState<string | null>(null);

  const owned = new Set(items.map((i) => i.decoration_id));
  const level = profile?.level ?? 1;
  const shown = catalog.filter((d) => d.category === tab);

  const buy = async (d: Decoration) => {
    setBuying(d.id);
    try {
      const { stamps } = await rewardsApi.buy(d.id);
      const p = useGameStore.getState().profile;
      if (p) useGameStore.getState().setProfile({ ...p, stamps });
      Presets.System.notificationSuccess();
      toast.show({ label: `Purchased ${d.name}!`, variant: 'success' });
      await load();
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: err instanceof Error ? err.message : 'Something went wrong. Try again.', variant: 'danger' });
    } finally {
      setBuying(null);
    }
  };

  return { kind, tabs, tab, setTab, shown, owned, level, stamps: profile?.stamps ?? 0, buying, buy };
}
