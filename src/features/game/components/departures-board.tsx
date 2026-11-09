import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Fonts } from '@/constants/theme';
import type { Flikkable } from '@/features/game/types/game';
import { cityOf, timeUntil } from '@/features/game/utils/geo';
import { durations, easings } from '@/lib/motion';

function FlapCell({ text, delay, className }: { text: string; delay: number; className?: string }) {
  const r = useSharedValue(90);
  useEffect(() => {
    r.set(
      withDelay(
        delay,
        withSequence(
          withTiming(0, { duration: durations.flap, easing: easings.enter }),
          withTiming(90, { duration: durations.flap, easing: easings.exit }),
          withTiming(0, { duration: durations.flap, easing: easings.enter }),
        ),
      ),
    );
  }, [text, delay, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ perspective: 400 }, { rotateX: `${r.get()}deg` }] }));
  return (
    <Animated.View style={style} className={className}>
      <View className="rounded bg-shade/60 px-1.5 py-1">
        <Text numberOfLines={1} className="text-xs font-bold tracking-widest text-board-ink" style={{ fontFamily: Fonts?.mono }}>
          {text.toUpperCase()}
        </Text>
      </View>
    </Animated.View>
  );
}

function statusOf(f: Flikkable) {
  if (f.status === 'picked_up') return `With ${f.picked_up_by_name ?? 'a finder'}`;
  const eta = f.return_ready_at ? timeUntil(f.return_ready_at) : null;
  return eta ? `Home in ${eta}` : 'Landed';
}

/** The terminal's split-flap departures board: every Flikkable out in the world, where it is now. */
export function DeparturesBoard({ away }: { away: Flikkable[] }) {
  return (
    <View className="gap-2 rounded-2xl border border-border bg-board p-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold tracking-widest text-board-ink" style={{ fontFamily: Fonts?.mono }}>
          ✈ IN FLIGHT
        </Text>
        <Text className="text-xs font-semibold tracking-widest text-board-ink/70" style={{ fontFamily: Fonts?.mono }}>
          {away.length} OUT
        </Text>
      </View>
      <View className="flex-row gap-2">
        {['Flikkable', 'Now at', 'Status'].map((h) => (
          <Text key={h} className="flex-1 text-xs tracking-widest text-board-ink/60" style={{ fontFamily: Fonts?.mono }}>
            {h.toUpperCase()}
          </Text>
        ))}
      </View>
      {away.length === 0 ? (
        <Text className="py-2 text-center text-xs tracking-widest text-board-ink/70" style={{ fontFamily: Fonts?.mono }}>
          NO FLIGHTS. DRAG A FLIKKABLE TO THE GATE.
        </Text>
      ) : (
        away.slice(0, 8).map((f, i) => (
          <View key={f.id} className="flex-row gap-2">
            <FlapCell className="flex-1" text={`${f.emoji} ${f.name}`} delay={i * durations.flap * 2} />
            <FlapCell className="flex-1" text={cityOf(f.current_place) || f.current_place} delay={i * durations.flap * 2 + durations.flap} />
            <FlapCell className="flex-1" text={statusOf(f)} delay={i * durations.flap * 2 + durations.flap * 2} />
          </View>
        ))
      )}
    </View>
  );
}
