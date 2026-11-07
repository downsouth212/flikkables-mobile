import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Fonts } from '@/constants/theme';
import { durations, timing } from '@/lib/motion';

interface Point {
  x: number;
  y: number;
}

const RIDER = 36;
const BUBBLE_W = 150;
const STREAKS = [
  { len: 30, off: -7, color: Colors.dark.neon, phase: 1 },
  { len: 44, off: 0, color: Colors.dark.glow, phase: -1 },
  { len: 26, off: 7, color: Colors.dark.neon, phase: 1 },
];
const GLOW = { boxShadow: `0 0 14px ${Colors.dark.neon}88` };

function bezier(t: number, a: number, c: number, b: number) {
  'worklet';
  const u = 1 - t;
  return u * u * a + 2 * u * t * c + t * t * b;
}

function tangent(t: number, a: number, c: number, b: number) {
  'worklet';
  return 2 * (1 - t) * (c - a) + 2 * t * (b - c);
}

function Streak({ len, off, color, phase, flutter }: (typeof STREAKS)[number] & { flutter: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const f = flutter.get();
    return {
      width: len,
      transform: [{ translateY: off + phase * (f - 0.5) * 3 }, { scaleX: 0.7 + 0.3 * (phase > 0 ? f : 1 - f) }],
    };
  });
  return <Animated.View className="absolute h-0.5 rounded-full" style={[style, { right: 0, top: 7, backgroundColor: color }]} />;
}

/**
 * The Flikkable riding its flight arc: it glides along the curve in one unbroken move,
 * a wind trail fluttering behind it and a speech bubble shouting along beside it.
 */
export function FlightRider({
  progress,
  a,
  b,
  c,
  scale,
  width,
  emoji,
  saying,
}: {
  progress: SharedValue<number>;
  a: Point;
  b: Point;
  c: Point;
  scale: number;
  width: number;
  emoji: string;
  saying: string;
}) {
  const reduced = useReducedMotion();
  const flutter = useSharedValue(0);
  const bubble = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    flutter.set(withRepeat(withTiming(1, { duration: durations.flutter, easing: Easing.linear }), -1, true));
    bubble.set(withTiming(1, timing.enter));
    return () => cancelAnimation(flutter);
  }, [reduced, flutter, bubble, saying]);

  const riderStyle = useAnimatedStyle(() => {
    const t = progress.get();
    const x = bezier(t, a.x, c.x, b.x) * scale;
    const y = bezier(t, a.y, c.y, b.y) * scale;
    const lean = Math.max(-18, Math.min(18, (tangent(t, a.y, c.y, b.y) / 4) * (b.x >= a.x ? 1 : -1)));
    return {
      transform: [
        { translateX: x - RIDER / 2 },
        { translateY: y - RIDER / 2 },
        { rotate: `${lean + (flutter.get() - 0.5) * 6 * (1 - t)}deg` },
      ],
    };
  });

  const trailStyle = useAnimatedStyle(() => {
    const t = progress.get();
    const angle = Math.atan2(tangent(t, a.y, c.y, b.y), tangent(t, a.x, c.x, b.x));
    return {
      opacity: t >= 1 ? 0 : Math.min(1, t * 8),
      transform: [{ rotate: `${angle}rad` }],
    };
  });

  const bubbleStyle = useAnimatedStyle(() => {
    const t = progress.get();
    const x = bezier(t, a.x, c.x, b.x) * scale;
    const y = bezier(t, a.y, c.y, b.y) * scale;
    const above = y > 52;
    return {
      opacity: bubble.get(),
      transform: [
        { translateX: Math.max(4, Math.min(width - BUBBLE_W - 4, x - BUBBLE_W / 2)) },
        { translateY: above ? y - RIDER / 2 - 34 : y + RIDER / 2 + 4 },
        { scale: 0.85 + 0.15 * bubble.get() },
      ],
    };
  });

  return (
    <>
      <Animated.View pointerEvents="none" className="absolute left-0 top-0" style={[{ width: RIDER, height: RIDER }, riderStyle]}>
        <Animated.View className="absolute inset-0 items-center justify-center" style={trailStyle}>
          <View className="absolute h-4 w-12" style={{ right: RIDER / 2 + 2 }}>
            {STREAKS.map((s) => (
              <Streak key={s.off} {...s} flutter={flutter} />
            ))}
          </View>
        </Animated.View>
        <View className="size-9 items-center justify-center rounded-full border-2 border-neon bg-surface" style={GLOW}>
          <Text className="text-lg">{emoji}</Text>
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        className="absolute left-0 top-0 rounded-xl border border-neon bg-background px-2.5 py-1.5"
        style={[{ width: BUBBLE_W }, bubbleStyle]}
      >
        <Text className="text-center text-xs text-neon" style={{ fontFamily: Fonts?.display }} numberOfLines={2}>
          {saying}
        </Text>
      </Animated.View>
    </>
  );
}
