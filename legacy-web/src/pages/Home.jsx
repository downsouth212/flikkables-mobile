import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSound } from '@/components/audio/useSound';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Trophy, Compass, Loader2, RefreshCw, Home as HomeIcon, List, Trees, Plane, ShoppingCart, Paintbrush, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import CharacterCard from '@/components/characters/CharacterCard';
import CreateCharacterModal from '@/components/characters/CreateCharacterModal';
import FlickArea from '@/components/characters/FlickArea';
import FlightAnimation from '@/components/characters/FlightAnimation';
import CityInfoModal from '@/components/characters/CityInfoModal';
import FlickTargetSelector from '@/components/characters/FlickTargetSelector';
import { QuestTracker } from '@/components/quests/QuestTracker';
import CharacterFilter, { sortCharacters, filterCharacters } from '@/components/characters/CharacterFilter';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import UserStatusBar from '@/components/user/UserStatusBar';
import MilestoneModal from '@/components/modals/MilestoneModal';
import GardenView from '@/components/characters/GardenView';
import AirportDepartureGate from '@/components/characters/AirportDepartureGate';
import GardenDisplay from '@/components/characters/GardenDisplay';
import AirportDisplay from '@/components/characters/AirportDisplay';
import AirportLounge from '@/components/characters/AirportLounge';
import GardenShop from '@/components/garden/GardenShop';
import GardenCustomizer from '@/components/garden/GardenCustomizer';
import AirportShop from '@/components/airport/AirportShop';
import AirportCustomizer from '@/components/airport/AirportCustomizer';
import StreakTracker from '@/components/rewards/StreakTracker';
import DailyQuests from '@/components/rewards/DailyQuests';
import SpinTheWheel from '@/components/rewards/SpinTheWheel';

export default function Home() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFlicking, setIsFlicking] = useState(false);
  const [flightData, setFlightData] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returningCharacter, setReturningCharacter] = useState(null);
  const [showCityInfo, setShowCityInfo] = useState(false);
  const [cityInfoCharacter, setCityInfoCharacter] = useState(null);
  const [homeFilter, setHomeFilter] = useState({ sortBy: 'last_flicked', ascending: false });
  const [travelingFilter, setTravelingFilter] = useState({ sortBy: 'last_flicked', ascending: false, continent: 'all', rarity: 'all', pickedUpBy: 'all' });
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [flickTarget, setFlickTarget] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [gardenCharIds, setGardenCharIds] = useState([]);
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [showGardenModal, setShowGardenModal] = useState(false);
  const [viewingGardenChar, setViewingGardenChar] = useState(null);
  const [viewingAirportChar, setViewingAirportChar] = useState(null);
  const [showBulkMoveConfirm, setShowBulkMoveConfirm] = useState(null);
  const [showGardenShop, setShowGardenShop] = useState(false);
  const [showGardenCustomizer, setShowGardenCustomizer] = useState(false);
  const [showAirportShop, setShowAirportShop] = useState(false);
  const [showAirportCustomizer, setShowAirportCustomizer] = useState(false);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const queryClient = useQueryClient();
  const { play: playSound } = useSound();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Load garden character IDs
      if (userData.garden_character_ids) {
        try {
          setGardenCharIds(JSON.parse(userData.garden_character_ids));
        } catch (e) {
          setGardenCharIds([]);
        }
      }
      
      // Redirect to onboarding if not completed
      if (!userData.onboarding_completed) {
        window.location.href = createPageUrl('Onboarding');
      }
    };
    loadUser();
    
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('Location access denied')
      );
    }
  }, []);

  const { data: myCharacters = [], isLoading } = useQuery({
    queryKey: ['myCharacters', user?.email],
    queryFn: () => base44.entities.Character.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: ownedCharacterReturns = [] } = useQuery({
    queryKey: ['character-returns', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const ownedChars = await base44.entities.Character.filter({ owner_email: user.email });
      const returns = await base44.entities.Journey.filter({ event_type: 'returned' }, '-created_date', 500);
      return returns.filter(j => ownedChars.some(c => c.id === j.character_id));
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: stampData = { daily: 0, weekly: 0, allTime: 0, totalReturns: 0 } } = useQuery({
   queryKey: ['stamp-data', user?.email],
   queryFn: async () => {
     if (!user?.email) return { daily: 0, weekly: 0, allTime: 0, totalReturns: 0 };

     const journeys = await base44.entities.Journey.filter(
       { by_user_email: user.email, event_type: 'flicked' },
       '-created_date',
       500
     );

     const now = new Date();
     const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
     const weekStart = new Date(now);
     weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1);
     weekStart.setHours(0, 0, 0, 0);

     let daily = 0, weekly = 0, allTime = 0;

     journeys.forEach(journey => {
       const journeyDate = new Date(journey.created_date);
       const stamps = journey.points_earned || 0;

       allTime += stamps;
       if (journeyDate >= todayStart) daily += stamps;
       if (journeyDate >= weekStart) weekly += stamps;
     });

     return { daily, weekly, allTime, totalReturns: ownedCharacterReturns?.length || 0 };
   },
   enabled: !!user?.email,
   staleTime: 5 * 60 * 1000,
   refetchInterval: 5 * 60 * 1000,
  });

  const { data: onlineCount = 0 } = useQuery({
    queryKey: ['online-users'],
    queryFn: async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const allUsers = await base44.entities.User.list();
        return allUsers.filter(u => u.last_seen && new Date(u.last_seen) >= new Date(fiveMinutesAgo)).length;
      } catch (err) {
        console.error('Failed to fetch online users:', err);
        return 0;
      }
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes (was 30s)
  });

  const totalFlicks = user?.characters_flicked || 0;
  const totalPickups = user?.characters_picked_up || 0;
  const totalReturns = user?.characters_returned || 0;

  const createMutation = useMutation({
    mutationFn: async (charData) => {
      // Fall back to home location from user profile if GPS not yet available
      const effectiveLocation = (userLocation && !(userLocation.lat === 0 && userLocation.lng === 0))
        ? userLocation
        : (user?.home_location_lat && user?.home_location_lng)
          ? { lat: user.home_location_lat, lng: user.home_location_lng }
          : null;

      if (!effectiveLocation) {
        throw new Error('Location not available. Please enable location access in your browser settings.');
      }

      const isUsingHomeLocation = !userLocation || (userLocation.lat === 0 && userLocation.lng === 0);
      const locationName = (isUsingHomeLocation && user?.home_location_name)
        ? user.home_location_name
        : await getLocationName(effectiveLocation.lat, effectiveLocation.lng);

      // Randomly assign rarity with equal 20% chance for each
      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      const randomRarity = rarities[Math.floor(Math.random() * rarities.length)];

      return base44.entities.Character.create({
        ...charData,
        rarity: randomRarity,
        owner_email: user.email,
        owner_name: user.full_name,
        owner_display_name: user.display_name || user.full_name,
        status: 'home',
        current_lat: effectiveLocation.lat,
        current_lng: effectiveLocation.lng,
        current_location_name: locationName || 'Unknown',
        home_lat: effectiveLocation.lat,
        home_lng: effectiveLocation.lng,
        total_distance_traveled: 0,
        times_returned: 0,
      });
    },
    onSuccess: (newCharacter) => {
      playSound('success');
      // Add newly created character to garden by default
      const newGardenIds = [...gardenCharIds, newCharacter.id];
      setGardenCharIds(newGardenIds);
      base44.auth.updateMe({ garden_character_ids: JSON.stringify(newGardenIds) });
      queryClient.invalidateQueries({ queryKey: ['myCharacters'] });
      setShowCreateModal(false);
    },
  });

  // Major world cities with population data
  const majorCities = [
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, population: 37000000 },
    { name: "Delhi", country: "India", lat: 28.7041, lng: 77.1025, population: 32000000 },
    { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, population: 28000000 },
    { name: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, population: 22000000 },
    { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, population: 21000000 },
    { name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357, population: 21000000 },
    { name: "Mumbai", country: "India", lat: 19.0760, lng: 72.8777, population: 20000000 },
    { name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074, population: 21000000 },
    { name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.2125, population: 21000000 },
    { name: "Osaka", country: "Japan", lat: 34.6937, lng: 135.5023, population: 19000000 },
    { name: "New York", country: "USA", lat: 40.7128, lng: -74.0060, population: 18000000 },
    { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437, population: 13000000 },
    { name: "London", country: "UK", lat: 51.5074, lng: -0.1278, population: 9000000 },
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, population: 7000000 },
    { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, population: 3000000 },
    { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198, population: 5800000 },
    { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694, population: 7500000 },
    { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, population: 5300000 },
    { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, population: 6000000 },
    { name: "Barcelona", country: "Spain", lat: 41.3851, lng: 2.1734, population: 5600000 },
    { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, population: 4800000 },
    { name: "Berlin", country: "Germany", lat: 52.5200, lng: 13.4050, population: 3700000 },
    { name: "Moscow", country: "Russia", lat: 55.7558, lng: 37.6173, population: 12600000 },
    { name: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, population: 15000000 },
    { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018, population: 10000000 },
    { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.9780, population: 9700000 },
    { name: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, population: 10600000 },
    { name: "Manila", country: "Philippines", lat: 14.5994, lng: 120.9842, population: 14000000 },
    { name: "Kolkata", country: "India", lat: 22.5726, lng: 88.3639, population: 14000000 },
    { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, population: 9500000 },
  ];

  const selectRandomCityWeighted = () => {
    // Weight cities by population (logarithmic scale)
    const weights = majorCities.map(city => Math.log(city.population) / Math.log(10));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return majorCities[i];
      }
    }
    
    return majorCities[majorCities.length - 1];
  };

  const flickMutation = useMutation({
    mutationFn: async ({ character, speed, angle, targetUser }) => {
      playSound('flick');
      let resultDistance = 0;
      if (!userLocation) return;

      // Use target location if specified (user home or city)
      let targetLat, targetLng, targetLocationName;
      let isTargeted = false;

      if (targetUser) {
        targetLat = targetUser.target_lat;
        targetLng = targetUser.target_lng;
        targetLocationName = targetUser.target_email ? `${targetUser.target_name}'s home` : targetUser.target_name;
        isTargeted = true;
      } else {
        // Select city based on population
        const cityResponse = selectRandomCityWeighted();
        targetLat = cityResponse.lat;
        targetLng = cityResponse.lng;
        targetLocationName = `${cityResponse.name}, ${cityResponse.country}`;
        // Pass city data to avoid additional LLM calls
        targetUser = { 
          city_data: { 
            city_name: targetLocationName, 
            population: cityResponse.population,
            country: cityResponse.country,
            temperature: null, 
            attractions: [] 
          } 
        };
      }

      // Add ±50km variance to the city coordinates (only for random flicks)
      // For all flicks, add a small random offset (50-100m) to prevent stacking
      let variedLat = targetLat;
      let variedLng = targetLng;
      
      if (!isTargeted) {
        const varianceKm = (Math.random() - 0.5) * 100; // -50 to +50 km
        const randomAngle = Math.random() * Math.PI * 2;
        variedLat = targetLat + (varianceKm / 111) * Math.cos(randomAngle);
        variedLng = targetLng + (varianceKm / (111 * Math.cos(targetLat * Math.PI / 180))) * Math.sin(randomAngle);
      }
      
      // Add small random offset (50-100m) to prevent characters from stacking
      const offsetMeters = Math.random() * 50 + 50; // 50-100 meters (reduced from 100-200m)
      const offsetKm = offsetMeters / 1000; // Convert to km
      const offsetAngle = Math.random() * Math.PI * 2;
      variedLat += (offsetKm / 111) * Math.cos(offsetAngle);
      variedLng += (offsetKm / (111 * Math.cos(variedLat * Math.PI / 180))) * Math.sin(offsetAngle);

      let clampedLat = Math.max(-85, Math.min(85, variedLat));
      let clampedLng = ((variedLng + 180) % 360) - 180;
      
      // Calculate actual distance
      const R = 6371;
      const dLat = (clampedLat - userLocation.lat) * Math.PI / 180;
      const dLng = (clampedLng - userLocation.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(clampedLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceKm = R * c;

      // Use city info from target (either predefined city data or user home)
      let accurateCityName = targetLocationName;
      let finalCityData = null;

      if (targetUser && targetUser.city_data) {
        // Use predefined city data from target selector
        finalCityData = targetUser.city_data;
        accurateCityName = finalCityData.city_name || targetLocationName;
      } else {
        // Use basic city data
        finalCityData = { 
          city_name: targetLocationName, 
          population: null, 
          temperature: null, 
          attractions: [] 
        };
      }

      const updatedChar = await base44.entities.Character.update(character.id, {
        status: 'landed',
        current_lat: clampedLat,
        current_lng: clampedLng,
        current_location_name: accurateCityName,
        city_info: JSON.stringify(finalCityData),
        total_distance_traveled: (character.total_distance_traveled || 0) + distanceKm,
        last_flicked: new Date().toISOString(),
        picked_up_by: null,
        picked_up_by_name: null,
        picked_up_by_display_name: null,
      });

      // Fetch full city info with attractions in the background (non-blocking)
      getCityInfo(clampedLat, clampedLng).then(fullCityData => {
        if (fullCityData && fullCityData.attractions && fullCityData.attractions.length > 0) {
          base44.entities.Character.update(character.id, {
            city_info: JSON.stringify({
              ...finalCityData,
              ...fullCityData,
            }),
            current_location_name: fullCityData.city_name || accurateCityName,
          });
        }
      }).catch(() => {});  // silently ignore errors
      
      // Calculate and award stamps first
      const stampsEarned = calculateStamps(character, distanceKm, finalCityData);

      await base44.entities.Journey.create({
        character_id: character.id,
        character_name: character.name,
        event_type: 'flicked',
        lat: clampedLat,
        lng: clampedLng,
        location_name: accurateCityName,
        by_user_email: user.email,
        by_user_name: user.full_name,
        by_user_display_name: user.display_name || user.full_name,
        distance_km: distanceKm,
        points_earned: stampsEarned,
      });

      playSound('land');

      await base44.auth.updateMe({ 
        passport_stamps: (user.passport_stamps || 0) + stampsEarned,
        characters_flicked: (user.characters_flicked || 0) + 1
      });

      // Update quests
      await QuestTracker.checkAndUpdateQuests(user.email, updatedChar, 'flicked');
      await QuestTracker.checkAndUpdateQuests(user.email, updatedChar, 'landed');
      
      // Update daily quest
      await base44.functions.invoke('updateDailyQuest', {
        userEmail: user.email,
        questType: 'flicked'
      });

      // Check for new stars earned
      await checkForNewStars(character, updatedChar);

      // Update country ownership
      try {
        await base44.functions.invoke('updateCountryOwnership', {
          countryName: finalCityData?.country || accurateCityName.split(',').pop().trim(),
          countryCode: ''
        });
      } catch (err) {
        console.error('Country ownership update failed:', err);
      }

      return { character, updatedChar };
      },
      onSuccess: async ({ character, updatedChar }) => {
      // Check for milestone after mutation succeeds
      checkForMilestone(character.total_distance_traveled || 0, updatedChar.total_distance_traveled);

      await queryClient.refetchQueries({ queryKey: ['myCharacters'] });
      await queryClient.refetchQueries({ queryKey: ['stamp-data'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      playSound('notification');
      // Don't clear animation here - let handleFlightComplete do it after animation finishes
      },
      });

  const handleFlightComplete = async () => {
    // Clear animation after it completes (4 seconds + 1 second delay in component)
    setFlightData(null);
    setIsFlicking(false);
    setSelectedCharacter(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (characterId) => {
      await base44.entities.Character.delete(characterId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCharacters'] });
    },
  });

  const canReturnHome = (character) => {
    // Can always return immediately if someone picked it up
    if (character.picked_up_by) return true;
    // Otherwise, Flikkstars need 4 hours, regular Flikkables need 8 hours
    if (!character.last_flicked) return true;
    const flickedTime = new Date(character.last_flicked).getTime();
    const now = Date.now();
    const hoursSinceFlick = (now - flickedTime) / (1000 * 60 * 60);
    const requiredHours = character.avatar_url ? 4 : 8; // Flikkstars = 4 hours, regular = 8 hours
    return hoursSinceFlick >= requiredHours;
  };

  const getReturnCountdown = (character) => {
    if (!character.last_flicked) return null;
    const flickedTime = new Date(character.last_flicked).getTime();
    const now = Date.now();
    const hoursSinceFlick = (now - flickedTime) / (1000 * 60 * 60);
    const requiredHours = character.avatar_url ? 4 : 8; // Flikkstars = 4 hours, regular = 8 hours
    if (hoursSinceFlick >= requiredHours) return null;
    
    const remainingHours = Math.ceil(requiredHours - hoursSinceFlick);
    return remainingHours;
  };

  const returnHomeMutation = useMutation({
      mutationFn: async (character) => {
        if (!canReturnHome(character)) {
          const requiredHours = character.avatar_url ? 4 : 8;
          throw new Error(`Must wait ${requiredHours} hours after flicking before returning home`);
        }

        playSound('return');

        // Check if this is a dropped character (home coordinates 0,0) or regular character
        const isDroppedCharacter = character.home_lat === 0 && character.home_lng === 0;
        const isOwner = character.owner_email === user.email;
        const wasPickedUp = !!character.picked_up_by;

        let stampsEarned = 0;
        
        // Only award stamps if someone else picked it up and is returning it
        if (wasPickedUp && !isOwner) {
          // Calculate stamps: 1 stamp per 200km + rarity bonus
          stampsEarned = Math.ceil((character.total_distance_traveled || 0) / 200);
          if (character.rarity === 'rare') stampsEarned += 5;
          else if (character.rarity === 'epic') stampsEarned += 10;
          else if (character.rarity === 'legendary') stampsEarned += 20;
        }

        await base44.entities.Character.update(character.id, {
          status: 'home',
          current_lat: character.home_lat,
          current_lng: character.home_lng,
          current_location_name: 'Home',
          picked_up_by: null,
          picked_up_by_name: null,
          picked_up_by_display_name: null,
          times_returned: (character.times_returned || 0) + 1,
        });

        await base44.entities.Journey.create({
          character_id: character.id,
          character_name: character.name,
          event_type: 'returned',
          lat: character.home_lat,
          lng: character.home_lng,
          by_user_email: user.email,
          by_user_name: user.full_name,
          by_user_display_name: user.display_name || user.full_name,
          distance_km: 0,
          points_earned: stampsEarned,
        });

        // Award stamps and increment return count
        const updateData = {
          characters_returned: (user.characters_returned || 0) + 1
        };
        if (stampsEarned > 0) {
          updateData.passport_stamps = (user.passport_stamps || 0) + stampsEarned;
        }
        await base44.auth.updateMe(updateData);

        // Notification to picker
        await base44.entities.Notification.create({
          user_email: user.email,
          type: 'character_returned',
          title: `${character.name} returned home!`,
          message: `${character.name} was returned by you and you earned ${stampsEarned} stamps! Total distance traveled: ${Math.round(character.total_distance_traveled).toLocaleString()} km.`,
          metadata: JSON.stringify({
            character_name: character.name,
            stamps_earned: stampsEarned,
            distance_traveled: character.total_distance_traveled
          }),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        // Notification to owner (only if different from picker)
        if (character.owner_email !== user.email) {
          // Check if similar notification already exists to avoid duplicates
          const existingNotif = await base44.entities.Notification.filter({
            user_email: character.owner_email,
            type: 'character_returned',
            related_user_email: user.email,
            created_date: { $gte: new Date(Date.now() - 60000).toISOString() } // Check last 1 minute
          });
          
          if (existingNotif.length === 0) {
            await base44.entities.Notification.create({
              user_email: character.owner_email,
              type: 'character_returned',
              title: `${character.name} returned home!`,
              message: `${character.name} was returned by ${character.picked_up_by_display_name || character.picked_up_by_name || 'someone'}!`,
              metadata: JSON.stringify({
                character_name: character.name,
                stamps_earned: 0,
                returned_by: character.picked_up_by_name,
                distance_traveled: character.total_distance_traveled
              }),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
          }

          // Set character mood to 1 heart when returned home
          const moods = await base44.entities.CharacterMood.filter({ character_id: character.id });
          if (moods.length > 0) {
            await base44.entities.CharacterMood.update(moods[0].id, { happiness_level: 1 });
          } else {
            await base44.entities.CharacterMood.create({
              character_id: character.id,
              character_name: character.name,
              owner_email: character.owner_email,
              happiness_level: 1
            });
          }
        }

        // Update quest
        await QuestTracker.checkAndUpdateQuests(user.email, character, 'returned');
        
        // Update daily quest
        await base44.functions.invoke('updateDailyQuest', {
          userEmail: user.email,
          questType: 'returned'
        });

        // Trigger quest progress update
        if (window.updateDailyQuests) {
          window.updateDailyQuests();
        }

        // Update country ownership (flikkable left the country)
        try {
          await base44.functions.invoke('updateCountryOwnership', {
            countryName: character.current_location_name?.split(',').pop().trim() || '',
            countryCode: ''
          });
        } catch (err) {
          console.error('Country ownership update failed:', err);
        }
      },
      onSuccess: () => {
        // Batch invalidations to avoid rate limit issues
        queryClient.invalidateQueries({ queryKey: ['myCharacters'] });
        queryClient.invalidateQueries({ queryKey: ['stamp-data'] });
        setShowReturnModal(false);
        setReturningCharacter(null);
        // Delay user refresh slightly to avoid rate limit
        setTimeout(() => {
          base44.auth.me().then(setUser);
        }, 100);
      },
    });

  const getCityInfo = async (lat, lng) => {
    if (!lat || !lng) return null;
    
    // Reject extreme polar regions - too cold/uninhabitable
    if (Math.abs(lat) > 75) {
      return { city_name: 'Remote Arctic Region', country: 'Polar', population: 0, temperature: -40, attractions: [] };
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await Promise.race([
        base44.integrations.Core.InvokeLLM({
          prompt: `For coordinates ${lat}, ${lng}, find the ACTUAL city or settlement at or very near these exact coordinates. Provide:
1. City name
2. Country name
3. Current population (approximate number)
4. Current temperature in Celsius
5. Top 3 attractions

If coordinates are in water/ocean/sea, return the nearest inhabited settlement. Be accurate to the coordinates given.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              city_name: { type: "string" },
              country: { type: "string" },
              population: { type: "number" },
              temperature: { type: "number" },
              attractions: { 
                type: "array", 
                items: { type: "string" }
              }
            }
          }
        }),
        new Promise((_, reject) => timeoutId)
      ]);
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      console.error('City info fetch failed:', error);
      return null;
    }
  };

  const getLocationName = async (lat, lng) => {
    if (!lat || !lng) return 'Unknown location';
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Given coordinates ${lat}, ${lng}, return just the city/region and country name. Be brief, like "Paris, France" or "Tokyo, Japan". If in ocean, say "Atlantic Ocean" etc.`,
        response_json_schema: {
          type: "object",
          properties: {
            location: { type: "string" }
          }
        }
      });
      return response.location || 'Unknown location';
    } catch {
      return 'Unknown location';
    }
  };

  const calculateStamps = (character, distance, cityInfo) => {
    let stamps = 0;

    // 1 stamp per unique city
    stamps += 1;

    // 1 stamp per 1000km (rounded up)
    stamps += Math.ceil(distance / 1000);

    // Population bonus: 1M+ = 3 stamps
    const population = cityInfo?.population || 0;
    if (population >= 1000000) {
      stamps += 3;
    }

    // Rarity bonuses
    if (character.rarity === 'rare') stamps += 2;
    else if (character.rarity === 'epic') stamps += 5;
    else if (character.rarity === 'legendary') stamps += 10;

    // Flikkstar bonus: +20% stamps if character has avatar_url (indicating it's a Flikkstar)
    if (character.avatar_url) {
      stamps = Math.ceil(stamps * 1.2);
    }

    return stamps;
  };

  const getStarThresholds = () => ({
    distance: [
      { threshold: 100000, level: 'gold', label: 'Gold Star' },
      { threshold: 50000, level: 'silver', label: 'Silver Star' },
      { threshold: 20000, level: 'bronze', label: 'Bronze Star' }
    ],
    cities: [
      { threshold: 50, level: 'gold', label: 'Gold Star' },
      { threshold: 20, level: 'silver', label: 'Silver Star' },
      { threshold: 10, level: 'bronze', label: 'Bronze Star' }
    ]
  });

  const checkForMilestone = (oldDistance, newDistance) => {
    const milestones = [100000, 500000, 1000000, 2000000, 3000000, 4000000];
    for (const m of milestones) {
      if (oldDistance < m && newDistance >= m) {
        playSound('milestone');
        setMilestone(m);
        return;
      }
    }
  };

  const checkForNewStars = async (oldChar, newChar) => {
    if (!user?.email) return;
    const thresholds = getStarThresholds();
    
    // Check distance star
    const oldDistanceStar = thresholds.distance.find(t => oldChar.total_distance_traveled >= t.threshold)?.level;
    const newDistanceStar = thresholds.distance.find(t => newChar.total_distance_traveled >= t.threshold)?.level;
    
    if (newDistanceStar && newDistanceStar !== oldDistanceStar) {
      const starLabel = thresholds.distance.find(t => t.level === newDistanceStar).label;
      await base44.entities.Notification.create({
        user_email: user.email,
        type: 'character_achievement',
        title: `${newChar.name} earned a ${starLabel}!`,
        message: `${newChar.name} has traveled ${Math.round(newChar.total_distance_traveled).toLocaleString()} km!`,
        metadata: JSON.stringify({
          character_name: newChar.name,
          achievement_type: 'distance_star',
          star_level: newDistanceStar
        }),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Check cities star
    const oldCitiesStar = thresholds.cities.find(t => oldChar.unique_cities_visited >= t.threshold)?.level;
    const newCitiesStar = thresholds.cities.find(t => newChar.unique_cities_visited >= t.threshold)?.level;
    
    if (newCitiesStar && newCitiesStar !== oldCitiesStar) {
      const starLabel = thresholds.cities.find(t => t.level === newCitiesStar).label;
      await base44.entities.Notification.create({
        user_email: user.email,
        type: 'character_achievement',
        title: `${newChar.name} earned a ${starLabel}!`,
        message: `${newChar.name} has visited ${newChar.unique_cities_visited} unique cities!`,
        metadata: JSON.stringify({
          character_name: newChar.name,
          achievement_type: 'cities_star',
          star_level: newCitiesStar
        }),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  };

  const handleFlick = async (speed, angle) => {
    if (!selectedCharacter || isFlicking || !userLocation) return;
    setShowTargetSelector(true);
  };

  const handleFlickWithTarget = async (target) => {
     if (!selectedCharacter || isFlicking) return;

     setShowTargetSelector(false);
     setIsFlicking(true);

     // Show flight animation immediately - determine target location
     let targetLat, targetLng, targetLocationName;
     if (target) {
       targetLat = target.target_lat;
       targetLng = target.target_lng;
       targetLocationName = target.target_email ? `${target.target_name}'s home` : target.target_name;
     } else {
       // Fallback to random city if no target selected
       const cityResponse = selectRandomCityWeighted();
       targetLat = cityResponse.lat;
       targetLng = cityResponse.lng;
       targetLocationName = `${cityResponse.name}, ${cityResponse.country}`;
     }

     setFlightData({
       character: selectedCharacter,
       startCoords: { lat: userLocation.lat, lng: userLocation.lng },
       endCoords: { lat: targetLat, lng: targetLng },
       endLocationName: targetLocationName,
     });
    
    try {
      await flickMutation.mutateAsync({ 
        character: selectedCharacter, 
        speed: 0, 
        angle: 0,
        targetUser: target
      });
    } finally {
      setFlickTarget(null);
    }
  };

  const allHomeCharacters = myCharacters.filter(c => c.status === 'home');
  
  const gardenCharacters = allHomeCharacters.filter(c => gardenCharIds.includes(c.id));
  const airportCharacters = sortCharacters(
    allHomeCharacters.filter(c => !gardenCharIds.includes(c.id)),
    homeFilter.sortBy,
    homeFilter.ascending
  );
  const homeCharacters = [...gardenCharacters, ...airportCharacters];
  
  const travelingCharacters = sortCharacters(
    filterCharacters(
      myCharacters.filter(c => c.status !== 'home' && c.picked_up_by !== user?.email),
      travelingFilter,
      user?.email
    ),
    travelingFilter.sortBy,
    travelingFilter.ascending
  );

  const handleMoveToGarden = async (character) => {
    const newGardenIds = [...gardenCharIds];
    if (!newGardenIds.includes(character.id)) {
      newGardenIds.push(character.id);
      setGardenCharIds(newGardenIds);
      await base44.auth.updateMe({ 
        garden_character_ids: JSON.stringify(newGardenIds) 
      });
    }
    setViewingAirportChar(null);
  };

  const handleMoveToAirport = async (character) => {
    const newGardenIds = gardenCharIds.filter(id => id !== character.id);
    setGardenCharIds(newGardenIds);
    await base44.auth.updateMe({ 
      garden_character_ids: JSON.stringify(newGardenIds) 
    });
    setViewingGardenChar(null);
  };

  const handleBulkMoveToAirport = async () => {
    setGardenCharIds([]);
    await base44.auth.updateMe({ 
      garden_character_ids: JSON.stringify([]) 
    });
    setShowBulkMoveConfirm(null);
  };

  const handleBulkMoveToGarden = async () => {
    const allHomeIds = allHomeCharacters.map(c => c.id);
    setGardenCharIds(allHomeIds);
    await base44.auth.updateMe({ 
      garden_character_ids: JSON.stringify(allHomeIds) 
    });
    setShowBulkMoveConfirm(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50">
      <div className="max-w-lg mx-auto px-4 pt-5 pb-24">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 via-pink-600 to-violet-600 bg-clip-text text-transparent animate-pulse leading-none">
              Flikkables
            </h1>
            <p className="text-[10px] text-gray-500 mt-0">Send them on adventures!</p>
          </div>
          {/* Online Count */}
          <motion.div
            className="flex items-center gap-2 bg-white/80 backdrop-blur px-2 py-1 rounded-full border border-gray-200 shadow-sm text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.7)',
                  '0 0 0 4px rgba(34, 197, 94, 0)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <span className="text-xs font-medium text-gray-700">{onlineCount}</span>
          </motion.div>
        </motion.div>

        {/* Daily Rewards Button - Centered */}
        {user && (
          <motion.div 
            className="mb-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="outline"
              onClick={() => setShowDailyRewards(true)}
              className="w-full bg-gradient-to-r from-violet-50 to-pink-50 border-violet-200 hover:shadow-lg transition-all py-5"
            >
              <span className="mr-2 text-2xl">🎁</span>
              <span className="text-base font-bold">Daily Rewards</span>
            </Button>
          </motion.div>
        )}

        {/* User Status Bar with Stamps */}
        {user && (
          <div className="mb-2">
            <UserStatusBar 
              user={{...user, total_distance_traveled: myCharacters.reduce((sum, c) => sum + (c.total_distance_traveled || 0), 0)}}
              stampData={stampData}
              userLocation={userLocation}
            />
          </div>
        )}

        {/* Stats */}
                {user && (
                  <motion.div 
                    className="grid grid-cols-2 gap-2 mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-white backdrop-blur border border-amber-100 shadow-lg shadow-amber-200/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Your Stamps</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 text-sm">
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-900">How Stamps Work</p>
                        <ul className="space-y-1 text-gray-600 text-xs">
                          <li>• <span className="font-medium">1 stamp</span> per unique city visited</li>
                          <li>• <span className="font-medium">1 stamp</span> per 1000 km traveled</li>
                          <li>• <span className="font-medium">3 stamps</span> bonus for cities with 1M+ population</li>
                          <li>• <span className="font-medium">Rarity bonuses:</span> Rare +2, Epic +5, Legendary +10</li>
                          <li>• <span className="font-medium">Trade characters</span> for stamps from other players</li>
                          <li>• <span className="font-medium">Complete quests</span> and exchange trophies for stamps</li>
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent mt-2">
                   {user.passport_stamps ? user.passport_stamps.toLocaleString() : '0'}
                 </p>
                <p className="text-2xl mt-1">🛂</p>
              </Card>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className="p-4 bg-gradient-to-br from-emerald-50 to-white backdrop-blur border border-emerald-100 shadow-lg shadow-emerald-200/50">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Flikkables Returned</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent mt-2">
                  {totalReturns}
                </p>
                <p className="text-2xl mt-1">🏠</p>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Flick Area */}
        {selectedCharacter && selectedCharacter.status === 'home' && !gardenCharIds.includes(selectedCharacter.id) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <FlickArea 
              character={selectedCharacter} 
              onFlick={handleFlick}
              disabled={isFlicking || flickMutation.isPending}
              userLocation={userLocation}
            />
            {(isFlicking || flickMutation.isPending) && (
              <div className="flex items-center justify-center gap-2 mt-2 text-violet-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Sending on adventure...</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Characters Tabs */}
        <Tabs defaultValue="home" className="w-full mb-2">
          <TabsList className="w-full bg-white/50 border border-gray-100 p-1 rounded-xl mb-2 text-xs">
            <TabsTrigger value="home" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow text-xs">
              Home ({homeCharacters.length})
            </TabsTrigger>
            <TabsTrigger value="traveling" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow text-xs">
              Away ({travelingCharacters.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : homeCharacters.length === 0 ? (
              <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <Compass className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">No Flikkables Yet</h3>
                <p className="text-sm text-gray-500 mb-4">Create your first Flikkable to start the adventure!</p>
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-violet-500 to-pink-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Flikkable
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-2" style={{ gridTemplateColumns: 'minmax(140px, 1fr) minmax(140px, 1fr)' }}>
                {/* Garden Section - Left */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trees className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Garden</h3>
                  </div>
                  {gardenCharacters.length > 0 ? (
                    <GardenView
                      characters={gardenCharacters}
                      onClick={() => setShowGardenModal(true)}
                    />
                  ) : (
                    <Card className="h-[160px] flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-100 border-dashed">
                      <div className="text-center px-2">
                        <Trees className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Move Flikkables here from the Airport</p>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Airport Section - Right */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Plane className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Airport</h3>
                  </div>
                  {airportCharacters.length > 0 ? (
                    <AirportDepartureGate
                      characters={airportCharacters}
                      onClick={() => setShowAirportModal(true)}
                    />
                  ) : (
                    <Card className="h-[160px] flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border border-blue-100 border-dashed">
                      <div className="text-center px-2">
                        <Plane className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                        <p className="text-xs text-blue-600 font-semibold">Send to Airport for flikking!</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="traveling" className="space-y-3">
            {myCharacters.filter(c => c.status !== 'home' && c.picked_up_by !== user?.email).length > 0 && (
              <CharacterFilter onFilterChange={setTravelingFilter} showFilters={true} />
            )}
            {travelingCharacters.length === 0 ? (
              <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
                <p className="text-sm text-gray-500">No Flikkables are flikkd away right now.</p>
              </Card>
            ) : (
              <AnimatePresence>
                {travelingCharacters.map((char) => (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <CharacterCard 
                      character={char} 
                      onClick={() => {
                        if (char.status === 'landed' && char.city_info) {
                          setCityInfoCharacter(char);
                          setShowCityInfo(true);
                        } else if (char.status === 'picked_up' && char.picked_up_by === user?.email) {
                          setReturningCharacter(char);
                          setShowReturnModal(true);
                        }
                      }}
                      onDelete={deleteMutation.mutate}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateCharacterModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => createMutation.mutate(data)}
        isCreating={createMutation.isPending}
      />

      {/* Flight Animation */}
      <AnimatePresence>
        {flightData && isFlicking && (
          <FlightAnimation
            character={flightData.character}
            startCoords={flightData.startCoords}
            endCoords={flightData.endCoords}
            endLocationName={flightData.endLocationName}
            onComplete={handleFlightComplete}
          />
        )}
      </AnimatePresence>

      {/* City Info Modal */}
      <CityInfoModal 
        open={showCityInfo}
        onClose={() => {
          setShowCityInfo(false);
          setCityInfoCharacter(null);
        }}
        character={cityInfoCharacter}
        onReturnHome={(char) => {
          setReturningCharacter(char);
          setShowReturnModal(true);
        }}
      />

      {/* Flick Target Selector */}
      <FlickTargetSelector
        open={showTargetSelector}
        onClose={() => setShowTargetSelector(false)}
        onSelectTarget={handleFlickWithTarget}
      />

      {/* Milestone Modal */}
      <MilestoneModal 
        open={!!milestone}
        onClose={() => setMilestone(null)}
        distance={milestone}
      />

      {/* Garden Modal */}
      <Dialog open={showGardenModal} onOpenChange={setShowGardenModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trees className="w-5 h-5 text-emerald-600" />
              Garden - Relaxing ({gardenCharacters.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGardenShop(true)}
              className="text-xs"
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Shop
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGardenCustomizer(true)}
              className="text-xs"
            >
              <Paintbrush className="w-3 h-3 mr-1" />
              Customize
            </Button>
            {gardenCharacters.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBulkMoveConfirm('toAirport')}
                className="text-xs"
              >
                <Plane className="w-3 h-3 mr-1" />
                Flikk all to Airport
              </Button>
            )}
          </div>
          <div className="mt-4">
            <GardenDisplay 
              characters={gardenCharacters}
              onCharacterClick={(char) => setViewingGardenChar(char)}
              user={user}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Garden Character Card Dialog */}
      <Dialog open={!!viewingGardenChar} onOpenChange={(open) => !open && setViewingGardenChar(null)}>
        <DialogContent className="max-w-[340px] w-[calc(100vw-2rem)] mx-auto p-4">
          <DialogHeader>
            <DialogTitle>In Garden</DialogTitle>
          </DialogHeader>
          {viewingGardenChar && (
            <div className="mt-4 space-y-4 w-full overflow-hidden">
              <CharacterCard
                character={viewingGardenChar}
                onClick={() => {}}
                onDelete={deleteMutation.mutate}
                onMoveToAirport={handleMoveToAirport}
                isInGarden={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Airport Modal */}
      <Dialog open={showAirportModal} onOpenChange={setShowAirportModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                Airport - Ready for Flikking ({airportCharacters.length})
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAirportShop(true)}
              className="text-xs"
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Shop
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAirportCustomizer(true)}
              className="text-xs"
            >
              <Package className="w-3 h-3 mr-1" />
              Customize
            </Button>
            {airportCharacters.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBulkMoveConfirm('toGarden')}
                className="text-xs"
              >
                <Trees className="w-3 h-3 mr-1" />
                Flikk all to Garden
              </Button>
            )}
          </div>
          <div className="mt-4">
            <AirportLounge 
              characters={airportCharacters}
              onCharacterClick={(char) => setViewingAirportChar(char)}
              user={user}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Airport Character Card Dialog */}
      <Dialog open={!!viewingAirportChar} onOpenChange={(open) => !open && setViewingAirportChar(null)}>
        <DialogContent className="max-w-[340px] w-[calc(100vw-2rem)] mx-auto p-4">
          <DialogHeader>
            <DialogTitle>Ready to Flikk</DialogTitle>
          </DialogHeader>
          {viewingAirportChar && (
            <div className="mt-4 space-y-3 w-full overflow-hidden">
              <CharacterCard
                character={viewingAirportChar}
                onClick={() => {}}
                onDelete={deleteMutation.mutate}
                onMoveToGarden={handleMoveToGarden}
                isInAirport={true}
              />
              <Button
                onClick={() => {
                  setSelectedCharacter(viewingAirportChar);
                  setViewingAirportChar(null);
                  setShowAirportModal(false);
                }}
                className="w-full bg-violet-500 hover:bg-violet-600"
              >
                Select for Flikking
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Move Confirmation */}
      <Dialog open={!!showBulkMoveConfirm} onOpenChange={(open) => !open && setShowBulkMoveConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Flikk</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              {showBulkMoveConfirm === 'toAirport' 
                ? `Flikk all ${gardenCharacters.length} Flikkables to Airport?`
                : `Flikk all ${airportCharacters.length} Flikkables to Garden?`
              }
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkMoveConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={showBulkMoveConfirm === 'toAirport' ? handleBulkMoveToAirport : handleBulkMoveToGarden}
                className="flex-1 bg-violet-500 hover:bg-violet-600"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Return Home Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Flikkable Home?</DialogTitle>
          </DialogHeader>
          {returningCharacter && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                  {returningCharacter.avatar_url ? (
                    <img src={returningCharacter.avatar_url} alt={returningCharacter.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{returningCharacter.avatar_emoji}</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{returningCharacter.name}</p>
                  <p className="text-sm text-gray-500">{returningCharacter.current_location_name}</p>
                </div>
              </div>
              {!canReturnHome(returningCharacter) ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">⏱️ Ready in:</p>
                  <p className="text-2xl font-bold text-amber-700 mt-2">
                    {getReturnCountdown(returningCharacter)}h remaining
                  </p>
                  <p className="text-xs text-amber-600 mt-2">Come back after the cooldown expires to return {returningCharacter.name} home.</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Bring {returningCharacter.name} back home? They'll be ready for another adventure!
                </p>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {canReturnHome(returningCharacter) && (
                  <Button 
                    onClick={() => returnHomeMutation.mutate(returningCharacter)}
                    disabled={returnHomeMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                  >
                    <HomeIcon className="w-4 h-4 mr-2" />
                    {returnHomeMutation.isPending ? 'Returning...' : 'Return Home'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Create Button - only show when not flicking or in flight */}
      {!isFlicking && !flightData && (
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full shadow-2xl shadow-violet-500/50 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 z-50"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Garden Shop */}
      <GardenShop
        open={showGardenShop}
        onOpenChange={setShowGardenShop}
        user={user}
      />

      {/* Garden Customizer */}
      <GardenCustomizer
        open={showGardenCustomizer}
        onOpenChange={setShowGardenCustomizer}
        user={user}
      />

      {/* Airport Shop */}
      <AirportShop
        open={showAirportShop}
        onOpenChange={setShowAirportShop}
        user={user}
      />

      {/* Airport Customizer */}
      <AirportCustomizer
        open={showAirportCustomizer}
        onOpenChange={setShowAirportCustomizer}
        user={user}
      />

      {/* Spin The Wheel */}
      <SpinTheWheel
        open={showSpinWheel}
        onOpenChange={setShowSpinWheel}
        user={user}
        onRewardClaimed={() => {
          base44.auth.me().then(setUser);
          queryClient.invalidateQueries({ queryKey: ['stamp-data'] });
        }}
      />

      {/* Daily Rewards Modal */}
      <Dialog open={showDailyRewards} onOpenChange={setShowDailyRewards}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Daily Rewards</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <StreakTracker 
              user={user} 
              onStreakUpdate={() => {
                base44.auth.me().then(setUser);
                queryClient.invalidateQueries({ queryKey: ['stamp-data'] });
              }}
            />
            <DailyQuests 
              user={user}
              onQuestComplete={() => {
                base44.auth.me().then(setUser);
                queryClient.invalidateQueries({ queryKey: ['stamp-data'] });
              }}
            />
            <Card 
              className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setShowDailyRewards(false);
                setShowSpinWheel(true);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎡</span>
                  <div>
                    <p className="text-xs text-gray-600 uppercase font-semibold">Daily Spin</p>
                    <p className="text-sm font-bold text-yellow-700">Win stamps & prizes!</p>
                  </div>
                </div>
                <Button size="sm" className="bg-gradient-to-r from-yellow-400 to-orange-500">
                  Spin
                </Button>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}