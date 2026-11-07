import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { MapPin, Loader2, Navigation, RefreshCw, AlertCircle, Globe, Bell, ArrowUpDown, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rarityConfig } from '@/components/characters/RarityBadge';
import { motion, AnimatePresence } from 'framer-motion';
import CharacterCard from '@/components/characters/CharacterCard';
import CharacterDetailModal from '@/components/characters/CharacterDetailModal';
import NearbyMap from '@/components/map/NearbyMap';
import GlobalMap from '@/components/map/GlobalMap';
import ReturnArea from '@/components/characters/ReturnArea';
import UserStatsPopup from '@/components/map/UserStatsPopup';
import HostRaceModal from '@/components/races/HostRaceModal';
import RaceDisplay from '@/components/races/RaceDisplay';
import PostcardGallery from '@/components/postcard/PostcardGallery';

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Explore() {
  const [user, setUser] = useState(null);
   const [userLocation, setUserLocation] = useState(null);
   const [locationError, setLocationError] = useState(null);
   const [selectedCharacter, setSelectedCharacter] = useState(null);
   const [showDetail, setShowDetail] = useState(false);
   const [mapBounds, setMapBounds] = useState(null);
   const [viewMode, setViewMode] = useState('nearby'); // 'nearby', 'carrying', or 'global'
   const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
   const [isReturning, setIsReturning] = useState(false);
   const [returningCharacter, setReturningCharacter] = useState(null);
   const [showUserStats, setShowUserStats] = useState(false);
   const [selectedUserEmail, setSelectedUserEmail] = useState(null);
   const [selectedUserName, setSelectedUserName] = useState(null);
   const [showHostRaceModal, setShowHostRaceModal] = useState(false);
   const [raceCharacter, setRaceCharacter] = useState(null);
   const [activeRace, setActiveRace] = useState(null);
   const [showRaceDisplay, setShowRaceDisplay] = useState(false);
   const [hostedRaces, setHostedRaces] = useState([]);
   const [nearbyAlert, setNearbyAlert] = useState(null);
   const [sortBy, setSortBy] = useState('distance');
   const [sortOrder, setSortOrder] = useState('asc');
   const [hideMyFlikkables, setHideMyFlikkables] = useState(false);
   const mapRef = useRef(null);
   const queryClient = useQueryClient();
   const shownAlertsRef = useRef(new Set());

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Load hosted races
        if (userData?.email) {
          const races = await base44.entities.Race.filter({
            host_email: userData.email,
            status: { $in: ['pending', 'active'] }
          });
          setHostedRaces(races);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  // Subscribe to race updates to detect when character is picked up
  useEffect(() => {
    if (!user?.email || !hostedRaces.length) return;

    const unsubscribe = base44.entities.Character.subscribe((event) => {
      if (event.type === 'update' && event.data.status === 'picked_up') {
        // Check if this character is in any of user's races
        hostedRaces.forEach(async (race) => {
          if (race.character_id === event.id && race.status !== 'completed') {
            // Find who picked it up and award them all stamps
            const stampEntries = JSON.parse(race.stamp_entries || '[]');
            const totalStamps = stampEntries.length * race.entry_fee;

            await base44.entities.Race.update(race.id, {
              status: 'completed',
              winner_email: event.data.picked_up_by,
              winner_name: event.data.picked_up_by_display_name
            });

            // Award all stamps to winner
            if (event.data.picked_up_by) {
              const allUsers = await base44.entities.User.list(undefined, 1000);
              const winner = allUsers.find(u => u.email === event.data.picked_up_by);
              if (winner) {
                await base44.entities.User.update(winner.id, {
                  passport_stamps: (winner.passport_stamps || 0) + totalStamps
                });
              }
            }

            setHostedRaces(prev => prev.filter(r => r.id !== race.id));
          }
        });
      }
    });

    return unsubscribe;
  }, [user?.email]);

  // Mark nearby notifications as read when viewing Nearby tab
  useEffect(() => {
    const markNotificationsRead = async () => {
      if (viewMode === 'nearby' && user?.email) {
        try {
          const notifications = await base44.entities.Notification.filter({
            user_email: user.email,
            read: false,
            type: 'flick_landed'
          });
          
          for (const notification of notifications) {
            await base44.entities.Notification.update(notification.id, { read: true });
          }
          
          if (notifications.length > 0) {
            queryClient.invalidateQueries({ queryKey: ['nearby-notifications'] });
          }
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      }
    };
    
    markNotificationsRead();
  }, [viewMode, user?.email, queryClient]);

  useEffect(() => {
    let watchId;
    setLocationError(null);
    
    if (navigator.geolocation) {
      // First try a quick low-accuracy fix so the map shows fast
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError(null);
        },
        () => {
          // Fall back to saved home location so map still renders
          if (user?.home_location_lat && user?.home_location_lng) {
            setUserLocation({ lat: user.home_location_lat, lng: user.home_location_lng });
          }
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );

      // Then watch for higher-accuracy updates
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError(null);
        },
        (err) => {
          console.error('Location error:', err);
          // Only show error if we don't already have a location
          setLocationError(prev => prev === null && !userLocation ? 'Please enable location to find nearby Flikkables' : prev);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
      );
    } else {
      setLocationError('Geolocation is not supported');
    }
    
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user?.email]);

  const requestLocation = () => {
    setLocationError(null);
    setIsRefreshingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('Location received:', pos.coords);
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsRefreshingLocation(false);
        },
        (err) => {
           console.error('Location error:', err);
           setLocationError('Please enable location to find nearby Flikkables');
           setIsRefreshingLocation(false);
         },
         { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation is not supported');
      setIsRefreshingLocation(false);
    }
  };

  const { data: landedCharacters = [], isLoading, refetch } = useQuery({
    queryKey: ['landedCharacters'],
    queryFn: () => base44.entities.Character.filter({ status: { $in: ['landed', 'traveling'] } }),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Refresh every 30s instead of 10s
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list(),
    staleTime: 60000, // Cache for 1 minute
    cacheTime: 300000, // Keep in cache for 5 minutes
  });

  const pickupRadiusSetting = settings.find(s => s.setting_key === 'pickup_radius');
  const pickupRadius = pickupRadiusSetting ? parseFloat(pickupRadiusSetting.setting_value) : 0.05; // default 50m
  
  const showRacesSetting = settings.find(s => s.setting_key === 'show_races');
  const racesEnabled = showRacesSetting ? showRacesSetting.setting_value === 'true' : true; // default enabled

  // Get all characters in map bounds (before ownership filter)
  const allNearbyCharacters = mapBounds
     ? landedCharacters.filter(char => {
         if (!char.current_lat || !char.current_lng) return false;
         return char.current_lat >= mapBounds.south &&
                char.current_lat <= mapBounds.north &&
                char.current_lng >= mapBounds.west &&
                char.current_lng <= mapBounds.east;
       })
     : [];

  // Filter out user's own characters based on toggle
  const nearbyCharacters = hideMyFlikkables 
    ? allNearbyCharacters.filter(char => char.owner_email !== user?.email)
    : allNearbyCharacters;

  // Sort nearby characters
  const sortedNearbyCharacters = [...nearbyCharacters].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === 'distance' && userLocation) {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.current_lat, a.current_lng);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.current_lat, b.current_lng);
      comparison = distA - distB;
    } else if (sortBy === 'rarity') {
      const rarityOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
      comparison = (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0);
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'owner') {
      const ownerA = a.owner_display_name || a.owner_name || '';
      const ownerB = b.owner_display_name || b.owner_name || '';
      comparison = ownerA.localeCompare(ownerB);
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const pickUpMutation = useMutation({
     mutationFn: async (character) => {
       // Check if trying to pick up own character
       if (character.owner_email === user.email) {
         throw new Error('You cannot pick up your own Flikkable!');
       }

       // Use cached pickup radius instead of fetching
       const currentPickupRadius = pickupRadius;

       // Check proximity
       if (userLocation) {
         const distance = calculateDistance(
           userLocation.lat, userLocation.lng,
           character.current_lat, character.current_lng
         );
         if (distance > currentPickupRadius) {
           throw new Error(`Too far away to pick up! You're ${(distance * 1000).toFixed(0)}m away. Get within ${(currentPickupRadius * 1000).toFixed(0)}m.`);
         }
       }

       // Run all independent operations in parallel
       await Promise.all([
         base44.entities.Character.update(character.id, {
           status: 'picked_up',
           picked_up_by: user.email,
           picked_up_by_name: user.full_name,
           picked_up_by_display_name: user.display_name || user.full_name,
           picked_up_at: new Date().toISOString(),
         }),
         base44.entities.Journey.create({
           character_id: character.id,
           character_name: character.name,
           event_type: 'picked_up',
           lat: character.current_lat,
           lng: character.current_lng,
           location_name: character.current_location_name,
           by_user_email: user.email,
           by_user_name: user.full_name,
         }),
         base44.auth.updateMe({
           characters_picked_up: (user.characters_picked_up || 0) + 1
         }),
         // Notify owner (skip duplicate check to reduce API calls)
         base44.entities.Notification.create({
           user_email: character.owner_email,
           type: 'flick_landed',
           title: `${character.name} was picked up!`,
           message: `${user.display_name || user.full_name} picked up ${character.name} in ${character.current_location_name}`,
           related_user_email: user.email,
           related_user_name: user.full_name,
           metadata: JSON.stringify({
             character_name: character.name,
             location: character.current_location_name,
             picker_name: user.display_name || user.full_name
           }),
           expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
         }),
       ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landedCharacters'] });
      queryClient.invalidateQueries({ queryKey: ['pickedUpCharacters', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['myCharacters'] });
      queryClient.invalidateQueries({ queryKey: ['journey-stats'] });
      setShowDetail(false);
      setSelectedCharacter(null);
      // Refresh user data
      base44.auth.me().then(setUser);
    },
    onError: (error) => {
      alert(error.message);
    },
    });

  const calculateStampsForReturn = (character, isOwner) => {
    // Owner doesn't get stamps for returning their own flikkable
    if (isOwner) return 0;

    // 1 stamp per 200km traveled
    let stamps = Math.ceil((character.total_distance_traveled || 0) / 200);

    // Rarity bonus
    if (character.rarity === 'rare') stamps += 5;
    else if (character.rarity === 'epic') stamps += 10;
    else if (character.rarity === 'legendary') stamps += 20;

    return stamps;
  };

  const returnMutation = useMutation({
    mutationFn: async (character) => {
      const distance = calculateDistance(
        character.current_lat, character.current_lng,
        character.home_lat, character.home_lng
      );
      const rarityMultiplier = rarityConfig[character.rarity]?.multiplier || 1;
      const pointsEarned = Math.round(distance * rarityMultiplier);
      const isOwner = character.owner_email === user.email;
      const stampsEarned = calculateStampsForReturn(character, isOwner);

      // Only add distance to character profile if returned by another user
      const updateData = {
        status: 'home',
        current_lat: character.home_lat,
        current_lng: character.home_lng,
        current_location_name: 'Home',
        times_returned: (character.times_returned || 0) + 1,
        picked_up_by: null,
        picked_up_by_name: null,
        picked_up_by_display_name: null,
        picked_up_at: null,
      };
      
      if (!isOwner) {
        updateData.total_distance_traveled = (character.total_distance_traveled || 0) + distance;
      }
      
      await base44.entities.Character.update(character.id, updateData);

      await base44.entities.Journey.create({
        character_id: character.id,
        character_name: character.name,
        event_type: 'returned',
        lat: character.home_lat,
        lng: character.home_lng,
        location_name: 'Home',
        by_user_email: user.email,
        by_user_name: user.full_name,
        distance_km: distance,
        points_earned: pointsEarned,
      });

      // Update user with stamps and return count
      const userUpdateData = { 
        characters_returned: (user.characters_returned || 0) + 1
      };
      if (stampsEarned > 0) {
        userUpdateData.passport_stamps = (user.passport_stamps || 0) + stampsEarned;
      }
      await base44.auth.updateMe(userUpdateData);

      // Create notification for the returner if they earned stamps
      if (stampsEarned > 0) {
        await base44.entities.Notification.create({
          user_email: user.email,
          type: 'character_returned',
          title: `${character.name} returned home!`,
          message: `${character.name} made it back home and earned ${stampsEarned} stamps. It traveled ${distance.toFixed(1)}km.`,
          metadata: JSON.stringify({
            character_name: character.name,
            stamps: stampsEarned,
            distance: distance.toFixed(1)
          }),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Notify the owner that their Flikkable was returned
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
            title: `${character.name} is back home!`,
            message: `${user.display_name || user.full_name} returned ${character.name} safely home after traveling ${distance.toFixed(1)}km!`,
            related_user_email: user.email,
            related_user_name: user.full_name,
            metadata: JSON.stringify({
              character_name: character.name,
              returner_name: user.display_name || user.full_name,
              distance: distance.toFixed(1)
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
      },
      onSuccess: () => {
      // Batch invalidations to avoid rate limit issues
      queryClient.invalidateQueries({ queryKey: ['landedCharacters'] });
      queryClient.invalidateQueries({ queryKey: ['pickedUpCharacters', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowDetail(false);
      setSelectedCharacter(null);
      setIsReturning(false);
      setReturningCharacter(null);
      // Delay user refresh slightly to avoid rate limit
      setTimeout(() => {
        base44.auth.me().then(setUser);
      }, 100);
      },
  });

  const returnHomeMutation = useMutation({
    mutationFn: async (character) => {
      // Check if in a race
      const races = await base44.entities.Race.filter({
        character_id: character.id,
        status: { $in: ['pending', 'active'] }
      });
      if (races.length > 0) {
        throw new Error('Cannot return home while in an active race');
      }

      // Check time limit
      if (character.last_flicked) {
        const flickedTime = new Date(character.last_flicked).getTime();
        const now = Date.now();
        const hoursSinceFlick = (now - flickedTime) / (1000 * 60 * 60);
        const requiredHours = character.avatar_url ? 4 : 8;
        if (hoursSinceFlick < requiredHours) {
          throw new Error(`Must wait ${requiredHours} hours after flicking before returning home`);
        }
      }

      // Return home without distance/stamps since owner is returning
      await base44.entities.Character.update(character.id, {
        status: 'home',
        current_lat: character.home_lat,
        current_lng: character.home_lng,
        current_location_name: 'Home',
        times_returned: (character.times_returned || 0) + 1,
      });

      await base44.entities.Journey.create({
        character_id: character.id,
        character_name: character.name,
        event_type: 'returned',
        lat: character.home_lat,
        lng: character.home_lng,
        location_name: 'Home',
        by_user_email: user.email,
        by_user_name: user.full_name,
        distance_km: 0,
        points_earned: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landedCharacters'] });
      setShowDetail(false);
      setSelectedCharacter(null);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  // Get characters the user has picked up
  const { data: pickedUpCharacters = [] } = useQuery({
    queryKey: ['pickedUpCharacters', user?.email],
    queryFn: () => base44.entities.Character.filter({ picked_up_by: user?.email, status: 'picked_up' }),
    enabled: !!user?.email,
  });

  // Get all landed characters and user's characters for global map
  const { data: allCharacters = [] } = useQuery({
    queryKey: ['allCharacters'],
    queryFn: () => base44.entities.Character.filter({ status: 'landed' }),
    enabled: viewMode === 'global',
  });

  const { data: userCharacters = [] } = useQuery({
    queryKey: ['userCharacters', user?.email],
    queryFn: () => base44.entities.Character.filter({ owner_email: user?.email }),
    enabled: viewMode === 'global' && !!user?.email,
  });

  // Get visited cities from user's character history
  const visitedCities = userCharacters
    .filter(char => char.current_location_name && char.status !== 'home')
    .map(char => char.current_location_name)
    .filter((city, idx, arr) => arr.indexOf(city) === idx);

  // Check for nearby flikkables within 2km and show alert
  useEffect(() => {
    // Clear alert if character is no longer in nearbyCharacters (already picked up)
    if (nearbyAlert && !nearbyCharacters.find(c => c.id === nearbyAlert.id)) {
      setNearbyAlert(null);
      shownAlertsRef.current.delete(nearbyAlert.id);
    }
    
    if (userLocation && nearbyCharacters.length > 0 && viewMode === 'nearby') {
      const pickupDistance = 2; // 2 km

      for (const char of nearbyCharacters) {
        // Skip user's own characters
        if (char.owner_email === user?.email) continue;

        const distance = calculateDistance(
          userLocation.lat, userLocation.lng,
          char.current_lat, char.current_lng
        );

        // Show alert only once per character and only if within 2km
        if (distance <= pickupDistance && !shownAlertsRef.current.has(char.id)) {
          shownAlertsRef.current.add(char.id);
          setNearbyAlert(char);
          
          // Play notification sound
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (e) {
            console.log('Could not play notification sound');
          }
          
          break;
        }
      }
    }
  }, [userLocation, nearbyCharacters, viewMode, nearbyAlert]);

  const hostRaceMutation = useMutation({
    mutationFn: async ({ character, minutes, durationMinutes, maxParticipants }) => {
      // Check if a race already exists for this character
      const existingRaces = await base44.entities.Race.filter({
        character_id: character.id,
        status: { $in: ['pending', 'active'] }
      });
      
      if (existingRaces.length > 0) {
        throw new Error('A race is already scheduled for this Flikkable!');
      }

      // Deduct 5 stamps from host
      const newStamps = Math.max(0, (user.passport_stamps || 0) - 5);
      await base44.auth.updateMe({ passport_stamps: newStamps });
      
      const startTime = new Date(Date.now() + minutes * 60 * 1000);
      const finishTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      
      return base44.entities.Race.create({
        character_id: character.id,
        character_name: character.name,
        host_email: user.email,
        host_name: user.display_name || user.full_name,
        start_time: startTime.toISOString(),
        finish_time: finishTime.toISOString(),
        max_participants: maxParticipants,
        status: 'pending',
        participants: JSON.stringify([user.email]),
        stamp_entries: JSON.stringify([user.email]) // Track who paid
      });
    },
    onSuccess: (race) => {
      setShowHostRaceModal(false);
      setRaceCharacter(null);
      setActiveRace(race);
      setShowRaceDisplay(true);
      // Refresh user to update stamps
      base44.auth.me().then(setUser);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const joinRaceMutation = useMutation({
    mutationFn: async (race) => {
      const participants = JSON.parse(race.participants || '[]');
      const stampEntries = JSON.parse(race.stamp_entries || '[]');
      
      if (!participants.includes(user.email)) {
        // Deduct 5 stamps immediately
        const newStamps = Math.max(0, (user.passport_stamps || 0) - 5);
        await base44.auth.updateMe({ passport_stamps: newStamps });
        
        participants.push(user.email);
        stampEntries.push(user.email);
        
        const updatedRace = await base44.entities.Race.update(race.id, {
          participants: JSON.stringify(participants),
          stamp_entries: JSON.stringify(stampEntries)
        });

        // Notify host that someone joined
        await base44.entities.Notification.create({
          user_email: race.host_email,
          type: 'race_joined',
          title: `Someone joined your race!`,
          message: `${user.display_name || user.full_name} joined your race for ${race.character_name}`,
          related_user_email: user.email,
          related_user_name: user.full_name,
          metadata: JSON.stringify({
            race_id: race.id,
            character_name: race.character_name
          }),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        return updatedRace;
      }
      return race;
    },
    onSuccess: (updatedRace) => {
      setActiveRace(updatedRace);
      queryClient.invalidateQueries({ queryKey: ['races'] });
      // Refresh user to update stamps
      base44.auth.me().then(setUser);
    }
  });

  const pickUpWithRaceMutation = useMutation({
    mutationFn: async (character) => {
      // Check if trying to pick up own character
      if (character.owner_email === user.email) {
        throw new Error('You cannot pick up your own Flikkable!');
      }

      // Use cached pickup radius instead of fetching
      const currentPickupRadius = pickupRadius;

      // Check proximity
      if (userLocation) {
        const distance = calculateDistance(
          userLocation.lat, userLocation.lng,
          character.current_lat, character.current_lng
        );
        if (distance > currentPickupRadius) {
          throw new Error(`Too far away! You're ${(distance * 1000).toFixed(0)}m away. Get within ${(currentPickupRadius * 1000).toFixed(0)}m.`);
        }
      }

      // Update character
      await base44.entities.Character.update(character.id, {
        status: 'picked_up',
        picked_up_by: user.email,
        picked_up_by_name: user.full_name,
        picked_up_by_display_name: user.display_name || user.full_name,
        picked_up_at: new Date().toISOString(),
      });

      // Update race and notify participants
      if (activeRace) {
        let stampsMultiplier = 2; // Double stamps for winner
        if (activeRace.status !== 'completed') {
          await base44.entities.Race.update(activeRace.id, {
            status: 'completed',
            winner_email: user.email,
            winner_name: user.display_name || user.full_name
          });

          // Award all entry fee stamps to winner (winner takes all)
          const stampEntries = JSON.parse(activeRace.stamp_entries || '[]');
          const totalStamps = stampEntries.length * (activeRace.entry_fee || 5);
          await base44.auth.updateMe({
            passport_stamps: (user.passport_stamps || 0) + totalStamps
          });

          // Notify all other participants
          const participants = JSON.parse(activeRace.participants || '[]');
          for (const participantEmail of participants) {
            if (participantEmail !== user.email) {
              const stampEntries = JSON.parse(activeRace.stamp_entries || '[]');
              const totalStamps = stampEntries.length * (activeRace.entry_fee || 5);
              await base44.entities.Notification.create({
                user_email: participantEmail,
                type: 'race_finished',
                title: `Race finished!`,
                message: `${user.display_name || user.full_name} won the race and takes all ${totalStamps} stamps!`,
                related_user_email: user.email,
                related_user_name: user.full_name,
                metadata: JSON.stringify({
                  race_id: activeRace.id,
                  character_name: character.name,
                  winner_name: user.display_name || user.full_name,
                  stamps_won: totalStamps
                }),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });
            }
          }
        }
      }

      // Create journey entry
      await base44.entities.Journey.create({
        character_id: character.id,
        character_name: character.name,
        event_type: 'picked_up',
        lat: character.current_lat,
        lng: character.current_lng,
        location_name: character.current_location_name,
        by_user_email: user.email,
        by_user_name: user.full_name,
      });

      // Increment user's pickup count
      await base44.auth.updateMe({
        characters_picked_up: (user.characters_picked_up || 0) + 1
      });

      // Check if similar notification already exists to avoid duplicates
      const existingNotif = await base44.entities.Notification.filter({
        user_email: character.owner_email,
        type: 'flick_landed',
        related_user_email: user.email,
        created_date: { $gte: new Date(Date.now() - 60000).toISOString() } // Check last 1 minute
      });
      
      if (existingNotif.length === 0) {
        // Notify owner
        await base44.entities.Notification.create({
          user_email: character.owner_email,
          type: 'flick_landed',
          title: `${character.name} was picked up!`,
          message: `${user.display_name || user.full_name} picked up ${character.name}`,
          related_user_email: user.email,
          related_user_name: user.full_name,
          metadata: JSON.stringify({
            character_name: character.name,
            location: character.current_location_name,
            picker_name: user.display_name || user.full_name
          }),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landedCharacters'] });
      queryClient.invalidateQueries({ queryKey: ['pickedUpCharacters', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['myCharacters'] });
      queryClient.invalidateQueries({ queryKey: ['journey-stats'] });
      setShowDetail(false);
      setShowRaceDisplay(false);
      setSelectedCharacter(null);
      setActiveRace(null);
      base44.auth.me().then(setUser);
    },
    onError: (error) => {
      alert(error.message);
    },
    });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-40">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
            <p className="text-sm text-gray-500 mt-1">Discover Flikkables worldwide</p>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Races Tab removed from top, now in Tabs */}

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="mb-6">
          <TabsList className="w-full bg-white/50 border border-gray-100 p-1 rounded-xl grid grid-cols-4">
            <TabsTrigger value="nearby" className="rounded-lg data-[state=active]:bg-white text-xs">
              <MapPin className="w-4 h-4 mr-1" />
              Nearby
            </TabsTrigger>
            <TabsTrigger value="carrying" className="rounded-lg data-[state=active]:bg-white text-xs">
              <Navigation className="w-4 h-4 mr-1" />
              Carrying
            </TabsTrigger>
            <TabsTrigger value="postcards" className="rounded-lg data-[state=active]:bg-white text-xs">
              📸
              Postcards
            </TabsTrigger>
            <TabsTrigger value="global" className="rounded-lg data-[state=active]:bg-white text-xs">
              <Globe className="w-4 h-4 mr-1" />
              Global
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === 'nearby' ? (
          <>
            {/* Location Error */}
            {locationError && (
              <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800">{locationError}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={requestLocation}>
                    Retry
                  </Button>
                </div>
              </Card>
            )}

            {/* Nearby Map */}
             {userLocation && (
               <div className={`mb-6 relative z-0 ${showDetail ? 'pointer-events-none' : ''}`}>
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-xs text-gray-500 font-medium">Your Location</span>
                   <Button 
                     size="sm" 
                     variant="ghost"
                     className="h-7 px-2 text-xs"
                     onClick={() => requestLocation()}
                     disabled={isRefreshingLocation}
                   >
                     <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshingLocation ? 'animate-spin' : ''}`} />
                     {isRefreshingLocation ? 'Refreshing...' : 'Recalibrate'}
                   </Button>
                 </div>
                 <NearbyMap
                    center={userLocation}
                    characters={nearbyCharacters}
                    onCharacterClick={(char) => {
                      setSelectedCharacter(char);
                      setShowDetail(true);
                    }}
                    onBoundsChange={setMapBounds}
                    mapRef={mapRef}
                    onOwnerClick={(ownerEmail) => {
                      const character = nearbyCharacters.find(c => c.owner_email === ownerEmail);
                      if (character) {
                        setSelectedUserEmail(ownerEmail);
                        setSelectedUserName(character.owner_display_name || character.owner_name);
                        setShowUserStats(true);
                      }
                    }}
                  />
               </div>
             )}

            {/* Nearby Characters */}
            <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-pink-500" />
              Nearby
            </h2>
            {allNearbyCharacters.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={hideMyFlikkables ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setHideMyFlikkables(!hideMyFlikkables)}
                >
                  {hideMyFlikkables ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                  {hideMyFlikkables ? 'Show Mine' : 'Hide Mine'}
                </Button>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="rarity">Rarity</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : !userLocation ? (
            <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Location Required</h3>
              <p className="text-sm text-gray-500">Enable location to discover Flikkables near you.</p>
            </Card>
          ) : nearbyCharacters.length === 0 ? (
            <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No Flikkables Nearby</h3>
              <p className="text-sm text-gray-500">Check back later or expand your search area!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {sortedNearbyCharacters.map((char) => {
                    const distance = userLocation ? calculateDistance(
                      userLocation.lat, userLocation.lng,
                      char.current_lat, char.current_lng
                    ) : 0;
                    return (
                    <motion.div
                      key={char.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <CharacterCard 
                       character={char} 
                       showOwner
                       distance={distance}
                       onClick={() => {
                         const finalDistance = userLocation ? calculateDistance(
                           userLocation.lat, userLocation.lng,
                           char.current_lat, char.current_lng
                         ) : undefined;
                         setSelectedCharacter({ ...char, userDistance: finalDistance });
                         setShowDetail(true);
                       }}
                      />
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          </div>
          </>
        ) : viewMode === 'carrying' ? (
          <>
            {isReturning && returningCharacter ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                {returningCharacter.home_lat === null || returningCharacter.home_lat === undefined || returningCharacter.home_lng === null || returningCharacter.home_lng === undefined ? (
                  <Card className="p-6 bg-amber-50 border-amber-200">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-amber-900 mb-2">Cannot Return This Character</h3>
                      <p className="text-sm text-amber-700 mb-4">
                        This character was dropped and has no home location set.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsReturning(false);
                          setReturningCharacter(null);
                        }}
                      >
                        Back to Carrying
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    <ReturnArea 
                      character={returningCharacter} 
                      onReturn={() => returnMutation.mutate(returningCharacter)}
                      disabled={returnMutation.isPending}
                      userLocation={userLocation}
                      ownerLocation={{ lat: returningCharacter.home_lat, lng: returningCharacter.home_lng }}
                    />
                    {returnMutation.isPending && (
                      <div className="flex items-center justify-center gap-2 mt-4 text-emerald-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Returning home...</span>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ) : pickedUpCharacters.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-violet-500" />
                  Flikkables You're Carrying
                </h2>
                <div className="space-y-3">
                  {pickedUpCharacters.map((char) => {
                    const distance = userLocation ? calculateDistance(
                      userLocation.lat, userLocation.lng,
                      char.current_lat, char.current_lng
                    ) : 999;
                    return (
                    <CharacterCard 
                      key={char.id} 
                      character={char} 
                      showOwner
                      distance={distance}
                      onClick={() => {
                        setSelectedCharacter({ ...char, userDistance: distance });
                        setReturningCharacter(char);
                        setIsReturning(true);
                      }}
                    />
                  );
                  })}
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
                <Navigation className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Carrying no Flikkables</h3>
                <p className="text-sm text-gray-500">Pikk up from the Nearby tab to carry one!</p>
              </Card>
            )}
          </>
        ) : viewMode === 'postcards' ? (
          <PostcardGallery user={user} />
        ) : (
          <>
            {/* Global Map */}
            <Card className="p-4 mb-6 bg-white/80 backdrop-blur border-0 shadow-lg">
              <GlobalMap
                showCharacters={true}
                showCities={false}
                userLocation={userLocation}
                characters={allCharacters}
                onCharacterSelect={(char) => {
                  setSelectedCharacter(char);
                  setShowDetail(true);
                }}
                onOwnerClick={(ownerEmail) => {
                  const character = allCharacters.find(c => c.owner_email === ownerEmail);
                  if (character) {
                    setSelectedUserEmail(ownerEmail);
                    setSelectedUserName(character.owner_display_name || character.owner_name);
                    setShowUserStats(true);
                  }
                }}
                height="400px"
              />
            </Card>
          </>
        )}
        </div>

        <CharacterDetailModal
           character={selectedCharacter}
           open={showDetail}
           onClose={() => {
             setShowDetail(false);
             setSelectedCharacter(null);
           }}
           onPickUp={(char) => pickUpMutation.mutate(char)}
           onReturn={(char) => returnMutation.mutate(char)}
           onReturnHome={(char) => {
             // Return home directly from Explore page
             returnHomeMutation.mutate(char);
           }}
           currentUserEmail={user?.email}
           isLoading={pickUpMutation.isPending || returnMutation.isPending || returnHomeMutation.isPending || joinRaceMutation.isPending}
           isOwner={selectedCharacter?.owner_email === user?.email}
           userLocation={userLocation}
           onOwnerNameClick={() => {
             if (selectedCharacter?.owner_email) {
               setSelectedUserEmail(selectedCharacter.owner_email);
               setSelectedUserName(selectedCharacter.owner_display_name || selectedCharacter.owner_name);
               setShowUserStats(true);
             }
           }}
           onHostRace={undefined}
           onJoinRace={(race) => {
             setActiveRace(race);
             setShowRaceDisplay(true);
             setShowDetail(false);
             joinRaceMutation.mutate(race);
           }}
         />

        <UserStatsPopup
          open={showUserStats}
          onClose={() => setShowUserStats(false)}
          userEmail={selectedUserEmail}
          userName={selectedUserName}
        />

        <HostRaceModal
          open={showHostRaceModal}
          onClose={() => {
            setShowHostRaceModal(false);
            setRaceCharacter(null);
          }}
          character={raceCharacter}
          userStamps={user?.passport_stamps || 0}
          onHost={(data) => hostRaceMutation.mutate({ 
            character: raceCharacter, 
            ...data 
          })}
        />

        <RaceDisplay
           open={showRaceDisplay}
           onClose={() => {
             setShowRaceDisplay(false);
             setActiveRace(null);
           }}
           race={activeRace}
           character={selectedCharacter}
           user={user}
           userStamps={user?.passport_stamps || 0}
           onJoinRace={() => joinRaceMutation.mutate(activeRace)}
           onPickUp={() => pickUpWithRaceMutation.mutate(selectedCharacter)}
           isJoining={joinRaceMutation.isPending}
           isPicking={pickUpWithRaceMutation.isPending}
         />

        {/* Nearby Alert Popup */}
        <Dialog open={!!nearbyAlert} onOpenChange={() => setNearbyAlert(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-pink-500 animate-bounce" />
                Flikkable Nearby!
              </DialogTitle>
            </DialogHeader>
            {nearbyAlert && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                    {nearbyAlert.avatar_url ? (
                      <img src={nearbyAlert.avatar_url} alt={nearbyAlert.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{nearbyAlert.avatar_emoji}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{nearbyAlert.name}</p>
                    <p className="text-sm text-gray-600">{nearbyAlert.current_location_name}</p>
                    <p className="text-xs text-pink-600 font-medium mt-1">📍 You can pick it up!</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setNearbyAlert(null)}
                    className="flex-1"
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedCharacter(nearbyAlert);
                      setShowDetail(true);
                      setNearbyAlert(null);
                    }}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                  >
                    View & Pick Up
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

         </div>
        );
        }