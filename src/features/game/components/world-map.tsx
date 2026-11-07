import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { durations, easings } from '@/lib/motion';
import { FlightRider } from '@/features/game/components/flight-rider';
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

function DrawnArc({ arc, color, progress }: { arc: MapArc; color: string; progress?: SharedValue<number> }) {
  const { d, length } = arcPath(arc.from.lat, arc.from.lng, arc.to.lat, arc.to.lng);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - (progress ? progress.get() : 1)) }));

  return (
    <G>
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={[length, length]}
        animatedProps={animatedProps}
      />
      <Path d={d} stroke={color} strokeOpacity={0.25} strokeWidth={0.6} strokeDasharray={[2, 2]} fill="none" />
    </G>
  );
}

/** Vector world map: violet land on a night sea, neon flight arcs and pins. */
export function WorldMap({
  pins = [],
  arcs = [],
  playKey,
  home,
  rider,
}: {
  pins?: MapPin[];
  arcs?: MapArc[];
  /** Arc key to draw in with motion (the latest flight). */
  playKey?: string;
  home?: { lat: number; lng: number };
  /** Who rides the played arc, and what they shout on the way. */
  rider?: { emoji: string; saying: string };
}) {
  const palette = usePalette();
  const reduced = useReducedMotion();
  const played = arcs.find((arc) => arc.key === playKey);
  const flight = useSharedValue(played && !reduced ? 0 : 1);
  const route = played ? arcPath(played.from.lat, played.from.lng, played.to.lat, played.to.lng) : null;

  useEffect(() => {
    if (!played || reduced) return;
    flight.set(0);
    flight.set(withTiming(1, { duration: durations.flight, easing: easings.move }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, route?.d, reduced, flight]);

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
              <DrawnArc key={arc.key} arc={arc} color={arc.key === playKey ? palette.neon : palette.accent} progress={arc.key === playKey ? flight : undefined} />
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
                  className="absolute size-7 items-center justify-center rounded-full border-2 border-glow bg-surface"
                  style={{ left: p.x * scale - 14, top: p.y * scale - 14 }}
                >
                  <Text className="text-sm">{pin.emoji}</Text>
                </View>
              );
            })}
          {rider && route ? (
            <FlightRider
              progress={flight}
              a={route.a}
              b={route.b}
              c={route.c}
              scale={scale}
              width={width}
              emoji={rider.emoji}
              saying={rider.saying}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}
