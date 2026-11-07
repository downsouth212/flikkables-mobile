import { useLocalSearchParams, useRouter } from 'expo-router';
import { useToast } from 'heroui-native';
import { useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useGameStore } from '@/features/game/store/game-store';

export type GameID = 'feeding' | 'grooming' | 'memory';

export const GAMES: { id: GameID; name: string; emoji: string; description: string }[] = [
  { id: 'feeding', name: 'Feeding Time', emoji: '🍴', description: 'Catch falling treats!' },
  { id: 'grooming', name: 'Grooming', emoji: '✨', description: 'Clean your Flikkable!' },
  { id: 'memory', name: 'Memory Match', emoji: '🧩', description: 'Match the pairs!' },
];

export function usePlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const f = useGameStore((s) => s.mine.find((x) => x.id === id) ?? null);
  const [game, setGame] = useState<GameID | null>(null);

  const complete = async (success: boolean) => {
    setGame(null);
    if (!success || !f) return;
    try {
      await useGameStore.getState().play(f.id);
      Presets.System.notificationSuccess();
      router.back();
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: err instanceof Error ? err.message : 'Something went wrong. Try again.', variant: 'danger' });
    }
  };

  return { f, game, setGame, complete, quit: () => setGame(null) };
}
