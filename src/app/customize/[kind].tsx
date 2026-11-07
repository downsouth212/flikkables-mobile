import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable } from '@/components/pressable';
import { cn } from '@/lib/cn';
import { confirmDelete } from '@/lib/confirm';
import { BackHeader } from '@/features/game/components/back-header';
import { GameDialog } from '@/features/game/components/game-dialog';
import { PlaceScene } from '@/features/game/components/place-scene';
import { useCustomizeScreen } from '@/features/game/hooks/use-customize-screen';

export default function CustomizeScreen() {
  const s = useCustomizeScreen();
  const router = useRouter();
  const label = s.kind === 'garden' ? 'Garden' : 'Airport';

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
        <BackHeader title={`Customize ${label}`} />

        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">Inventory</Text>
          <Card>
            {s.inventory.length === 0 ? (
              <Text className="text-sm text-muted">No items in inventory</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {s.inventory.map((item) => (
                  <Pressable key={item.id} onPress={() => s.toggle(item)} accessibilityLabel={item.decoration.name}>
                    <View
                      className={cn(
                        'size-14 items-center justify-center rounded-xl border-2',
                        s.selected?.id === item.id ? 'border-accent bg-accent/10' : 'border-border bg-background',
                      )}
                    >
                      <Text className="text-3xl">{item.decoration.emoji}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
          {s.selected ? (
            <Text className="text-sm font-semibold text-neon">
              Click on the {label.toLowerCase()} preview to place {s.selected.decoration.name}
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">{label} Preview</Text>
          <PlaceScene
            kind={s.kind}
            characters={s.characters}
            items={s.scene}
            onCanvasPress={s.selected ? s.place : undefined}
            onItemPress={(item) => s.edit(item.id)}
          />
        </View>

        <Button onPress={() => router.back()}>
          <Button.Label>Done</Button.Label>
        </Button>
      </ScrollView>

      <GameDialog isOpen={!!s.editing} onClose={s.closeEdit} title={`${s.editing?.decoration.emoji ?? ''} ${s.editing?.decoration.name ?? ''}`}>
        <View className="gap-2">
          <Button variant="secondary" onPress={() => (s.editing ? s.removeItem(s.editing) : undefined)}>
            <Button.Label>Remove from {label.toLowerCase()}</Button.Label>
          </Button>
          <Button
            variant="danger"
            onPress={() => {
              const item = s.editing;
              if (!item) return;
              confirmDelete({
                title: `Delete ${item.decoration.name} permanently?`,
                message: 'This item will be gone from your inventory.',
                confirmLabel: 'Delete',
                onConfirm: () => s.deleteItem(item),
              });
            }}
          >
            <Button.Label>Delete permanently</Button.Label>
          </Button>
        </View>
      </GameDialog>
    </View>
  );
}
