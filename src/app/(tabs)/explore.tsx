import { Button, Spinner, useThemeColor } from 'heroui-native';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Image } from '@/components/image';
import { ListRow } from '@/components/list-row';
import { pressHaptic } from '@/components/pressable';
import { Section } from '@/components/section';
import { Fonts } from '@/constants/theme';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import { LandingCard } from '@/features/game/components/landing-card';
import { Radar } from '@/features/game/components/radar';
import { WorldMap } from '@/features/game/components/world-map';
import { useExploreScreen } from '@/features/game/hooks/use-explore-screen';
import { formatKm, timeUntil } from '@/features/game/utils/geo';
import { RARITY_LABEL } from '@/features/game/utils/rarity';

function distanceLabel(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export default function ExploreScreen() {
  const s = useExploreScreen();
  const accent = useThemeColor('accent');
  const pickupKm = s.result?.pickup_radius_km ?? 0.05;
  const radiusKm = s.result?.radius_km ?? 25;
  const sel = s.selected;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6"
        refreshControl={<RefreshControl refreshing={s.scanning} onRefresh={s.scan} tintColor={accent} />}
      >
        <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>EXPLORE</Text>

        <Section title={`Within ${radiusKm} km`}>
          <Card>
            {s.result ? (
              <Radar items={s.result.nearby} radiusKm={radiusKm} onSelect={s.setSelected} />
            ) : (
              <View className="aspect-square w-full items-center justify-center gap-3">
                {s.scanning ? (
                  <Spinner />
                ) : (
                  <Button
                    variant="secondary"
                    onPress={() => {
                      pressHaptic();
                      void s.scan();
                    }}
                  >
                    <Button.Label>Scan again</Button.Label>
                  </Button>
                )}
              </View>
            )}
            {s.result && s.result.nearby.length === 0 ? (
              <View className="gap-2">
                <Image source={require('@/assets/images/game/empty-radar.jpg')} className="aspect-[3/2] w-full rounded-xl" contentFit="cover" />
                <Text className="text-center text-base text-muted">
                  No Flikkables near you right now. Pull down to scan again later.
                </Text>
              </View>
            ) : null}
            {sel ? (
              <View className="flex-row items-center gap-3">
                <CreatureStamp emoji={sel.emoji} rarity={sel.rarity} size="sm" edge="surface" />
                <View className="flex-1 gap-0.5">
                  <Text className="text-lg text-foreground" style={{ fontFamily: Fonts?.display }}>{sel.name}</Text>
                  <Text className="text-sm text-muted">
                    {RARITY_LABEL[sel.rarity]} · {sel.owner_name}’s · {distanceLabel(sel.distance_km)}
                  </Text>
                </View>
              </View>
            ) : null}
            {sel && sel.distance_km <= pickupKm ? (
              <Button
                onPress={() => {
                  pressHaptic();
                  void s.pickup(sel);
                }}
                isDisabled={s.busyID === sel.id}
              >
                {s.busyID === sel.id ? <Spinner color="white" /> : <Button.Label>Pikk up {sel.name}</Button.Label>}
              </Button>
            ) : null}
            {sel && sel.distance_km > pickupKm ? (
              <Text className="text-sm text-muted">Walk within {Math.round(pickupKm * 1000)} m to pikk it up.</Text>
            ) : null}
          </Card>
          {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}
          {s.notice ? <Text className="text-sm text-success">{s.notice}</Text> : null}
        </Section>

        <Section title={`In your hands · ${s.holding.length}`}>
          {s.holding.length === 0 ? (
            <Text className="text-base text-muted">
              Flikkables you pikk up wait here. Flikk them onward to a new city, or send them home to their owner for a
              stamp bonus.
            </Text>
          ) : null}
          {s.holding.map((f) => {
            const ready = !f.return_ready_at || new Date(f.return_ready_at).getTime() <= Date.now();
            return (
              <Card key={f.id}>
                <View className="flex-row items-center gap-3">
                  <CreatureStamp emoji={f.emoji} rarity={f.rarity} size="sm" edge="surface" />
                  <View className="flex-1 gap-0.5">
                    <Text className="text-lg text-foreground" style={{ fontFamily: Fonts?.display }}>{f.name}</Text>
                    <Text className="text-sm text-muted">
                      {f.owner_name}’s · {formatKm(f.total_km)} travelled
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <Button
                    className="flex-1"
                    onPress={() => {
                      pressHaptic();
                      void s.flickOnward(f.id);
                    }}
                    isDisabled={s.busyID === f.id}
                  >
                    <Button.Label>Flikk onward</Button.Label>
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onPress={() => {
                      pressHaptic();
                      void s.sendHome(f.id);
                    }}
                    isDisabled={!ready || s.busyID === f.id}
                  >
                    <Button.Label>{ready ? 'Send home' : `Home in ${timeUntil(f.return_ready_at ?? '')}`}</Button.Label>
                  </Button>
                </View>
              </Card>
            );
          })}
        </Section>

        <Section title="Roaming the world">
          <WorldMap
            pins={(s.result?.roaming ?? []).map((p, i) => ({ key: `${p.place}-${i}`, lat: p.lat, lng: p.lng, tone: 'navy' }))}
            home={s.fix ?? undefined}
          />
          <Text className="text-sm text-muted" style={{ fontFamily: Fonts?.mono }}>
            {(s.result?.roaming.length ?? 0).toString()} FLIKKABLES OUT IN THE WORLD
          </Text>
          {s.holding.length > 0 ? (
            <Card list>
              {s.holding.map((f) => (
                <ListRow key={f.id} title={`${f.emoji}  ${f.name}`} subtitle="See its journey" onPress={() => s.open(f.id)} />
              ))}
            </Card>
          ) : null}
        </Section>
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
