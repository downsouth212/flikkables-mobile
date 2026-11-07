import { useRouter } from 'expo-router';
import { Button, Input, Label, Spinner, TextField } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Pressable, pressHaptic } from '@/components/pressable';
import { cn } from '@/lib/cn';
import { CreatureStamp } from '@/features/game/components/creature-stamp';
import { useGameStore } from '@/features/game/store/game-store';
import { gameApi } from '@/features/game/utils/game-api';
import { CREATURES } from '@/features/game/utils/rarity';
import { Fonts } from '@/constants/theme';

export default function CreateScreen() {
  const router = useRouter();
  const upsert = useGameStore((s) => s.upsert);
  const select = useGameStore((s) => s.select);
  const [emoji, setEmoji] = useState<string>(CREATURES[Math.floor(Math.random() * CREATURES.length)] ?? '🦊');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    pressHaptic();
    if (name.trim().length === 0) return setError('Give it a name.');
    setSaving(true);
    setError(null);
    try {
      const { flikkable } = await gameApi.create({ name: name.trim(), emoji });
      upsert(flikkable);
      select(flikkable.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t make it.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-6 pb-safe-offset-4 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center gap-3">
        <CreatureStamp emoji={emoji} rarity="common" size="md" />
        <Text className="text-2xl text-foreground" style={{ fontFamily: Fonts?.display }}>New Flikkable</Text>
        <Text className="text-center text-sm text-muted">Its rarity is a surprise, rolled when it’s made.</Text>
      </View>
      <TextField isInvalid={error !== null}>
        <Label>Name</Label>
        <Input
          className="leading-none"
          value={name}
          onChangeText={setName}
          placeholder="Pip, Biscuit, Captain…"
          maxLength={24}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </TextField>
      <View className="flex-row flex-wrap justify-center gap-2">
        {CREATURES.map((c) => (
          <Pressable key={c} onPress={() => setEmoji(c)} accessibilityLabel={`Creature ${c}`}>
            <View
              className={cn(
                'size-12 items-center justify-center rounded-xl border-2',
                c === emoji ? 'border-accent bg-accent/15' : 'border-transparent',
              )}
            >
              <Text className="text-2xl">{c}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {error ? <Text className="text-center text-sm text-danger">{error}</Text> : null}
      <Button size="lg" onPress={save} isDisabled={saving}>
        {saving ? <Spinner color="white" /> : <Button.Label>Make {name.trim() || 'it'}</Button.Label>}
      </Button>
    </KeyboardAwareScrollView>
  );
}
