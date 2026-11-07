import { Stack } from 'expo-router';
import { Button, Spinner } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { pressHaptic } from '@/components/pressable';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/features/game/store/game-store';

/** The navigation gate: sign in → set a home spot → the game. */
export function RootStack() {
  const { user, loading } = useAuth();
  const profile = useGameStore((s) => s.profile);
  const loaded = useGameStore((s) => s.loaded);
  const storeUser = useGameStore((s) => s.userID);
  const refresh = useGameStore((s) => s.refresh);
  const reset = useGameStore((s) => s.reset);
  const [error, setError] = useState<string | null>(null);
  const userID = user?.id ?? null;

  const load = (id: string) => {
    setError(null);
    refresh(id).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Couldn’t reach Flikkables.'));
  };

  useEffect(() => {
    if (!userID) {
      reset();
      return;
    }
    load(userID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userID]);

  const signedIn = userID !== null;
  const known = signedIn && storeUser === userID && (loaded || profile !== null);

  if (loading || (signedIn && !known)) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        {error ? (
          <>
            <Text className="text-center text-base text-muted">{error}</Text>
            <Button
              onPress={() => {
                pressHaptic();
                if (userID) load(userID);
              }}
            >
              <Button.Label>Try again</Button.Label>
            </Button>
          </>
        ) : (
          <Spinner />
        )}
      </View>
    );
  }

  const ready = signedIn && profile !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && profile === null}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="flikkable/[id]" />
        <Stack.Screen
          name="create"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [1], sheetGrabberVisible: true }}
        />
      </Stack.Protected>
    </Stack>
  );
}
