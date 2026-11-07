import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Presets } from 'react-native-pulsar';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Fonts } from '@/constants/theme';
import { durations, easings, springs, timing } from '@/lib/motion';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import type { Flikkable } from '@/features/game/types/game';
import { RARITY_LABEL, RARITY_TEXT } from '@/features/game/utils/rarity';
import { cn } from '@/lib/cn';

const FLING_DISTANCE = -120;
const FLING_VELOCITY = -900;

/**
 * The launch pad: drag the stamp and fling it upward to send it flying.
 * The stamp follows the finger with a tilt, spins away off the top on release,
 * and drops back in once the server says where it landed.
 */
export function FlickPad({
  flikkable,
  onFlick,
}: {
  flikkable: Flikkable;
  /** Resolves when the flight is recorded; rejects on failure (the stamp returns). */
  onFlick: () => Promise<void>;
}) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const spin = useSharedValue(0);
  const opacity = useSharedValue(1);
  const lift = useSharedValue(1);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    x.set(0);
    y.set(0);
    spin.set(0);
    opacity.set(1);
  }, [flikkable.id, x, y, spin, opacity]);

  const land = () => {
    x.set(0);
    spin.set(0);
    y.set(reduced ? 0 : 60);
    opacity.set(0);
    opacity.set(withTiming(1, timing.enter));
    y.set(withSpring(0, springs.settle));
  };

  const launch = async () => {
    setFlying(true);
    Presets.System.impactMedium();
    try {
      await onFlick();
    } catch {
      Presets.System.notificationError();
    } finally {
      setFlying(false);
      land();
    }
  };

  const pan = Gesture.Pan()
    .enabled(!flying)
    .onBegin(() => {
      lift.set(withSpring(1.06, springs.press));
    })
    .onChange((e) => {
      x.set(e.translationX);
      y.set(Math.min(e.translationY, 40));
    })
    .onEnd((e) => {
      lift.set(withSpring(1, springs.press));
      const flung = e.translationY < FLING_DISTANCE || e.velocityY < FLING_VELOCITY;
      if (!flung) {
        x.set(withSpring(0, springs.settle));
        y.set(withSpring(0, springs.settle));
        return;
      }
      const flight = { duration: durations.draw, easing: easings.exit };
      y.set(withTiming(-900, flight));
      x.set(withTiming(e.translationX + e.velocityX * 0.25, flight));
      spin.set(withTiming(e.velocityX >= 0 ? 540 : -540, flight));
      opacity.set(withTiming(0, flight));
      scheduleOnRN(launch);
    });

  const stampStyle = useAnimatedStyle(() => {
    const tilt = interpolate(x.get(), [-200, 200], [-14, 14]);
    const pitch = interpolate(y.get(), [-200, 0, 40], [18, 0, -6]);
    return {
      opacity: opacity.get(),
      transform: [
        { perspective: 600 },
        { translateX: x.get() },
        { translateY: y.get() },
        { rotateX: `${pitch}deg` },
        { rotateZ: `${tilt + spin.get()}deg` },
        { scale: lift.get() },
      ],
    };
  });

  const hintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.get(), [-80, 0], [0, 1], 'clamp'),
  }));

  return (
    <View className="items-center gap-4 py-2">
      <Animated.View style={hintStyle} className="items-center gap-1">
        <Text className="text-xs font-semibold tracking-widest text-muted" style={{ fontFamily: Fonts?.mono }}>
          {flying ? 'IN FLIGHT…' : 'SWIPE UP TO FLICK'}
        </Text>
        <Text className="text-lg text-muted">↑</Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={stampStyle}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Flick ${flikkable.name}`}
          accessibilityHint="Sends it to a random city in the world"
          accessibilityActions={[{ name: 'activate', label: 'Flick' }]}
          onAccessibilityAction={() => {
            if (!flying) void launch();
          }}
        >
          <CreatureStamp emoji={flikkable.emoji} rarity={flikkable.rarity} size="xl" />
        </Animated.View>
      </GestureDetector>
      <View className="items-center gap-0.5">
        <Text className="text-2xl font-black text-foreground" style={{ fontFamily: Fonts?.rounded }}>
          {flikkable.name}
        </Text>
        <Text className={cn('text-sm font-semibold', RARITY_TEXT[flikkable.rarity])}>
          {RARITY_LABEL[flikkable.rarity]}
        </Text>
      </View>
    </View>
  );
}
