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

import { Colors, Fonts } from '@/constants/theme';
import { durations, easings, fadeIn, springs, timing } from '@/lib/motion';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import type { Flikkable } from '@/features/game/types/game';
import { RARITY_LABEL, RARITY_TEXT } from '@/features/game/utils/rarity';
import { randomSaying } from '@/features/game/utils/sayings';
import { cn } from '@/lib/cn';

const FLING_DISTANCE = -120;
const FLING_VELOCITY = -900;
const RING_GLOW = { boxShadow: `0 0 32px ${Colors.dark.glow}66, inset 0 0 24px ${Colors.dark.neon}22` };

/**
 * The launch pad: drag the stamp and fling it upward to send it flikking.
 * The stamp follows the finger with a tilt, spins away off the top on release,
 * and drops back in once the server says where it landed.
 */
export function FlickPad({
  flikkable,
  onFlick,
}: {
  flikkable: Flikkable;
  /** Resolves when the flight is recorded; rejects on failure (the stamp returns). */
  onFlick: (saying: string) => Promise<void>;
}) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const spin = useSharedValue(0);
  const opacity = useSharedValue(1);
  const lift = useSharedValue(1);
  const [flying, setFlying] = useState(false);
  const [saying, setSaying] = useState(() => randomSaying());

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
    const line = randomSaying(saying);
    setSaying(line);
    setFlying(true);
    Presets.System.impactMedium();
    try {
      await onFlick(line);
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
        <Text className="text-xs tracking-widest text-neon" style={{ fontFamily: Fonts?.displaySemi }}>
          SWIPE UP TO FLIKK
        </Text>
        <Text className="text-lg text-neon">↑</Text>
      </Animated.View>
      {flying ? (
        <Animated.View entering={fadeIn} className="absolute top-0 z-10 rounded-xl border border-neon bg-background px-3 py-1.5">
          <Text className="text-base text-neon" style={{ fontFamily: Fonts?.display }}>
            {saying}
          </Text>
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={stampStyle}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Flikk ${flikkable.name}`}
          accessibilityHint="Sends it to a random city in the world"
          accessibilityActions={[{ name: 'activate', label: 'Flikk' }]}
          onAccessibilityAction={() => {
            if (!flying) void launch();
          }}
        >
          <CreatureStamp emoji={flikkable.emoji} templateID={flikkable.template_id} rarity={flikkable.rarity} size="xl" />
        </Animated.View>
      </GestureDetector>
      <View pointerEvents="none" className="h-3 w-40 rounded-full border border-glow bg-glow/20" style={RING_GLOW} />
      <View className="items-center gap-0.5">
        <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }}>
          {flikkable.name}
        </Text>
        <Text className={cn('text-sm font-semibold', RARITY_TEXT[flikkable.rarity])}>
          {RARITY_LABEL[flikkable.rarity]}
        </Text>
      </View>
    </View>
  );
}
