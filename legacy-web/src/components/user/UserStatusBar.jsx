import React, { useMemo, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UserStatusBar({ user, stampData = { daily: 0, weekly: 0, allTime: 0 }, userLocation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [countryInfo, setCountryInfo] = useState(null);

  useEffect(() => {
    const fetchCountryInfo = async () => {
      try {
        // Use home coordinates if available, otherwise use current location
        const lat = user?.home_lat || userLocation?.lat;
        const lng = user?.home_lng || userLocation?.lng;
        
        if (lat && lng) {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Given coordinates ${lat}, ${lng}, return the country name and its flag emoji.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                flag: { type: "string" },
                country: { type: "string" }
              }
            }
          });
          setCountryInfo(response);
        }
      } catch (err) {
        console.error('Failed to get country info:', err);
        setCountryInfo(null);
      }
    };
    
    const lat = user?.home_lat || userLocation?.lat;
    const lng = user?.home_lng || userLocation?.lng;
    
    if (lat && lng) {
      fetchCountryInfo();
    }
  }, [user?.home_lat, user?.home_lng, userLocation]);

  const levelThresholds = [0, 10000, 20000, 30000, 50000, 70000, 100000, 150000];

  const getLevelThreshold = (level) => {
    if (level <= levelThresholds.length) return levelThresholds[level - 1];
    
    let current = levelThresholds[levelThresholds.length - 1];
    for (let i = levelThresholds.length; i < level; i++) {
      current = current + 50000 + Math.floor(current * 0.1);
    }
    return current;
  };

  const calculateLevel = (totalKm) => {
    let level = 1;
    while (getLevelThreshold(level + 1) <= totalKm) {
      level++;
    }
    return level;
  };

  const getNextLevelThreshold = (totalKm) => {
    const currentLevel = calculateLevel(totalKm);
    return getLevelThreshold(currentLevel + 1);
  };

  const currentLevel = useMemo(() => calculateLevel(user?.total_distance_traveled || 0), [user?.total_distance_traveled]);
  const nextThreshold = useMemo(() => getNextLevelThreshold(user?.total_distance_traveled || 0), [user?.total_distance_traveled]);
  const currentKm = user?.total_distance_traveled || 0;
  const prevThreshold = currentLevel === 1 ? 0 : nextThreshold / 4;
  const progressToNextLevel = ((currentKm - prevThreshold) / (nextThreshold - prevThreshold)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-4"
    >
      <Card className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-purple-200 shadow-md overflow-hidden">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-3 flex items-center justify-between hover:bg-white/20 transition-colors"
        >
          <div className="flex-1 min-w-0 text-left">
            {countryInfo && (
              <div className="flex items-center gap-1 mb-1">
                <span className="text-lg">{countryInfo.flag}</span>
                <span className="text-xs text-gray-600 font-medium">{countryInfo.country}</span>
              </div>
            )}
            <h2 className="text-sm font-bold text-gray-900 truncate">{user?.display_name || user?.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg shadow-sm border border-purple-100">
                <Trophy className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Lvl {currentLevel}
                </p>
              </div>
              <span className="text-xs text-gray-500">{Math.round(currentKm).toLocaleString()} km</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stamp Summary */}
            <div className="flex gap-1">
              <div className="flex flex-col items-center px-2 py-1 bg-amber-50/60 rounded border border-amber-200 text-center">
                <span className="text-lg">🛂</span>
                <span className="text-xs font-bold text-amber-700">Daily</span>
                <p className="text-sm font-bold text-amber-600">{stampData.daily}</p>
              </div>
              <div className="flex flex-col items-center px-2 py-1 bg-orange-50/60 rounded border border-orange-200 text-center">
                <span className="text-lg">🛂</span>
                <span className="text-xs font-bold text-orange-700">Week</span>
                <p className="text-sm font-bold text-orange-600">{stampData.weekly}</p>
              </div>
              <div className="flex flex-col items-center px-2 py-1 bg-yellow-50/60 rounded border border-yellow-300 text-center">
                <span className="text-lg">🛂</span>
                <span className="text-xs font-bold text-yellow-800">All</span>
                <p className="text-sm font-bold text-yellow-700">{stampData.allTime}</p>
              </div>
            </div>

            {/* Expand Icon */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
            </motion.div>
          </div>
        </button>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-purple-200 bg-white/30 backdrop-blur"
            >
              <div className="p-3 space-y-3">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 font-medium">Flikks</p>
                    <p className="text-lg font-bold text-violet-600">{user?.characters_flicked || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 font-medium">Pikk ups</p>
                    <p className="text-lg font-bold text-pink-600">{user?.characters_picked_up || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500 font-medium">Returned</p>
                    <p className="text-lg font-bold text-emerald-600">{user?.characters_returned || 0}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Level {currentLevel} Progress</span>
                    <span className="font-semibold text-gray-700">{Math.round(progressToNextLevel)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNextLevel}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {Math.round(nextThreshold - currentKm).toLocaleString()} km to Level {currentLevel + 1}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}