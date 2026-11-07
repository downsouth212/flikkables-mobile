import React from 'react';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Activity, TrendingUp, Gift, UserPlus, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';

const activityIcons = {
  flick: TrendingUp,
  return: Award,
  achievement: Award,
  donation: Gift,
  member_joined: UserPlus,
  level_up: Activity,
};

export default function ActivityFeed({ guildId }) {
  const { data: activities = [] } = useQuery({
    queryKey: ['guild-activities', guildId],
    queryFn: () => base44.entities.GuildActivity.filter({ guild_id: guildId }, '-created_date', 20),
    enabled: !!guildId,
    refetchInterval: 5000,
  });

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Activity Feed
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            activities.map((activity) => {
              const Icon = activityIcons[activity.activity_type] || Activity;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{activity.user_name}</span>
                      {' '}
                      <span className="text-gray-600">{activity.description}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {moment(activity.created_date).fromNow()}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}