import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Pressable } from '@/components/pressable';
import { usePalette } from '@/features/game/hooks/use-palette';
import type { NearbyFlikkable } from '@/features/game/types/game';

/** A compass radar: you in the middle, Flikkables placed by bearing and distance. */
export function Radar({
  items,
  radiusKm,
  onSelect,
}: {
  items: NearbyFlikkable[];
  radiusKm: number;
  onSelect: (f: NearbyFlikkable) => void;
}) {
  const palette = usePalette();
  const [size, setSize] = useState(0);
  const c = size / 2;
  const r = c - 18;

  return (
    <View
      className="aspect-square w-full items-center justify-center"
      onLayout={(e) => setSize(e.nativeEvent.layout.width)}
      accessibilityLabel={`Radar showing ${items.length} Flikkables within ${radiusKm} kilometres`}
    >
      {size > 0 ? (
        <>
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Circle cx={c} cy={c} r={r} fill={palette.ocean} />
            {[0.33, 0.66, 1].map((k) => (
              <Circle key={k} cx={c} cy={c} r={r * k} stroke={palette.landStroke} strokeWidth={1} fill="none" />
            ))}
            <Line x1={c} y1={c - r} x2={c} y2={c + r} stroke={palette.landStroke} strokeWidth={1} />
            <Line x1={c - r} y1={c} x2={c + r} y2={c} stroke={palette.landStroke} strokeWidth={1} />
            <Circle cx={c} cy={c} r={7} fill={palette.accent} />
            <Circle cx={c} cy={c} r={14} stroke={palette.accent} strokeOpacity={0.4} strokeWidth={2} fill="none" />
          </Svg>
          <Text className="absolute top-0 text-xs font-bold text-muted">N</Text>
          {items.map((f) => {
            const d = Math.sqrt(Math.min(f.distance_km, radiusKm) / radiusKm) * r;
            const a = (f.bearing * Math.PI) / 180;
            return (
              <View key={f.id} className="absolute" style={{ left: c + Math.sin(a) * d - 18, top: c - Math.cos(a) * d - 18 }}>
                <Pressable
                  onPress={() => onSelect(f)}
                  accessibilityLabel={`${f.name}, ${f.distance_km.toFixed(1)} kilometres away`}
                >
                  <View className="size-9 items-center justify-center rounded-full border-2 border-accent bg-background">
                    <Text className="text-lg">{f.emoji}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
