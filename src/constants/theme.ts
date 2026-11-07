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

export const Colors = { light: NEON, dark: NEON } as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
