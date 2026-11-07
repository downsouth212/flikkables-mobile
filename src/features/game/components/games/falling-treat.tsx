import { useEffect } from 'react';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Pressable } from '@/components/pressable';
import { durations, easings } from '@/lib/motion';

interface FallingTreatProps {
  emoji: string;
  x: number;
  height: number;
  onCatch: () => void;
  onMiss: () => void;
}

export function FallingTreat({ emoji, x, height, onCatch, onMiss }: FallingTreatProps) {
  const y = useSharedValue(-48);

  useEffect(() => {
    y.set(withTiming(height, { duration: durations.fall, easing: easings.linear }));
    const t = setTimeout(onMiss, durations.fall);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <Animated.View style={[{ position: 'absolute', left: `${x}%`, top: 0 }, style]}>
      <Pressable onPress={onCatch} accessibilityLabel={`Catch ${emoji}`}>
        <Text className="text-4xl">{emoji}</Text>
      </Pressable>
    </Animated.View>
  );
}
