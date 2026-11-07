import { Ionicons } from '@expo/vector-icons';
import { Spinner, useThemeColor } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable } from '@/components/pressable';
import { Fonts } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { useFlikkableScreen } from '@/features/game/hooks/use-flikkable-screen';
import type { JourneyEvent } from '@/features/game/types/game';
import { timeAgo } from '@/features/game/utils/geo';

const EVENT_LABEL: Record<JourneyEvent, string> = {
  created: 'Created',
  flicked: 'Flikkd',
  picked_up: 'Pikkd up',
  returned: 'Returned',
};

const EVENT_TONE: Record<JourneyEvent, string> = {
  created: 'text-muted',
  flicked: 'text-navy',
  picked_up: 'text-gold',
  returned: 'text-teal-ink',
};

export default function FlikkableScreen() {
  const s = useFlikkableScreen();
  const foreground = useThemeColor('foreground');
  const f = s.flikkable;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
      <Pressable onPress={s.back} accessibilityLabel="Back">
        <View className="size-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={foreground} />
        </View>
      </Pressable>
      <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>
        {f ? `${f.emoji} ${f.name}'s Adventures` : 'Adventures'}
      </Text>
      {s.error ? <Text className="text-base text-danger">{s.error}</Text> : null}
      {!f && !s.error ? <Spinner /> : null}

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Text className="text-xs text-muted">Total Distance</Text>
          <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }}>
            {Math.round(s.totalKm).toLocaleString()} km
          </Text>
        </Card>
        <Card className="flex-1">
          <Text className="text-xs text-muted">Cities Visited</Text>
          <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }}>
            {s.cities}
          </Text>
        </Card>
      </View>

      <View className="gap-3">
        <Text className="text-base font-semibold text-foreground">Recent Adventures</Text>
        {s.journeys.map((j) => (
          <Card key={j.id}>
            <View className="flex-row justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold text-foreground">📍 {j.place}</Text>
                <Text className="text-sm text-muted">🧭 {Math.round(j.distance_km || 0)} km</Text>
                {j.by_name ? <Text className="text-xs text-muted">Via {j.by_name}</Text> : null}
              </View>
              <View className="items-end gap-1">
                <Text className="text-xs text-muted">{timeAgo(j.created_at)}</Text>
                <Text className={cn('text-xs font-semibold', EVENT_TONE[j.event])}>{EVENT_LABEL[j.event]}</Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
