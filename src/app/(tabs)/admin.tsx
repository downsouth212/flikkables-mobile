import { Button, Chip, Input, Label, Spinner, Switch, TextField } from 'heroui-native';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Card } from '@/components/card';
import { ListRow } from '@/components/list-row';
import { pressHaptic } from '@/components/pressable';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { Fonts } from '@/constants/theme';
import { confirmDelete } from '@/lib/confirm';
import { ADMIN_TABS, BATTLES, useAdminScreen } from '@/features/admin/hooks/use-admin-screen';
import type { City } from '@/features/game/types/game';

function CityPicker({ query, onQuery, cities, onPick }: { query: string; onQuery: (q: string) => void; cities: City[]; onPick: (c: City) => void }) {
  return (
    <View className="gap-3">
      <TextField>
        <Input
          className="leading-none"
          value={query}
          onChangeText={onQuery}
          placeholder="Search cities"
          autoCorrect={false}
          autoComplete="off"
          returnKeyType="search"
          onSubmitEditing={() => (cities[0] ? onPick(cities[0]) : undefined)}
        />
      </TextField>
      <Card list>
        {cities.map((c) => (
          <ListRow key={c.name} title={c.name} subtitle={c.country} onPress={() => onPick(c)} />
        ))}
      </Card>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}

function Toggle({ label, body, on, onChange }: { label: string; body?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text className="text-base text-foreground">{label}</Text>
        {body ? <Text className="text-xs text-muted">{body}</Text> : null}
      </View>
      <Switch isSelected={on} onSelectedChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

function seen(iso: string | null) {
  if (!iso) return 'never seen';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 5) return 'online now';
  if (mins < 60) return `seen ${mins}m ago`;
  if (mins < 1440) return `seen ${Math.round(mins / 60)}h ago`;
  return `seen ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export default function AdminScreen() {
  const s = useAdminScreen();
  const d = s.data;
  const p = s.selected;

  const press = (fn: () => void) => () => {
    pressHaptic();
    fn();
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-3xl text-foreground" style={{ fontFamily: Fonts?.display }}>Admin Panel</Text>
          <Text className="text-sm text-muted">Manage your app users and settings</Text>
        </View>
        {d ? (
          <Chip color={s.isMaster ? 'accent' : 'default'} variant="soft">
            <Chip.Label>{s.isMaster ? 'Master' : 'Admin'}</Chip.Label>
          </Chip>
        ) : null}
      </View>

      <Segmented values={ADMIN_TABS} value={s.tab} onChange={s.setTab} labels={['Invite', 'Users', 'Dummy', 'Settings', 'Drop']} />

      {s.notice ? <Text className="text-sm font-semibold text-success">{s.notice}</Text> : null}
      {s.error ? <Text className="text-sm text-danger">{s.error}</Text> : null}

      {d ? (
        <>
          {s.tab === 'invite' ? (
            <>
          <Section title="Invite users">
            <Card>
              <TextField>
                <Label>Email</Label>
                <Input
                  className="leading-none"
                  value={s.invite.email}
                  onChangeText={s.invite.setEmail}
                  placeholder="friend@email.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="off"
                  textContentType="emailAddress"
                  returnKeyType="send"
                />
              </TextField>
              <Segmented values={['user', 'admin'] as const} labels={['User', 'Admin']} value={s.invite.role} onChange={s.invite.setRole} />
              <Button onPress={press(() => void s.invite.send())} isDisabled={s.busy !== null}>
                {s.busy === 'invite' ? <Spinner color="white" /> : <Button.Label>Send Invitation</Button.Label>}
              </Button>
            </Card>
          </Section>
          {s.isMaster ? (
            <Section title="Admins">
              <Card list>
                {d.admins.map((a) => (
                  <ListRow
                    key={a.email}
                    title={a.email}
                    subtitle={`${a.role === 'master' ? 'Master admin' : 'Admin'} · ${a.claimed ? 'signed in' : 'hasn’t signed in yet'}`}
                    onPress={
                      a.role === 'master'
                        ? undefined
                        : () =>
                            confirmDelete({
                              title: `Remove ${a.email}?`,
                              message: 'They lose access to this panel.',
                              confirmLabel: 'Remove admin',
                              onConfirm: () => s.removeAdmin(a.email),
                            })
                    }
                  />
                ))}
              </Card>
              <View className="flex-row items-end gap-3">
                <TextField className="flex-1">
                  <Label>Add an admin</Label>
                  <Input
                    className="leading-none"
                    value={s.newAdmin}
                    onChangeText={s.setNewAdmin}
                    placeholder="their@email.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="off"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={() => (s.newAdmin.trim().length > 0 ? void s.addAdmin() : undefined)}
                  />
                </TextField>
                <Button onPress={press(() => void s.addAdmin())} isDisabled={s.busy !== null || s.newAdmin.trim().length === 0}>
                  <Button.Label>Add</Button.Label>
                </Button>
              </View>
            </Section>
          ) : null}

            </>
          ) : null}
          {s.tab === 'users' ? (
            <>
          <Card>
            <View className="flex-row">
              <Stat value={s.online} label="online now" />
              <Stat value={d.totals.players} label="total users" />
              <Stat value={d.totals.flikkables} label="Flikkables" />
              <Stat value={d.totals.landed} label="out in the world" />
            </View>
          </Card>

          <Section title="Manage users">
            {p ? (
              <Card>
                <View className="gap-0.5">
                  <Text className="text-lg text-foreground" style={{ fontFamily: Fonts?.display }}>{p.display_name}</Text>
                  <Text className="text-sm text-muted">{p.email ?? 'No email on file'}</Text>
                  <Text className="text-sm text-muted">
                    Home: {p.home_name} · {p.stamps} stamps · {p.flick_count} flikks
                  </Text>
                  <Text className="text-sm text-muted">{seen(p.last_seen_at)}</Text>
                  {p.locked ? <Text className="text-sm font-semibold text-danger">Locked</Text> : null}
                </View>
                {s.movingHome ? (
                  <View className="gap-3">
                    <View className="flex-row gap-3">
                      <TextField className="flex-1">
                        <Label>Latitude</Label>
                        <Input className="leading-none" keyboardType="numbers-and-punctuation" returnKeyType="done" value={s.latInput} onChangeText={s.setLatInput} />
                      </TextField>
                      <TextField className="flex-1">
                        <Label>Longitude</Label>
                        <Input className="leading-none" keyboardType="numbers-and-punctuation" returnKeyType="done" value={s.lngInput} onChangeText={s.setLngInput} />
                      </TextField>
                    </View>
                    <Button size="sm" onPress={press(() => void s.setLocation(p))} isDisabled={s.busy !== null}>
                      <Button.Label>Save location</Button.Label>
                    </Button>
                    <Text className="text-xs text-muted">Or pikk a city:</Text>
                    <CityPicker query={s.cityQuery} onQuery={s.setCityQuery} cities={s.cities} onPick={(c) => void s.moveHome(p, c)} />
                  </View>
                ) : null}
                <View className="flex-row flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onPress={press(() => s.setMovingHome(!s.movingHome))} isDisabled={s.busy !== null}>
                    <Button.Label>{s.movingHome ? 'Cancel' : 'Set User Location'}</Button.Label>
                  </Button>
                  {p.role === 'master' ? null : (
                    <Button size="sm" variant="secondary" onPress={press(() => void s.toggleLock(p))} isDisabled={s.busy !== null}>
                      <Button.Label>{p.locked ? 'Unlock' : 'Lock'}</Button.Label>
                    </Button>
                  )}
                  {p.role === 'master' ? null : (
                    <Button size="sm" variant="danger-soft" onPress={() => s.resetPlayer(p)} isDisabled={s.busy !== null}>
                      <Button.Label>Reset player</Button.Label>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onPress={press(() => s.select(null))}>
                    <Button.Label>Done</Button.Label>
                  </Button>
                </View>
              </Card>
            ) : null}
            <TextField>
              <Input className="leading-none" value={s.playerQuery} onChangeText={s.setPlayerQuery} placeholder="Search name, email or home" autoCapitalize="none" autoCorrect={false} autoComplete="off" returnKeyType="search" />
            </TextField>
            <Card list>
              {s.players.slice(0, 50).map((pl) => (
                <ListRow
                  key={pl.user_id}
                  title={`${s.isOnline(pl) ? '🟢 ' : ''}${pl.display_name}${pl.role ? ' · admin' : ''}${pl.locked ? ' · locked' : ''}`}
                  subtitle={`${pl.email ?? 'no email'} · ${seen(pl.last_seen_at)}`}
                  onPress={() => s.select(pl.user_id)}
                />
              ))}
            </Card>
            {s.players.length === 0 ? <Text className="text-sm text-muted">No players match.</Text> : null}
          </Section>
            </>
          ) : null}
          {s.tab === 'dummy' ? (
            <>
          <Section title="Create dummy user">
            <Card>
              <TextField>
                <Label>Email</Label>
                <Input className="leading-none" value={s.dummy.email} onChangeText={s.dummy.setEmail} placeholder="dummy@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="off" returnKeyType="next" />
              </TextField>
              <TextField>
                <Label>Password</Label>
                <Input className="leading-none" value={s.dummy.password} onChangeText={s.dummy.setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" autoComplete="off" textContentType="newPassword" returnKeyType="next" />
              </TextField>
              <TextField>
                <Label>Display Name</Label>
                <Input className="leading-none" value={s.dummy.name} onChangeText={s.dummy.setName} placeholder="Test Player" autoCapitalize="words" returnKeyType="done" maxLength={24} />
              </TextField>
              <Button onPress={press(() => void s.dummy.create())} isDisabled={s.busy !== null}>
                {s.busy === 'dummy' ? <Spinner color="white" /> : <Button.Label>Create Dummy User</Button.Label>}
              </Button>
            </Card>
          </Section>
            </>
          ) : null}
          {s.tab === 'settings' ? (
            <>
          <Section title="Game settings">
            <Card>
              <TextField>
                <Label>Pickup Radius (metres)</Label>
                <Input className="leading-none" keyboardType="number-pad" returnKeyType="done" value={s.rules.pickup} onChangeText={s.rules.setPickup} />
              </TextField>
              <Text className="text-xs text-muted">Distance within which players can pick up flikkables</Text>
              <TextField>
                <Label>Radar range (km)</Label>
                <Input className="leading-none" keyboardType="number-pad" returnKeyType="done" value={s.rules.nearby} onChangeText={s.rules.setNearby} />
              </TextField>
              <TextField>
                <Label>Most Flikkables a player can own</Label>
                <Input className="leading-none" keyboardType="number-pad" returnKeyType="done" value={s.rules.maxOwned} onChangeText={s.rules.setMaxOwned} />
              </TextField>
              <Button onPress={press(() => void s.rules.save())} isDisabled={s.busy !== null}>
                {s.busy === 'settings' ? <Spinner color="white" /> : <Button.Label>Save Settings</Button.Label>}
              </Button>
            </Card>
          </Section>

          <Section title="Feature settings">
            <Card>
              <Toggle label="Enable Guilds" on={s.features.show_guilds} onChange={(on) => s.setFeature('show_guilds', on)} />
              <Toggle label="Enable Map" on={s.features.show_map} onChange={(on) => s.setFeature('show_map', on)} />
              <Toggle label="Enable Races" on={s.features.show_races} onChange={(on) => s.setFeature('show_races', on)} />
              <Button onPress={press(() => void s.saveFeatures())} isDisabled={s.busy !== null}>
                {s.busy === 'features' ? <Spinner color="white" /> : <Button.Label>Save Feature Settings</Button.Label>}
              </Button>
            </Card>
          </Section>
          <Section title="Friend battles">
            <Card>
              {BATTLES.map((b) => (
                <Toggle
                  key={b.key}
                  label={`${b.icon} ${b.name}`}
                  body={b.body}
                  on={s.battles[b.key] ?? false}
                  onChange={(on) => s.toggleBattle(b.key, on)}
                />
              ))}
            </Card>
          </Section>
            </>
          ) : null}
          {s.tab === 'drop' ? (
            <>
          <Section title="Drop near me">
            <Card>
              <Segmented values={['here', 'city'] as const} labels={['Where I am', 'A city']} value={s.dropper.spot} onChange={s.dropper.setSpot} />
              {s.dropper.spot === 'city' ? (
                s.dropper.city ? (
                  <ListRow
                    title={`${s.dropper.city.name}, ${s.dropper.city.country}`}
                    subtitle="Tap to pikk another city"
                    onPress={() => s.setCityQuery(' ')}
                  />
                ) : (
                  <CityPicker query={s.cityQuery} onQuery={s.setCityQuery} cities={s.cities} onPick={s.dropper.setCity} />
                )
              ) : null}
              {s.dropper.spot === 'city' && s.dropper.city && s.cityQuery.length > 0 ? (
                <CityPicker query={s.cityQuery} onQuery={s.setCityQuery} cities={s.cities} onPick={s.dropper.setCity} />
              ) : null}
              <View className="flex-row gap-3">
                <TextField className="flex-1">
                  <Label>How many</Label>
                  <Input className="leading-none" keyboardType="number-pad" returnKeyType="done" value={s.dropper.count} onChangeText={s.dropper.setCount} />
                </TextField>
                <TextField className="flex-1">
                  <Label>Spread (m)</Label>
                  <Input className="leading-none" keyboardType="number-pad" returnKeyType="done" value={s.dropper.spread} onChangeText={s.dropper.setSpread} />
                </TextField>
              </View>
              <Button onPress={press(() => void s.dropper.drop())} isDisabled={s.busy !== null}>
                {s.busy === 'drop' ? <Spinner color="white" /> : <Button.Label>Drop them</Button.Label>}
              </Button>
              <Button variant="ghost" onPress={s.dropper.clear} isDisabled={s.busy !== null}>
                <Button.Label>Clear all team drops</Button.Label>
              </Button>
            </Card>
          </Section>

            </>
          ) : null}
        </>
      ) : s.error ? null : (
        <Spinner />
      )}
    </KeyboardAwareScrollView>
  );
}
