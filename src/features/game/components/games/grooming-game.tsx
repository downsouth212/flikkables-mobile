import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Presets } from 'react-native-pulsar';

import { Pressable } from '@/components/pressable';
import { GameHeader } from '@/features/game/components/games/game-header';

const TOTAL = 8;

const makeSpots = () =>
  Array.from({ length: TOTAL }, (_, id) => ({ id, x: 15 + Math.random() * 70, y: 15 + Math.random() * 70 }));

interface GroomingGameProps {
  emoji: string;
  onComplete: (success: boolean) => void;
  onQuit: () => void;
}

export function GroomingGame({ emoji, onComplete, onQuit }: GroomingGameProps) {
  const [spots, setSpots] = useState(makeSpots);
  const cleaned = TOTAL - spots.length;
  const done = spots.length === 0;

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => onComplete(true), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <View className="gap-4">
      <Text className="text-center text-xl font-bold text-foreground">Grooming</Text>
      <Text className="text-center text-sm text-muted">Clean your Flikkable!</Text>
      <GameHeader left="Clean the spots!" right={`${cleaned}/${TOTAL}`} onQuit={onQuit} />
      <View className="h-2 overflow-hidden rounded-full bg-surface">
        <View className="h-full rounded-full bg-accent" style={{ width: `${(cleaned / TOTAL) * 100}%` }} />
      </View>
      <View className="h-80 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface">
        <Text style={{ fontSize: 140 }}>{emoji}</Text>
        {spots.map((s) => (
          <View key={s.id} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
            <Pressable
              accessibilityLabel="Clean spot"
              onPress={() => {
                Presets.System.impactLight();
                setSpots((list) => list.filter((x) => x.id !== s.id));
              }}
            >
              <Text className="text-3xl">💧</Text>
            </Pressable>
          </View>
        ))}
        {done ? (
          <View className="absolute inset-0 items-center justify-center gap-2 bg-background/80 p-4">
            <Text className="text-center text-2xl font-bold text-foreground">✨ Sparkling Clean!</Text>
            <Text className="text-center text-base text-muted">+1 happiness</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
