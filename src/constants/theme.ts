/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1E2B',
    background: '#F6F3EC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFEAE0',
    textSecondary: '#6C6A73',
    accent: '#E0393E',
    navy: '#22336B',
    gold: '#C98A24',
    ocean: '#CFE6F5',
    land: '#FBF9F4',
    landStroke: '#D9D2C2',
  },
  dark: {
    text: '#F2EEE4',
    background: '#0E1426',
    backgroundElement: '#18203A',
    backgroundSelected: '#212A48',
    textSecondary: '#9AA2BD',
    accent: '#FF5A5F',
    navy: '#9DB4FF',
    gold: '#F1B955',
    ocean: '#1B2B4D',
    land: '#2B3760',
    landStroke: '#3A4775',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
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
