import { Ionicons } from '@expo/vector-icons';
import { Button, useThemeColor } from 'heroui-native';
import { Alert, Text, View } from 'react-native';

import { Pressable } from '@/components/pressable';
import { GameDialog } from '@/features/game/components/game-dialog';
import { NotificationItem } from '@/features/notifications/components/notification-item';
import { useNotifications } from '@/features/notifications/hooks/use-notification-feed';
import { confirmDelete } from '@/lib/confirm';

export function NotificationBell() {
  const n = useNotifications();
  const foreground = useThemeColor('foreground');

  return (
    <>
      <Pressable onPress={() => n.setOpen(true)} accessibilityLabel={n.unread ? `Notifications, ${n.unread} unread` : 'Notifications'}>
        <View className="size-10 items-center justify-center">
          <Ionicons name="notifications-outline" size={24} color={foreground} />
          {n.unread > 0 ? (
            <View className="absolute right-0.5 top-0.5 min-w-5 items-center justify-center rounded-full bg-danger px-1">
              <Text className="text-[10px] font-bold text-white">{n.unread > 9 ? '9+' : n.unread}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      <GameDialog isOpen={n.open} onClose={() => n.setOpen(false)} title="Notifications" scroll>
        {n.items.length > 0 ? (
          <View className="flex-row gap-2">
            {n.unread > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                onPress={() =>
                  Alert.alert('Mark all notifications as read?', undefined, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark all read', onPress: n.markAllRead },
                  ])
                }
              >
                <Button.Label>Mark all read</Button.Label>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onPress={() => confirmDelete({ title: 'Delete all notifications?', confirmLabel: 'Delete all', onConfirm: n.clearAll })}
            >
              <Button.Label>Delete all</Button.Label>
            </Button>
          </View>
        ) : null}
        {n.items.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Ionicons name="notifications-off-outline" size={32} color={foreground} />
            <Text className="text-sm text-muted">No notifications yet</Text>
          </View>
        ) : null}
        {n.items.map((item) => (
          <NotificationItem key={item.id} n={item} onRead={() => n.markRead(item.id)} onDismiss={() => n.dismiss(item.id)} />
        ))}
      </GameDialog>
    </>
  );
}
