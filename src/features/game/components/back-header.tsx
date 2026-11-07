import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { Fonts } from '@/constants/theme';

/** A pushed screen's back chevron and title. */
export function BackHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const router = useRouter();
  const foreground = useThemeColor('foreground');
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} accessibilityLabel="Back">
          <View className="size-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={foreground} />
          </View>
        </Pressable>
        {right}
      </View>
      <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>
        {title}
      </Text>
      {subtitle ? <Text className="text-sm text-muted">{subtitle}</Text> : null}
    </View>
  );
}
