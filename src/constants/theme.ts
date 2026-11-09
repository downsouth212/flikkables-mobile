/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const NEON = {
    text: '#F3EEFF',
    background: '#0B0716',
    backgroundElement: '#160F2B',
    backgroundSelected: '#1F1640',
    textSecondary: '#A397CF',
    accent: '#B44CFF',
    navy: '#39FF88',
    gold: '#FFD23F',
    ocean: '#120B26',
    land: '#2A1E55',
    landStroke: '#5B3FB0',
    neon: '#39FF88',
    glow: '#B44CFF',
  } as const;

const NEON_LIGHT = {
    text: '#1B1035',
    background: '#F5F1FF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFE8FF',
    textSecondary: '#5F5288',
    accent: '#9B2CF0',
    navy: '#0B8F4A',
    gold: '#A87800',
    ocean: '#EBE3FF',
    land: '#D3C4FA',
    landStroke: '#B39BEF',
    neon: '#0B8F4A',
    glow: '#B44CFF',
  } as const;

export const Colors = { light: NEON_LIGHT, dark: NEON } as const;

export type ThemeColor = keyof typeof NEON;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ChakraPetch_700Bold',
    display: 'ChakraPetch_700Bold',
    displaySemi: 'ChakraPetch_600SemiBold',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'ChakraPetch_700Bold',
    display: 'ChakraPetch_700Bold',
    displaySemi: 'ChakraPetch_600SemiBold',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'ChakraPetch_700Bold',
    display: 'ChakraPetch_700Bold',
    displaySemi: 'ChakraPetch_600SemiBold',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Colours inside the street map's web page (Leaflet), which can't read CSS tokens. */
export const StreetMapColors = {
  tileBackground: '#e5e3df',
  pinShadow: 'rgba(0,0,0,0.3)',
};

/** The soft floor shadow over the painted Garden and Airport backdrops (gradient stops can't read CSS tokens). */
export const SceneColors = {
  floorShade: ['transparent', 'rgba(10,6,20,0.28)'] as const,
};
