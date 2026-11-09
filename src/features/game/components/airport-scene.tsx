import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AirportTraveler, GATE } from '@/features/game/components/airport-traveler';
import { SceneBackdrop, type SceneItem } from '@/features/game/components/scene-backdrop';
import { useArrivalsStore } from '@/features/game/store/arrivals-store';
import type { Flikkable } from '@/features/game/types/game';
import { cityOf } from '@/features/game/utils/geo';
import { depthScale } from '@/features/game/utils/scene-depth';
import { durations, easings } from '@/lib/motion';

const SEATS = [
  { x: 22, y: 58 },
  { x: 42, y: 58 },
  { x: 62, y: 58 },
  { x: 18, y: 74 },
  { x: 40, y: 74 },
  { x: 62, y: 74 },
  { x: 22, y: 89 },
  { x: 44, y: 89 },
  { x: 66, y: 89 },
] as const;

/** A lounge seat drawn in depth: backrest, cushion and a floor shadow. */
function Seat({ x, y }: { x: number; y: number }) {
  return (
    <View
      pointerEvents="none"
      className="absolute items-center"
      style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y * 4), transform: [{ translateX: -30 }, { translateY: -34 }, { scale: depthScale(y) }] }}
    >
      <View className="h-6 w-14 rounded-t-xl border border-glow/60 bg-land" />
      <View className="h-3 w-16 rounded-md bg-glow/70" />
      <View className="flex-row gap-8">
        <View className="h-3 w-1 bg-shade/70" />
        <View className="h-3 w-1 bg-shade/70" />
      </View>
      <View className="h-2 w-16 rounded-full bg-shade/40" />
    </View>
  );
}

/** A plane climbing out past the gate after a boarding. */
function Takeoff({ run }: { run: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!run) return;
    p.set(0);
    p.set(withTiming(1, { duration: durations.takeoff, easing: easings.exit }));
  }, [run, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.get() > 0 && p.get() < 1 ? 1 : 0,
    transform: [{ translateX: p.get() * 140 }, { translateY: -p.get() * 120 }, { scale: 0.8 + p.get() * 0.8 }, { rotate: '-20deg' }],
  }));
  return (
    <Animated.Text pointerEvents="none" style={[{ left: `${GATE.x - 4}%`, top: `${GATE.y - 8}%`, zIndex: 1000 }, style]} className="absolute text-4xl">
      ✈️
    </Animated.Text>
  );
}

/** The terminal lounge: seated Flikkables, the boarding gate on the right, arrivals on the left. */
export function AirportScene({
  characters,
  items,
  onPassport,
  onBoard,
}: {
  characters: Flikkable[];
  items: SceneItem[];
  onPassport: (f: Flikkable) => void;
  onBoard: (f: Flikkable) => void;
}) {
  const [size, setSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [boarded, setBoarded] = useState<string[]>([]);
  const [takeoffs, setTakeoffs] = useState(0);
  const seen = useArrivalsStore((s) => s.seen);
  const markSeen = useArrivalsStore((s) => s.markSeen);
  // Snapshot who is coming home when the lounge opens, so the walk plays once.
  const [arriving] = useState(() =>
    new Set(characters.filter((f) => f.times_returned > 0 && f.times_returned > (seen[f.id] ?? 0)).slice(0, 3).map((f) => f.id)),
  );
  const seated = characters.filter((f) => !boarded.includes(f.id)).slice(0, SEATS.length);

  const board = (f: Flikkable) => {
    setBoarded((all) => [...all, f.id]);
    setTakeoffs((n) => n + 1);
    setTimeout(() => onBoard(f), durations.takeoff);
  };

  return (
    <View className="gap-2">
      <SceneBackdrop backdrop="airport" items={items} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
        <View
          pointerEvents="none"
          className={dragging ? 'absolute items-center justify-center rounded-2xl border-4 border-neon bg-neon/20' : 'absolute items-center justify-center'}
          style={{ left: '66%', top: '14%', width: '28%', height: '30%', zIndex: 2 }}
        >
          {dragging ? <Text className="text-center text-xs font-bold text-white">Drop to board</Text> : null}
        </View>
        {SEATS.map((s) => (
          <Seat key={`${s.x}-${s.y}`} x={s.x} y={s.y} />
        ))}
        {size
          ? seated.map((f, i) => (
              <AirportTraveler
                key={f.id}
                f={f}
                seat={SEATS[i]}
                size={size}
                arriving={arriving.has(f.id)}
                from={cityOf(f.places[f.places.length - 1] ?? '') || 'the world'}
                onPassport={onPassport}
                onBoard={board}
                onDrag={setDragging}
                onArrived={(a) => markSeen(a.id, a.times_returned)}
              />
            ))
          : null}
        <Takeoff run={takeoffs} />
      </SceneBackdrop>
      <Text className="text-center text-sm text-muted">Tap a Flikkable for its passport · drag it into the glowing gate to board</Text>
      {characters.length === 0 ? (
        <Text className="text-center text-sm text-muted">The lounge is empty. Move Flikkables here from the Garden.</Text>
      ) : null}
    </View>
  );
}
