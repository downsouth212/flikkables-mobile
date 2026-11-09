import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { Image } from '@/components/image';
import { SceneColors } from '@/constants/theme';
import { Pressable } from '@/components/pressable';
import { depthScale } from '@/features/game/utils/scene-depth';

export interface SceneItem {
  id: string;
  emoji: string;
  name: string;
  x: number;
  y: number;
}

export type Backdrop = 'garden-day' | 'garden-night' | 'airport';

const SOURCES = {
  'garden-day': require('@/assets/images/game/garden-day.jpg'),
  'garden-night': require('@/assets/images/game/garden-night.jpg'),
  airport: require('@/assets/images/game/airport-lounge.jpg'),
} as const;

/** A shop decoration standing on the scene's floor, with a contact shadow and depth scale. */
function PlacedItem({ item, onPress }: { item: SceneItem; onPress?: (item: SceneItem) => void }) {
  const scale = depthScale(item.y);
  const body = (
    <View className="items-center">
      <Text className="text-4xl">{item.emoji}</Text>
      <View className="h-2 w-8 rounded-full bg-shade/40" />
    </View>
  );
  return (
    <View
      className="absolute"
      style={{ left: `${item.x}%`, top: `${item.y}%`, zIndex: Math.round(item.y * 4), transform: [{ translateX: -20 }, { translateY: -40 }, { scale }] }}
    >
      {onPress ? (
        <Pressable onPress={() => onPress(item)} accessibilityLabel={item.name}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

/** The painted 3D scene: backdrop picture, the player's placed decorations, and whatever lives on top. */
export function SceneBackdrop({
  backdrop,
  items,
  onItemPress,
  onLayout,
  onCanvasPress,
  children,
}: {
  backdrop: Backdrop;
  items: SceneItem[];
  onItemPress?: (item: SceneItem) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  onCanvasPress?: (e: GestureResponderEvent) => void;
  children?: ReactNode;
}) {
  return (
    <View
      className="aspect-square w-full overflow-hidden rounded-3xl border border-border bg-ocean"
      onLayout={onLayout}
      onStartShouldSetResponder={() => !!onCanvasPress}
      onResponderRelease={onCanvasPress}
    >
      <Image source={SOURCES[backdrop]} className="absolute inset-0" contentFit="cover" />
      <LinearGradient
        pointerEvents="none"
        colors={SceneColors.floorShade}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '35%' }}
      />
      {items.map((item) => (
        <PlacedItem key={item.id} item={item} onPress={onItemPress} />
      ))}
      {children}
    </View>
  );
}
