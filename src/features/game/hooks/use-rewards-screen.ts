import { useToast } from 'heroui-native';
import { useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useGameStore } from '@/features/game/store/game-store';
import { rewardsApi } from '@/features/game/utils/game-api';

export const DAILY_REWARDS = [5, 10, 15, 20, 25, 30, 50];

const dayKey = () => new Date().toISOString().slice(0, 10);

const refresh = async () => {
  const userID = useGameStore.getState().profile?.user_id;
  if (userID) await useGameStore.getState().refresh(userID);
};

export function useRewardsScreen() {
  const { toast } = useToast();
  const p = useGameStore((s) => s.profile);
  const [target, setTarget] = useState<number | null>(null);
  const [prize, setPrize] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);

  const today = dayKey();
  const streak = p?.streak ?? 0;
  const cycleDay = p?.streak_cycle ?? 0;
  const fresh = p?.dq_day === today;
  const quests = [
    { id: 'flikk' as const, title: 'Flikk 5 Flikkables', progress: fresh ? (p?.dq_flicked ?? 0) : 0, target: 5, claimed: fresh && !!p?.dq_flikk_claimed },
    { id: 'return' as const, title: 'Return 1 Flikkable', progress: fresh ? (p?.dq_returned ?? 0) : 0, target: 1, claimed: fresh && !!p?.dq_return_claimed },
  ];

  const fail = (err: unknown) => {
    Presets.System.notificationError();
    toast.show({ label: err instanceof Error ? err.message : 'Something went wrong. Try again.', variant: 'danger' });
  };

  const claim = async (quest: 'flikk' | 'return') => {
    setClaiming(quest);
    try {
      await rewardsApi.claimQuest(quest);
      await refresh();
      Presets.System.notificationSuccess();
      toast.show({ label: 'Quest complete! +20 stamps', variant: 'success' });
    } catch (err) {
      fail(err);
    } finally {
      setClaiming(null);
    }
  };

  const spin = async () => {
    setSpinning(true);
    try {
      const r = await rewardsApi.spin();
      setPrize(r.prize);
      setTarget(r.index);
    } catch (err) {
      setSpinning(false);
      fail(err);
    }
  };

  const spinDone = async () => {
    Presets.System.notificationSuccess();
    toast.show({ label: `You won: ${prize}!`, variant: 'success' });
    setSpinning(false);
    await refresh().catch(() => undefined);
  };

  return {
    streak,
    cycleDay,
    next: DAILY_REWARDS[cycleDay % 7]!,
    quests,
    claiming,
    claim,
    spun: !spinning && p?.last_spin_day === today,
    lastPrize: prize ?? p?.last_spin_prize ?? null,
    spinning,
    target,
    spin,
    spinDone,
  };
}
