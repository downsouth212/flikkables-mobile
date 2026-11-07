import React, { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Navigation, Home, User, Trash2, History, Star, Plane, Trees, Utensils, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import RarityBadge from './RarityBadge';
import JourneyHistory from './JourneyHistory';
import MoodDisplay from './MoodDisplay';
import MiniGamesModal from '../games/MiniGamesModal';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const statusConfig = {
  home: { label: 'At Home', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  traveling: { label: 'Traveling', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  landed: { label: 'Landed', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  picked_up: { label: 'Pikkd Up', color: 'bg-sky-100 text-sky-700 border-sky-200' }
};

const rarityGlow = {
  common: 'shadow-lg shadow-gray-200/50 hover:shadow-xl hover:shadow-gray-300/50',
  uncommon: 'shadow-lg shadow-green-200/50 hover:shadow-xl hover:shadow-green-300/50',
  rare: 'shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50',
  epic: 'shadow-lg shadow-purple-200/50 hover:shadow-xl hover:shadow-purple-300/50',
  legendary: 'shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/50'
};

const rarityFrame = {
  common: 'ring-4 ring-blue-400/60',
  uncommon: 'ring-4 ring-red-400/60',
  rare: 'ring-4 ring-orange-400/60',
  epic: 'ring-4 ring-gray-300/60',
  legendary: 'ring-4 ring-amber-400/80'
};

const getDistanceStar = (distance) => {
  if (distance >= 100000) return { color: 'text-amber-500', label: 'Gold Star' };
  if (distance >= 50000) return { color: 'text-gray-400', label: 'Silver Star' };
  if (distance >= 20000) return { color: 'text-orange-600', label: 'Bronze Star' };
  return null;
};

const getCityStar = (cities) => {
  if (cities >= 50) return { color: 'text-amber-500', label: 'Gold Star' };
  if (cities >= 20) return { color: 'text-gray-400', label: 'Silver Star' };
  if (cities >= 10) return { color: 'text-orange-600', label: 'Bronze Star' };
  return null;
};

export default function CharacterCard({ character, onClick, onDelete, showOwner = false, distance = null, onMoveToGarden, onMoveToAirport, isInGarden = false, isInAirport = false }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showJourneyHistory, setShowJourneyHistory] = useState(false);
  const [showStarInfo, setShowStarInfo] = useState(null);
  const [showGames, setShowGames] = useState(false);
  const queryClient = useQueryClient();
  const status = statusConfig[character.status] || statusConfig.home;
  const distanceStar = getDistanceStar(character.total_distance_traveled || 0);
  const cityStar = getCityStar(character.unique_cities_visited || 0);

  // Fetch mood data
  const { data: mood, refetch: refetchMood } = useQuery({
    queryKey: ['mood', character.id],
    queryFn: async () => {
      const moods = await base44.entities.CharacterMood.filter(
        { character_id: character.id },
        '-created_date',
        1
      );
      return moods[0] || null;
    },
  });

  // Check if character was fed today
  const wasAlreadyFedToday = () => {
    if (!mood || !mood.last_fed_date) return false;
    const lastFed = new Date(mood.last_fed_date);
    const today = new Date();
    return lastFed.toDateString() === today.toDateString();
  };

  // Feed mutation
  const feedMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('feedCharacter', { character_id: character.id });
    },
    onSuccess: async () => {
      await refetchMood();
    },
  });

  // Handle game completion
  const handleGameComplete = async (success, happinessBoost) => {
    if (success && happinessBoost > 0 && mood) {
      const newHappiness = Math.min(mood.happiness_level + happinessBoost, 5);
      await base44.entities.CharacterMood.update(mood.id, {
        happiness_level: newHappiness
      });
      await refetchMood();
    }
    setShowGames(false);
  };

  const handleDelete = () => {
    onDelete?.(character.id);
    setShowDeleteConfirm(false);
  };
  
  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          onClick?.(character);
        }}
        style={{ cursor: 'pointer' }}
      >
        <Card 
          className={`p-2.5 bg-white/80 backdrop-blur-sm border-0 transition-all relative overflow-hidden ${rarityGlow[character.rarity] || rarityGlow.common} ${rarityFrame[character.rarity] || ''}`}
        >
          <div className="absolute top-1.5 right-1.5 flex gap-0.5 z-10">
            {isInGarden && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToAirport?.(character);
                }}
                disabled={mood && mood.happiness_level < 3}
                className={`h-7 px-2 text-xs gap-1 ${mood && mood.happiness_level < 3 ? 'opacity-50 cursor-not-allowed' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                title={mood && mood.happiness_level < 3 ? "Character too sad to travel" : "Move to Airport"}
              >
                <Plane className="w-3 h-3" />
                Flikk
              </Button>
            )}
            {isInAirport && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToGarden?.(character);
                }}
                className="h-7 px-2 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                title="Move to Garden"
              >
                <Trees className="w-3 h-3" />
                Flikk
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 pr-14 max-w-full">
            <motion.div 
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl overflow-hidden cursor-pointer ring-2 transition-all ${
                {
                  common: 'bg-gradient-to-br from-gray-100 to-gray-200 ring-blue-500',
                  uncommon: 'bg-gradient-to-br from-green-100 to-emerald-200 ring-red-500',
                  rare: 'bg-gradient-to-br from-blue-100 to-cyan-200 ring-orange-600',
                  epic: 'bg-gradient-to-br from-purple-100 to-fuchsia-200 ring-gray-400',
                  legendary: 'bg-gradient-to-br from-amber-100 to-yellow-200 ring-amber-500'
                }[character.rarity] || 'bg-gradient-to-br from-violet-100 to-pink-100 ring-violet-300'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onClick?.(character);
              }}
            >
              {character.avatar_url ? (
                <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                character.avatar_emoji
                )}
                </motion.div>
          
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
              onClick?.(character);
            }}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-medium text-sm text-gray-900 truncate">{character.name}</h3>
                <RarityBadge rarity={character.rarity} />
                {distanceStar && (
                   <button
                     className="flex items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform p-1 -m-1"
                     onClick={(e) => {
                       e.stopPropagation();
                       setShowStarInfo({
                         type: 'distance',
                         star: distanceStar,
                         value: Math.round(character.total_distance_traveled).toLocaleString()
                       });
                     }}
                     type="button"
                   >
                     <Star className={`w-4 h-4 ${distanceStar.color} fill-current`} />
                   </button>
                 )}
                 {cityStar && (
                   <button
                     className="flex items-center gap-0.5 cursor-pointer hover:scale-110 transition-transform p-1 -m-1"
                     onClick={(e) => {
                       e.stopPropagation();
                       setShowStarInfo({
                         type: 'cities',
                         star: cityStar,
                         value: character.unique_cities_visited
                       });
                     }}
                     type="button"
                   >
                     <Star className={`w-4 h-4 ${cityStar.color} fill-current`} />
                   </button>
                 )}
              </div>
              
              {showOwner && (character.owner_display_name || character.owner_name) && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <User className="w-3 h-3" />
                  <span className="truncate">{character.owner_display_name || character.owner_name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">
                  {character.current_location_name || 'Unknown location'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                {distance !== null && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{distance < 1 ? (distance * 1000).toFixed(0) : distance.toFixed(1)} {distance < 1 ? 'm' : 'km'}</span>
                  </div>
                )}
                {character.total_distance_traveled > 0 && (
                  <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-violet-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowJourneyHistory(true);
                    }}
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{Math.round(character.total_distance_traveled).toLocaleString()} km</span>
                  </div>
                )}
              </div>



              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="outline" className={`${status.color} border shrink-0`}>
                    {status.label}
                  </Badge>
                </div>
                </div>

                {isInGarden && (
                  <div className="mt-3 pt-3 border-t border-gray-100 w-full">
                    <div className="flex items-center justify-between gap-2">
                      {mood && (
                        <div className="flex-shrink-0">
                          <MoodDisplay happinessLevel={mood.happiness_level} size="sm" showLabel={true} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                      {(!mood || mood.happiness_level < 5) && (
                        wasAlreadyFedToday() ? (
                          <div className="text-xs text-amber-600 font-medium w-full text-right">Your Flikkable was already fed! Come back tomorrow</div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              feedMutation.mutate();
                            }}
                            disabled={feedMutation.isPending}
                            className="h-7 px-2 text-orange-500 hover:text-orange-700 hover:bg-orange-50 gap-1 text-xs"
                            title="Feed (1 stamp)"
                          >
                            🍴
                            Feed
                          </Button>
                        )
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGames(true);
                        }}
                        className="h-7 px-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 gap-1 text-xs"
                        title="Play mini-games"
                      >
                        <Gamepad2 className="w-3 h-3" />
                        Play
                      </Button>
                      </div>
                      </div>
                      </div>
                      )}
                
                {(character.status === 'home' || character.status === 'traveling') && !isInGarden && !isInAirport && (
                  <div className="mt-3 pt-3 border-t border-gray-100 w-full flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {character.picked_up_by_name && character.status === 'picked_up' && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  Being carried by <span className="font-medium text-gray-700">{character.picked_up_by_display_name || character.picked_up_by_name}</span>
                </div>
                )}
                </div>
                </div>
                </Card>
      </motion.div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Flikkable?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold">{character.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <JourneyHistory
        characterId={character.id}
        characterName={character.name}
        open={showJourneyHistory}
        onOpenChange={setShowJourneyHistory}
      />

      <Dialog open={!!showStarInfo} onOpenChange={() => setShowStarInfo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className={`w-5 h-5 ${showStarInfo?.star?.color} fill-current`} />
              {showStarInfo?.star?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {showStarInfo?.type === 'distance' ? (
              <>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{character.name}</span> has traveled an incredible <span className="font-bold text-violet-600">{showStarInfo.value} km</span>!
                </p>
                <div className="space-y-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-orange-600 fill-current" />
                    <span><strong>Bronze:</strong> 20,000 km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-gray-400 fill-current" />
                    <span><strong>Silver:</strong> 50,000 km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    <span><strong>Gold:</strong> 100,000 km</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{character.name}</span> has visited <span className="font-bold text-violet-600">{showStarInfo?.value} unique cities</span>!
                </p>
                <div className="space-y-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-orange-600 fill-current" />
                    <span><strong>Bronze:</strong> 10 cities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-gray-400 fill-current" />
                    <span><strong>Silver:</strong> 20 cities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    <span><strong>Gold:</strong> 50 cities</span>
                  </div>
                </div>
              </>
            )}
            <Button 
              onClick={() => setShowStarInfo(null)}
              className="w-full bg-violet-500 hover:bg-violet-600"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MiniGamesModal
        open={showGames}
        onOpenChange={setShowGames}
        character={character}
        onGameComplete={handleGameComplete}
      />
    </>
  );
}