import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { depthScale, randomIn } from '@/features/game/utils/scene-depth';
import { durations, easings, springs } from '@/lib/motion';

/** A butterfly drifting over the lawn by day, wings flapping. */
export function Butterfly({ size, seed }: { size: number; seed: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(20 + seed * 25);
  const y = useSharedValue(30 + seed * 8);
  const flap = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    flap.set(withRepeat(withTiming(0.35, { duration: durations.flap, easing: easings.move }), -1, true));
    const drift = () => {
      x.set(withTiming(randomIn(8, 92), { duration: durations.drift, easing: easings.move }));
      y.set(withTiming(randomIn(20, 70), { duration: durations.drift, easing: easings.move }));
    };
    drift();
    const id = setInterval(drift, durations.drift);
    return () => {
      clearInterval(id);
      cancelAnimation(flap);
    };
  }, [reduced, x, y, flap]);
  const style = useAnimatedStyle(() => ({
    left: (x.get() / 100) * size,
    top: (y.get() / 100) * size,
    transform: [{ scale: depthScale(y.get()) }],
  }));
  const wings = useAnimatedStyle(() => ({ transform: [{ scaleX: flap.get() }] }));
  return (
    <Animated.View pointerEvents="none" style={[style, { zIndex: 500 }]} className="absolute">
      <Animated.Text style={wings} className="text-xl">
        🦋
      </Animated.Text>
    </Animated.View>
  );
}

/** A firefly glowing and wandering at night. */
export function Firefly({ size, seed }: { size: number; seed: number }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(randomIn(8, 92));
  const y = useSharedValue(randomIn(25, 85));
  const glow = useSharedValue(0.3);
  useEffect(() => {
    if (reduced) return;
    glow.set(withRepeat(withTiming(1, { duration: durations.breathe + seed * 200, easing: easings.move }), -1, true));
    const drift = () => {
      x.set(withTiming(randomIn(8, 92), { duration: durations.drift, easing: easings.move }));
      y.set(withTiming(randomIn(25, 85), { duration: durations.drift, easing: easings.move }));
    };
    const id = setInterval(drift, durations.drift);
    return () => {
      clearInterval(id);
      cancelAnimation(glow);
    };
  }, [reduced, seed, x, y, glow]);
  const style = useAnimatedStyle(() => ({ left: (x.get() / 100) * size, top: (y.get() / 100) * size, opacity: glow.get() }));
  return (
    <Animated.View pointerEvents="none" style={[style, { zIndex: 500 }]} className="absolute size-3 items-center justify-center rounded-full bg-firefly/30">
      <View className="size-1.5 rounded-full bg-firefly" />
    </Animated.View>
  );
}

/** One ring spreading across the water where it was tapped. */
export function Ripple({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withTiming(1, { duration: durations.ripple, easing: easings.enter }, (done) => {
        if (done) scheduleOnRN(onDone);
      }),
    );
  }, [p, onDone]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - p.get(), transform: [{ scaleX: 0.2 + p.get() * 2.4 }, { scaleY: 0.2 + p.get() * 1.2 }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ left: x - 24, top: y - 10 }, style]}
      className="absolute h-5 w-12 rounded-full border-2 border-white/80"
    />
  );
}

/** A water area (the pond or fountain) that ripples where you tap it. */
export function WaterZone({
  size,
  area,
  onTap,
}: {
  size: number;
  area: { left: number; top: number; width: number; height: number };
  onTap: (x: number, y: number) => void;
}) {
  const left = (area.left / 100) * size;
  const top = (area.top / 100) * size;
  const tap = Gesture.Tap().onEnd((e) => {
    scheduleOnRN(onTap, left + e.x, top + e.y);
  });
  return (
    <GestureDetector gesture={tap}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel="Touch the water"
        className="absolute"
        style={{ left, top, width: (area.width / 100) * size, height: (area.height / 100) * size, zIndex: 1 }}
      />
    </GestureDetector>
  );
}

/** The treat tray: drag the cookie onto a Flikkable to feed it. */
export function TreatTray({ size, onDrop }: { size: number; onDrop: (x: number, y: number) => void }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(1);
  const startX = 0.88 * size;
  const startY = 0.9 * size;
  const pan = Gesture.Pan()
    .onBegin(() => {
      lift.set(withSpring(1.3, springs.press));
    })
    .onUpdate((e) => {
      tx.set(e.translationX);
      ty.set(e.translationY);
    })
    .onEnd((e) => {
      scheduleOnRN(onDrop, ((startX + e.translationX) / size) * 100, ((startY + e.translationY) / size) * 100);
    })
    .onFinalize(() => {
      tx.set(withSpring(0, springs.settle));
      ty.set(withSpring(0, springs.settle));
      lift.set(withSpring(1, springs.press));
    });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: lift.get() }] }));
  return (
    <View className="absolute items-center" style={{ left: startX - 28, top: startY - 28, zIndex: 900 }}>
      <View className="size-14 items-center justify-center rounded-full border-2 border-white/60 bg-shade/40">
        <GestureDetector gesture={pan}>
          <Animated.View style={style} accessible accessibilityLabel="Treat. Drag it onto a Flikkable to feed it">
            <Text className="text-3xl">🍪</Text>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}
