import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ListRow } from '@/components/list-row';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { BackHeader } from '@/features/game/components/back-header';
import { useAccountScreen } from '@/features/game/hooks/use-account-screen';

export default function AccountScreen() {
  const s = useAccountScreen();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
      <BackHeader
        title="Account"
        right={<ThemeToggleButton onSwitched={(next) => s.setTheme(next === 'light' ? 'light' : 'dark')} />}
      />
      <Card>
        <View className="gap-0.5">
          <Text className="text-xl font-bold text-foreground">{s.profile?.display_name}</Text>
          <Text className="text-sm text-muted">{s.email}</Text>
          <Text className="text-sm text-muted">Home · {s.profile?.home_name}</Text>
        </View>
      </Card>
      <Card list>
        {s.role ? <ListRow title="👑 Admin" onPress={s.openAdmin} /> : null}
        <ListRow title="Sign out" onPress={s.signOut} />
        <ListRow title="Delete account" onPress={s.deleteAccount} />
      </Card>
      {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}
    </ScrollView>
  );
}
