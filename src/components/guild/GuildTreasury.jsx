import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, Gift } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GuildTreasury({ guild, user, canManage }) {
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const queryClient = useQueryClient();

  const donateMutation = useMutation({
    mutationFn: async () => {
      const amount = parseInt(donateAmount);
      if (amount <= 0 || amount > (user.passport_stamps || 0)) {
        throw new Error('Invalid amount');
      }

      // Deduct from user
      await base44.auth.updateMe({ 
        passport_stamps: (user.passport_stamps || 0) - amount 
      });

      // Add to treasury
      await base44.entities.Guild.update(guild.id, {
        treasury: (guild.treasury || 0) + amount
      });

      // Log activity
      await base44.entities.GuildActivity.create({
        guild_id: guild.id,
        user_email: user.email,
        user_name: user.display_name || user.full_name,
        activity_type: 'donation',
        description: `Donated ${amount} stamps to treasury`,
        metadata: JSON.stringify({ amount })
      });
    },
    onSuccess: () => {
      toast.success('Donation successful!');
      queryClient.invalidateQueries({ queryKey: ['guild'] });
      setShowDonate(false);
      setDonateAmount('');
      window.location.reload(); // Refresh user data
    },
    onError: (error) => {
      toast.error(error.message || 'Donation failed');
    }
  });

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-200 flex items-center justify-center text-2xl">
              🛂
            </div>
            <div>
              <p className="text-sm text-gray-600">Guild Treasury</p>
              <p className="text-2xl font-bold text-amber-700">
                {(guild.treasury || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowDonate(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Gift className="w-4 h-4 mr-2" />
            Donate
          </Button>
        </div>

        {guild.joining_fee > 0 || guild.daily_fee > 0 ? (
          <div className="mt-4 pt-4 border-t border-amber-200 text-xs space-y-1">
            {guild.joining_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Joining Fee:</span>
                <span className="font-semibold">{guild.joining_fee} stamps</span>
              </div>
            )}
            {guild.daily_fee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Fee:</span>
                <span className="font-semibold">{guild.daily_fee} stamps</span>
              </div>
            )}
          </div>
        ) : null}
      </Card>

      <Dialog open={showDonate} onOpenChange={setShowDonate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Donate to Treasury</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Your stamps: {(user.passport_stamps || 0).toLocaleString()}
              </p>
              <Input
                type="number"
                placeholder="Amount to donate"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                min="1"
                max={user.passport_stamps || 0}
              />
            </div>
            <Button
              onClick={() => donateMutation.mutate()}
              disabled={donateMutation.isPending || !donateAmount}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Donate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}