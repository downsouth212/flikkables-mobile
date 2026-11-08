import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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

const MAX_ZOOM = 12;

function clampPan(value: number, content: number, frame: number, zoom: number) {
  'worklet';
  const limit = Math.max(0, (content * zoom - frame) / 2);
  return Math.min(limit, Math.max(-limit, value));
}

function PinBadge({ x, y, emoji, zoom }: { x: number; y: number; emoji: string; zoom: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 / zoom.get() }] }));
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute size-7 items-center justify-center rounded-full border-2 border-glow bg-surface"
      style={[{ left: x - 14, top: y - 14 }, style]}
    >
      <Text className="text-sm">{emoji}</Text>
    </Animated.View>
  );
}

/** Vector world map: violet land on a night sea, neon flight arcs and pins. */
export function WorldMap({
  pins = [],
  arcs = [],
  playKey,
  home,
  rider,
  zoomable = false,
  focus,
  focusZoom = 1,
  tall = false,
}: {
  pins?: MapPin[];
  arcs?: MapArc[];
  /** Arc key to draw in with motion (the latest flight). */
  playKey?: string;
  home?: { lat: number; lng: number };
  /** Who rides the played arc, and what they shout on the way. */
  rider?: { emoji: string; saying: string };
  /** Pinch to zoom and drag to pan. */
  zoomable?: boolean;
  /** Where the map opens centred when zoomed in. */
  focus?: { lat: number; lng: number };
  focusZoom?: number;
  /** Square frame instead of the full world's 2:1. */
  tall?: boolean;
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

  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const width = frame.width;
  const scale = width / MAP_WIDTH;
  const height = MAP_HEIGHT * scale;
  const toneColor = { accent: palette.accent, navy: palette.navy, gold: palette.gold };

  const zoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  useEffect(() => {
    if (!zoomable || width === 0) return;
    const z = focus ? focusZoom : 1;
    const p = focus ? project(focus.lat, focus.lng) : { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    const x = clampPan((width / 2 - p.x * scale) * z, width, width, z);
    const y = clampPan((height / 2 - p.y * scale) * z, height, frame.height, z);
    zoom.set(z);
    savedZoom.set(z);
    panX.set(x);
    panY.set(y);
    savedX.set(x);
    savedY.set(y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomable, width, frame.height, focus?.lat, focus?.lng, focusZoom]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, savedZoom.get() * e.scale));
      zoom.set(z);
      panX.set(clampPan((savedX.get() * z) / savedZoom.get(), width, width, z));
      panY.set(clampPan((savedY.get() * z) / savedZoom.get(), height, frame.height, z));
    })
    .onEnd(() => {
      savedZoom.set(zoom.get());
      savedX.set(panX.get());
      savedY.set(panY.get());
    });
  const pan = Gesture.Pan()
    .minPointers(1)
    .averageTouches(true)
    .onUpdate((e) => {
      panX.set(clampPan(savedX.get() + e.translationX, width, width, zoom.get()));
      panY.set(clampPan(savedY.get() + e.translationY, height, frame.height, zoom.get()));
    })
    .onEnd(() => {
      savedX.set(panX.get());
      savedY.set(panY.get());
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const z = zoom.get() > 1.5 ? 1 : 3;
      zoom.set(withTiming(z, { duration: durations.draw, easing: easings.move }));
      savedZoom.set(z);
      panX.set(withTiming(0, { duration: durations.draw, easing: easings.move }));
      panY.set(withTiming(0, { duration: durations.draw, easing: easings.move }));
      savedX.set(0);
      savedY.set(0);
    });
  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);
  const layerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: panX.get() }, { translateY: panY.get() }, { scale: zoom.get() }],
  }));

  return (
    <View
      className="w-full overflow-hidden rounded-2xl bg-ocean"
      style={{ aspectRatio: tall ? 1 : MAP_WIDTH / MAP_HEIGHT }}
      onLayout={(e) => setFrame({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      accessibilityLabel={zoomable ? 'World map. Pinch to zoom, drag to move.' : 'World map'}
    >
      {width > 0 ? (
        <GestureDetector gesture={zoomable ? gesture : Gesture.Native()}>
        <Animated.View
          style={[{ width, height: frame.height, justifyContent: 'center' }, zoomable ? layerStyle : null]}
        >
        <View style={{ width, height }}>
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
              return <PinBadge key={pin.key} x={p.x * scale} y={p.y * scale} emoji={pin.emoji ?? ''} zoom={zoom} />;
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
        </View>
        </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}
