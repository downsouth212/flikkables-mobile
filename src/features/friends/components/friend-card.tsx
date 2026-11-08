import { Ionicons } from '@expo/vector-icons';
import { Button, useThemeColor } from 'heroui-native';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import type { FriendRow } from '@/features/friends/types/friends';

export function FriendCard({
  friend,
  type,
  busy,
  onAccept,
  onReject,
  onBlock,
}: {
  friend: FriendRow;
  type: 'accepted' | 'pending' | 'sent';
  busy: boolean;
  onAccept?: () => void;
  onReject: () => void;
  onBlock?: () => void;
}) {
  const muted = useThemeColor('muted');
  const danger = useThemeColor('danger');
  const foreground = useThemeColor('foreground');

  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <View className="size-10 items-center justify-center rounded-full bg-accent/15">
          <Text className="text-sm font-bold text-accent">{friend.display_name.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-medium text-foreground" numberOfLines={1}>
            {friend.display_name}
          </Text>
          {friend.home_name ? (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {friend.home_name}
            </Text>
          ) : null}
        </View>
        {type === 'accepted' ? (
          <View className="flex-row items-center gap-1">
            <View className="rounded-full bg-success/15 px-2 py-1">
              <Text className="text-xs font-medium text-success">Friends</Text>
            </View>
            <Button
              size="sm"
              variant="ghost"
              isDisabled={busy}
              accessibilityLabel={`Block ${friend.display_name}`}
              onPress={() => {
                pressHaptic();
                onBlock?.();
              }}
            >
              <Button.Label>Block</Button.Label>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              isDisabled={busy}
              accessibilityLabel="Remove friend"
              onPress={() => {
                pressHaptic();
                onReject();
              }}
            >
              <Ionicons name="trash-outline" size={18} color={muted} />
            </Button>
          </View>
        ) : null}
        {type === 'pending' ? (
          <View className="flex-row items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              isDisabled={busy}
              accessibilityLabel="Accept friend request"
              onPress={() => {
                pressHaptic();
                onAccept?.();
              }}
            >
              <Ionicons name="checkmark" size={18} color={foreground} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              isDisabled={busy}
              accessibilityLabel="Decline friend request"
              onPress={() => {
                pressHaptic();
                onReject();
              }}
            >
              <Ionicons name="close" size={18} color={danger} />
            </Button>
          </View>
        ) : null}
        {type === 'sent' ? (
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-warning/15 px-2 py-1">
              <Text className="text-xs font-medium text-warning">Pending</Text>
            </View>
            <Button
              size="sm"
              variant="secondary"
              isIconOnly
              isDisabled={busy}
              accessibilityLabel="Cancel friend request"
              onPress={() => {
                pressHaptic();
                onReject();
              }}
            >
              <Ionicons name="close" size={18} color={danger} />
            </Button>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
