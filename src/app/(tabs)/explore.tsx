import { Button, Spinner, useThemeColor } from 'heroui-native';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ListRow } from '@/components/list-row';
import { pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { Fonts } from '@/constants/theme';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import { GameDialog } from '@/features/game/components/game-dialog';
import { LandingCard } from '@/features/game/components/landing-card';
import { WorldMap } from '@/features/game/components/world-map';
import { EXPLORE_TABS, SORTS, useExploreScreen } from '@/features/game/hooks/use-explore-screen';
import { formatCoords, formatKm, timeUntil } from '@/features/game/utils/geo';
import { RARITY_LABEL } from '@/features/game/utils/rarity';
import { PostcardGallery } from '@/features/postcards/components/postcard-gallery';

function distanceLabel(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <Card className="items-center gap-2 py-8">
      <Text className="text-4xl">{icon}</Text>
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      <Text className="text-center text-sm text-muted">{body}</Text>
    </Card>
  );
}

export default function ExploreScreen() {
  const s = useExploreScreen();
  const accent = useThemeColor('accent');
  const pickupKm = s.result?.pickup_radius_km ?? 0.05;
  const sel = s.selected;
  const unsent = s.returning ? s.postcards.unsentFor(s.returning.id) : null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5"
        refreshControl={
          <RefreshControl
            refreshing={s.scanning}
            onRefresh={() => {
              void s.scan();
              void s.postcards.load();
            }}
            tintColor={accent}
          />
        }
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>Explore</Text>
            <Text className="text-sm text-muted">Discover Flikkables worldwide</Text>
          </View>
          <Button
            size="sm"
            variant="secondary"
            isDisabled={s.scanning}
            accessibilityLabel="Refresh"
            onPress={() => {
              pressHaptic();
              void s.scan();
              void s.postcards.load();
            }}
          >
            <Button.Label>{s.scanning ? 'Refreshing...' : 'Refresh'}</Button.Label>
          </Button>
        </View>

        <Segmented values={EXPLORE_TABS} value={s.tab} onChange={s.setTab} labels={['Nearby', 'Carrying', 'Postcards', 'Global']} />

        {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}
        {s.postcards.error ? <Text className="text-sm text-danger">{s.postcards.error}</Text> : null}
        {s.notice ? <Text className="text-sm text-success">{s.notice}</Text> : null}
        {s.postcards.toast ? <Text className="text-sm text-success">{s.postcards.toast}</Text> : null}
        {s.postcards.making ? (
          <View className="flex-row items-center gap-2">
            <Spinner />
            <Text className="text-sm text-muted">Making your selfie postcard…</Text>
          </View>
        ) : null}

        {s.tab === 'nearby' ? (
          <View className="gap-4">
            {s.locationError ? (
              <Card>
                <Text className="text-sm text-danger">{s.locationError}</Text>
                <Button
                  variant="secondary"
                  onPress={() => {
                    pressHaptic();
                    void s.scan();
                  }}
                >
                  <Button.Label>Retry</Button.Label>
                </Button>
              </Card>
            ) : null}
            {s.fix ? (
              <Card>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-sm font-semibold text-foreground">📍 Your Location</Text>
                    <Text className="text-xs text-muted" style={{ fontFamily: Fonts?.mono }}>
                      {s.place ? `${s.place} · ` : ''}
                      {formatCoords(s.fix.lat, s.fix.lng)}
                    </Text>
                  </View>
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={s.scanning}
                    onPress={() => {
                      pressHaptic();
                      void s.scan();
                    }}
                  >
                    <Button.Label>{s.scanning ? 'Refreshing...' : 'Recalibrate'}</Button.Label>
                  </Button>
                </View>
                <WorldMap
                  zoomable
                  tall
                  focus={s.fix}
                  focusZoom={8}
                  home={s.fix}
                  pins={s.nearby.map((f) => ({ key: f.id, lat: f.current_lat, lng: f.current_lng, emoji: f.emoji }))}
                />
                <Text className="text-xs text-muted">Pinch to zoom, drag to move, double-tap to zoom in.</Text>
              </Card>
            ) : null}
            {!s.fix && s.scanning ? (
              <View className="items-center gap-2 py-8">
                <Spinner />
                <Text className="text-sm text-muted">Finding your location…</Text>
              </View>
            ) : null}
            {!s.fix && !s.scanning ? (
              <Empty icon="📍" title="Location Required" body="Enable location to discover Flikkables near you." />
            ) : null}
            {s.fix ? (
              <View className="gap-3">
                <View className="flex-row items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      pressHaptic();
                      s.setHideMine(!s.hideMine);
                    }}
                  >
                    <Button.Label>{s.hideMine ? 'Show Mine' : 'Hide Mine'}</Button.Label>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      pressHaptic();
                      s.setAsc(!s.asc);
                    }}
                  >
                    <Button.Label>{s.asc ? '↑ Asc' : '↓ Desc'}</Button.Label>
                  </Button>
                </View>
                <Segmented values={SORTS} value={s.sort} onChange={s.setSort} labels={['Distance', 'Rarity', 'Name', 'Owner']} />
              </View>
            ) : null}
            {s.fix && s.result && s.nearby.length === 0 ? (
              <Empty icon="🔍" title="No Flikkables Nearby" body="Check back later or expand your search area!" />
            ) : null}
            {s.nearby.length > 0 ? (
              <Card list>
                {s.nearby.map((f) => (
                  <ListRow
                    key={f.id}
                    title={`${f.emoji}  ${f.name}`}
                    subtitle={`${RARITY_LABEL[f.rarity]} · ${f.owner_name} · ${distanceLabel(f.distance_km)}`}
                    onPress={() => s.setSelected(f)}
                  />
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}

        {s.tab === 'carrying' ? (
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Flikkables You&apos;re Carrying</Text>
            {s.holding.length === 0 ? (
              <Empty icon="🎒" title="Carrying no Flikkables" body="Pikk up from the Nearby tab to carry one!" />
            ) : null}
            {s.holding.map((f) => {
              const ready = !f.return_ready_at || new Date(f.return_ready_at).getTime() <= Date.now();
              return (
                <Card key={f.id}>
                  <View className="flex-row items-center gap-3">
                    <CreatureStamp emoji={f.emoji} templateID={f.template_id ?? undefined} rarity={f.rarity} size="sm" edge="surface" />
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
                        s.setReturning(f);
                      }}
                      isDisabled={!ready || s.busyID === f.id}
                    >
                      <Button.Label>{ready ? 'Return to owner' : `Return in ${timeUntil(f.return_ready_at ?? '')}`}</Button.Label>
                    </Button>
                  </View>
                  <Button
                    variant="ghost"
                    onPress={() => {
                      pressHaptic();
                      void s.selfie(f);
                    }}
                    isDisabled={s.postcards.making}
                  >
                    <Button.Label>📸 Take Selfie Postcard</Button.Label>
                  </Button>
                </Card>
              );
            })}
            {s.holding.length > 0 ? (
              <Card list>
                {s.holding.map((f) => (
                  <ListRow key={f.id} title={`${f.emoji}  ${f.name}`} subtitle="See its journey" onPress={() => s.open(f.id)} />
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}

        {s.tab === 'postcards' ? <PostcardGallery p={s.postcards} /> : null}

        {s.tab === 'global' ? (
          <View className="gap-3">
            <WorldMap
              zoomable
              tall
              home={s.fix ?? undefined}
              pins={(s.result?.roaming ?? []).map((p, i) => ({ key: `${p.place}-${i}`, lat: p.lat, lng: p.lng, emoji: p.emoji }))}
            />
            <Text className="text-xs text-muted">Pinch to zoom, drag to move, double-tap to zoom in.</Text>
            <Text className="text-sm text-muted" style={{ fontFamily: Fonts?.mono }}>
              {(s.result?.roaming.length ?? 0).toString()} FLIKKABLES OUT IN THE WORLD
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <GameDialog isOpen={sel !== null} onClose={() => s.setSelected(null)} title={sel ? `${sel.emoji} ${sel.name}` : ''}>
        {sel ? (
          <View className="items-center gap-1">
            <CreatureStamp emoji={sel.emoji} templateID={sel.template_id ?? undefined} rarity={sel.rarity} size="md" edge="surface" />
            <Text className="text-sm text-muted">
              {RARITY_LABEL[sel.rarity]} · {sel.owner_name}’s · {distanceLabel(sel.distance_km)}
            </Text>
            <Text className="text-xs text-muted">{formatKm(sel.total_km)} travelled</Text>
          </View>
        ) : null}
        {sel && sel.distance_km <= pickupKm ? (
          <View className="gap-3">
            <Button
              onPress={() => {
                pressHaptic();
                void s.pickup(sel);
              }}
              isDisabled={s.busyID === sel.id}
            >
              {s.busyID === sel.id ? <Spinner color="white" /> : <Button.Label>Pikk Up This Flikkable</Button.Label>}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                pressHaptic();
                void s.selfie(sel);
              }}
            >
              <Button.Label>📸 Take Selfie Postcard</Button.Label>
            </Button>
          </View>
        ) : null}
        {sel && sel.distance_km > pickupKm ? (
          <Button isDisabled>
            <Button.Label>
              Too Far Away · {Math.max(0, Math.round((sel.distance_km - pickupKm) * 1000))} m closer needed
            </Button.Label>
          </Button>
        ) : null}
      </GameDialog>

      <GameDialog
        isOpen={s.returning !== null}
        onClose={() => s.setReturning(null)}
        title={s.returning ? `Return ${s.returning.name}` : ''}
      >
        <Text className="text-center text-base text-foreground">
          {unsent ? 'Send a postcard with your return?' : `Send ${s.returning?.name ?? ''} home to ${s.returning?.owner_name ?? 'its owner'}?`}
        </Text>
        <View className="gap-3">
          {unsent ? (
            <Button
              onPress={() => {
                pressHaptic();
                if (s.returning) void s.sendHome(s.returning, true);
              }}
            >
              <Button.Label>Return with Postcard</Button.Label>
            </Button>
          ) : null}
          <Button
            variant={unsent ? 'secondary' : 'primary'}
            onPress={() => {
              pressHaptic();
              if (s.returning) void s.sendHome(s.returning, false);
            }}
          >
            <Button.Label>{unsent ? 'Return without Postcard' : 'Return'}</Button.Label>
          </Button>
          <Button variant="ghost" onPress={() => s.setReturning(null)}>
            <Button.Label>Cancel</Button.Label>
          </Button>
        </View>
      </GameDialog>

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
