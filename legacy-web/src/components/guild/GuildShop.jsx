import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function GuildShop({ guild, isLeader }) {
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['guild-shop-items'],
    queryFn: () => base44.entities.GuildShopItem.list(),
  });

  const purchaseMutation = useMutation({
    mutationFn: async (item) => {
      if ((guild.treasury || 0) < item.treasury_cost) {
        throw new Error('Not enough treasury stamps');
      }

      await base44.entities.Guild.update(guild.id, {
        treasury: (guild.treasury || 0) - item.treasury_cost
      });

      await base44.entities.GuildActivity.create({
        guild_id: guild.id,
        activity_type: 'donation',
        description: `Purchased ${item.name} from guild shop`,
        metadata: JSON.stringify({ item_id: item.id, cost: item.treasury_cost })
      });
    },
    onSuccess: () => {
      toast.success('Item purchased!');
      queryClient.invalidateQueries({ queryKey: ['guild'] });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const availableItems = items.filter(item => item.level_requirement <= guild.level);

  return (
    <div className="space-y-3">
      {availableItems.length === 0 ? (
        <Card className="p-8 text-center">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No items available yet</p>
        </Card>
      ) : (
        availableItems.map((item) => {
          const canAfford = (guild.treasury || 0) >= item.treasury_cost;
          const isLocked = guild.level < item.level_requirement;

          return (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-2xl">
                    {item.emoji || '🎁'}
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {item.name}
                      {isLocked && <Lock className="w-3 h-3 text-gray-400" />}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <p className="text-xs text-amber-600 font-semibold mt-1">
                      {item.treasury_cost} treasury stamps
                    </p>
                  </div>
                </div>
                {isLeader && !isLocked && (
                  <Button
                    size="sm"
                    disabled={!canAfford || purchaseMutation.isPending}
                    onClick={() => purchaseMutation.mutate(item)}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Buy
                  </Button>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}