import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Trophy, Target } from 'lucide-react';
import moment from 'moment';

export default function GuildEvents({ guildId }) {
  const { data: events = [] } = useQuery({
    queryKey: ['guild-events', guildId],
    queryFn: () => base44.entities.GuildEvent.filter({ guild_id: guildId }, '-start_date', 10),
    enabled: !!guildId,
  });

  const activeEvents = events.filter(e => e.status === 'active');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  return (
    <div className="space-y-3">
      {activeEvents.length === 0 && upcomingEvents.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No events scheduled</p>
        </Card>
      ) : (
        <>
          {activeEvents.map((event) => (
            <Card key={event.id} className="p-4 border-l-4 border-green-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress: {event.current_progress} / {event.target}</span>
                      <span>{Math.round((event.current_progress / event.target) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                        style={{ width: `${Math.min((event.current_progress / event.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Reward: {event.reward_stamps} stamps
                  </p>
                </div>
              </div>
            </Card>
          ))}
          {upcomingEvents.map((event) => (
            <Card key={event.id} className="p-4 border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant="outline">Upcoming</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{event.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Starts {moment(event.start_date).fromNow()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}