import { Button, Input, Spinner, TextField } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { pressHaptic } from '@/components/pressable';
import { GameDialog } from '@/features/game/components/game-dialog';
import type { FriendSearchResult } from '@/features/friends/types/friends';
import { friendsApi } from '@/features/friends/utils/friends-api';

export function AddFriendDialog({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (userID: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingID, setAddingID] = useState<string | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let live = true;
    const timer = setTimeout(() => {
      friendsApi
        .search(q)
        .then((r) => (live ? setResults(r.players) : undefined))
        .catch(() => (live ? setResults([]) : undefined))
        .finally(() => (live ? setSearching(false) : undefined));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q]);

  const close = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  const add = async (userID: string) => {
    setAddingID(userID);
    const ok = await onAdd(userID);
    setAddingID(null);
    if (ok) setResults((rows) => rows.filter((r) => r.user_id !== userID));
  };

  return (
    <GameDialog isOpen={isOpen} onClose={close} title="Add Friend" scroll>
      <TextField>
        <Input
          className="leading-none"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by display name..."
          autoCapitalize="none"
          autoCorrect={false}
        />
      </TextField>
      {searching ? (
        <View className="items-center py-4">
          <Spinner />
        </View>
      ) : null}
      {!searching && q.length >= 2 && results.length === 0 ? (
        <Text className="py-4 text-center text-sm text-muted">No users found matching &quot;{q}&quot;</Text>
      ) : null}
      {!searching
        ? results.map((p) => (
            <View key={p.user_id} className="flex-row items-center gap-3">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="font-medium text-foreground" numberOfLines={1}>
                  {p.display_name}
                </Text>
                {p.home_name ? (
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {p.home_name}
                  </Text>
                ) : null}
              </View>
              <Button
                size="sm"
                isDisabled={addingID !== null}
                onPress={() => {
                  pressHaptic();
                  void add(p.user_id);
                }}
              >
                {addingID === p.user_id ? <Spinner color="white" /> : <Button.Label>Add</Button.Label>}
              </Button>
            </View>
          ))
        : null}
    </GameDialog>
  );
}
