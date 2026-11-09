import { Ionicons } from '@expo/vector-icons';
import { Button, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable, pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { Fonts } from '@/constants/theme';
import { AwayFilterBar } from '@/features/game/components/away-filter-bar';
import { CelebrationOverlay } from '@/features/game/components/celebration-overlay';
import { CharacterCard } from '@/features/game/components/character-card';
import { CityInfoDialog } from '@/features/game/components/city-info-dialog';
import { FlickPad } from '@/features/game/components/flick-pad';
import { FlickTargetSheet } from '@/features/game/components/flick-target-sheet';
import { GameDialog } from '@/features/game/components/game-dialog';
import { LandingCard } from '@/features/game/components/landing-card';
import { ReturnDialog } from '@/features/game/components/return-dialog';
import { StreakPopup } from '@/features/game/components/streak-popup';
import { UserStatusBar } from '@/features/game/components/user-status-bar';
import { useHomeScreen } from '@/features/game/hooks/use-home-screen';
import { NotificationBell } from '@/features/notifications/components/notification-bell';

const STAMP_RULES = [
  '1 stamp per unique city visited',
  '1 stamp per 1000 km traveled',
  '3 stamps bonus for cities with 1M+ population',
  'Rarity bonuses: Rare +2, Epic +5, Legendary +10',
  'Trade characters for stamps from other players',
  'Complete quests and exchange trophies for stamps',
];

function PlaceTile({ icon, count, line, hint, empty, onPress }: { icon: string; count: number; line: string; hint: string; empty: string; onPress: () => void }) {
  return (
    <Pressable className="flex-1" onPress={onPress} accessibilityLabel={line}>
      <Card className="flex-1 items-center justify-center gap-1">
        <Text className="text-4xl">{icon}</Text>
        <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>
          {count}
        </Text>
        <Text className="text-center text-sm font-semibold text-foreground">{count ? line : empty}</Text>
        <Text className="text-xs text-muted">{hint}</Text>
      </Card>
    </Pressable>
  );
}

export default function HomeScreen() {
  const s = useHomeScreen();
  const accent = useThemeColor('accent');
  const foreground = useThemeColor('foreground');
  const accentForeground = useThemeColor('accent-foreground');
  const [stampHelp, setStampHelp] = useState(false);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6"
        refreshControl={<RefreshControl refreshing={s.refreshing} onRefresh={s.reload} tintColor={accent} />}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>
              Flikkables
            </Text>
            <Text className="text-sm text-muted">Send them on adventures!</Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5">
            <View className="size-2 rounded-full bg-success" />
            <Text className="text-xs font-semibold text-foreground">{s.online}</Text>
          </View>
          <NotificationBell />
          <Pressable onPress={s.openAccount} accessibilityLabel="Account">
            <View className="size-10 items-center justify-center">
              <Ionicons name="person-circle-outline" size={28} color={foreground} />
            </View>
          </Pressable>
        </View>

        {s.profile ? <UserStatusBar
            profile={s.profile}
            onTrophies={s.openTrophies}
            onRewards={s.openRewards}
            onLeaderboard={s.openLeaderboard}
          /> : null}

        <View className="flex-row gap-3">
          <Pressable onPress={() => setStampHelp(true)} accessibilityLabel="How stamps work">
            <Card className="flex-1 gap-1">
              <Text className="text-xs font-semibold uppercase text-muted">Your Stamps ⓘ</Text>
              <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }}>
                🛂 {s.profile?.stamps ?? 0}
              </Text>
            </Card>
          </Pressable>
          <Card className="flex-1 gap-1">
            <Text className="text-xs font-semibold uppercase text-muted">Flikkables Returned</Text>
            <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }}>
              🏠 {s.profile?.returned_count ?? 0}
            </Text>
          </Card>
        </View>

        {s.selected ? <FlickPad flikkable={s.selected} onFlick={s.onFlick} /> : null}

        <Segmented
          values={['home', 'away'] as const}
          value={s.tab}
          onChange={s.setTab}
          labels={[`Home (${s.atHome.length})`, `Away (${s.travelling.length})`]}
        />

        {s.tab === 'home' ? (
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <PlaceTile
                  icon="🌳"
                  count={s.garden.length}
                  line="Relaxing in garden"
                  hint="Tap to view Garden"
                  empty="Move Flikkables here from the Airport"
                  onPress={() => s.openPlace('garden')}
                />
              </View>
              <View className="flex-1">
                <PlaceTile
                  icon="✈️"
                  count={s.airport.length}
                  line="Ready for flikking!"
                  hint="Tap to view Airport"
                  empty="Send to Airport for flikking!"
                  onPress={() => s.openPlace('airport')}
                />
              </View>
            </View>
            {s.atHome.length === 0 ? (
              <Card className="items-center gap-3">
                <Text className="text-5xl">🥚</Text>
                <Text className="text-lg font-bold text-foreground">No Flikkables Yet</Text>
                <Text className="text-center text-sm text-muted">Create your first Flikkable to start the adventure!</Text>
                <Button onPress={s.create}>
                  <Button.Label>Create Flikkable</Button.Label>
                </Button>
              </Card>
            ) : null}
          </View>
        ) : (
          <View className="gap-3">
            <AwayFilterBar filter={s.filter} onChange={s.setFilter} />
            {s.away.length === 0 ? <Text className="text-center text-sm text-muted">No Flikkables are flikkd away right now.</Text> : null}
            {s.away.map((f) => (
              <CharacterCard
                key={f.id}
                f={f}
                myID={s.myID}
                showOwner={f.owner_id !== s.myID}
                onPress={() => s.openAway(f)}
                onJourney={() => s.openJourney(f.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-safe-offset-24 right-5">
        <Pressable onPress={s.create} accessibilityLabel="Create Flikkable">
          <View className="size-14 items-center justify-center rounded-full bg-accent">
            <Ionicons name="add" size={30} color={accentForeground} />
          </View>
        </Pressable>
      </View>

      <GameDialog isOpen={stampHelp} onClose={() => setStampHelp(false)} title="How Stamps Work">
        <View className="gap-1.5">
          {STAMP_RULES.map((rule) => (
            <Text key={rule} className="text-sm text-foreground">
              • {rule}
            </Text>
          ))}
        </View>
      </GameDialog>

      <FlickTargetSheet isOpen={s.targetOpen} onChoose={s.chooseTarget} />
      <ReturnDialog f={s.returning} busy={s.returnBusy} onClose={() => s.setReturning(null)} onConfirm={s.confirmReturn} />
      <CityInfoDialog
        f={s.cityInfo}
        onClose={() => s.setCityInfo(null)}
        onReturn={() => {
          const f = s.cityInfo;
          s.setCityInfo(null);
          s.setReturning(f);
        }}
      />
      <StreakPopup streak={s.streak} onClose={s.closeStreak} />
      <CelebrationOverlay />

      {s.lastLanding?.origin === 'launch' ? (
        <LandingCard
          saying={s.saying}
          landing={s.lastLanding.landing}
          flikkable={s.lastLanding.flikkable}
          onDone={s.closeLanding}
          onOpen={() => {
            const id = s.lastLanding?.flikkable.id;
            s.closeLanding();
            if (id) s.openJourney(id);
          }}
        />
      ) : null}
    </View>
  );
}
