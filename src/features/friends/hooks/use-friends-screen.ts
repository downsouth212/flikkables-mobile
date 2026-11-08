import { useFocusEffect } from 'expo-router';
import { useToast } from 'heroui-native';
import { useCallback, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import type { FriendRequestStatus, FriendsList } from '@/features/friends/types/friends';
import { friendsApi } from '@/features/friends/utils/friends-api';

export const FRIEND_TABS = ['friends', 'requests', 'sent'] as const;
export type FriendTab = (typeof FRIEND_TABS)[number];

const EMPTY: FriendsList = { friends: [], incoming: [], sent: [], blocked: [], allow_friend_requests: true };

export function useFriendsScreen() {
  const { toast } = useToast();
  const [data, setData] = useState<FriendsList>(EMPTY);
  const [tab, setTab] = useState<FriendTab>('friends');
  const [busyID, setBusyID] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = () =>
    friendsApi
      .list()
      .then(setData)
      .catch(() => undefined);

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const run = async (id: string, action: () => Promise<unknown>, success?: string) => {
    setBusyID(id);
    try {
      await action();
      Presets.System.notificationSuccess();
      if (success) toast.show({ label: success, variant: 'success' });
      await load();
      return true;
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: err instanceof Error ? err.message : 'Something went wrong. Try again.', variant: 'danger' });
      return false;
    } finally {
      setBusyID(null);
    }
  };

  const sendRequest = async (userID: string) => {
    const result: { status: FriendRequestStatus } = { status: 'pending' };
    const ok = await run(userID, async () => {
      result.status = (await friendsApi.request(userID)).status;
    });
    const status = result.status;
    if (ok) toast.show({ label: status === 'accepted' ? 'You’re now friends!' : 'Friend request sent!', variant: 'success' });
    return ok;
  };

  const setAllow = async (allow: boolean) => {
    setData((d) => ({ ...d, allow_friend_requests: allow }));
    const ok = await run('settings', () => friendsApi.setAllow(allow));
    if (!ok) setData((d) => ({ ...d, allow_friend_requests: !allow }));
  };

  return {
    ...data,
    tab,
    setTab,
    busyID,
    adding,
    setAdding,
    sendRequest,
    accept: (id: string) => run(id, () => friendsApi.accept(id), 'Friend request accepted'),
    remove: (id: string) => run(id, () => friendsApi.remove(id)),
    block: (userID: string) => run(userID, () => friendsApi.block(userID), 'Player blocked'),
    unblock: (userID: string) => run(userID, () => friendsApi.unblock(userID), 'Player unblocked'),
    setAllow,
  };
}
