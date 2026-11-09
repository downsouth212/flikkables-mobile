import { useEffect, type RefObject } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Presets } from 'react-native-pulsar';
import { scheduleOnRN } from 'react-native-worklets';

import { FlikkableFace } from '@/features/game/components/flikkable-face';
import type { Flikkable } from '@/features/game/types/game';
import { depthScale, GROUND, randomIn } from '@/features/game/utils/scene-depth';
import { durations, easings, springs } from '@/lib/motion';

export type PositionRegistry = Map<string, { x: SharedValue<number>; y: SharedValue<number> }>;

const G = GROUND.garden;

function Snooze({ index }: { index: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(index * (durations.snooze / 3), withRepeat(withTiming(1, { duration: durations.snooze, easing: easings.linear }), -1, false)));
    return () => cancelAnimation(p);
  }, [index, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.get() < 0.2 ? p.get() * 5 : 1 - (p.get() - 0.2) / 0.8,
    transform: [{ translateY: -p.get() * 34 }, { translateX: p.get() * 14 + Math.sin(p.get() * 6) * 3 }, { scale: 0.7 + p.get() * 0.6 }],
  }));
  return (
    <Animated.Text style={style} className="absolute right-0 top-0 text-sm font-bold text-white">
      z
    </Animated.Text>
  );
}

function Heart({ index, h }: { index: number; h: SharedValue<number> }) {
  const dx = (index - 1) * 16;
  const style = useAnimatedStyle(() => ({
    opacity: h.get() > 0 && h.get() < 1 ? 1 - h.get() : 0,
    transform: [{ translateX: dx * h.get() }, { translateY: -h.get() * (40 + index * 8) }, { scale: 0.6 + h.get() * 0.6 }],
  }));
  return (
    <Animated.Text pointerEvents="none" style={style} className="absolute top-0 text-lg">
      💖
    </Animated.Text>
  );
}

/** A Flikkable living in the garden: strolls by day, sleeps at night, loves being petted. */
export function GardenWanderer({
  f,
  size,
  night,
  index,
  registry,
  onPet,
  onDetails,
}: {
  f: Flikkable;
  size: number;
  night: boolean;
  index: number;
  registry: RefObject<PositionRegistry>;
  onPet: (f: Flikkable) => void;
  onDetails: (f: Flikkable) => void;
}) {
  const reduced = useReducedMotion();
  const x = useSharedValue(G.left + ((index % 4) + 0.5) * ((G.right - G.left) / 4));
  const y = useSharedValue(G.top + 4 + ((index * 7) % 30));
  const facing = useSharedValue(1);
  const bob = useSharedValue(0);
  const pop = useSharedValue(1);
  const jump = useSharedValue(0);
  const breathe = useSharedValue(0);
  const hearts = useSharedValue(0);

  useEffect(() => {
    const map = registry.current;
    map?.set(f.id, { x, y });
    const forget = () => {
      map?.delete.call(map, f.id);
    };
    return forget;
  }, [f.id, registry, x, y]);

  useEffect(() => {
    if (night || reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const stroll = () => {
      const tx = randomIn(G.left, G.right);
      const ty = randomIn(G.top, G.bottom);
      facing.set(tx < x.get() ? -1 : 1);
      x.set(withTiming(tx, { duration: durations.wander, easing: easings.move }));
      y.set(withTiming(ty, { duration: durations.wander, easing: easings.move }));
      bob.set(withRepeat(withTiming(1, { duration: durations.step, easing: easings.move }), -1, true));
      timer = setTimeout(() => {
        bob.set(withTiming(0, { duration: durations.step, easing: easings.enter }));
        timer = setTimeout(stroll, randomIn(1500, 4000));
      }, durations.wander);
    };
    timer = setTimeout(stroll, randomIn(300, 2500));
    return () => {
      clearTimeout(timer);
      cancelAnimation(x);
      cancelAnimation(y);
      bob.set(0);
    };
  }, [night, reduced, x, y, facing, bob]);

  useEffect(() => {
    if (!night || reduced) return;
    breathe.set(withRepeat(withTiming(1, { duration: durations.breathe, easing: easings.move }), -1, true));
    return () => cancelAnimation(breathe);
  }, [night, reduced, breathe]);

  const pet = () => {
    Presets.System.notificationSuccess();
    onPet(f);
  };
  const details = () => onDetails(f);

  const tap = Gesture.Tap()
    .hitSlop(12)
    .onBegin(() => {
      // Stop mid-stroll the moment a finger lands, so a walking Flikkable is easy to pet.
      cancelAnimation(x);
      cancelAnimation(y);
    })
    .onEnd(() => {
    pop.set(withSequence(withSpring(1.22, springs.press), withSpring(1, springs.settle)));
    jump.set(withSequence(withTiming(-14, { duration: durations.fast, easing: easings.enter }), withSpring(0, springs.settle)));
    hearts.set(0);
    hearts.set(withTiming(1, { duration: durations.hearts, easing: easings.enter }));
    scheduleOnRN(pet);
  });
  const hold = Gesture.LongPress()
    .hitSlop(12)
    .onBegin(() => {
      cancelAnimation(x);
      cancelAnimation(y);
    })
    .onStart(() => {
    scheduleOnRN(details);
  });
  const gesture = Gesture.Exclusive(hold, tap);

  const style = useAnimatedStyle(() => {
    const depth = depthScale(y.get());
    return {
      left: (x.get() / 100) * size,
      top: (y.get() / 100) * size,
      zIndex: Math.round(y.get() * 4),
      transform: [{ translateX: -28 }, { translateY: -64 }, { scale: depth * pop.get() }],
    };
  });
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: jump.get() - bob.get() * 4 },
      { scaleX: facing.get() },
      { rotate: night ? '-10deg' : `${(bob.get() - 0.5) * 6}deg` },
      { scale: night ? 1 + breathe.get() * 0.05 : 1 },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 - bob.get() * 0.15 + (jump.get() / 14) * 0.3 }] }));

  return (
    <Animated.View style={style} className="absolute w-14 items-center">
      <GestureDetector gesture={gesture}>
        <View className="items-center" accessible accessibilityRole="button" accessibilityLabel={`Pet ${f.name}`}>
          <Animated.View style={[{ transformOrigin: 'bottom' }, bodyStyle]} className={night ? 'opacity-90' : undefined}>
            <FlikkableFace emoji={f.emoji} templateID={f.template_id} size="text-4xl" />
          </Animated.View>
          <Animated.View style={shadowStyle} className="h-2 w-9 rounded-full bg-shade/40" />
          <Text className="text-xs font-semibold text-white" numberOfLines={1}>
            {f.name}
          </Text>
        </View>
      </GestureDetector>
      {night ? (
        <View pointerEvents="none" className="absolute -right-2 -top-3 h-10 w-8">
          {[0, 1, 2].map((i) => (
            <Snooze key={i} index={i} />
          ))}
        </View>
      ) : null}
      <View pointerEvents="none" className="absolute top-0 items-center">
        {[0, 1, 2].map((i) => (
          <Heart key={i} index={i} h={hearts} />
        ))}
      </View>
    </Animated.View>
  );
}
