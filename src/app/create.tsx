import { useRouter } from 'expo-router';
import { Button, Input, Label, Spinner, TextField } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Card } from '@/components/card';
import { Pressable, pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { cn } from '@/lib/cn';
import { GameDialog } from '@/features/game/components/game-dialog';
import { useGameStore } from '@/features/game/store/game-store';
import { gameApi } from '@/features/game/utils/game-api';
import { isProfane } from '@/features/game/utils/profanity';
import { CREATURES } from '@/features/game/utils/rarity';
import { AuthImage } from '@/features/postcards/components/auth-image';
import type { CharacterTemplate } from '@/features/postcards/types/postcard';
import { templateApi, templateImageURL } from '@/features/postcards/utils/postcard-api';
import { useAuth } from '@/contexts/AuthContext';

const FLIKKSTAR_COST = 10;

const TABS = ['emoji', 'templates'] as const;

export default function CreateScreen() {
  const router = useRouter();
  const upsert = useGameStore((s) => s.upsert);
  const stamps = useGameStore((s) => s.profile?.stamps ?? 0);
  const refresh = useGameStore((s) => s.refresh);
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CharacterTemplate[] | null>(null);
  const [template, setTemplate] = useState<CharacterTemplate | null>(null);
  const [unlocking, setUnlocking] = useState<CharacterTemplate | null>(null);
  const loadTemplates = () =>
    templateApi
      .list()
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  useEffect(() => {
    void loadTemplates();
  }, []);
  const [tab, setTab] = useState<(typeof TABS)[number]>('emoji');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = name.trim().length > 0 && (tab === 'emoji' ? emoji !== null : template !== null);

  const unlock = async (t: CharacterTemplate) => {
    setUnlocking(null);
    setError(null);
    try {
      await templateApi.unlock(t.id);
      if (user) await refresh(user.id);
      await loadTemplates();
      setTemplate({ ...t, unlocked: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t unlock it.');
    }
  };

  const pickTemplate = (t: CharacterTemplate) => {
    setError(null);
    if (t.is_locked && !t.unlocked) return setUnlocking(t);
    setTemplate(t);
  };

  const save = async () => {
    if (tab === 'templates') return saveFlikkstar();
    if (!emoji) return;
    setConfirming(false);
    if (isProfane(name)) return setError('Please choose an appropriate name');
    setSaving(true);
    setError(null);
    try {
      const { flikkable } = await gameApi.create({ name: name.trim(), emoji });
      upsert(flikkable);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t create it. Try again.');
      setSaving(false);
    }
  };

  const saveFlikkstar = async () => {
    if (!template) return;
    setConfirming(false);
    if (isProfane(name)) return setError('Please choose an appropriate name');
    if (stamps < FLIKKSTAR_COST) return setError(`Not enough stamps! You need ${FLIKKSTAR_COST} but have ${stamps}`);
    setSaving(true);
    setError(null);
    try {
      const { flikkable } = await gameApi.create({ name: name.trim(), emoji: '⭐', template_id: template.id });
      upsert(flikkable);
      if (user) await refresh(user.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t create it. Try again.');
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-5 pt-6 pb-safe-offset-4 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold text-foreground">Create New Flikkable</Text>
        <TextField isInvalid={error !== null}>
          <Label>Name</Label>
          <Input
            className="leading-none"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            placeholder="Give your Flikkable a name..."
            maxLength={24}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </TextField>
        <Segmented values={TABS} value={tab} onChange={setTab} labels={['Flikkables', 'Flikkstars']} />
        {tab === 'emoji' ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Choose an Emoji</Text>
            <Card><View className="flex-row flex-wrap justify-center gap-2">
              {CREATURES.map((c) => (
                <Pressable key={c} onPress={() => setEmoji(c)} accessibilityLabel={`Emoji ${c}`}>
                  <View
                    className={cn(
                      'size-12 items-center justify-center rounded-xl',
                      c === emoji ? 'bg-accent' : 'bg-background',
                    )}
                  >
                    <Text className="text-3xl">{c}</Text>
                  </View>
                </Pressable>
              ))}
            </View></Card>
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Choose a Flikkstar</Text>
            <Text className="text-xs text-muted">⭐ Flikkstars cost {FLIKKSTAR_COST} stamps · You have {stamps}</Text>
            {templates === null ? <Spinner /> : null}
            {templates?.length === 0 ? (
              <Text className="py-8 text-center text-sm text-muted">No templates available yet</Text>
            ) : null}
            <View className="flex-row flex-wrap gap-3">
              {(templates ?? []).map((t) => (
                <Pressable key={t.id} onPress={() => pickTemplate(t)} accessibilityLabel={`Flikkstar ${t.name}`}>
                  <View
                    className={cn(
                      'w-28 gap-1 rounded-xl p-1',
                      t.id === template?.id ? 'bg-accent' : 'bg-surface',
                    )}
                  >
                    <AuthImage uri={templateImageURL(t.id)} className="aspect-square w-full rounded-lg" />
                    <Text numberOfLines={1} className="text-center text-xs font-semibold text-foreground">{t.name}</Text>
                    {t.is_locked && !t.unlocked ? (
                      <Text className="text-center text-xs text-warning">🔒 {t.stamp_cost}</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {tab === 'templates' && template ? (
          <View className="items-center gap-1">
            <AuthImage uri={templateImageURL(template.id)} className="size-28 rounded-2xl" />
            <Text className="text-base font-semibold text-foreground">{name.trim() || template.name}</Text>
          </View>
        ) : null}
        {tab === 'emoji' && emoji ? (
          <View className="items-center gap-1">
            <Text className="text-6xl">{emoji}</Text>
            <Text className="text-base font-semibold text-foreground">{name.trim() || ' '}</Text>
          </View>
        ) : null}
        {error ? <Text className="text-center text-sm text-danger">{error}</Text> : null}
        <View className="flex-row gap-3">
          <Button variant="secondary" className="flex-1" onPress={() => router.back()}>
            <Button.Label>Cancel</Button.Label>
          </Button>
          <Button
            className="flex-1"
            isDisabled={!ready || saving}
            onPress={() => {
              pressHaptic();
              setConfirming(true);
            }}
          >
            {saving ? <Spinner color="white" /> : <Button.Label>Create Flikkable</Button.Label>}
          </Button>
        </View>
      </KeyboardAwareScrollView>

      <GameDialog isOpen={confirming} onClose={() => setConfirming(false)} title="Create Flikkable">
        <Text className="text-center text-lg font-medium text-foreground">
          {tab === 'templates' ? `Create this Flikkstar for ${FLIKKSTAR_COST} stamps?` : 'Create your new Flikkable!'}
        </Text>
        <View className="flex-row gap-3">
          <Button variant="secondary" className="flex-1" onPress={() => setConfirming(false)}>
            <Button.Label>Cancel</Button.Label>
          </Button>
          <Button className="flex-1" onPress={save}>
            <Button.Label>Create</Button.Label>
          </Button>
        </View>
      </GameDialog>

      <GameDialog isOpen={unlocking !== null} onClose={() => setUnlocking(null)} title="Locked Flikkstar">
        <Text className="text-center text-base text-foreground">
          Unlock {unlocking?.name} for {unlocking?.stamp_cost} stamps? You have {stamps}.
        </Text>
        <View className="flex-row gap-3">
          <Button variant="secondary" className="flex-1" onPress={() => setUnlocking(null)}>
            <Button.Label>Cancel</Button.Label>
          </Button>
          <Button className="flex-1" onPress={() => (unlocking ? unlock(unlocking) : undefined)}>
            <Button.Label>Unlock for {unlocking?.stamp_cost ?? 0} stamps</Button.Label>
          </Button>
        </View>
      </GameDialog>
    </View>
  );
}
