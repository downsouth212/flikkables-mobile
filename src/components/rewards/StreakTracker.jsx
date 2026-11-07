import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Award } from 'lucide-react';
import { toast } from 'sonner';

const DAILY_REWARDS = [5, 10, 15, 20, 25, 30, 50]; // Day 1-7
const THIRTY_DAY_BONUS = 200;

export default function StreakTracker({ user, onStreakUpdate }) {
  const [streakData, setStreakData] = useState(null);
  const [showReward, setShowReward] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const hasCheckedToday = React.useRef(false);

  useEffect(() => {
    if (!user?.email || isChecking || hasCheckedToday.current) return;
    checkAndUpdateStreak();
  }, [user?.email]);

  const checkAndUpdateStreak = async () => {
    if (!user?.email || isChecking) return;

    setIsChecking(true);
    const today = new Date().toISOString().split('T')[0];
    hasCheckedToday.current = true;
    
    try {
      let streak = await base44.entities.DailyStreak.filter({ user_email: user.email });
      streak = streak[0];

      if (!streak) {
      // First time login
      streak = await base44.entities.DailyStreak.create({
        user_email: user.email,
        current_streak: 1,
        longest_streak: 1,
        last_login_date: today,
        total_logins: 1,
        last_reward_claimed: today,
        streak_cycle: 1,
        thirty_day_milestones: 0
      });

      // Award day 1 reward
      const reward = DAILY_REWARDS[0];
      await base44.auth.updateMe({
        passport_stamps: (user.passport_stamps || 0) + reward
      });

      setShowReward({ stamps: reward, day: 1, isNew: true });
      toast.success(`🔥 Day 1 streak! +${reward} stamps`);
      onStreakUpdate?.();
      setIsChecking(false);
    } else {
      const lastLogin = new Date(streak.last_login_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastLogin) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Already logged in today
        setStreakData(streak);
        setIsChecking(false);
      } else if (diffDays === 1) {
        // Consecutive day - increment streak
        let newStreak = streak.current_streak + 1;
        let newCycle = (streak.streak_cycle % 7) + 1;
        let thirtyDayMilestones = streak.thirty_day_milestones;
        let bonusStamps = 0;

        // Check for 30-day milestone
        if (newStreak % 30 === 0) {
          thirtyDayMilestones += 1;
          bonusStamps = THIRTY_DAY_BONUS;
          toast.success(`🎉 30-day streak milestone! +${THIRTY_DAY_BONUS} bonus stamps!`);
        }

        const dayReward = DAILY_REWARDS[newCycle - 1];
        const totalReward = dayReward + bonusStamps;

        await base44.entities.DailyStreak.update(streak.id, {
          current_streak: newStreak,
          longest_streak: Math.max(streak.longest_streak, newStreak),
          last_login_date: today,
          last_reward_claimed: today,
          total_logins: streak.total_logins + 1,
          streak_cycle: newCycle,
          thirty_day_milestones: thirtyDayMilestones
        });

        await base44.auth.updateMe({
          passport_stamps: (user.passport_stamps || 0) + totalReward
        });

        setShowReward({ 
          stamps: totalReward, 
          day: newCycle, 
          isNew: true,
          bonus: bonusStamps > 0 ? bonusStamps : null,
          totalStreak: newStreak
        });
        
        toast.success(`🔥 Day ${newCycle} streak! +${totalReward} stamps`);
        onStreakUpdate?.();

        setStreakData({
          ...streak,
          current_streak: newStreak,
          streak_cycle: newCycle,
          thirty_day_milestones: thirtyDayMilestones
        });
        setIsChecking(false);
      } else {
        // Streak broken - reset
        await base44.entities.DailyStreak.update(streak.id, {
          current_streak: 1,
          last_login_date: today,
          last_reward_claimed: today,
          total_logins: streak.total_logins + 1,
          streak_cycle: 1
        });

        const reward = DAILY_REWARDS[0];
        await base44.auth.updateMe({
          passport_stamps: (user.passport_stamps || 0) + reward
        });

        toast.info(`Streak reset. Starting fresh! +${reward} stamps`);
        onStreakUpdate?.();

        setStreakData({
          ...streak,
          current_streak: 1,
          streak_cycle: 1
        });
        setIsChecking(false);
      }
    }
    } catch (error) {
      console.error('Streak check error:', error);
      setIsChecking(false);
      hasCheckedToday.current = false;
    }
  };

  if (!streakData) return null;

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className="w-8 h-8 text-orange-500" />
            </motion.div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Daily Streak</p>
              <p className="text-2xl font-bold text-orange-600">{streakData.current_streak} days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Day {streakData.streak_cycle}/7</p>
            <p className="text-sm font-semibold text-orange-600">
              Next: {DAILY_REWARDS[streakData.streak_cycle % 7]} stamps
            </p>
          </div>
        </div>

        {/* 7-day cycle progress */}
        <div className="mt-3 flex gap-1">
          {DAILY_REWARDS.map((reward, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full ${
                idx < streakData.streak_cycle
                  ? 'bg-gradient-to-r from-orange-400 to-red-400'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* 30-day milestone progress */}
        {streakData.current_streak >= 7 && (
          <div className="mt-2 p-2 bg-white/50 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                30-day milestone
              </span>
              <span className="font-semibold text-orange-600">
                {streakData.current_streak % 30}/30 days
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                style={{ width: `${((streakData.current_streak % 30) / 30) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Reward popup */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowReward(null)}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Flame className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Day {showReward.day} Streak! 🔥
              </h2>
              <p className="text-4xl font-bold text-orange-600 mb-2">
                +{showReward.stamps} stamps
              </p>
              {showReward.bonus && (
                <p className="text-sm text-green-600 font-semibold mb-2">
                  Including +{showReward.bonus} bonus for {showReward.totalStreak}-day streak!
                </p>
              )}
              <p className="text-sm text-gray-600">
                Come back tomorrow to continue your streak!
              </p>
              <button
                onClick={() => setShowReward(null)}
                className="mt-6 px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-semibold"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}