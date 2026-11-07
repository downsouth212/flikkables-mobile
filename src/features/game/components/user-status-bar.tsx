import { Ionicons } from '@expo/vector-icons';
import { Button, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable, pressHaptic } from '@/components/pressable';
import { Fonts } from '@/constants/theme';
import type { Profile } from '@/features/game/types/game';
import { levelProgress } from '@/features/game/utils/levels';

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center">
      <Text className="text-sm font-bold text-foreground">🛂 {value}</Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center gap-1">
      <Text className="text-xl text-foreground" style={{ fontFamily: Fonts?.display }}>
        {value}
      </Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

/** The web UserStatusBar: tap to expand the counts and the level bar. */
export function UserStatusBar({ profile, onTrophies }: { profile: Profile; onTrophies: () => void }) {
  const muted = useThemeColor('muted');
  const [open, setOpen] = useState(false);
  const level = profile.level ?? 1;
  const km = profile.total_km ?? 0;
  const progress = levelProgress(level, km);

  return (
    <Pressable onPress={() => setOpen(!open)} accessibilityLabel="Your status">
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-xs text-muted" numberOfLines={1}>
              📍 {profile.home_name}
            </Text>
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {profile.display_name}
            </Text>
            <Text className="text-xs text-gold">
              🏆 Lvl {level} · {Math.round(km).toLocaleString()} km
            </Text>
          </View>
          <View className="flex-row gap-3">
            <Mini label="Daily" value={profile.stamps_today ?? 0} />
            <Mini label="Week" value={profile.stamps_week ?? 0} />
            <Mini label="All" value={profile.stamps} />
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={muted} />
        </View>
        {open ? (
          <View className="gap-3">
            <View className="flex-row gap-2">
              <Stat label="Flikks" value={profile.flick_count} />
              <Stat label="Pikk ups" value={profile.picked_up_count} />
              <Stat label="Returned" value={profile.returned_count ?? 0} />
            </View>
            <View className="gap-1">
              <View className="flex-row justify-between">
                <Text className="text-xs font-semibold text-foreground">Level {level} Progress</Text>
                <Text className="text-xs text-muted">{Math.round(progress.percent)}%</Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-border">
                <View className="h-full rounded-full bg-accent" style={{ width: `${progress.percent}%` }} />
              </View>
              <Text className="text-xs text-muted">
                {progress.remaining.toLocaleString()} km to Level {level + 1}
              </Text>
            </View>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                pressHaptic();
                onTrophies();
              }}
            >
              <Button.Label>🏆 Trophy Room</Button.Label>
            </Button>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
