import { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

/**
 * Motion tokens — the app's ONE animation vocabulary, exactly like the color tokens
 * in global.css. EVERY animation you write uses these; never ad-hoc duration or
 * easing numbers in a screen (per-screen numbers are how motion drifts into slop).
 *
 *   import Animated, { withTiming } from 'react-native-reanimated';
 *   import { fadeIn, fadeOut, reflow, timing } from '@/lib/motion';
 *
 *   // A list that reflows (the functional motion):
 *   <Animated.View entering={fadeIn} exiting={fadeOut} layout={reflow} />
 *
 *   // A value that must tween (a crossfade, a progress arc):
 *   opacity.set(withTiming(1, timing.enter));
 *
 * House rules the tokens encode: entrances ease OUT (never ease-in), exits are
 * FASTER than entrances, nothing exceeds 300ms except a one-time data draw-in
 * (timing.draw, for a chart/ring animating in once per visit). No springs.
 */

export const durations = {
  /** Exits, press-adjacent feedback. */
  fast: 150,
  /** Entrances, crossfades, most tweens. */
  base: 200,
  /** List reflow. */
  gentle: 250,
  /** One-time data draw-in (chart path trim, ring sweep, count-up) — NOT for UI chrome. */
  draw: 500,
  /** The signature flikk: one unbroken glide across the map, start to landing. */
  flight: 1500,
  /** One beat of the wind trail fluttering behind a flying Flikkable. */
  flutter: 160,
  /** The web garden: a resting Flikkable strolls to a new spot over six seconds. */
  wander: 6000,
  /** The web Daily Lucky Spin: four seconds, five turns. */
  spin: 4000,
  /** Feeding Time: a treat takes four seconds to fall. */
  fall: 4000,
  /** The web garden: a resting Flikkable sways side to side. */
  sway: 1500,
  /** The web airport: the ready-to-board dot pulses. */
  pulse: 1000,
  /** Garden at night: one soft "z" drifts up from a sleeping Flikkable. */
  snooze: 2400,
  /** Garden: a sleeper's slow breathing. */
  breathe: 1800,
  /** Garden: a butterfly or firefly drifts to a new spot. */
  drift: 5000,
  /** Garden: hearts float off a petted Flikkable. */
  hearts: 900,
  /** Airport: a Flikkable walks through the boarding gate. */
  board: 700,
  /** Airport: a returning Flikkable walks out of the arrivals door to its seat. */
  arrive: 1800,
  /** Airport: one flap of the departures board. */
  flap: 120,
  /** A walking step bob. */
  step: 280,
  /** Garden: a ripple ring spreads across the pond or fountain. */
  ripple: 1200,
  /** Airport: the plane climbs out of the gate. */
  takeoff: 1400,
} as const;

export const easings = {
  /** Entering / appearing: starts fast, feels responsive. Never ease-in on an entrance. */
  enter: Easing.out(Easing.cubic),
  /** Leaving: accelerate away. */
  exit: Easing.in(Easing.cubic),
  /** Moving while on screen. */
  move: Easing.inOut(Easing.cubic),
  /** Constant motion only (progress, shimmer). */
  linear: Easing.linear,
} as const;

/** Configs for withTiming: `withTiming(value, timing.enter)`. */
export const timing = {
  enter: { duration: durations.base, easing: easings.enter },
  exit: { duration: durations.fast, easing: easings.exit },
  move: { duration: durations.base, easing: easings.move },
  draw: { duration: durations.draw, easing: easings.enter },
} as const;

/** Entering preset for list items / content arriving after mount. */
export const fadeIn = FadeIn.duration(durations.base).easing(easings.enter);

/** Exiting preset — faster than the entrance, per the house rule. */
export const fadeOut = FadeOut.duration(durations.fast).easing(easings.exit);

/** Layout preset for the rows that shift when a list adds/removes/reorders. */
export const reflow = LinearTransition.duration(durations.gentle);

/**
 * Staged entrance for a screen's PRIMARY list/grid. Semantics: REVEAL-ONCE ON
 * FIRST FOCUS. NativeTabs mounts tabs EAGERLY (off-screen), so a plain
 * mount-time `entering` plays before the tab is ever visible (you see nothing);
 * re-keying the list per focus replays it but blanks every row for a frame
 * (flicker). The correct pattern: gate the rows behind a `revealed` state set
 * true in useFocusEffect — they mount on first focus (the stagger plays,
 * visibly, once) and then stay forever:
 *
 *   const [revealed, setRevealed] = useState(false);
 *   useFocusEffect(useCallback(() => { setRevealed(true); }, []));
 *   {revealed ? items.map((it, i) => (
 *     <Animated.View key={it.id} entering={enterStaggered(i)}>…</Animated.View>
 *   )) : null}
 *
 * Never on scroll, re-renders, or filter changes. Delays cap at item 8 so
 * below-the-fold items don't queue a long cascade.
 */
export function enterStaggered(index: number) {
  return FadeInDown.duration(durations.gentle)
    .easing(easings.enter)
    .delay(Math.min(index, 8) * 40);
}

/** expo-image `transition` value — every remote image fades in instead of popping:
 *  `<Image source={{ uri }} transition={imageFade} />`. */
export const imageFade = 200;

/**
 * Spring configs — ONLY for apps whose motion dial is `lively` (design/dials.json);
 * calm/standard apps are timing-only (the lint + hook enforce it). Critically
 * damped: alive, never a visible overshoot. Never call withSpring without one of
 * these — the default spring config visibly bounces.
 *
 *   scale.set(withSpring(0.97, springs.press));
 */
export const springs = {
  /** Press feedback and small state settles. */
  press: { dampingRatio: 1, duration: durations.base },
  /** The signature moment / a gesture release settling into place. */
  settle: { dampingRatio: 0.95, duration: 300 },
} as const;
