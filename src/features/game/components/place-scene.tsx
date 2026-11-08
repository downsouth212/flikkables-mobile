import { FlikkableFace } from '@/features/game/components/flikkable-face';
import { useEffect, useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Pressable } from '@/components/pressable';
import { cn } from '@/lib/cn';
import { durations, easings } from '@/lib/motion';
import type { Flikkable, PlaceKind } from '@/features/game/types/game';
import { RARITY_BORDER } from '@/features/game/utils/rarity';

export interface SceneItem {
  id: string;
  emoji: string;
  name: string;
  x: number;
  y: number;
}

const BACKDROP: Record<PlaceKind, { emoji: string; x: number; y: number }[]> = {
  garden: [
    { emoji: '🌳', x: 6, y: 8 },
    { emoji: '🌲', x: 84, y: 6 },
    { emoji: '🌴', x: 90, y: 70 },
    { emoji: '🌸', x: 20, y: 82 },
    { emoji: '🌺', x: 62, y: 88 },
    { emoji: '🌻', x: 4, y: 52 },
    { emoji: '⛲', x: 46, y: 6 },
    { emoji: '🪑', x: 30, y: 30 },
    { emoji: '🪑', x: 70, y: 40 },
  ],
  airport: [
    { emoji: '✈️', x: 8, y: 6 },
    { emoji: '🛫', x: 46, y: 4 },
    { emoji: '🛬', x: 84, y: 6 },
    { emoji: '🌍', x: 90, y: 46 },
    { emoji: '🗓️', x: 4, y: 46 },
    { emoji: 'ℹ️', x: 30, y: 90 },
    { emoji: '🚻', x: 60, y: 90 },
    { emoji: '🧳', x: 86, y: 88 },
    { emoji: '🎒', x: 6, y: 88 },
  ],
};

const SEATS = [20, 40, 60, 80].flatMap((x) => [25, 50, 75].map((y) => ({ x, y })));
const TILE = { garden: 64, airport: 48 } as const;

function Wanderer({ f, width, height, onPress }: { f: Flikkable; width: number; height: number; onPress?: () => void }) {
  const x = useSharedValue(Math.random() * Math.max(0, width - TILE.garden));
  const y = useSharedValue(Math.random() * Math.max(0, height - TILE.garden - 20));
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (!width) return undefined;
    tilt.set(withRepeat(withSequence(withTiming(-4, { duration: durations.sway, easing: easings.move }), withTiming(4, { duration: durations.sway, easing: easings.move })), -1, true));
    let timer: ReturnType<typeof setTimeout>;
    const stroll = () => {
      x.set(withTiming(Math.random() * Math.max(0, width - TILE.garden), { duration: durations.wander, easing: easings.move }));
      y.set(withTiming(Math.random() * Math.max(0, height - TILE.garden - 20), { duration: durations.wander, easing: easings.move }));
      timer = setTimeout(stroll, 6000 + Math.random() * 4000);
    };
    stroll();
    return () => clearTimeout(timer);
  }, [width, height, x, y, tilt]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${tilt.get()}deg` }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <Pressable onPress={onPress} accessibilityLabel={f.name}>
        <View className="items-center gap-1">
          <View className={cn('size-16 items-center justify-center rounded-2xl border-2 bg-background', RARITY_BORDER[f.rarity])}>
            <FlikkableFace emoji={f.emoji} templateID={f.template_id} size="text-4xl" />
            <View className="absolute -right-2 -top-2 rounded-full bg-surface px-1">
              <Text className="text-xs text-foreground">❤️ {f.happiness}</Text>
            </View>
          </View>
          <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
            {f.name}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Seated({ f, x, y, onPress }: { f: Flikkable; x: number; y: number; onPress?: () => void }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(0.3, { duration: durations.pulse, easing: easings.move }), -1, true));
  }, [pulse]);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <View style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: [{ translateX: -24 }, { translateY: -24 }] }}>
      <Pressable onPress={onPress} accessibilityLabel={f.name}>
        <View className="items-center">
          <View className={cn('size-12 items-center justify-center rounded-xl border-2 bg-background', RARITY_BORDER[f.rarity])}>
            <FlikkableFace emoji={f.emoji} templateID={f.template_id} size="text-2xl" />
            <Animated.View className="absolute -right-1 -top-1 size-3 rounded-full bg-success" style={dot} />
          </View>
          <Text className="text-base">🪑</Text>
        </View>
      </Pressable>
    </View>
  );
}

/** The web GardenDisplay / AirportLounge scenes, also the Customizer's placement canvas. */
export function PlaceScene({
  kind,
  characters,
  items,
  onCharacterPress,
  onCanvasPress,
  onItemPress,
}: {
  kind: PlaceKind;
  characters: Flikkable[];
  items: SceneItem[];
  onCharacterPress?: (f: Flikkable) => void;
  /** Customizer: tap a spot to place the selected item there (percent coordinates). */
  onCanvasPress?: (x: number, y: number) => void;
  onItemPress?: (item: SceneItem) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const tap = (e: GestureResponderEvent) => {
    if (!onCanvasPress || !size.width) return;
    const clamp = (v: number) => Math.max(5, Math.min(95, v));
    onCanvasPress(clamp((e.nativeEvent.locationX / size.width) * 100), clamp((e.nativeEvent.locationY / size.height) * 100));
  };

  return (
    <View className="gap-2">
      <View
        className={cn('h-80 overflow-hidden rounded-2xl border-2', kind === 'garden' ? 'border-success bg-success/15' : 'border-navy bg-navy/15')}
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => !!onCanvasPress}
        onResponderRelease={tap}
      >
        {kind === 'airport' ? (
          <>
            <View className="absolute left-0 right-0 top-1/2 h-px bg-border" />
            <View className="absolute left-0 right-0 top-1/3 h-px bg-border" />
          </>
        ) : null}
        {BACKDROP[kind].map((b, i) => (
          <Text key={i} className="absolute text-2xl opacity-60" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
            {b.emoji}
          </Text>
        ))}
        {items.map((item) => (
          <View key={item.id} className="absolute" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: [{ translateX: -16 }, { translateY: -16 }] }}>
            {onItemPress ? (
              <Pressable onPress={() => onItemPress(item)} accessibilityLabel={item.name}>
                <Text className="text-3xl">{item.emoji}</Text>
              </Pressable>
            ) : (
              <Text className="text-3xl">{item.emoji}</Text>
            )}
          </View>
        ))}
        {kind === 'garden'
          ? characters.map((f) => (
              <Wanderer key={f.id} f={f} width={size.width} height={size.height} onPress={onCharacterPress ? () => onCharacterPress(f) : undefined} />
            ))
          : characters.slice(0, SEATS.length).map((f, i) => (
              <Seated key={f.id} f={f} x={SEATS[i]!.x} y={SEATS[i]!.y} onPress={onCharacterPress ? () => onCharacterPress(f) : undefined} />
            ))}
        {characters.length === 0 && !onCanvasPress ? (
          <View className="absolute inset-0 items-center justify-center p-6">
            <Text className="text-center text-base text-muted">
              {kind === 'garden' ? '🌳 Move Flikkables here from the Airport' : '✈️ Move Flikkables here from the Garden'}
            </Text>
          </View>
        ) : null}
      </View>
      {!onCanvasPress ? (
        <Text className="text-center text-sm text-muted">
          {kind === 'garden' ? `${characters.length} Flikkables relaxing` : `${characters.length} Flikkables ready for departure`}
        </Text>
      ) : null}
    </View>
  );
}
