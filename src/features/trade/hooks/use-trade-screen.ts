import { useFocusEffect } from 'expo-router';
import { useToast } from 'heroui-native';
import { useCallback, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useGameStore } from '@/features/game/store/game-store';
import type { NewTradeOffer, TradeLists } from '@/features/trade/types/trade';
import { tradeApi } from '@/features/trade/utils/trade-api';

export const TRADE_TABS = ['incoming', 'outgoing'] as const;
export type TradeTab = (typeof TRADE_TABS)[number];
export type TradeAction = 'accept' | 'decline' | 'cancel';

const EMPTY: TradeLists = { incoming: [], outgoing: [] };

export function useTradeScreen() {
  const { toast } = useToast();
  const stamps = useGameStore((s) => s.profile?.stamps ?? 0);
  const [data, setData] = useState<TradeLists>(EMPTY);
  const [tab, setTab] = useState<TradeTab>('incoming');
  const [busy, setBusy] = useState<{ id: string; action: TradeAction } | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () =>
    tradeApi
      .list()
      .then(setData)
      .catch(() => undefined);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const fail = (err: unknown) => {
    Presets.System.notificationError();
    toast.show({ label: err instanceof Error ? err.message : 'Something went wrong. Try again.', variant: 'danger' });
  };

  const run = async (id: string, action: TradeAction) => {
    setBusy({ id, action });
    try {
      await tradeApi[action](id);
      if (action === 'accept') {
        const userID = useGameStore.getState().profile?.user_id;
        if (userID) await useGameStore.getState().refresh(userID);
      }
      Presets.System.notificationSuccess();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
      await load();
    }
  };

  const send = async (offer: NewTradeOffer) => {
    try {
      await tradeApi.create(offer);
      setCreating(false);
      toast.show({ label: 'Trade offer sent!', variant: 'success' });
      Presets.System.notificationSuccess();
      await load();
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  };

  return {
    ...data,
    stamps,
    tab,
    setTab,
    busy,
    creating,
    setCreating,
    send,
    accept: (id: string) => run(id, 'accept'),
    decline: (id: string) => run(id, 'decline'),
    cancel: (id: string) => run(id, 'cancel'),
  };
}
