import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Presets } from 'react-native-pulsar';
import { scheduleOnRN } from 'react-native-worklets';

import { FlikkableFace } from '@/features/game/components/flikkable-face';
import type { Flikkable } from '@/features/game/types/game';
import { depthScale } from '@/features/game/utils/scene-depth';
import { durations, easings, springs } from '@/lib/motion';

export const GATE = { x: 79, y: 30 };
export const DOOR = { x: 16, y: 38 };

function inGate(x: number, y: number) {
  'worklet';
  return x > 66 && y < 52;
}

/** A Flikkable waiting on a lounge seat. Tap for its passport, drag it into the gate to board. */
export function AirportTraveler({
  f,
  seat,
  size,
  arriving,
  from,
  onPassport,
  onBoard,
  onDrag,
  onArrived,
}: {
  f: Flikkable;
  seat: { x: number; y: number };
  size: number;
  arriving: boolean;
  from: string;
  onPassport: (f: Flikkable) => void;
  onBoard: (f: Flikkable) => void;
  onDrag: (dragging: boolean) => void;
  onArrived: (f: Flikkable) => void;
}) {
  const x = useSharedValue(arriving ? DOOR.x : seat.x);
  const y = useSharedValue(arriving ? DOOR.y : seat.y);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const lift = useSharedValue(1);
  const fade = useSharedValue(1);
  const bob = useSharedValue(0);
  const pulse = useSharedValue(0);
  const [bubble, setBubble] = useState(arriving);

  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: durations.pulse, easing: easings.move }), -1, true));
    return () => cancelAnimation(pulse);
  }, [pulse]);

  useEffect(() => {
    if (!arriving) return;
    bob.set(withRepeat(withTiming(1, { duration: durations.step, easing: easings.move }), -1, true));
    x.set(withTiming(seat.x, { duration: durations.arrive * 2, easing: easings.move }));
    y.set(
      withTiming(seat.y, { duration: durations.arrive * 2, easing: easings.move }, (done) => {
        if (done) scheduleOnRN(onArrived, f);
      }),
    );
    const stop = setTimeout(() => bob.set(withTiming(0, { duration: durations.step, easing: easings.enter })), durations.arrive * 2);
    const hide = setTimeout(() => setBubble(false), durations.arrive * 4);
    return () => {
      clearTimeout(stop);
      clearTimeout(hide);
    };
    // Runs once, when the homecoming walk starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passport = () => onPassport(f);
  const board = () => {
    Presets.System.notificationSuccess();
    onBoard(f);
  };
  const dragStart = () => {
    Presets.System.selection();
    onDrag(true);
  };
  const dragEnd = () => onDrag(false);

  const tap = Gesture.Tap().onEnd(() => {
    scheduleOnRN(passport);
  });
  const pan = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      lift.set(withSpring(1.25, springs.press));
      scheduleOnRN(dragStart);
    })
    .onUpdate((e) => {
      dx.set(e.translationX);
      dy.set(e.translationY);
    })
    .onEnd((e) => {
      const px = x.get() + (e.translationX / size) * 100;
      const py = y.get() + (e.translationY / size) * 100;
      scheduleOnRN(dragEnd);
      if (inGate(px, py)) {
        x.set(px);
        y.set(py);
        dx.set(0);
        dy.set(0);
        x.set(withTiming(GATE.x, { duration: durations.board, easing: easings.exit }));
        y.set(withTiming(GATE.y, { duration: durations.board, easing: easings.exit }));
        lift.set(withTiming(0.3, { duration: durations.board, easing: easings.exit }));
        fade.set(
          withTiming(0, { duration: durations.board, easing: easings.exit }, (done) => {
            if (done) scheduleOnRN(board);
          }),
        );
        return;
      }
      dx.set(withSpring(0, springs.settle));
      dy.set(withSpring(0, springs.settle));
      lift.set(withSpring(1, springs.settle));
    });
  const gesture = Gesture.Exclusive(pan, tap);

  const style = useAnimatedStyle(() => ({
    left: (x.get() / 100) * size,
    top: (y.get() / 100) * size,
    zIndex: dx.get() !== 0 || dy.get() !== 0 ? 999 : Math.round(y.get() * 4) + 1,
    opacity: fade.get(),
    transform: [{ translateX: dx.get() - 28 }, { translateY: dy.get() - 66 }, { scale: depthScale(y.get()) * lift.get() }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.get() * 4 }, { rotate: `${(bob.get() - 0.5) * 6}deg` }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.4 + pulse.get() * 0.6, transform: [{ scale: 0.8 + pulse.get() * 0.4 }] }));

  return (
    <Animated.View style={style} className="absolute w-14 items-center">
      {bubble ? (
        <View pointerEvents="none" className="absolute -top-8 w-32 items-center">
          <View className="rounded-full bg-white px-2 py-1">
            <Text numberOfLines={1} className="text-xs font-bold text-shade">
              Back from {from}!
            </Text>
          </View>
        </View>
      ) : null}
      <GestureDetector gesture={gesture}>
        <View className="items-center" accessible accessibilityRole="button" accessibilityLabel={`${f.name}. Tap for passport, drag to the gate to board`}>
          <Animated.View style={[{ transformOrigin: 'bottom' }, bodyStyle]} className="flex-row items-end">
            <FlikkableFace emoji={f.emoji} templateID={f.template_id} size="text-4xl" />
            {arriving ? <Text className="text-lg">🧳</Text> : null}
          </Animated.View>
          {arriving ? <Text className="absolute -left-3 top-6 text-base">🎁</Text> : null}
          <View className="flex-row items-center gap-1">
            <Animated.View style={dotStyle} className="size-2 rounded-full bg-neon" />
            <Text className="text-xs font-semibold text-white" numberOfLines={1}>
              {f.name}
            </Text>
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}
