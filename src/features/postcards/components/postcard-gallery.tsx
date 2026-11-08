import { Spinner } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Pressable } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { GameDialog } from '@/features/game/components/game-dialog';
import { AuthImage } from '@/features/postcards/components/auth-image';
import type { PostcardsState } from '@/features/postcards/hooks/use-postcards';
import type { Postcard } from '@/features/postcards/types/postcard';
import { postcardImageURL } from '@/features/postcards/utils/postcard-api';

const VIEWS = ['mine', 'received'] as const;

function day(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Tile({ card, received, onPress }: { card: Postcard; received: boolean; onPress: () => void }) {
  const ready = card.status === 'succeeded';
  return (
    <Pressable onPress={onPress} accessibilityLabel={`Postcard with ${card.character_name}`} className="w-1/2 p-1">
      <Card className="gap-2 p-2">
        {ready ? (
          <AuthImage uri={postcardImageURL(card.id)} className="aspect-[3/4] w-full rounded-lg" />
        ) : (
          <View className="aspect-[3/4] w-full items-center justify-center gap-2 rounded-lg bg-background">
            <Spinner />
            <Text className="text-xs text-muted">Making postcard…</Text>
          </View>
        )}
        <View className="gap-0.5">
          <Text numberOfLines={1} className="text-sm font-semibold text-foreground">
            {card.character_emoji} {card.character_name}
          </Text>
          {received ? <Text numberOfLines={1} className="text-xs text-muted">From: {card.user_name}</Text> : null}
          <Text numberOfLines={1} className="text-xs text-muted">📍 {card.place}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function PostcardGallery({ p }: { p: PostcardsState }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>('mine');
  const [open, setOpen] = useState<Postcard | null>(null);
  const list = view === 'mine' ? p.mine : p.received;
  const received = view === 'received';

  return (
    <View className="gap-4">
      <Segmented values={VIEWS} value={view} onChange={setView} labels={['📸 My Postcards', `Received (${p.received.length})`]} />
      {!p.loaded ? <Spinner /> : null}
      {p.loaded && list.length === 0 ? (
        <Card className="items-center gap-2 py-8">
          <Text className="text-4xl">📸</Text>
          <Text className="text-lg font-semibold text-foreground">{received ? 'No Received Postcards' : 'No Postcards Yet'}</Text>
          <Text className="text-center text-sm text-muted">
            {received
              ? 'When someone returns your Flikkable with a postcard, it will appear here.'
              : 'Take selfie postcards when picking up Flikkables to build your collection!'}
          </Text>
        </Card>
      ) : null}
      <View className="-mx-1 flex-row flex-wrap">
        {list.map((card) => (
          <Tile key={card.id} card={card} received={received} onPress={() => setOpen(card)} />
        ))}
      </View>

      <GameDialog isOpen={open !== null} onClose={() => setOpen(null)} title={open ? `${open.character_emoji} ${open.character_name}` : ''} scroll>
        {open && open.status === 'succeeded' ? (
          <AuthImage uri={postcardImageURL(open.id)} className="aspect-[3/4] w-full rounded-xl" />
        ) : null}
        {open && open.status !== 'succeeded' ? <Text className="text-center text-sm text-muted">Still making this postcard…</Text> : null}
        {open ? (
          <View className="gap-1">
            <Text className="text-sm text-foreground">📍 {open.place}</Text>
            <Text className="text-sm text-muted">{day(open.created_at)}</Text>
            {received ? <Text className="text-sm text-muted">From: {open.user_name}</Text> : null}
            {received ? (
              <Text className="text-sm text-success">Postcard received with the return of {open.character_name}</Text>
            ) : null}
            {!received && open.sent_to_owner && open.sent_at ? (
              <Text className="text-sm text-success">Sent to owner on {day(open.sent_at)}</Text>
            ) : null}
            {!received && !open.sent_to_owner ? (
              <Text className="text-sm text-muted">💡 This postcard can be sent when you return the Flikkable</Text>
            ) : null}
          </View>
        ) : null}
      </GameDialog>
    </View>
  );
}
