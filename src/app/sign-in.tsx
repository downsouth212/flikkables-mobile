import { Button, FieldError, Input, Label, Spinner, TextField } from 'heroui-native';
import { useRef, useState } from 'react';
import { Text, type TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { Image } from '@/components/image';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'Sign in' | 'Create account';

const BUTTON_GLOW = { boxShadow: `0 0 24px ${Colors.dark.glow}99` };

export default function SignInScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>('Create account');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const creating = mode === 'Create account';
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

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
      bottomOffset={140}
    >
      <View className="-mx-5 items-center">
        <Image source={require('@/assets/images/game/hero-launch.jpg')} className="aspect-[3/2] w-full" contentFit="cover" />
      </View>
      <View className="items-center gap-2">
        <Text className="text-5xl text-foreground" style={{ fontFamily: Fonts?.display, textShadowColor: Colors.dark.glow, textShadowRadius: 18 }}>
          FLIKKABLES
        </Text>
        <Text className="text-center text-base text-muted">
          Flikk little creatures to real cities around the world. Find the ones that land near you.
        </Text>
      </View>
      <Segmented<Mode> values={['Create account', 'Sign in']} value={mode} onChange={setMode} />
      <View className="gap-4">
        {creating ? (
          <TextField>
            <Label>Your name</Label>
            <Input
              className="leading-none"
              value={name}
              onChangeText={setName}
              placeholder="What other players see"
              autoComplete="name"
              textContentType="nickname"
              autoCapitalize="words"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </TextField>
        ) : null}
        <TextField>
          <Label>Email</Label>
          <Input
            ref={emailRef}
            className="leading-none"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        </TextField>
        <TextField isInvalid={error !== null}>
          <Label>Password</Label>
          <Input
            ref={passwordRef}
            className="leading-none"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete={creating ? 'new-password' : 'current-password'}
            textContentType={creating ? 'newPassword' : 'password'}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={() => void submit()}
          />
          <FieldError>{error ?? ''}</FieldError>
        </TextField>
      </View>
      <View className="rounded-2xl" style={BUTTON_GLOW}>
        <Button size="lg" onPress={submit} isDisabled={busy}>
          {busy ? (
            <Spinner color="white" />
          ) : (
            <Button.Label style={{ fontFamily: Fonts?.display }}>{creating ? 'CREATE ACCOUNT' : 'SIGN IN'}</Button.Label>
          )}
        </Button>
      </View>
    </KeyboardAwareScrollView>
  );
}
