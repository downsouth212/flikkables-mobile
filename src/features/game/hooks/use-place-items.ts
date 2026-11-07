import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Decoration, PlaceKind, UserItem } from '@/features/game/types/game';
import { rewardsApi } from '@/features/game/utils/game-api';

export interface OwnedItem extends UserItem {
  decoration: Decoration;
}

/** The shop catalog for a place and the items the player owns there, joined. */
export function usePlaceItems(kind: PlaceKind) {
  const [catalog, setCatalog] = useState<Decoration[]>([]);
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const result = await rewardsApi.shop(kind);
    const byID = new Map(result.catalog.map((d) => [d.id, d]));
    setCatalog(result.catalog);
    setItems(
      result.items.flatMap((item) => {
        const decoration = byID.get(item.decoration_id);
        return decoration ? [{ ...item, decoration }] : [];
      }),
    );
    setLoaded(true);
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoaded(true));
    }, [load]),
  );

  return { catalog, items, loaded, load, setItems };
}
