import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { confirmDelete } from '@/lib/confirm';
import type { GameNotification } from '@/features/notifications/types/notification';
import { timeAgo } from '@/features/notifications/utils/notification-api';

type Tone = 'accent' | 'success' | 'warning' | 'danger';
const CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; tone: Tone }> = {
  flick_landed: { icon: 'flash', tone: 'accent' },
  character_returned: { icon: 'gift', tone: 'success' },
  stamps_earned: { icon: 'gift', tone: 'warning' },
  leaderboard_change: { icon: 'trending-up', tone: 'accent' },
  trade_received: { icon: 'send', tone: 'warning' },
  trade_accepted: { icon: 'checkmark-circle', tone: 'success' },
  trade_declined: { icon: 'close-circle', tone: 'danger' },
};

export function NotificationItem({
  n,
  onRead,
  onDismiss,
}: {
  n: GameNotification;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const accent = useThemeColor('accent');
  const success = useThemeColor('success');
  const warning = useThemeColor('warning');
  const danger = useThemeColor('danger');
  const muted = useThemeColor('muted');
  const colors = { accent, success, warning, danger };
  const config = CONFIG[n.type] ?? { icon: 'gift' as const, tone: 'warning' as const };
  const long = n.message.length > 100;

  return (
    <Pressable onPress={onRead} accessibilityLabel={n.title} className={n.read ? 'opacity-60' : ''}>
      <View className="flex-row gap-3 rounded-xl bg-background p-3">
        <Ionicons name={config.icon} size={20} color={colors[config.tone]} />
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">{n.title}</Text>
          <Text numberOfLines={expanded || !long ? undefined : 2} className="text-sm text-muted">
            {n.message}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-muted">{timeAgo(n.created_at)}</Text>
            {long ? (
              <Pressable onPress={() => setExpanded((v) => !v)} accessibilityLabel={expanded ? 'Show less' : 'Show more'}>
                <Text className="text-xs font-medium text-accent">{expanded ? 'Show less' : 'Show more'}</Text>
              </Pressable>
            ) : null}
          </View>
          {n.read ? null : <View className="size-2 rounded-full bg-accent" />}
        </View>
        <Pressable
          onPress={() => confirmDelete({ title: 'Delete this notification?', onConfirm: onDismiss })}
          accessibilityLabel="Delete notification"
        >
          <View className="size-8 items-center justify-center">
            <Ionicons name="close" size={16} color={muted} />
          </View>
        </Pressable>
      </View>
    </Pressable>
  );
}
