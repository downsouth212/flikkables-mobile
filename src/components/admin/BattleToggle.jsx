import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BATTLES } from '../battles/BattleConfig';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function BattleToggle() {
  const queryClient = useQueryClient();
  const [toggleStates, setToggleStates] = useState({});

  const { data: settings } = useQuery({
    queryKey: ['battle-settings'],
    queryFn: async () => {
      const result = await base44.entities.Settings.filter({ setting_key: 'enabled_battles' });
      if (result.length > 0) {
        try {
          const parsed = JSON.parse(result[0].setting_value);
          setToggleStates(parsed);
          return result[0];
        } catch {
          return null;
        }
      }
      return null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newStates) => {
      if (settings?.id) {
        await base44.entities.Settings.update(settings.id, {
          setting_value: JSON.stringify(newStates),
        });
      } else {
        await base44.entities.Settings.create({
          setting_key: 'enabled_battles',
          setting_value: JSON.stringify(newStates),
          description: 'Controls which friend battles are enabled',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle-settings'] });
      toast.success('Battle settings updated');
    },
  });

  const handleToggle = (battleType) => {
    const newStates = { ...toggleStates, [battleType]: !toggleStates[battleType] };
    setToggleStates(newStates);
    updateMutation.mutate(newStates);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Friend Battles</h3>
      <p className="text-sm text-gray-600 mb-4">Enable or disable individual battle types:</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(BATTLES).map(([key, battle]) => (
          <Card
            key={key}
            className={`p-4 cursor-pointer transition-all ${
              toggleStates[key] !== false ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
            onClick={() => handleToggle(key)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">{battle.icon} {battle.name}</p>
                <p className="text-xs text-gray-600 mt-1">{battle.description}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                toggleStates[key] !== false 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-red-200 text-red-800'
              }`}>
                {toggleStates[key] !== false ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {updateMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}