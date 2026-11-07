import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, MapPin, Home, X, ThumbsUp, TreesIcon as Tree } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UserStatsPopup({ open, onClose, userEmail, userName }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [gardenItems, setGardenItems] = useState([]);
  const [gardenLikes, setGardenLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    if (open && userEmail) {
      loadUserStats();
      loadGardenData();
    }
  }, [open, userEmail]);

  const loadGardenData = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Get user's garden items
      const items = await base44.entities.UserGardenItem.filter({ 
        user_email: userEmail,
        is_placed: true
      });
      setGardenItems(items);

      // Get garden likes (create entity if needed)
      try {
        const likes = await base44.entities.GardenLike.filter({ garden_owner_email: userEmail });
        setGardenLikes(likes.length);
        
        // Check if current user has liked
        const userLike = likes.find(l => l.liker_email === currentUser.email);
        setHasLiked(!!userLike);
      } catch (err) {
        // GardenLike entity might not exist yet
        setGardenLikes(0);
        setHasLiked(false);
      }
    } catch (err) {
      console.error('Failed to load garden data:', err);
    }
  };

  const handleLike = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      if (hasLiked) {
        // Unlike
        const likes = await base44.entities.GardenLike.filter({ 
          garden_owner_email: userEmail,
          liker_email: currentUser.email
        });
        if (likes[0]) {
          await base44.entities.GardenLike.delete(likes[0].id);
          setGardenLikes(prev => prev - 1);
          setHasLiked(false);
        }
      } else {
        // Like
        await base44.entities.GardenLike.create({
          garden_owner_email: userEmail,
          garden_owner_name: userName,
          liker_email: currentUser.email,
          liker_name: currentUser.display_name || currentUser.full_name
        });
        setGardenLikes(prev => prev + 1);
        setHasLiked(true);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const loadUserStats = async () => {
    setLoading(true);
    try {
      // Get user's characters
      const characters = await base44.entities.Character.filter(
        { owner_email: userEmail }
      );

      // Calculate total distance and get home location
      const totalDistance = characters.reduce((sum, c) => sum + (c.total_distance_traveled || 0), 0);
      const homeChar = characters[0];
      const homeLat = homeChar?.home_lat;
      const homeLng = homeChar?.home_lng;

      // Get country from home location
      let country = '';
      if (homeLat && homeLng) {
        try {
          const response = await base44.integrations.Core.InvokeLLM({
            prompt: `Given coordinates ${homeLat}, ${homeLng}, return the country name and its flag emoji.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                flag: { type: "string" },
                country: { type: "string" }
              }
            }
          });
          country = response.country || '';
          setCountryCode(response.flag || '');
        } catch (err) {
          console.error('Failed to get country:', err);
        }
      }

      // Get total returns - count all characters that have been returned (times_returned > 0)
      const totalReturns = characters.reduce((sum, c) => sum + (c.times_returned || 0), 0);
      
      // Also check for online status
      const userData = await base44.entities.User.filter({ email: userEmail });
      const userInfo = userData[0];
      const lastSeen = userInfo?.last_seen ? new Date(userInfo.last_seen) : null;
      const now = new Date();
      const minutesSinceLastSeen = lastSeen ? (now - lastSeen) / (1000 * 60) : 999;
      const isOnline = minutesSinceLastSeen <= 2;

      setStats({
        totalCharacters: characters.length,
        totalDistance: Math.round(totalDistance),
        totalReturns: totalReturns,
        country: country,
        isOnline: isOnline
      });
    } catch (err) {
      console.error('Failed to load user stats:', err);
      // Set stats with default values so UI still renders
      setStats({
        totalCharacters: 0,
        totalDistance: 0,
        totalReturns: 0,
        country: '',
        isOnline: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm w-[90vw] max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{userName}'s Stats</h3>
            {stats && (
              <div className={`w-2.5 h-2.5 rounded-full ${stats.isOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Home Location */}
            {countryCode && stats.country && (
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                <div className="text-4xl mb-2">{countryCode}</div>
                <p className="text-sm font-medium text-gray-700">{stats.country}</p>
                <p className="text-xs text-gray-500 mt-1">Home Location</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg border border-violet-100 text-center">
                <Package className="w-5 h-5 text-violet-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-violet-700">{stats.totalCharacters}</p>
                <p className="text-xs text-gray-600 mt-1">Flikkables</p>
              </div>

              <div className="p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100 text-center">
                <MapPin className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">{(stats.totalDistance / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-600 mt-1">KM Traveled</p>
              </div>

              <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-100 text-center">
                <Home className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-700">{stats.totalReturns}</p>
                <p className="text-xs text-gray-600 mt-1">Returns</p>
              </div>
            </div>

            {/* Garden Section */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tree className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-900">Garden</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={hasLiked ? "default" : "outline"}
                    onClick={handleLike}
                    className="h-8"
                  >
                    <ThumbsUp className={`w-3 h-3 mr-1 ${hasLiked ? 'fill-current' : ''}`} />
                    {gardenLikes}
                  </Button>
                </div>
              </div>
              {gardenItems.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-center">
                  {gardenItems.slice(0, 8).map((item, idx) => (
                    <span key={idx} className="text-2xl">{item.decoration_emoji}</span>
                  ))}
                  {gardenItems.length > 8 && (
                    <span className="text-sm text-gray-600 self-center ml-1">+{gardenItems.length - 8}</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center">No garden items</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">Unable to load stats</p>
        )}
      </div>
    </div>
  );
}