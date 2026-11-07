import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations, easings } from '@/lib/motion';

export const SPIN_LABELS = ['5🛂', '🌸', '10🛂', '🌸', '20🛂', '🌸', '⭐'];
const SIZE = 256;
const SEG = 360 / SPIN_LABELS.length;

interface SpinWheelProps {
  /** The segment the server picked; null while idle. */
  target: number | null;
  onDone: () => void;
}

export function SpinWheel({ target, onDone }: SpinWheelProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (target === null) return;
    rotation.set(0);
    rotation.set(withTiming(5 * 360 + (360 - (target * SEG + SEG / 2)), { duration: durations.spin, easing: easings.enter }));
    const t = setTimeout(onDone, durations.spin);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));

  return (
    <View className="items-center gap-1">
      <Text className="text-3xl text-danger">▼</Text>
      <Animated.View
        className="items-center justify-center rounded-full border-4 border-accent bg-surface"
        style={[{ width: SIZE, height: SIZE }, style]}
      >
        {SPIN_LABELS.map((label, i) => {
          const angle = ((i * SEG + SEG / 2) * Math.PI) / 180;
          const r = SIZE / 2 - 36;
          return (
            <View
              key={i}
              className="absolute size-12 items-center justify-center rounded-full bg-accent/15"
              style={{ left: SIZE / 2 - 28 + r * Math.sin(angle), top: SIZE / 2 - 28 - r * Math.cos(angle) }}
            >
              <Text className="text-base font-bold text-foreground">{label}</Text>
            </View>
          );
        })}
        <Text className="text-3xl">🎰</Text>
      </Animated.View>
    </View>
  );
}
