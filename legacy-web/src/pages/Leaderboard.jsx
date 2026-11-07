import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Loader2, TrendingUp, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import LeaderboardItem from '@/components/leaderboard/LeaderboardItem';

export default function Leaderboard() {
  const [user, setUser] = useState(null);
  const [timeframe, setTimeframe] = useState('all-time');
  const [leaderboardType, setLeaderboardType] = useState('returners'); // 'returners' or 'pickers'

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const characters = await base44.entities.Character.list('-created_date', 5000);
      const journeys = await base44.entities.Journey.list('-created_date', 50000);
      const allUsers = await base44.entities.User.list('-created_date', 1000);

      const userMap = {};
      const userLookup = {};
      allUsers.forEach(u => {
        userLookup[u.email] = u;
      });

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1);
      weekStart.setHours(0, 0, 0, 0);

      // Initialize users from character owners
      characters.forEach(character => {
        if (!character.owner_email) return;
        if (!userMap[character.owner_email]) {
          const userData = userLookup[character.owner_email];
          userMap[character.owner_email] = {
            id: character.owner_email,
            email: character.owner_email,
            full_name: userData?.display_name || userData?.full_name || 'Unknown User',
            allTime: 0,
            daily: 0,
            weekly: 0,
            pickups: 0,
            characters_returned: 0
          };
        }
      });

      // Calculate distances from Journey records (accurate daily/weekly)
      journeys.forEach(journey => {
        if (!journey.by_user_email || journey.event_type !== 'flicked') return;

        if (!userMap[journey.by_user_email]) {
          const userData = userLookup[journey.by_user_email];
          userMap[journey.by_user_email] = {
            id: journey.by_user_email,
            email: journey.by_user_email,
            full_name: userData?.display_name || userData?.full_name || 'Unknown User',
            allTime: 0,
            daily: 0,
            weekly: 0,
            pickups: 0,
            characters_returned: 0
          };
        }

        const distance = journey.distance_km || 0;
        const journeyDate = new Date(journey.created_date);

        userMap[journey.by_user_email].allTime += distance;
        if (journeyDate >= todayStart) {
          userMap[journey.by_user_email].daily += distance;
        }
        if (journeyDate >= weekStart) {
          userMap[journey.by_user_email].weekly += distance;
        }
      });

      // Track characters returned and pickups from characters
      characters.forEach(character => {
        if (!character.owner_email) return;
        if (character.picked_up_by) {
          userMap[character.owner_email].characters_returned += 1;
          if (!userMap[character.picked_up_by]) {
            const userData = userLookup[character.picked_up_by];
            userMap[character.picked_up_by] = {
              id: character.picked_up_by,
              email: character.picked_up_by,
              full_name: userData?.display_name || userData?.full_name || 'Unknown User',
              allTime: 0,
              daily: 0,
              weekly: 0,
              pickups: 0,
              characters_returned: 0
            };
          }
          userMap[character.picked_up_by].pickups += 1;
        }
      });

      return Object.values(userMap);
    },
    enabled: !!user,
  });

  const getKmsByTimeframe = (u) => {
    if (timeframe === 'daily') return u.daily || 0;
    if (timeframe === 'weekly') return u.weekly || 0;
    return u.allTime || 0;
  };

  const usersWithKms = users.filter(u => getKmsByTimeframe(u) > 0);

  const sortedUsers = leaderboardType === 'returners' 
    ? [...usersWithKms].sort((a, b) => getKmsByTimeframe(b) - getKmsByTimeframe(a))
    : [...users].filter(u => u.characters_returned > 0).sort((a, b) => b.characters_returned - a.characters_returned);

  const currentUserRank = sortedUsers.findIndex(u => u.email === user?.email) + 1;
  const currentUserValue = user ? (leaderboardType === 'returners' 
    ? getKmsByTimeframe(users.find(u => u.email === user.email) || {})
    : (users.find(u => u.email === user.email)?.characters_returned || 0)) : 0;
  const userHasValue = currentUserValue > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-1">{leaderboardType === 'returners' ? 'Top Flikkrs' : 'Top Pikkrs'}</p>
        </div>

        {/* Leaderboard Type Tabs */}
        <Tabs value={leaderboardType} onValueChange={setLeaderboardType} className="mb-6">
          <TabsList className="w-full bg-white/50 border border-gray-100 p-1 rounded-xl">
            <TabsTrigger value="returners" className="flex-1 rounded-lg data-[state=active]:bg-white">
              Top Flikkrs
            </TabsTrigger>
            <TabsTrigger value="pickers" className="flex-1 rounded-lg data-[state=active]:bg-white">
              Top Pikkrs
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Current User Rank */}
        {user && userHasValue && (
          <Card className="p-4 mb-6 bg-gradient-to-r from-violet-500 to-pink-500 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">Your Rank</p>
                <p className="text-3xl font-bold">#{currentUserRank}</p>
              </div>
              <div className="text-right">
                 <p className="text-sm text-white/80">{leaderboardType === 'returners' ? 'Total KMs' : 'Pikks'}</p>
                 <p className="text-2xl font-bold">{leaderboardType === 'returners' ? Math.round(currentUserValue).toLocaleString() : currentUserValue}</p>
               </div>
            </div>
          </Card>
        )}

        {/* Timeframe Selection - Only for Returners */}
        {leaderboardType === 'returners' && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTimeframe('daily')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                timeframe === 'daily'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                timeframe === 'weekly'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe('all-time')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                timeframe === 'all-time'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70'
              }`}
            >
              All Time
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : sortedUsers.length === 0 ? (
          <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
            <p className="text-sm text-gray-500">No rankings yet. Be the first!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedUsers.slice(0, 20).map((u, index) => (
              <LeaderboardItem 
                key={u.id} 
                user={{ ...u, kms: leaderboardType === 'returners' ? Math.round(getKmsByTimeframe(u)) : u.characters_returned }}
                rank={index + 1}
                isCurrentUser={u.email === user?.email}
                type={leaderboardType}
              />
            ))}
            {currentUserRank > 20 && user && (
              <>
                <div className="h-px bg-gray-200 my-4" />
                <LeaderboardItem 
                  user={{ ...users.find(u => u.email === user.email), kms: leaderboardType === 'returners' ? Math.round(currentUserValue) : currentUserValue }}
                  rank={currentUserRank}
                  isCurrentUser={true}
                  type={leaderboardType}
                />
              </>
            )}
          </div>
        )}

        {/* About the Leaderboard */}
         <Card className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-white border-0 shadow-lg">
          <h3 className="font-semibold text-gray-900 mb-3">About the Leaderboard</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            {leaderboardType === 'returners' ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500">•</span>
                  <span>Ranked by total kilometers traveled by all your Flikkables</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">•</span>
                  <span>Track daily, weekly, and all-time distance records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>Compete globally and climb the rankings</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-violet-500">•</span>
                  <span>Ranked by number of Flikkables you've Pikkd</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-500">•</span>
                  <span>Each Pikk counts toward your total</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500">•</span>
                  <span>Become the ultimate Pikkr!</span>
                </li>
              </>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}