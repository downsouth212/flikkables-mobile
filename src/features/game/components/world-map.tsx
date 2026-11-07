import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { durations, easings } from '@/lib/motion';
import { usePalette } from '@/features/game/hooks/use-palette';
import { LAND_PATH } from '@/features/game/utils/land-path';
import { arcPath, MAP_HEIGHT, MAP_WIDTH, project } from '@/features/game/utils/geo';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface MapPin {
  key: string;
  lat: number;
  lng: number;
  emoji?: string;
  tone?: 'accent' | 'navy' | 'gold';
}

export interface MapArc {
  key: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

function DrawnArc({ arc, color, play }: { arc: MapArc; color: string; play: boolean }) {
  const { d, length } = arcPath(arc.from.lat, arc.from.lng, arc.to.lat, arc.to.lng);
  const reduced = useReducedMotion();
  const progress = useSharedValue(play && !reduced ? 0 : 1);

  useEffect(() => {
    if (!play || reduced) return;
    progress.set(0);
    progress.set(withDelay(durations.base, withTiming(1, { duration: durations.draw * 2, easing: easings.move })));
  }, [play, reduced, progress, d]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.get()) }));

  return (
    <G>
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={[length, length]}
        animatedProps={animatedProps}
      />
      <Path d={d} stroke={color} strokeOpacity={0.25} strokeWidth={0.6} strokeDasharray={[2, 2]} fill="none" />
    </G>
  );
}

/** Vector world map: paper land on an ocean sea, airmail-red flight arcs and pins. */
export function WorldMap({
  pins = [],
  arcs = [],
  playKey,
  home,
}: {
  pins?: MapPin[];
  arcs?: MapArc[];
  /** Arc key to draw in with motion (the latest flight). */
  playKey?: string;
  home?: { lat: number; lng: number };
}) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const scale = width / MAP_WIDTH;
  const height = MAP_HEIGHT * scale;
  const toneColor = { accent: palette.accent, navy: palette.navy, gold: palette.gold };

  return (
    <View
      className="w-full overflow-hidden rounded-2xl bg-ocean"
      style={{ aspectRatio: MAP_WIDTH / MAP_HEIGHT }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel="World map"
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={height} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
            <Path d={LAND_PATH} fill={palette.land} stroke={palette.landStroke} strokeWidth={0.4} />
            {arcs.map((arc) => (
              <DrawnArc key={arc.key} arc={arc} color={palette.accent} play={arc.key === playKey} />
            ))}
            {home ? (
              <Circle cx={project(home.lat, home.lng).x} cy={project(home.lat, home.lng).y} r={2.4} fill={palette.navy} />
            ) : null}
            {pins
              .filter((pin) => !pin.emoji)
              .map((pin) => {
                const p = project(pin.lat, pin.lng);
                return <Circle key={pin.key} cx={p.x} cy={p.y} r={2} fill={toneColor[pin.tone ?? 'accent']} />;
              })}
          </Svg>
          {pins
            .filter((pin) => pin.emoji)
            .map((pin) => {
              const p = project(pin.lat, pin.lng);
              return (
                <View
                  key={pin.key}
                  pointerEvents="none"
                  className="absolute size-7 items-center justify-center rounded-full border-2 border-accent bg-surface"
                  style={{ left: p.x * scale - 14, top: p.y * scale - 14 }}
                >
                  <Text className="text-sm">{pin.emoji}</Text>
                </View>
              );
            })}
        </>
      ) : null}
    </View>
  );
}
