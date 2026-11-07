import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Target, Plane, Home, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DailyQuests({ user, onQuestComplete }) {
  const [questData, setQuestData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    loadQuests();
  }, [user?.email]);

  const loadQuests = async () => {
    if (!user?.email || isLoading) return;

    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const quest = await base44.entities.DailyQuest.filter({ 
        user_email: user.email, 
        quest_date: today 
      });

      if (quest.length === 0) {
        // Create today's quest
        const newQuest = await base44.entities.DailyQuest.create({
          user_email: user.email,
          quest_date: today,
          flikkables_flicked: 0,
          flikkables_returned: 0,
          flikk_quest_claimed: false,
          return_quest_claimed: false
        });
        setQuestData(newQuest);
      } else {
        setQuestData(quest[0]);
      }
    } catch (error) {
      console.error('Failed to load quests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update progress when user actions occur
  const updateProgress = async () => {
    if (!user?.email) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const quest = await base44.entities.DailyQuest.filter({ 
        user_email: user.email, 
        quest_date: today 
      });

      if (quest.length > 0) {
        setQuestData(quest[0]);
      }
    } catch (error) {
      console.error('Failed to update quest progress:', error);
    }
  };

  // Expose updateProgress for parent components to call after actions
  useEffect(() => {
    if (window) {
      window.updateDailyQuests = updateProgress;
    }
  }, [user?.email]);

  // Subscribe to quest updates
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = base44.entities.DailyQuest.subscribe((event) => {
      if (event.data?.user_email === user.email) {
        updateProgress();
      }
    });

    return unsubscribe;
  }, [user?.email]);

  const claimReward = async (questType) => {
    if (!questData) return;

    const reward = 20;
    await base44.auth.updateMe({
      passport_stamps: (user.passport_stamps || 0) + reward
    });

    const updateData = questType === 'flikk'
      ? { flikk_quest_claimed: true }
      : { return_quest_claimed: true };

    await base44.entities.DailyQuest.update(questData.id, updateData);

    toast.success(`Quest complete! +${reward} stamps`);
    onQuestComplete?.();
    loadQuests();
  };

  const flikkProgress = questData ? Math.min(questData.flikkables_flicked, 5) : 0;
  const returnProgress = questData ? Math.min(questData.flikkables_returned, 1) : 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">Daily Quests</h3>
      </div>
      
      {isLoading && !questData ? (
        <div className="text-center py-4 text-gray-500 text-sm">Loading quests...</div>
      ) : !questData ? (
        <div className="text-center py-4 text-gray-500 text-sm">No quest data available</div>
      ) : null}

      {questData && (
        <div className="space-y-3">
          {/* Flikk Quest */}
          <div className="bg-white/70 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Flikk 5 Flikkables</span>
            </div>
            <span className="text-xs font-semibold text-purple-600">
              {flikkProgress}/5
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${(flikkProgress / 5) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {questData.flikk_quest_claimed ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Completed!</span>
            </div>
          ) : flikkProgress >= 5 ? (
            <Button
              size="sm"
              onClick={() => claimReward('flikk')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              Claim 20 stamps
            </Button>
          ) : (
            <p className="text-xs text-gray-500">Reward: 20 stamps</p>
          )}
        </div>

        {/* Return Quest */}
        <div className="bg-white/70 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Return 1 Flikkable</span>
            </div>
            <span className="text-xs font-semibold text-emerald-600">
              {returnProgress}/1
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${returnProgress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {questData.return_quest_claimed ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Completed!</span>
            </div>
          ) : returnProgress >= 1 ? (
            <Button
              size="sm"
              onClick={() => claimReward('return')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500"
            >
              Claim 20 stamps
            </Button>
          ) : (
            <p className="text-xs text-gray-500">Reward: 20 stamps</p>
          )}
        </div>
        </div>
      )}
    </Card>
  );
}