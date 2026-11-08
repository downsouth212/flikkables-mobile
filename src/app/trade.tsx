import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { BackHeader } from '@/features/game/components/back-header';
import { NewTradeDialog } from '@/features/trade/components/new-trade-dialog';
import { TradeCard } from '@/features/trade/components/trade-card';
import { TRADE_TABS, useTradeScreen } from '@/features/trade/hooks/use-trade-screen';

export default function TradeScreen() {
  const s = useTradeScreen();
  const incoming = s.tab === 'incoming';
  const offers = incoming ? s.incoming : s.outgoing;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-6">
        <BackHeader
          title="Trade"
          subtitle="Swap Flikkables with others"
          right={
            <Button
              size="sm"
              onPress={() => {
                pressHaptic();
                s.setCreating(true);
              }}
            >
              <Button.Label>New Trade</Button.Label>
            </Button>
          }
        />

        <Segmented
          values={TRADE_TABS}
          value={s.tab}
          onChange={s.setTab}
          labels={[`Incoming (${s.incoming.length})`, `Outgoing (${s.outgoing.length})`]}
        />

        {offers.length === 0 ? (
          <Card>
            <View className="items-center gap-1 py-4">
              <Text className="text-5xl">🔄</Text>
              <Text className="text-sm text-muted">{incoming ? 'No incoming trade offers' : 'No outgoing trade offers'}</Text>
            </View>
          </Card>
        ) : (
          <View className="gap-3">
            {offers.map((o) => (
              <TradeCard
                key={o.id}
                offer={o}
                incoming={incoming}
                stamps={s.stamps}
                busy={s.busy?.id === o.id ? s.busy.action : s.busy ? 'accept' : null}
                onAccept={() => s.accept(o.id)}
                onDecline={() => s.decline(o.id)}
                onCancel={() => s.cancel(o.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <NewTradeDialog isOpen={s.creating} onClose={() => s.setCreating(false)} onSend={s.send} />
    </View>
  );
}
