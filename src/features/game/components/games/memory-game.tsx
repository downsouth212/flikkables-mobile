import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Presets } from 'react-native-pulsar';

import { Pressable } from '@/components/pressable';
import { GameHeader } from '@/features/game/components/games/game-header';
import { cn } from '@/lib/cn';

const SYMBOLS = ['🌟', '🎈', '🎨', '🎭', '🎪', '🎯', '🎲', '🎮'];

const shuffle = () =>
  [...SYMBOLS, ...SYMBOLS]
    .map((symbol, i) => ({ id: i, symbol, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, symbol }) => ({ id, symbol }));

interface MemoryGameProps {
  onComplete: (success: boolean) => void;
  onQuit: () => void;
}

export function MemoryGame({ onComplete, onQuit }: MemoryGameProps) {
  const [cards] = useState(shuffle);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const done = matched.length === cards.length;

  useEffect(() => {
    if (!done) return;
    Presets.System.notificationSuccess();
    const t = setTimeout(() => onComplete(true), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const flip = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;
    const open = [...flipped, index];
    setFlipped(open);
    if (open.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = open as [number, number];
    if (cards[a]!.symbol === cards[b]!.symbol) {
      setMatched((m) => [...m, a, b]);
      setFlipped([]);
      return;
    }
    setTimeout(() => setFlipped([]), 1000);
  };

  return (
    <View className="gap-4">
      <Text className="text-center text-xl font-bold text-foreground">Memory Match</Text>
      <Text className="text-center text-sm text-muted">Match the pairs!</Text>
      <GameHeader left={`Moves: ${moves}`} right={`Pairs: ${matched.length / 2}/8`} onQuit={onQuit} />
      <View className="flex-row flex-wrap justify-between gap-y-2">
        {cards.map((c, i) => {
          const shown = flipped.includes(i) || matched.includes(i);
          return (
            <View key={c.id} className="w-[23%]">
              <Pressable onPress={() => flip(i)} accessibilityLabel={shown ? c.symbol : 'Hidden card'}>
                <View
                  className={cn(
                    'aspect-square items-center justify-center rounded-xl border-2',
                    shown ? 'border-accent bg-surface' : 'border-border bg-accent',
                  )}
                >
                  <Text className="text-3xl">{shown ? c.symbol : '❓'}</Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
      {done ? (
        <View className="items-center gap-1">
          <Text className="text-center text-2xl font-bold text-foreground">🎉 Puzzle Complete!</Text>
          <Text className="text-center text-base text-muted">Finished in {moves} moves</Text>
          <Text className="text-center text-base text-success">+1 happiness</Text>
        </View>
      ) : null}
    </View>
  );
}
