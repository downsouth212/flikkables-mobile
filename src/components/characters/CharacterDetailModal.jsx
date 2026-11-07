import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, User, Home, Gift, ArrowRight, Compass, Star, X, Camera, Landmark } from 'lucide-react';
import PostcardCamera from '@/components/postcard/PostcardCamera';
import RarityBadge from '@/components/characters/RarityBadge';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const statusConfig = {
  home: { label: 'At Home', color: 'bg-emerald-100 text-emerald-700' },
  traveling: { label: 'Traveling', color: 'bg-amber-100 text-amber-700' },
  landed: { label: 'Landed', color: 'bg-violet-100 text-violet-700' },
  picked_up: { label: 'Picked Up', color: 'bg-sky-100 text-sky-700' }
};

const rarityFrame = {
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

export default function CharacterDetailModal({ 
        character, 
        open, 
        onClose, 
        onPickUp, 
        onReturn,
        onReturnHome,
        currentUserEmail,
        isLoading,
        isOwner,
        onOwnerNameClick,
        onHostRace,
        onJoinRace,
        userLocation
      }) {
         const racesEnabled = !!onHostRace;
         const [showCooldownError, setShowCooldownError] = React.useState(false);
         const [showPostcardCamera, setShowPostcardCamera] = React.useState(false);

         // Subscribe to real-time character updates
         React.useEffect(() => {
           if (!character?.id) return;

           const unsubscribe = base44.entities.Character.subscribe((event) => {
             // If this character was picked up, close the modal
             if (event.id === character.id && event.type === 'update' && event.data.status === 'picked_up') {
               onClose();
             }
           });

           return unsubscribe;
         }, [character?.id, onClose]);

         // Reset cooldown error when modal opens/closes or character changes
         React.useEffect(() => {
           setShowCooldownError(false);
         }, [open, character?.id]);



        // Fetch owner user data to check last_seen
        const { data: ownerUser } = useQuery({
          queryKey: ['user-status', character?.owner_email],
          queryFn: async () => {
            if (!character?.owner_email) return null;
            const users = await base44.entities.User.filter({ email: character.owner_email });
            return users[0];
          },
          enabled: !!character?.owner_email && open,
          refetchInterval: 60000, // Refresh every minute
        });

        // Fetch pickup radius from settings
        const { data: settings } = useQuery({
          queryKey: ['pickup-radius-setting'],
          queryFn: async () => {
            const result = await base44.entities.Settings.filter({ setting_key: 'pickup_radius' });
            return result[0];
          },
          refetchInterval: 10000, // Refresh every 10 seconds to catch admin changes
        });

        // Check if character is in an active race
        const { data: activeRace } = useQuery({
          queryKey: ['character-race', character?.id],
          queryFn: async () => {
            if (!character?.id) return null;
            const races = await base44.entities.Race.filter({
              character_id: character.id,
              status: { $in: ['pending', 'active'] }
            });
            return races[0] || null;
          },
          enabled: !!character?.id && open,
        });

        // Check if current user is already in the race
        const isUserInRace = activeRace ? JSON.parse(activeRace.participants || '[]').includes(currentUserEmail) : false;

        const isOwnerOnline = () => {
          if (!ownerUser?.last_seen) return false;
          const lastSeen = new Date(ownerUser.last_seen);
          const now = new Date();
          const diffMinutes = (now - lastSeen) / (1000 * 60);
          return diffMinutes < 5;
        };

        if (!character) {
          return null;
        }

        const status = statusConfig[character.status] || statusConfig.home;
  const isHolder = character.picked_up_by === currentUserEmail;
  const pickupRadiusKm = settings?.setting_value ? parseFloat(settings.setting_value) : 0.05;
  
  // Recalculate distance if not provided but we have userLocation
  let actualDistance = character.userDistance;
  if (actualDistance === undefined && userLocation && character.current_lat && character.current_lng) {
    const R = 6371; // Earth's radius in km
    const dLat = (character.current_lat - userLocation.lat) * Math.PI / 180;
    const dLng = (character.current_lng - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(character.current_lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    actualDistance = R * c;
  }
  
  const isWithinPickupRange = actualDistance !== undefined ? actualDistance <= pickupRadiusKm : false;
  const canPickUp = character.status === 'landed' && !isOwner && isWithinPickupRange;
  const canReturn = isHolder && character.status === 'picked_up';
  const distanceStar = getDistanceStar(character.total_distance_traveled || 0);
  const cityStar = getCityStar(character.unique_cities_visited || 0);

  // Check if owner can return home (must meet time limit and not in race)
  const canReturnHome = () => {
    if (!isOwner || (character.status !== 'landed' && character.status !== 'traveling')) return false;
    if (activeRace) return false; // Cannot return if in active race
    if (!character.last_flicked) return true;
    const flickedTime = new Date(character.last_flicked).getTime();
    const now = Date.now();
    const hoursSinceFlick = (now - flickedTime) / (1000 * 60 * 60);
    const requiredHours = character.avatar_url ? 4 : 8; // Flikkstars = 4 hours, regular = 8 hours
    return hoursSinceFlick >= requiredHours;
  };

  const getReturnCountdown = () => {
    if (!character.last_flicked) return null;
    const flickedTime = new Date(character.last_flicked).getTime();
    const now = Date.now();
    const hoursSinceFlick = (now - flickedTime) / (1000 * 60 * 60);
    const requiredHours = character.avatar_url ? 4 : 8;
    if (hoursSinceFlick >= requiredHours) return null;
    const remainingHours = Math.ceil(requiredHours - hoursSinceFlick);
    return remainingHours;
  };

  const handleGetDirections = () => {
    if (character.current_lat && character.current_lng) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${character.current_lat},${character.current_lng}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const handlePickUp = () => {
    onPickUp(character);
  };

  const handleReturn = () => {
    onReturn(character);
  };

  const handleReturnHome = () => {
    if (!canReturnHome()) {
      setShowCooldownError(true);
      return;
    }
    onReturnHome?.(character);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-[90vw] max-h-[85vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Flikkable Details</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Character Card */}
          <div className="relative p-4 bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-100 shadow-lg">
            <div className="flex items-start gap-4">
              <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center flex-shrink-0 ${rarityFrame[character.rarity] || ''}`}>
                {character.avatar_url ? (
                  <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{character.avatar_emoji}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg truncate">{character.name}</h3>
                  {distanceStar && (
                    <Star className={`w-5 h-5 ${distanceStar.color} fill-current flex-shrink-0`} />
                  )}
                  {cityStar && (
                    <Star className={`w-5 h-5 ${cityStar.color} fill-current flex-shrink-0`} />
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <RarityBadge rarity={character.rarity} />
                  <Badge className={status.color}>{status.label}</Badge>
                  {isOwner && (
                    <Badge variant="outline" className="border-violet-200 text-violet-700 text-xs">
                      Your Flikkable
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Navigation className="w-4 h-4" />
                    <span className="font-semibold">{Math.round(character.total_distance_traveled || 0).toLocaleString()} km</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{character.current_location_name || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Owner:</span>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={onOwnerNameClick}
                  className="font-medium text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
                >
                  {character.owner_display_name || character.owner_name || 'Unknown'}
                </button>
                <div className={`w-2 h-2 rounded-full ${isOwnerOnline() ? 'bg-green-400' : 'bg-yellow-400'}`} />
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Location:</span>
              <span className="font-medium">{character.current_location_name || 'Unknown'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Distance traveled:</span>
              <span className="font-medium">{Math.round(character.total_distance_traveled || 0).toLocaleString()} km</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Home className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Times returned:</span>
              <span className="font-medium">{character.times_returned || 0}</span>
            </div>
            
            {character.last_flicked && (
              <div className="flex items-center gap-2 text-sm">
                <Gift className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Last flicked:</span>
                <span className="font-medium">{format(new Date(character.last_flicked), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
          
          {/* Top Attractions */}
          {(() => {
            if (!character.city_info) return null;
            try {
              const cityData = JSON.parse(character.city_info);
              if (!cityData.attractions || cityData.attractions.length === 0) return null;
              return (
                <div className="p-4 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Landmark className="w-4 h-4 text-purple-600" />
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Top Attractions</p>
                  </div>
                  <ul className="space-y-1">
                    {cityData.attractions.map((attraction, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(attraction + ' ' + character.current_location_name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-700 hover:text-purple-600 hover:underline transition-colors"
                        >
                          {attraction}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            } catch { return null; }
          })()}

          {character.picked_up_by_name && character.status === 'picked_up' && (
           <div className="p-3 bg-sky-50 rounded-xl text-sm text-sky-700">
             Currently being carried by <span className="font-semibold">{character.picked_up_by_display_name || character.picked_up_by_name || 'Someone'}</span>
           </div>
          )}



          {character.current_lat && character.current_lng && character.status !== 'picked_up' && (
            <Button 
              onClick={handleGetDirections}
              variant="outline"
              className="w-full h-12"
            >
              <Compass className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          )}

          {character.status === 'landed' && !isOwner && !isWithinPickupRange && (
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
              <p className="font-medium">Too Far Away</p>
              <p className="mt-1">You need to be within {(pickupRadiusKm * 1000).toFixed(0)} meters to pick up this Flikkable. Current distance: {character.userDistance ? `${(character.userDistance * 1000).toFixed(0)}m` : 'Unknown'}</p>
            </div>
          )}

          {canPickUp && (
            <>
              <Button 
                onClick={() => setShowPostcardCamera(true)}
                variant="outline"
                className="w-full h-12 border-2 border-violet-300 hover:bg-violet-50"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Selfie Postcard
              </Button>
              <Button 
                onClick={handlePickUp}
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
              >
                <Gift className="w-4 h-4 mr-2" />
                {isLoading ? 'Picking up...' : 'Pikk Up This Flikkable'}
              </Button>
            </>
          )}
          
          {canReturn && (
            <Button 
              onClick={handleReturn}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              {isLoading ? 'Returning...' : 'Return to Owner'}
            </Button>
          )}

          {isOwner && (character.status === 'landed' || character.status === 'traveling') && (
            <>
              {activeRace ? (
                <div className="p-4 bg-amber-50 rounded-xl text-sm text-amber-700 border border-amber-200">
                  <p className="font-medium">⏱️ Cannot Return Home</p>
                  <p className="mt-1">This Flikkable is in an active race and cannot be returned home until the race completes.</p>
                </div>
              ) : (
                <>
                  <Button 
                    onClick={handleReturnHome}
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    {isLoading ? 'Returning Home...' : 'Return Home'}
                  </Button>
                  {showCooldownError && !canReturnHome() && (
                    <div className="p-4 bg-amber-50 rounded-xl text-sm text-amber-700 border border-amber-200 mt-3">
                      <p className="font-medium">⏱️ Ready in:</p>
                      <p className="text-2xl font-bold text-amber-700 mt-2">
                        {getReturnCountdown()}h remaining
                      </p>
                      <p className="text-xs text-amber-600 mt-2">Come back after the cooldown to return {character.name} home.</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Race Option */}
          {racesEnabled && character.status === 'landed' && !isOwner && (
            activeRace ? (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">🏁 Active Race!</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Hosted by <span className="font-medium">{activeRace.host_name}</span>
                    </p>
                    <div className="text-xs text-amber-600 mt-2">
                      <p>Participants: {JSON.parse(activeRace.participants || '[]').length}</p>
                      <p>Prize: {JSON.parse(activeRace.stamp_entries || '[]').length * (activeRace.entry_fee || 5)} stamps</p>
                    </div>
                  </div>
                  {!isUserInRace && (
                    <Button
                      onClick={() => onJoinRace?.(activeRace)}
                      disabled={isLoading}
                      className="w-full h-10 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-sm"
                    >
                      Join Race (5 stamps)
                    </Button>
                  )}
                  {isUserInRace && (
                    <div className="p-2 bg-green-50 rounded text-xs text-green-700 text-center font-medium">
                      ✓ You're in this race!
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-gradient-to-r from-violet-50 to-pink-50 rounded-lg border border-violet-200">
                <button
                  onClick={() => onHostRace(character)}
                  className="text-sm font-semibold text-violet-600 hover:text-violet-700 w-full text-center"
                >
                  🏁 Host a Pick Up Race!
                </button>
                <p className="text-xs text-gray-600 text-center mt-1">Race to pick this up. Winner gets double stamps!</p>
              </div>
            )
          )}
          </div>

          <PostcardCamera
            open={showPostcardCamera}
            onClose={() => setShowPostcardCamera(false)}
            character={character}
            onPostcardSaved={() => {
              setShowPostcardCamera(false);
              handlePickUp();
            }}
            userLocation={userLocation}
          />

          </div>
          </div>
          );
          }