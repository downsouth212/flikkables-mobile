import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function GuildQuests({ guildId, userEmail }) {
  const queryClient = useQueryClient();

  const { data: quests = [] } = useQuery({
    queryKey: ['guild-quests', guildId],
    queryFn: () => base44.entities.GuildQuest.filter({ guild_id: guildId }, '-created_date'),
    enabled: !!guildId,
  });

  const joinMutation = useMutation({
    mutationFn: async (quest) => {
      const participants = JSON.parse(quest.participants || '[]');
      if (participants.includes(userEmail)) {
        throw new Error('Already participating');
      }

      participants.push(userEmail);
      await base44.entities.GuildQuest.update(quest.id, {
        participants: JSON.stringify(participants)
      });
    },
    onSuccess: () => {
      toast.success('Joined quest!');
      queryClient.invalidateQueries({ queryKey: ['guild-quests'] });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const activeQuests = quests.filter(q => !q.completed);

  return (
    <div className="space-y-3">
      {activeQuests.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No active quests</p>
        </Card>
      ) : (
        activeQuests.map((quest) => {
          const participants = JSON.parse(quest.participants || '[]');
          const isParticipating = participants.includes(userEmail);
          const progress = (quest.current / quest.target) * 100;

          return (
            <Card key={quest.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{quest.title}</h3>
                    <Badge variant="outline">{quest.quest_type}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{quest.description}</p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Progress: {quest.current} / {quest.target}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {participants.length}/{quest.required_members}
                  </span>
                  {quest.expires_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {moment(quest.expires_at).fromNow()}
                    </span>
                  )}
                  <span className="text-amber-600 font-semibold">
                    Reward: {quest.reward_treasury} to treasury
                  </span>
                </div>
                {!isParticipating && (
                  <Button
                    size="sm"
                    onClick={() => joinMutation.mutate(quest)}
                    disabled={joinMutation.isPending}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Join
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