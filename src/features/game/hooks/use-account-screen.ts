import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/lib/auth';
import { confirmDelete } from '@/lib/confirm';
import { useGameStore } from '@/features/game/store/game-store';
import { useSettingsStore } from '@/features/settings/store/settings-store';
import { gameApi } from '@/features/game/utils/game-api';

export function useAccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profile = useGameStore((s) => s.profile);
  const role = useGameStore((s) => s.role);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = () =>
    confirmDelete({
      title: 'Delete your account?',
      message: 'Your Flikkables, journeys and stamps are deleted for good. Other players won’t see them again.',
      confirmLabel: 'Delete account',
      onConfirm: async () => {
        try {
          await gameApi.deleteMe();
          await authClient.deleteUser();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Couldn’t delete your account.');
          return;
        }
        await signOut();
      },
    });

  return {
    email: user?.email ?? '',
    profile,
    role,
    error,
    setTheme,
    signOut: () => void signOut(),
    deleteAccount,
    openAdmin: () => router.push('/admin'),
  };
}
