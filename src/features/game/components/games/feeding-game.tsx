import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Presets } from 'react-native-pulsar';

import { FallingTreat } from '@/features/game/components/games/falling-treat';
import { GameHeader } from '@/features/game/components/games/game-header';

const FOODS = ['🍎', '🍕', '🍔', '🍰', '🍪', '🥕'];
const AREA = 360;

interface Treat {
  id: number;
  emoji: string;
  x: number;
}

interface FeedingGameProps {
  emoji: string;
  onComplete: (success: boolean) => void;
  onQuit: () => void;
}

export function FeedingGame({ emoji, onComplete, onQuit }: FeedingGameProps) {
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(20);
  const [treats, setTreats] = useState<Treat[]>([]);
  const next = useRef(0);
  const over = time <= 0;

  useEffect(() => {
    if (over) return;
    const tick = setInterval(() => setTime((t) => t - 1), 1000);
    const spawn = setInterval(() => {
      next.current += 1;
      const id = next.current;
      setTreats((list) => [...list, { id, emoji: FOODS[Math.floor(Math.random() * FOODS.length)]!, x: 10 + Math.random() * 80 }]);
    }, 1000);
    return () => {
      clearInterval(tick);
      clearInterval(spawn);
    };
  }, [over]);

  useEffect(() => {
    if (!over) return;
    setTreats([]);
    const t = setTimeout(() => onComplete(score >= 5), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  const drop = (id: number) => setTreats((list) => list.filter((t) => t.id !== id));

  return (
    <View className="gap-4">
      <Text className="text-center text-xl font-bold text-foreground">Feeding Time</Text>
      <Text className="text-center text-sm text-muted">Catch falling treats!</Text>
      <GameHeader left={`Score: ${score}`} right={`Time: ${Math.max(time, 0)}s`} onQuit={onQuit} />
      <View className="overflow-hidden rounded-2xl border border-border bg-surface" style={{ height: AREA }}>
        {treats.map((t) => (
          <FallingTreat
            key={t.id}
            emoji={t.emoji}
            x={t.x}
            height={AREA}
            onMiss={() => drop(t.id)}
            onCatch={() => {
              Presets.System.impactLight();
              setScore((s) => s + 1);
              drop(t.id);
            }}
          />
        ))}
        <View className="absolute bottom-2 left-0 right-0 items-center">
          <Text className="text-5xl">{emoji}</Text>
        </View>
        {over ? (
          <View className="absolute inset-0 items-center justify-center gap-2 bg-background/80 p-4">
            <Text className="text-center text-2xl font-bold text-foreground">🎉 Game Over! Score: {score}</Text>
            <Text className="text-center text-base text-muted">
              {score >= 5 ? 'Great job! +1 happiness' : 'Try to catch more next time!'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
