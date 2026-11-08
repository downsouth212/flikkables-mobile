import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import type { Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useGameStore } from '@/features/game/store/game-store';

export default function AppTabs() {
  const isAdmin = useGameStore((st) => st.role !== null);
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Explore</TabButton>
          </TabTrigger>
          <TabTrigger name="friends" href={'/friends' as Href} asChild>
            <TabButton>Friends</TabButton>
          </TabTrigger>
          {isAdmin ? (
            <TabTrigger name="admin" href="/admin" asChild>
              <TabButton>Admin</TabButton>
            </TabTrigger>
          ) : null}
          {isAdmin ? (
            <TabTrigger name="templates" href="/templates" asChild>
              <TabButton>Templates</TabButton>
            </TabTrigger>
          ) : null}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="rounded-xl px-4 py-2 active:opacity-70">
      <Text
        className={
          isFocused ? 'text-sm font-medium text-foreground' : 'text-sm font-medium text-muted'
        }>
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} className="absolute w-full flex-row items-center justify-center p-4">
      <View className="w-full max-w-3xl flex-row items-center gap-2 rounded-2xl bg-surface px-5 py-2">
        {props.children}
      </View>
    </View>
  );
}
