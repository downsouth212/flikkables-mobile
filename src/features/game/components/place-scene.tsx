import { useState } from 'react';
import { Text, View, type GestureResponderEvent } from 'react-native';

import { FlikkableFace } from '@/features/game/components/flikkable-face';
import { SceneBackdrop, type SceneItem } from '@/features/game/components/scene-backdrop';
import type { Flikkable, PlaceKind } from '@/features/game/types/game';
import { depthScale, GROUND, isNight } from '@/features/game/utils/scene-depth';

export type { SceneItem } from '@/features/game/components/scene-backdrop';

/** The Customizer's placement canvas: the same painted scene the Garden and Airport use. */
export function PlaceScene({
  kind,
  characters,
  items,
  onCanvasPress,
  onItemPress,
}: {
  kind: PlaceKind;
  characters: Flikkable[];
  items: SceneItem[];
  /** Tap a spot to place the selected item there (percent coordinates). */
  onCanvasPress?: (x: number, y: number) => void;
  onItemPress?: (item: SceneItem) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const tap = (e: GestureResponderEvent) => {
    if (!onCanvasPress || !size.width) return;
    const clamp = (v: number) => Math.max(5, Math.min(95, v));
    onCanvasPress(clamp((e.nativeEvent.locationX / size.width) * 100), clamp((e.nativeEvent.locationY / size.height) * 100));
  };
  const ground = GROUND[kind];
  const backdrop = kind === 'airport' ? 'airport' : isNight() ? 'garden-night' : 'garden-day';

  return (
    <View className="gap-2">
      <SceneBackdrop
        backdrop={backdrop}
        items={items}
        onItemPress={onItemPress}
        onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onCanvasPress={onCanvasPress ? tap : undefined}
      >
        {characters.slice(0, 6).map((f, i) => {
          const x = ground.left + ((i % 3) + 0.5) * ((ground.right - ground.left) / 3);
          const y = ground.top + (Math.floor(i / 3) + 0.6) * ((ground.bottom - ground.top) / 2);
          return (
            <View
              key={f.id}
              pointerEvents="none"
              className="absolute items-center opacity-80"
              style={{ left: `${x}%`, top: `${y}%`, transform: [{ translateX: -20 }, { translateY: -44 }, { scale: depthScale(y) }] }}
            >
              <FlikkableFace emoji={f.emoji} templateID={f.template_id} size="text-4xl" />
              <View className="h-2 w-8 rounded-full bg-shade/40" />
            </View>
          );
        })}
      </SceneBackdrop>
      {onCanvasPress ? <Text className="text-center text-sm text-muted">Tap the scene to place it there</Text> : null}
    </View>
  );
}
