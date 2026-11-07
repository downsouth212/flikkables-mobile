import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, MapPin, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

const MAJOR_CITIES = [
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Delhi", country: "India", lat: 28.7041, lng: 77.1025 },
  { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737 },
  { name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333 },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332 },
  { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357 },
  { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777 },
  { name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074 },
  { name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.2125 },
  { name: "Osaka", country: "Japan", lat: 34.6937, lng: 135.5023 },
  { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060 },
  { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437 },
  { name: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
  { name: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734 },
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050 },
  { name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173 },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784 },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780 },
  { name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456 },
  { name: "Manila", country: "Philippines", lat: 14.5994, lng: 120.9842 },
  { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639 },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816 },
];

export default function FlickTargetSelector({ open, onClose, onSelectTarget }) {
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [tabMode, setTabMode] = useState('mode'); // 'mode', 'user', 'city'
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, [open]);

  const searchCities = async (query) => {
    if (!query.trim() || query.length < 2) {
      setCityResults([]);
      return;
    }
    
    setIsSearchingCities(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Find up to 10 cities matching the search query: "${query}". Return a JSON array of cities with name, country, latitude, and longitude. Include major and minor cities from around the world.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            cities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  country: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" }
                }
              }
            }
          }
        }
      });
      setCityResults(result.cities || []);
    } catch (error) {
      console.error('City search failed:', error);
      setCityResults([]);
    } finally {
      setIsSearchingCities(false);
    }
  };

  const handleSearch = async (query) => {
    const searchQuery = query || searchUsername;
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await base44.functions.invoke('searchUsersByDisplayName', { userEmail: user?.email, searchQuery });
      const results = (response.data.users || []).map(u => ({
        id: u.email,
        email: u.email,
        full_name: u.display_name,
        home_lat: u.home_lat || 0,
        home_lng: u.home_lng || 0,
      }));
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  const handleConfirm = () => {
    if (tabMode === 'mode' || !selectedUser && !selectedCity) {
      onSelectTarget(null); // Random city
    } else if (selectedUser) {
      onSelectTarget({
        target_email: selectedUser.email,
        target_name: selectedUser.full_name,
        target_lat: selectedUser.home_lat,
        target_lng: selectedUser.home_lng,
      });
    } else if (selectedCity) {
      onSelectTarget({
        target_email: null,
        target_name: selectedCity.name,
        target_lat: selectedCity.lat,
        target_lng: selectedCity.lng,
        city_data: {
          city_name: `${selectedCity.name}, ${selectedCity.country}`,
          country: selectedCity.country,
          population: null,
          temperature: null,
          attractions: []
        }
      });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>Choose Flikk Destination</DialogTitle>
            <DialogDescription>Select where you want to send your Flikkable</DialogDescription>
          </DialogHeader>

        <Tabs value={tabMode} onValueChange={setTabMode} className="mt-4 w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="mode">Random</TabsTrigger>
            <TabsTrigger value="user">
              <Users className="w-4 h-4 mr-1" />
              User
            </TabsTrigger>
            <TabsTrigger value="city">
              <Globe className="w-4 h-4 mr-1" />
              City
            </TabsTrigger>
          </TabsList>

          {/* Random Mode */}
          <TabsContent value="mode" className="space-y-3">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-blue-50 rounded-lg border border-blue-100"
            >
              <p className="text-sm text-blue-700">
                Your Flikkable will be sent to a random city based on population and activity.
              </p>
            </motion.div>
          </TabsContent>

          {/* Specific User Mode */}
          <TabsContent value="user" className="space-y-3">
              <Input
                placeholder="Search by display name..."
                value={searchUsername}
                onChange={(e) => {
                  setSearchUsername(e.target.value);
                  handleSearch(e.target.value);
                }}
              />

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((user) => (
                    <motion.button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        selectedUser?.id === user.id
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className="font-medium text-sm">{user.full_name}</p>
                    </motion.button>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchUsername && !isSearching && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No users found matching that display name.
                </p>
              )}
          </TabsContent>

          {/* City Selection Mode */}
          <TabsContent value="city" className="space-y-3">
            <Input
              placeholder="Search for any city in the world..."
              value={citySearch}
              onChange={(e) => {
                setCitySearch(e.target.value);
                searchCities(e.target.value);
              }}
            />
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {isSearchingCities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                </div>
              ) : cityResults.length === 0 && citySearch.trim() ? (
                <p className="text-sm text-gray-500 text-center py-4">No cities found. Try a different search.</p>
              ) : cityResults.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Type to search for any city...</p>
              ) : (
                cityResults.map((city, idx) => (
                  <motion.button
                    key={`${city.name}-${city.country}-${idx}`}
                    onClick={() => setSelectedCity(city)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedCity?.name === city.name && selectedCity?.country === city.country
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{city.name}</p>
                        <p className="text-xs text-gray-500">{city.country}</p>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={tabMode === 'user' && !selectedUser || tabMode === 'city' && !selectedCity}
            className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}