import { Button } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { pressHaptic } from '@/components/pressable';
import { Segmented } from '@/components/segmented';
import { NewTradeDialog } from '@/features/trade/components/new-trade-dialog';
import { TradeCard } from '@/features/trade/components/trade-card';
import { TRADE_TABS, useTradeScreen } from '@/features/trade/hooks/use-trade-screen';

export default function TradeScreen() {
  const s = useTradeScreen();
  const incoming = s.tab === 'incoming';
  const offers = incoming ? s.incoming : s.outgoing;

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-3xl font-bold text-foreground">Trade</Text>
            <Text className="text-sm text-muted">Swap Flikkables with others</Text>
          </View>
          <Button
            size="sm"
            onPress={() => {
              pressHaptic();
              s.setCreating(true);
            }}
          >
            <Button.Label>New Trade</Button.Label>
          </Button>
        </View>

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
                busy={s.busy?.id === o.id ? s.busy.action : null}
                disabled={s.busy !== null}
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
