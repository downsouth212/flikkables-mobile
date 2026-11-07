import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useThemeColor } from 'heroui-native';
import { useUniwind } from 'uniwind';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const { theme } = useUniwind();
  const colors = theme === 'light' ? Colors.light : Colors.dark;
  // The selected tab tint tracks the brand ACCENT token (icon + label) — never the iOS
  // default blue, so the native tab bar matches the app's design tokens.
  const accent = useThemeColor('accent');

  // ICON API — EXACT: the Icon takes the `sf` PROP (SF Symbol, iOS) + the `md` PROP
  // (Material Symbol, Android). There is NO `sf:` URI protocol — a string in `src` is
  // an invalid image source and renders a BLANK icon. `src={require(...png)}` is only
  // for custom image assets (see src/assets/images/tabIcons/ if you need one).
  // `disableAutomaticContentInsets` on EVERY Trigger. Do not remove it. Without it
  // expo-router turns on a SECOND inset mechanism behind the screens' backs, and it
  // stacks on top of the safe-area utility classes every screen already carries:
  //   iOS: react-native-screens flips the screen's first descendant ScrollView to
  //        contentInsetAdjustmentBehavior = Automatic, which insets top AND bottom.
  //   Android: the screen gets wrapped in <SafeAreaView edges={{ bottom: true }}>.
  // A screen root with `pt-safe-offset-2 pb-safe-offset-22` is then padded TWICE: the
  // status bar counted twice on iOS (the giant band above the large title), the home
  // indicator twice on both platforms. Switching it off here restores the invariant the
  // whole design system rests on: the utility classes are the ONE inset mechanism, and a
  // screen lays out the same on iOS and Android.
  return (
    <NativeTabs backgroundColor={colors.background} tintColor={accent}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Launch</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="paperplane.fill" md="send" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="location.north.circle.fill" md="explore" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="passport" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Passport</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.closed.fill" md="menu_book" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
