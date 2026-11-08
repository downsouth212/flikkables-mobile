import { Button, Switch } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { Fonts } from '@/constants/theme';
import { AddFriendDialog } from '@/features/friends/components/add-friend-dialog';
import { FriendCard } from '@/features/friends/components/friend-card';
import { FRIEND_TABS, useFriendsScreen } from '@/features/friends/hooks/use-friends-screen';
import { confirmDelete } from '@/lib/confirm';

function EmptyLine({ text }: { text: string }) {
  return (
    <Card className="items-center py-8">
      <Text className="text-center text-sm text-muted">{text}</Text>
    </Card>
  );
}

export default function FriendsScreen() {
  const s = useFriendsScreen();

  const openAdd = () => {
    pressHaptic();
    s.setAdding(true);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5"
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>Friends</Text>
            <Text className="text-sm text-muted">Connect with other players</Text>
          </View>
          <Button size="sm" onPress={openAdd}>
            <Button.Label>Add Friend</Button.Label>
          </Button>
        </View>

        <Segmented
          values={FRIEND_TABS}
          value={s.tab}
          onChange={s.setTab}
          labels={[`Friends (${s.friends.length})`, `Requests (${s.incoming.length})`, `Sent (${s.sent.length})`]}
        />

        {s.tab === 'friends' ? (
          <View className="gap-3">
            {s.friends.length === 0 ? (
              <Card className="items-center gap-2 py-8">
                <Text className="text-lg font-semibold text-foreground">No Friends Yet</Text>
                <Text className="text-center text-sm text-muted">Add friends to share adventures!</Text>
                <Button size="sm" onPress={openAdd}>
                  <Button.Label>Add Friend</Button.Label>
                </Button>
              </Card>
            ) : null}
            {s.friends.map((f) => (
              <FriendCard
                key={f.id}
                friend={f}
                type="accepted"
                busy={s.busyID === f.id || s.busyID === f.user_id}
                onReject={() =>
                  confirmDelete({
                    title: 'Remove Friend',
                    message: `Are you sure you want to remove ${f.display_name} from your friends list?`,
                    confirmLabel: 'Remove',
                    onConfirm: () => void s.remove(f.id),
                  })
                }
                onBlock={() =>
                  confirmDelete({
                    title: `Block ${f.display_name}?`,
                    message: "You won't see each other in searches or be able to interact. You can unblock them later.",
                    confirmLabel: 'Block',
                    onConfirm: () => void s.block(f.user_id),
                  })
                }
              />
            ))}

            {s.blocked.length > 0 ? (
              <View className="gap-3">
                <Text className="text-lg font-semibold text-foreground">Blocked players</Text>
                {s.blocked.map((b) => (
                  <Card key={b.id}>
                    <View className="flex-row items-center gap-3">
                      <Text className="flex-1 font-medium text-foreground" numberOfLines={1}>
                        {b.display_name}
                      </Text>
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={s.busyID === b.user_id}
                        onPress={() => {
                          pressHaptic();
                          void s.unblock(b.user_id);
                        }}
                      >
                        <Button.Label>Unblock</Button.Label>
                      </Button>
                    </View>
                  </Card>
                ))}
              </View>
            ) : null}

            <Card>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-base text-foreground">Allow friend requests</Text>
                <Switch
                  isSelected={s.allow_friend_requests}
                  isDisabled={s.busyID === 'settings'}
                  onSelectedChange={(on) => void s.setAllow(on)}
                  accessibilityLabel="Allow friend requests"
                />
              </View>
            </Card>
          </View>
        ) : null}

        {s.tab === 'requests' ? (
          <View className="gap-3">
            {s.incoming.length === 0 ? <EmptyLine text="No pending friend requests" /> : null}
            {s.incoming.map((f) => (
              <FriendCard
                key={f.id}
                friend={f}
                type="pending"
                busy={s.busyID === f.id}
                onAccept={() => void s.accept(f.id)}
                onReject={() => void s.remove(f.id)}
              />
            ))}
          </View>
        ) : null}

        {s.tab === 'sent' ? (
          <View className="gap-3">
            {s.sent.length === 0 ? <EmptyLine text="No sent friend requests" /> : null}
            {s.sent.map((f) => (
              <FriendCard key={f.id} friend={f} type="sent" busy={s.busyID === f.id} onReject={() => void s.remove(f.id)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <AddFriendDialog isOpen={s.adding} onClose={() => s.setAdding(false)} onAdd={s.sendRequest} />
    </View>
  );
}
