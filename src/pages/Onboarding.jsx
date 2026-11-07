import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Filter from 'bad-words';

export default function Onboarding() {
   const [user, setUser] = useState(null);
   const [step, setStep] = useState('location'); // location, tutorial, or complete
   const [isLoading, setIsLoading] = useState(false);
   const [userLocation, setUserLocation] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [username, setUsername] = useState('');
    const [isEditingLocation, setIsEditingLocation] = useState(false);
   const [usernameError, setUsernameError] = useState('');
   const navigate = useNavigate();

  const validateUsername = (name) => {
    if (!name.trim()) {
      setUsernameError('Username is required');
      return false;
    }
    if (name.length < 2) {
      setUsernameError('Username must be at least 2 characters');
      return false;
    }
    if (name.length > 20) {
      setUsernameError('Username must be 20 characters or less');
      return false;
    }
    // Check for swear words using bad-words library
    const filter = new Filter();
    if (filter.isProfane(name)) {
      setUsernameError('Username contains inappropriate language');
      return false;
    }
    setUsernameError('');
    return true;
  };

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Skip onboarding if already completed
      if (userData.onboarding_completed) {
        navigate(createPageUrl('Home'));
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    // Get user's geolocation with timeout
    if (navigator.geolocation && step === 'location' && !userLocation) {
      const timeoutId = setTimeout(() => {
        if (!userLocation) setLocationName('Unable to detect location');
      }, 8000); // 8 second timeout for geo detection

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          clearTimeout(timeoutId);
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          await getLocationName(pos.coords.latitude, pos.coords.longitude);
        },
        (error) => {
          clearTimeout(timeoutId);
          setLocationName('Unable to detect location');
        }
      );
    }
  }, [step]);

  const getLocationName = async (lat, lng) => {
    try {
      const timeoutId = setTimeout(() => {
        setLocationName('Your Home');
      }, 5000); // 5 second timeout

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Given coordinates ${lat}, ${lng}, return just the city and country name. Be brief, like "Paris, France".`,
        response_json_schema: {
          type: "object",
          properties: {
            location: { type: "string" }
          }
        }
      });

      clearTimeout(timeoutId);
      setLocationName(response.location || 'Your Home');
    } catch {
      setLocationName('Your Home');
    }
  };

  const handleSetHome = async () => {
    if (!validateUsername(username) || !locationName.trim() || locationName === 'Detecting...') return;

    setIsLoading(true);
    try {
      await base44.auth.updateMe({
        home_lat: userLocation?.lat || 0,
        home_lng: userLocation?.lng || 0,
        home_location_name: locationName,
        display_name: username.trim(),
        onboarding_completed: true,
        passport_stamps: 0,
        characters_returned: 0,
      });

      // Add to UserSearch table
      await base44.entities.UserSearch.create({
        user_email: user.email,
        display_name: username.trim(),
        home_lat: userLocation?.lat || 0,
        home_lng: userLocation?.lng || 0,
      });

      // Auto-drop 3 flikkables near new user's home location (owned by a random admin)
      if (userLocation?.lat && userLocation?.lng) {
        try {
          const [templates, allUsers] = await Promise.all([
            base44.entities.FlikkableTemplate.list(),
            base44.entities.User.list(),
          ]);

          // Pick a random admin to be the owner
          const admins = allUsers.filter(u => u.role === 'admin');
          const adminOwner = admins.length > 0
            ? admins[Math.floor(Math.random() * admins.length)]
            : null;

          const radiusMeters = 200;
          
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * (radiusMeters / 111000);
            const lat = userLocation.lat + distance * Math.cos(angle);
            const lng = userLocation.lng + distance * Math.sin(angle);
            
            const template = templates.length > 0 
              ? templates[Math.floor(Math.random() * templates.length)]
              : { avatar_emoji: '🎈', avatar_url: '' };
            
            const rarityRand = Math.random();
            const rarity = rarityRand < 0.5 ? 'common' : rarityRand < 0.8 ? 'uncommon' : 'rare';
            
            const names = ['Zippy', 'Luna', 'Spark', 'Echo', 'Buddy', 'Pixel', 'Nova', 'Cosmo'];
            const name = names[Math.floor(Math.random() * names.length)];
            
            await base44.entities.Character.create({
              name,
              avatar_emoji: template.avatar_emoji || '🎈',
              avatar_url: template.avatar_url || '',
              rarity,
              owner_email: adminOwner?.email || user.email,
              owner_name: adminOwner?.full_name || user.full_name,
              owner_display_name: adminOwner?.display_name || adminOwner?.full_name || 'Flikkables',
              status: 'landed',
              current_lat: lat,
              current_lng: lng,
              current_location_name: locationName,
              home_lat: adminOwner ? (adminOwner.home_location_lat || userLocation.lat) : userLocation.lat,
              home_lng: adminOwner ? (adminOwner.home_location_lng || userLocation.lng) : userLocation.lng,
              total_distance_traveled: 0,
              unique_cities_visited: 0,
              times_returned: 0,
              last_flicked: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error auto-dropping flikkables:', err);
        }
      }

      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error('Error setting home location:', err);
    } finally {
      setIsLoading(false);
    }
  };



  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
           <motion.div
             key="location"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
           >
              <Card className="p-8 bg-white/80 backdrop-blur border-0 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-8 h-8 text-violet-600" />
                </div>

                <h1 className="text-3xl font-bold text-center mb-3">Welcome to Flikkables!</h1>
                <p className="text-center text-gray-600 mb-6">
                  Set your username and home base to get started.
                </p>

                <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 mb-2">Choose Your Username</label>
                   <input
                     type="text"
                     value={username}
                     onChange={(e) => {
                       setUsername(e.target.value);
                       validateUsername(e.target.value);
                     }}
                     placeholder="Enter username"
                     className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                       usernameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-violet-500'
                     }`}
                   />
                   {usernameError && <p className="text-xs text-red-500 mt-1">{usernameError}</p>}
                 </div>

                <div className="mb-6">
                   <label className="block text-sm font-medium text-gray-700 mb-2">📍 Home Location</label>
                   {!isEditingLocation ? (
                     <div className="p-4 bg-violet-50 rounded-xl">
                       <p className="text-xl font-semibold text-violet-600">{locationName || 'Detecting...'}</p>
                       {userLocation && (
                         <p className="text-xs text-gray-500 mt-2">
                           {userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}
                         </p>
                       )}
                       <button
                         onClick={() => setIsEditingLocation(true)}
                         className="mt-3 text-sm text-violet-600 hover:text-violet-700 font-medium"
                       >
                         Change Location
                       </button>
                     </div>
                   ) : (
                     <div className="space-y-3">
                       <input
                         type="text"
                         value={locationName}
                         onChange={(e) => setLocationName(e.target.value)}
                         placeholder="Enter city and country (e.g., Paris, France)"
                         className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                       />
                       <div className="flex gap-2">
                         <button
                           onClick={() => setIsEditingLocation(false)}
                           className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                         >
                           Done
                         </button>
                         <button
                           onClick={() => {
                             setIsEditingLocation(false);
                             if (userLocation) {
                               getLocationName(userLocation.lat, userLocation.lng);
                             }
                           }}
                           className="flex-1 px-4 py-2 text-violet-600 border border-violet-300 rounded-lg font-medium hover:bg-violet-50"
                         >
                           Use Detected
                         </button>
                       </div>
                     </div>
                   )}
                 </div>

                <Button
                    onClick={handleSetHome}
                    disabled={!username.trim() || !!usernameError || !locationName.trim() || locationName === 'Detecting...' || isLoading}
                    className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
                  >
                   {isLoading ? (
                     <>
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       Getting started...
                     </>
                   ) : (
                     'Get Started'
                   )}
                 </Button>
                </Card>
                </motion.div>
                </AnimatePresence>
      </div>
    </div>
  );
}