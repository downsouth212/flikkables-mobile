import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Pressable } from '@/components/pressable';
import type { GardenPlant } from '@/features/game/types/garden';
import { depthScale } from '@/features/game/utils/scene-depth';
import { durations, easings } from '@/lib/motion';

export const BED_SPOTS = [
  { x: 16, y: 74 },
  { x: 31, y: 74 },
  { x: 46, y: 74 },
  { x: 14, y: 88 },
  { x: 31, y: 88 },
  { x: 48, y: 88 },
] as const;

function stageOf(plant: GardenPlant | undefined) {
  if (!plant) return 'empty' as const;
  const start = new Date(plant.planted_at).getTime();
  const end = new Date(plant.ready_at).getTime();
  const t = (Date.now() - start) / Math.max(1, end - start);
  if (t >= 1) return 'ready' as const;
  return t >= 0.5 ? ('sprout' as const) : ('seedling' as const);
}

/** One soil bed in the lawn: tap to plant, watch it grow over a real day, tap the bloom to pick it. */
export function GardenBed({
  spot,
  plant,
  onPlant,
  onPick,
  onGrowing,
}: {
  spot: { x: number; y: number };
  plant?: GardenPlant;
  onPlant: () => void;
  onPick: () => void;
  onGrowing: (p: GardenPlant) => void;
}) {
  const stage = stageOf(plant);
  const sway = useSharedValue(0);
  useEffect(() => {
    if (stage !== 'ready') return;
    sway.set(withRepeat(withTiming(1, { duration: durations.sway, easing: easings.move }), -1, true));
    return () => cancelAnimation(sway);
  }, [stage, sway]);
  const swayStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${(sway.get() - 0.5) * 14}deg` }] }));

  const glyph = stage === 'ready' ? plant?.flower : stage === 'sprout' ? '🌿' : stage === 'seedling' ? '🌱' : null;
  const label = stage === 'empty' ? 'Plant a seed' : stage === 'ready' ? `Pick ${plant?.flower ?? 'flower'}` : 'Growing';
  const press = () => {
    if (stage === 'empty') return onPlant();
    if (stage === 'ready') return onPick();
    if (plant) onGrowing(plant);
  };

  return (
    <View
      className="absolute"
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, zIndex: Math.round(spot.y * 4), transform: [{ translateX: -32 }, { translateY: -40 }, { scale: depthScale(spot.y) }] }}
    >
      <Pressable onPress={press} accessibilityLabel={label}>
        <View className="w-16 items-center">
          <Animated.View style={[{ transformOrigin: 'bottom' }, swayStyle]} className="h-9 justify-end">
            {glyph ? <Text className={stage === 'ready' ? 'text-3xl' : 'text-2xl'}>{glyph}</Text> : <Text className="text-xs font-bold text-white">+ seed</Text>}
          </Animated.View>
          <View className="h-6 w-16 items-center justify-center rounded-full border-2 border-soil-rim bg-soil">
            <View className="h-2 w-10 rounded-full bg-shade/30" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
