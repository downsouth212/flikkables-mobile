import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { pressHaptic } from '@/components/pressable';
import { BackHeader } from '@/features/game/components/back-header';
import { CharacterCard } from '@/features/game/components/character-card';
import { GameDialog } from '@/features/game/components/game-dialog';
import { PlaceScene } from '@/features/game/components/place-scene';
import { usePlaceScreen } from '@/features/game/hooks/use-place-screen';

export default function PlaceScreen() {
  const s = usePlaceScreen();
  const garden = s.kind === 'garden';
  const count = s.characters.length;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
        <BackHeader title={garden ? `Garden - Relaxing (${count})` : `Airport - Ready for Flikking (${count})`} />
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onPress={() => {
              pressHaptic();
              s.openShop();
            }}
          >
            <Button.Label>🛍️ Shop</Button.Label>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onPress={() => {
              pressHaptic();
              s.openCustomize();
            }}
          >
            <Button.Label>🎨 Customize</Button.Label>
          </Button>
        </View>
        {count > 0 ? (
          <Button
            size="sm"
            onPress={() => {
              pressHaptic();
              s.setBulkOpen(true);
            }}
          >
            <Button.Label>{garden ? 'Flikk all to Airport' : 'Flikk all to Garden'}</Button.Label>
          </Button>
        ) : null}

        <PlaceScene kind={s.kind} characters={s.characters} items={s.placed} onCharacterPress={(f) => s.setOpenID(f.id)} />
      </ScrollView>

      <GameDialog isOpen={!!s.open} onClose={() => s.setOpenID(null)} title={garden ? 'In Garden' : 'Ready to Flikk'}>
        {s.open ? (
          <CharacterCard
            f={s.open}
            myID={s.myID}
            inGarden={garden}
            inAirport={!garden}
            onJourney={() => (s.open ? s.openJourney(s.open.id) : undefined)}
            onMoveToAirport={() => (s.open ? s.moveOne(s.open) : undefined)}
            onMoveToGarden={() => (s.open ? s.moveOne(s.open) : undefined)}
            onFeed={() => (s.open ? s.feed(s.open) : undefined)}
            onPlay={() => (s.open ? s.play(s.open) : undefined)}
          />
        ) : null}
        {!garden && s.open ? (
          <Button
            onPress={() => {
              pressHaptic();
              if (s.open) s.selectForFlick(s.open);
            }}
          >
            <Button.Label>Select for Flikking</Button.Label>
          </Button>
        ) : null}
      </GameDialog>

      <GameDialog isOpen={s.bulkOpen} onClose={() => s.setBulkOpen(false)} title="Confirm Bulk Flikk">
        <Text className="text-sm text-muted">
          {garden ? `Flikk all ${count} Flikkables to Airport?` : `Flikk all ${count} Flikkables to Garden?`}
        </Text>
        <View className="flex-row gap-2">
          <Button variant="secondary" className="flex-1" onPress={() => s.setBulkOpen(false)}>
            <Button.Label>Cancel</Button.Label>
          </Button>
          <Button className="flex-1" isDisabled={s.busy} onPress={s.moveAll}>
            <Button.Label>Confirm</Button.Label>
          </Button>
        </View>
      </GameDialog>
    </View>
  );
}
