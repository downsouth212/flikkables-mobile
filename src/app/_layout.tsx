import '@/global.css';

import Constants from 'expo-constants';
import { ChakraPetch_600SemiBold, ChakraPetch_700Bold, useFonts } from '@expo-google-fonts/chakra-petch';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Newly } from '@newly/sdk-react-native';

import { Colors } from '@/constants/theme';
import { ThemeSwitchHost } from '@/components/theme-switch-host';
import { AuthProvider } from '@/contexts/AuthContext';
import { RootStack } from '@/features/game/components/root-stack';
import { hideExpoDeveloperUi } from '@/lib/dev-menu';
import generatedAnalytics from '@/lib/newly-analytics.json';

type NewlyAnalyticsExtra = {
  newlyAnalyticsEnabled?: unknown;
  newlyAnalyticsSamplingRate?: unknown;
  newlyApiUrl?: unknown;
  newlyIngestKey?: unknown;
};

// Newly writes this project's own analytics settings into src/lib/newly-analytics.json,
// which ships empty. They are deliberately NOT in app.json `expo.extra`: everything under
// `extra` is a native input, so a per-project value there gives the project its own
// fingerprint and costs it a full native build instead of the shared pre-built shell.
// Projects scaffolded before the move still carry the four keys in `extra`, so that stays
// the fallback.
const generated = generatedAnalytics as {
  ingestKey?: string;
  apiUrl?: string;
  enabled?: boolean;
  samplingRate?: number | null;
};
const analyticsExtra = (Constants.expoConfig?.extra ?? {}) as NewlyAnalyticsExtra;
const analytics = generated.ingestKey
  ? {
      ingestKey: generated.ingestKey,
      apiUrl: generated.apiUrl,
      enabled: generated.enabled,
      sampling: generated.samplingRate,
    }
  : {
      ingestKey: analyticsExtra.newlyIngestKey,
      apiUrl: analyticsExtra.newlyApiUrl,
      enabled: analyticsExtra.newlyAnalyticsEnabled,
      sampling: analyticsExtra.newlyAnalyticsSamplingRate,
    };

const newlyIngestKey = typeof analytics.ingestKey === 'string' ? analytics.ingestKey : '';
const newlyApiUrl = typeof analytics.apiUrl === 'string' ? analytics.apiUrl : '';
const newlyAnalyticsSampling = typeof analytics.sampling === 'number' ? analytics.sampling : undefined;

// Expo's floating gear and developer menu belong to whoever is debugging Expo, not to
// the person looking at their own app. See src/lib/dev-menu.ts for why this is JS and
// not an app.json plugin option.
hideExpoDeveloperUi();

if (analytics.enabled !== false && newlyIngestKey && newlyApiUrl) {
  Newly.init({
    ingestKey: newlyIngestKey,
    apiUrl: newlyApiUrl,
    sampling: newlyAnalyticsSampling,
  });
}

// Color scheme is driven by app.json `userInterfaceStyle` (automatic / light / dark) —
// set by the design system at lock time. Uniwind follows the system color scheme by
// default (adaptive themes), so the HeroUI/Uniwind design tokens switch light/dark on
// their own; we only mirror it into React Navigation's theme here.
//
// KeyboardProvider (react-native-keyboard-controller) is mounted once at the root so any
// screen can use KeyboardAwareScrollView / keyboard hooks for proper form handling — this
// is the keyboard library the design system mandates over RN's KeyboardAvoidingView. It is
// pre-baked into the scaffold (along with MMKV for persistence and Skia for charts) so the
// native module set is fixed up front and screen work hot-reloads without a native rebuild.
const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.backgroundElement,
    primary: Colors.dark.accent,
    border: Colors.dark.backgroundSelected,
  },
};

export default function RootLayout() {
  // Neon Arcade is dark-only: the tokens are identical in both schemes, so navigation stays dark too.
  useFonts({ ChakraPetch_700Bold, ChakraPetch_600SemiBold });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <HeroUINativeProvider>
          <ThemeProvider value={NAV_THEME}>
            <StatusBar style="light" />
            {/* ThemeSwitchHost is always mounted (zero cost when unused) so any theme
                toggle switches via useThemeSwitch() and the circular reveal plays. */}
            <ThemeSwitchHost>
              <AuthProvider>
                <RootStack />
              </AuthProvider>
            </ThemeSwitchHost>
          </ThemeProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
