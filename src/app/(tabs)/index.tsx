import { Ionicons } from '@expo/vector-icons';
import { Button, useThemeColor } from 'heroui-native';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ListRow } from '@/components/list-row';
import { Pressable, pressHaptic } from '@/components/pressable';
import { Section } from '@/components/section';
import { Fonts } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import { FlickPad } from '@/features/game/components/flick-pad';
import { LandingCard } from '@/features/game/components/landing-card';
import { WorldMap } from '@/features/game/components/world-map';
import { MAX_OWNED, useLaunchScreen } from '@/features/game/hooks/use-launch-screen';
import { formatKm } from '@/features/game/utils/geo';
import { statusLine } from '@/features/game/utils/rarity';

export default function LaunchScreen() {
  const s = useLaunchScreen();
  const accent = useThemeColor('accent');
  const muted = useThemeColor('muted');

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6"
        refreshControl={<RefreshControl refreshing={s.refreshing} onRefresh={s.reload} tintColor={accent} />}
      >
        <View className="flex-row items-end justify-between gap-3">
          <Text className="text-3xl font-bold text-foreground">Launch</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-2xl font-black text-accent" style={{ fontFamily: Fonts?.rounded }}>
              {s.profile?.stamps ?? 0}
            </Text>
            <Text className="text-sm text-muted">stamps</Text>
          </View>
        </View>

        {s.selected ? (
          <FlickPad flikkable={s.selected} onFlick={s.launch} />
        ) : (
          <Card>
            <Text className="text-lg font-semibold text-foreground">Everyone’s out exploring</Text>
            <Text className="text-base text-muted">
              All your Flikkables are somewhere in the world. Make a new one, or send one home from its page.
            </Text>
          </Card>
        )}
        {s.error ? <Text className="text-center text-sm text-danger">{s.error}</Text> : null}

        <Section title={`At home · ${s.atHome.length}`}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 py-1">
            {s.atHome.map((f) => (
              <Pressable key={f.id} onPress={() => s.select(f.id)} accessibilityLabel={`Select ${f.name}`}>
                <View className={cn('items-center gap-1 rounded-xl p-1', f.id === s.selected?.id ? 'bg-accent/15' : '')}>
                  <CreatureStamp emoji={f.emoji} rarity={f.rarity} size="sm" />
                  <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                    {f.name}
                  </Text>
                </View>
              </Pressable>
            ))}
            {s.canCreate ? (
              <Pressable onPress={s.create} accessibilityLabel="Make a new Flikkable">
                <View className="items-center gap-1 p-1">
                  <View className="size-13 items-center justify-center rounded-md border-2 border-dashed border-border">
                    <Ionicons name="add" size={24} color={muted} />
                  </View>
                  <Text className="text-xs font-semibold text-muted">New</Text>
                </View>
              </Pressable>
            ) : null}
          </ScrollView>
          {!s.canCreate ? (
            <Text className="text-sm text-muted">You own {MAX_OWNED} Flikkables, the most you can have at once.</Text>
          ) : null}
        </Section>

        <Section title={`Out in the world · ${s.away.length}`}>
          <WorldMap
            home={s.profile ? { lat: s.profile.home_lat, lng: s.profile.home_lng } : undefined}
            arcs={s.away.map((f) => ({
              key: f.id,
              from: { lat: f.home_lat, lng: f.home_lng },
              to: { lat: f.current_lat, lng: f.current_lng },
            }))}
            pins={s.away.map((f) => ({ key: f.id, lat: f.current_lat, lng: f.current_lng, emoji: f.emoji }))}
          />
          {s.away.length > 0 ? (
            <Card list>
              {s.away.map((f) => (
                <ListRow
                  key={f.id}
                  title={`${f.emoji}  ${f.name}`}
                  subtitle={statusLine(f, s.profile?.user_id)}
                  right={<Text className="text-sm text-muted">{formatKm(f.total_km)}</Text>}
                  onPress={() => s.open(f.id)}
                />
              ))}
            </Card>
          ) : (
            <Text className="text-base text-muted">Flick a Flikkable and it shows up here, wherever it lands.</Text>
          )}
          {s.atHome.length > 0 ? (
            <Card list>
              {s.atHome.map((f) => (
                <ListRow
                  key={f.id}
                  title={`${f.emoji}  ${f.name}`}
                  subtitle={`At home · ${formatKm(f.total_km)} travelled`}
                  onPress={() => s.open(f.id)}
                />
              ))}
            </Card>
          ) : null}
        </Section>
        {s.canCreate ? (
          <Button
            variant="secondary"
            onPress={() => {
              pressHaptic();
              s.create();
            }}
          >
            <Button.Label>Make a new Flikkable</Button.Label>
          </Button>
        ) : null}
      </ScrollView>
      {s.lastLanding ? (
        <LandingCard
          landing={s.lastLanding.landing}
          flikkable={s.lastLanding.flikkable}
          onDone={s.closeLanding}
          onOpen={() => {
            const id = s.lastLanding?.flikkable.id;
            s.closeLanding();
            if (id) s.open(id);
          }}
        />
      ) : null}
    </View>
  );
}
