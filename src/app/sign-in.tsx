import { Button, FieldError, Input, Label, Spinner, TextField } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { AirmailStripe } from '@/features/game/components/airmail-stripe';
import { CreatureStamp } from '@/features/game/components/creature-stamp';

type Mode = 'Sign in' | 'Create account';

export default function SignInScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('Create account');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const creating = mode === 'Create account';

  const submit = async () => {
    pressHaptic();
    setError(null);
    if (!email.includes('@')) return setError('Enter your email address.');
    if (password.length < 8) return setError('Use a password of at least 8 characters.');
    if (creating && name.trim().length === 0) return setError('Tell us what to call you.');
    setBusy(true);
    try {
      if (creating) await signUpWithEmail(email.trim(), password, name.trim());
      else await signInWithEmail(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center gap-4 pt-10">
        <View className="flex-row gap-3">
          <View style={{ transform: [{ rotate: '-8deg' }] }}>
            <CreatureStamp emoji="🦊" rarity="rare" size="md" />
          </View>
          <View style={{ transform: [{ rotate: '6deg' }] }}>
            <CreatureStamp emoji="🐙" rarity="legendary" size="md" />
          </View>
        </View>
        <Text className="text-4xl font-black text-foreground" style={{ fontFamily: Fonts?.rounded }}>
          Flikkables
        </Text>
        <Text className="text-center text-base text-muted">
          Flick little creatures to real cities around the world. Find the ones that land near you.
        </Text>
      </View>
      <AirmailStripe />
      <Segmented<Mode> values={['Create account', 'Sign in']} value={mode} onChange={setMode} />
      <View className="gap-4">
        {creating ? (
          <TextField>
            <Label>Your name</Label>
            <Input className="leading-none" value={name} onChangeText={setName} placeholder="What other players see" autoComplete="name" />
          </TextField>
        ) : null}
        <TextField>
          <Label>Email</Label>
          <Input
            className="leading-none"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </TextField>
        <TextField isInvalid={error !== null}>
          <Label>Password</Label>
          <Input
            className="leading-none"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete={creating ? 'new-password' : 'current-password'}
          />
          <FieldError>{error ?? ''}</FieldError>
        </TextField>
      </View>
      <Button size="lg" onPress={submit} isDisabled={busy}>
        {busy ? <Spinner color="white" /> : <Button.Label>{creating ? 'Create account' : 'Sign in'}</Button.Label>}
      </Button>
    </KeyboardAwareScrollView>
  );
}
