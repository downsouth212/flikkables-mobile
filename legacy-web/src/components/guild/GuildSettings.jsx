import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Settings, Users as UsersIcon, Volume2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GuildSettings({ guild, isLeader, open, onClose }) {
  const [joiningFee, setJoiningFee] = useState(guild?.joining_fee || 0);
  const [dailyFee, setDailyFee] = useState(guild?.daily_fee || 0);
  const [maxMembers, setMaxMembers] = useState(guild?.max_members || 20);
  const [voiceEnabled, setVoiceEnabled] = useState(guild?.voice_channel_enabled || false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Guild.update(guild.id, {
        joining_fee: joiningFee,
        daily_fee: dailyFee,
        max_members: maxMembers,
        voice_channel_enabled: voiceEnabled
      });
    },
    onSuccess: () => {
      toast.success('Guild settings updated');
      queryClient.invalidateQueries({ queryKey: ['guild'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to update settings');
    }
  });

  if (!isLeader) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Guild Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Joining Fee */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              🛂 Joining Fee (one-time)
            </Label>
            <Input
              type="number"
              min="0"
              value={joiningFee}
              onChange={(e) => setJoiningFee(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500">
              New members pay this amount once to join
            </p>
          </div>

          {/* Daily Fee */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              🛂 Daily Membership Fee
            </Label>
            <Input
              type="number"
              min="0"
              value={dailyFee}
              onChange={(e) => setDailyFee(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-xs text-gray-500">
              Members pay this amount daily (goes to treasury)
            </p>
          </div>

          {/* Max Members */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Maximum Members: {maxMembers}
            </Label>
            <Slider
              value={[maxMembers]}
              onValueChange={(val) => setMaxMembers(val[0])}
              min={5}
              max={100}
              step={5}
            />
          </div>

          {/* Voice Channel */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Enable Voice Channel
            </Label>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={setVoiceEnabled}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={() => updateMutation.mutate()} 
            disabled={updateMutation.isPending}
            className="flex-1 bg-violet-600 hover:bg-violet-700"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}