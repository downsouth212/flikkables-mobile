import { Button } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Presets } from 'react-native-pulsar';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import { Fonts } from '@/constants/theme';
import { durations, springs, timing } from '@/lib/motion';
import { AirmailStripe } from '@/features/game/components/airmail-stripe';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import { Postmark } from '@/features/game/components/postmark';
import { WorldMap } from '@/features/game/components/world-map';
import type { Flikkable, Landing } from '@/features/game/types/game';
import { formatKm } from '@/features/game/utils/geo';
import { randomSaying } from '@/features/game/utils/sayings';

const STAMP_AT = durations.flight;

function useCountUp(target: number, delay: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / durations.draw));
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, delay]);
  return value;
}

/** The postcard that slides up after a flick: the flight arc draws, the postmark thumps on. */
export function LandingCard({
  landing,
  flikkable,
  onDone,
  onOpen,
  saying: line,
}: {
  /** What the Flikkable shouted on take-off; it keeps shouting it across the map. */
  saying?: string;
  landing: Landing;
  flikkable: Flikkable;
  onDone: () => void;
  onOpen: () => void;
}) {
  const reduced = useReducedMotion();
  const [saying] = useState(() => line ?? randomSaying());
  const rise = useSharedValue(reduced ? 0 : 80);
  const fade = useSharedValue(0);
  const mark = useSharedValue(reduced ? 1 : 0);
  const stamps = useCountUp(landing.stamps, reduced ? 0 : STAMP_AT);
  const before = flikkable.total_km - landing.km;
  const crossedBronze = before < 20_000 && flikkable.total_km >= 20_000;
  const seal = useSharedValue(0);
  const celebrate = () => Presets.System.notificationSuccess();

  useEffect(() => {
    fade.set(withTiming(1, timing.enter));
    rise.set(withSpring(0, springs.settle));
    if (reduced) {
      Presets.System.notificationSuccess();
      seal.set(1);
      return;
    }
    mark.set(
      withDelay(
        STAMP_AT,
        withSpring(1, springs.settle, (finished) => {
          if (finished) scheduleOnRN(celebrate);
        }),
      ),
    );
    seal.set(withDelay(STAMP_AT + durations.draw, withSpring(1, springs.settle)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fade, rise, mark, seal, reduced]);

  const sheetStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateY: rise.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.get(),
    transform: [{ scale: 1.4 - 0.4 * mark.get() }, { rotate: `${-14 + 6 * mark.get()}deg` }],
  }));
  const sealStyle = useAnimatedStyle(() => ({ opacity: seal.get(), transform: [{ scale: 0.6 + 0.4 * seal.get() }] }));

  return (
    <View className="absolute inset-0 justify-end px-4 pb-safe-offset-22">
      <Animated.View style={backdropStyle} className="absolute inset-0 bg-black/40" />
      <Animated.View style={sheetStyle}>
        <Card>
          <View className="-mx-4 -mt-4 overflow-hidden rounded-t-2xl">
            <AirmailStripe height={10} />
          </View>
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-xs tracking-widest text-muted" style={{ fontFamily: Fonts?.displaySemi }}>
                GREETINGS FROM
              </Text>
              <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }} numberOfLines={2}>
                {landing.city}
              </Text>
              <Text className="text-base text-muted">
                {flikkable.name} landed in {landing.country}
              </Text>
            </View>
            <CreatureStamp emoji={flikkable.emoji} rarity={flikkable.rarity} size="sm" edge="surface" />
          </View>
          <WorldMap
            arcs={[{ key: 'flight', from: { lat: landing.from_lat, lng: landing.from_lng }, to: landing }]}
            playKey="flight"
            rider={{ emoji: flikkable.emoji, saying }}
          />
          <View className="flex-row items-center justify-between gap-3">
            <Animated.View style={markStyle}>
              <Postmark top={landing.city} bottom={`${formatKm(landing.km)}`} />
            </Animated.View>
            <View className="items-end">
              <Text className="text-3xl text-accent" style={{ fontFamily: Fonts?.display }}>
                +{stamps}
              </Text>
              <Text className="text-sm text-muted">stamps</Text>
            </View>
          </View>
          {crossedBronze ? (
            <Animated.View style={sealStyle} className="flex-row items-center gap-3 rounded-xl bg-gold/15 p-3">
              <Text className="text-3xl">⭐</Text>
              <Text className="flex-1 text-base font-semibold text-foreground">
                {flikkable.name} has flown 20,000 km. Bronze distance star earned!
              </Text>
            </Animated.View>
          ) : null}
          <View className="flex-row gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => {
                pressHaptic();
                onOpen();
              }}
            >
              <Button.Label>See its journey</Button.Label>
            </Button>
            <Button
              className="flex-1"
              onPress={() => {
                pressHaptic();
                onDone();
              }}
            >
              <Button.Label>Done</Button.Label>
            </Button>
          </View>
        </Card>
      </Animated.View>
    </View>
  );
}
