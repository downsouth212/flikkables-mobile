import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const FLIKKABLE_NAMES = [
  'Zippy', 'Luna', 'Spark', 'Echo', 'Buddy', 'Pixel', 'Nova', 'Zephyr',
  'Cosmo', 'Ruby', 'Pepper', 'Whisper', 'Bolt', 'Breezy', 'Twinkle', 'Scout',
  'Jazz', 'Maple', 'River', 'Sunny', 'Storm', 'Cloud', 'Drift', 'Dash',
  'Blaze', 'Swift', 'Gentle', 'Joyful', 'Happy', 'Curious', 'Lucky', 'Magic'
];

const FLIKKSTAR_NAMES = [
  'Stellar', 'Galaxy', 'Comet', 'Nebula', 'Orion', 'Phoenix', 'Dragon', 'Titan',
  'Zeus', 'Athena', 'Apollo', 'Aurora', 'Cosmos', 'Infinity', 'Zenith', 'Apex',
  'Prism', 'Eclipse', 'Horizon', 'Summit', 'Crown', 'Sovereign', 'Legend', 'Epic',
  'Mythic', 'Royal', 'Noble', 'Majestic', 'Celestial', 'Divine', 'Eternal', 'Prime'
];

// Fetch existing templates instead of hardcoded emojis
async function getRandomTemplate() {
  const templates = await base44.entities.FlikkableTemplate.list();
  if (templates.length === 0) {
    return { avatar_emoji: '🎈', avatar_url: '' };
  }
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return { 
    avatar_emoji: randomTemplate.avatar_emoji || '🎈', 
    avatar_url: randomTemplate.avatar_url || '' 
  };
}

function generateRandomCoordinate(centerLat, centerLng, radiusMeters) {
  // Convert radius from meters to degrees (approximate)
  const radiusDegrees = radiusMeters / 111000;
  
  // Random angle and distance
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusDegrees;
  
  const newLat = centerLat + distance * Math.cos(angle);
  const newLng = centerLng + distance * Math.sin(angle);
  
  return { lat: newLat, lng: newLng };
}

function isLocationTooClose(lat, lng, existingLocations, minDistanceMeters = 30) {
  for (const loc of existingLocations) {
    // Simple distance calculation (good enough for this use case)
    const dLat = lat - loc.lat;
    const dLng = lng - loc.lng;
    const distanceMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
    
    if (distanceMeters < minDistanceMeters) {
      return true;
    }
  }
  return false;
}

function getRandomName(isFlikkstar) {
  const names = isFlikkstar ? FLIKKSTAR_NAMES : FLIKKABLE_NAMES;
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomRarity() {
  const rand = Math.random();
  if (rand < 0.5) return 'common';
  if (rand < 0.8) return 'uncommon';
  if (rand < 0.95) return 'rare';
  if (rand < 0.99) return 'epic';
  return 'legendary';
}

export default function DropNearMe() {
  const [user, setUser] = useState(null);
  const [numFlikkables, setNumFlikkables] = useState('5');
  const [numFlikkstars, setNumFlikkstars] = useState('3');
  const [radiusMeters, setRadiusMeters] = useState('1000');
  const [previewList, setPreviewList] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [locationType, setLocationType] = useState('home'); // home, current, city, user
  const [currentLocation, setCurrentLocation] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const [citySearchResults, setCitySearchResults] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationType('current');
        toast.success('Current location detected');
      } catch (error) {
        toast.error('Could not get current location');
        console.error(error);
      }
    }
  };

  const searchCities = async () => {
    if (!citySearch.trim()) {
      toast.error('Please enter a city name');
      return;
    }

    setIsSearching(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the exact center coordinates for the city: ${citySearch}. Return ONLY valid JSON with lat (number between -90 and 90) and lng (number between -180 and 180) properties.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
            city_name: { type: 'string' }
          }
        }
      });
      if (response && typeof response.lat === 'number' && typeof response.lng === 'number') {
        setCitySearchResults([response]);
      } else {
        toast.error('Invalid coordinates received');
      }
    } catch (error) {
      toast.error('Could not find city. Try a major city name.');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const searchUsers = async () => {
    if (!userSearch.trim()) {
      toast.error('Please enter a username or email');
      return;
    }

    setIsSearching(true);
    try {
      const users = await base44.entities.User.filter({});
      const results = users.filter(u => {
        const hasMatch = u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.display_name?.toLowerCase().includes(userSearch.toLowerCase());
        
        const hasLocation = (u.home_lat && u.home_lng) || 
          (u.data?.home_location_lat && u.data?.home_location_lng);
        
        return hasMatch && hasLocation;
      });
      setUserSearchResults(results);
      if (results.length === 0) {
        toast.error('No users found with home location set');
      }
    } catch (error) {
      toast.error('Could not search users');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const generatePreview = async () => {
    const flikkCount = parseInt(numFlikkables) || 0;
    const flikkstarCount = parseInt(numFlikkstars) || 0;
    const radius = parseInt(radiusMeters) || 1000;

    if (flikkCount + flikkstarCount === 0) {
      toast.error('Please enter at least 1 character to drop');
      return;
    }

    let dropLat, dropLng;

    if (locationType === 'home') {
      if (!user?.home_lat || !user?.home_lng) {
        toast.error('Admin home location not set');
        return;
      }
      dropLat = user.home_lat;
      dropLng = user.home_lng;
    } else if (locationType === 'current') {
      if (!currentLocation) {
        toast.error('Current location not detected');
        return;
      }
      dropLat = currentLocation.lat;
      dropLng = currentLocation.lng;
    } else if (locationType === 'city') {
      if (!selectedCity) {
        toast.error('Please select a city');
        return;
      }
      dropLat = selectedCity.lat;
      dropLng = selectedCity.lng;
    } else if (locationType === 'user') {
      const userLat = selectedUser?.home_lat || selectedUser?.data?.home_location_lat;
      const userLng = selectedUser?.home_lng || selectedUser?.data?.home_location_lng;
      if (!userLat || !userLng) {
        toast.error('Selected user has no home location');
        return;
      }
      dropLat = userLat;
      dropLng = userLng;
    } else if (locationType === 'manual') {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error('Please enter valid coordinates (lat: -90 to 90, lng: -180 to 180)');
        return;
      }
      dropLat = lat;
      dropLng = lng;
    }

    setIsGenerating(true);
    try {
      const preview = [];
      const usedLocations = [];

      // Generate flikkables
      for (let i = 0; i < flikkCount; i++) {
        let location;
        let attempts = 0;
        do {
          location = generateRandomCoordinate(dropLat, dropLng, radius);
          attempts++;
        } while (attempts < 200 && isLocationTooClose(location.lat, location.lng, usedLocations));

        if (attempts < 200) {
          usedLocations.push(location);
          const template = await getRandomTemplate();
          preview.push({
            type: 'flikkable',
            name: getRandomName(false),
            avatar_emoji: template.avatar_emoji,
            avatar_url: template.avatar_url,
            rarity: getRandomRarity(),
            lat: location.lat,
            lng: location.lng
          });
        }
      }

      // Generate flikkstars
      for (let i = 0; i < flikkstarCount; i++) {
        let location;
        let attempts = 0;
        do {
          location = generateRandomCoordinate(dropLat, dropLng, radius);
          attempts++;
        } while (attempts < 200 && isLocationTooClose(location.lat, location.lng, usedLocations));

        if (attempts < 200) {
          usedLocations.push(location);
          const template = await getRandomTemplate();
          preview.push({
            type: 'flikkstar',
            name: getRandomName(true),
            avatar_emoji: template.avatar_emoji,
            avatar_url: template.avatar_url,
            rarity: getRandomRarity(),
            lat: location.lat,
            lng: location.lng
          });
        }
      }

      setPreviewList(preview);
      setShowPreview(true);
      toast.success(`Generated ${preview.length} characters for preview`);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDropCharacters = async () => {
    setShowConfirmDialog(false);
    setIsDropping(true);

    try {
       const entityName = 'Character';
       const charactersToCreate = previewList.map(char => ({
         name: char.name || `Character_${Math.random().toString(36).substr(2, 9)}`,
         avatar_emoji: char.avatar_emoji || '🎈',
         avatar_url: char.avatar_url || '',
         rarity: char.rarity || 'common',
         owner_email: user.email,
         owner_name: user.full_name,
         owner_display_name: user.username || user.full_name,
         status: 'landed',
         current_lat: char.lat,
         current_lng: char.lng,
         current_location_name: `Dropped at ${char.lat.toFixed(4)}, ${char.lng.toFixed(4)}`,
         home_lat: 0,
         home_lng: 0,
         total_distance_traveled: 0,
         unique_cities_visited: 0,
         times_returned: 0,
         picked_up_by: null,
         picked_up_by_name: null,
         picked_up_by_display_name: null,
         last_flicked: new Date().toISOString()
       }));

       // Create all characters in parallel
       await Promise.all(
         charactersToCreate.map(char => base44.entities.Character.create(char))
       );
       toast.success(`Successfully dropped ${previewList.length} characters!`);
      
      setPreviewList([]);
      setShowPreview(false);
      setNumFlikkables('5');
      setNumFlikkstars('3');
    } catch (error) {
      console.error('Error dropping characters:', error);
      toast.error('Failed to drop characters');
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Drop Near Me
        </CardTitle>
        <CardDescription>
          Bulk create and drop characters randomly within a radius around your location
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Location Type Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Drop Location
            </label>
            <Select value={locationType} onValueChange={setLocationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="home">Home Location</SelectItem>
                <SelectItem value="current">Current Location</SelectItem>
                <SelectItem value="city">Search City</SelectItem>
                <SelectItem value="user">Search User</SelectItem>
                <SelectItem value="manual">Manual Coordinates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current Location Option */}
          {locationType === 'current' && (
            <Button
              onClick={getCurrentLocation}
              variant="outline"
              className="w-full"
            >
              {currentLocation ? `Using: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : 'Detect Current Location'}
            </Button>
          )}

          {/* City Search Option */}
          {locationType === 'city' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search city..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                />
                <Button
                  onClick={searchCities}
                  disabled={isSearching}
                  variant="outline"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              {citySearchResults.length > 0 && (
                <div className="space-y-1">
                  {citySearchResults.map((city, idx) => (
                    <Button
                      key={idx}
                      variant={selectedCity?.lat === city.lat ? 'default' : 'outline'}
                      onClick={() => setSelectedCity(city)}
                      className="w-full text-left justify-start"
                    >
                      {city.city_name || `${city.lat.toFixed(4)}, ${city.lng.toFixed(4)}`}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Search Option */}
          {locationType === 'user' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Button
                  onClick={searchUsers}
                  disabled={isSearching}
                  variant="outline"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              {userSearchResults.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {userSearchResults.map((u) => (
                    <Button
                      key={u.id}
                      variant={selectedUser?.id === u.id ? 'default' : 'outline'}
                      onClick={() => setSelectedUser(u)}
                      className="w-full text-left justify-start"
                    >
                      <div className="flex flex-col items-start text-xs">
                        <span className="font-medium">{u.display_name || u.username || u.full_name}</span>
                        <span className="text-gray-500">{u.email}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual Coordinates Option */}
          {locationType === 'manual' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Latitude</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    placeholder="-33.8688"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Range: -90 to 90</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Longitude</label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    placeholder="151.2093"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-0.5">Range: -180 to 180</p>
                </div>
              </div>
              {manualLat && manualLng && (
                <p className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                  Location: {parseFloat(manualLat).toFixed(4)}, {parseFloat(manualLng).toFixed(4)}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Number of Flikkables
              </label>
              <Input
                type="number"
                min="0"
                placeholder="5"
                value={numFlikkables}
                onChange={(e) => setNumFlikkables(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Number of Flikkstars
              </label>
              <Input
                type="number"
                min="0"
                placeholder="3"
                value={numFlikkstars}
                onChange={(e) => setNumFlikkstars(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Within Radius (meters)
            </label>
            <Input
              type="number"
              min="100"
              step="100"
              placeholder="1000"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Characters will be randomly placed within this radius from the selected location
            </p>
          </div>

          <Button
            onClick={generatePreview}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
          >
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isGenerating ? 'Generating Preview...' : 'Generate Preview'}
          </Button>
        </div>
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Characters ({previewList.length})</DialogTitle>
            <DialogDescription>
              Review the characters that will be dropped before confirming
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {previewList.map((char, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 rounded-lg border flex items-start justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{char.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Type: <span className="font-medium">{char.type === 'flikkstar' ? 'Flikkstar' : 'Flikkable'}</span> | 
                    Rarity: <span className="font-medium capitalize">{char.rarity}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Location: {char.lat.toFixed(4)}, {char.lng.toFixed(4)}
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  char.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' :
                  char.rarity === 'epic' ? 'bg-purple-100 text-purple-800' :
                  char.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                  char.rarity === 'uncommon' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {char.rarity}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowPreview(false);
                setShowConfirmDialog(true);
              }}
              className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            >
              Drop {previewList.length} Characters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Drop?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to drop {previewList.length} characters near your location? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDropCharacters}
              disabled={isDropping}
              className="bg-gradient-to-r from-violet-500 to-pink-500"
            >
              {isDropping && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDropping ? 'Dropping...' : 'Confirm Drop'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}