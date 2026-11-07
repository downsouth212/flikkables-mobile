import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Major cities list
const MAJOR_CITIES = [
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
];

const CityMarker = ({ city, isVisited, onCityClick, userLocation }) => {
  const distance = userLocation ? calculateDistance(userLocation, city) : null;
  
  const icon = L.divIcon({
    html: `
      <div class="flex flex-col items-center">
        <div class="w-3 h-3 rounded-full ${isVisited ? 'bg-amber-400' : 'bg-blue-500'} shadow-lg"></div>
      </div>
    `,
    iconSize: [24, 24],
    className: 'city-marker',
  });

  return (
    <Marker position={[city.lat, city.lng]} icon={icon}>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-bold text-sm">{city.name}</h3>
          <p className="text-xs text-gray-600">{city.country}</p>
          <p className="text-xs text-gray-600 mt-1">Pop: {(city.population / 1000000).toFixed(1)}M</p>
          {distance && <p className="text-xs text-gray-500 mt-1">{distance.toFixed(0)} km away</p>}
          {isVisited && <Badge className="mt-2 bg-amber-100 text-amber-800 text-xs">🛂 Visited</Badge>}
          <button
            onClick={() => onCityClick(city)}
            className="w-full mt-2 px-2 py-1 bg-violet-500 text-white text-xs rounded hover:bg-violet-600"
          >
            Select as Target
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

const CharacterMarker = ({ character, onCharacterClick, onOwnerClick }) => {
  const statusConfig = {
    home: { label: 'At Home', color: 'bg-emerald-100 text-emerald-700' },
    traveling: { label: 'Traveling', color: 'bg-amber-100 text-amber-700' },
    landed: { label: 'Landed', color: 'bg-violet-100 text-violet-700' },
    picked_up: { label: 'Picked Up', color: 'bg-sky-100 text-sky-700' }
  };

  const rarityBorderColor = {
    common: 'border-blue-500',
    uncommon: 'border-red-500',
    rare: 'border-orange-600',
    epic: 'border-gray-400',
    legendary: 'border-amber-500'
  };

  const rarityFrame = {
    rare: 'ring-8 ring-orange-500',
    epic: 'ring-8 ring-gray-400',
    legendary: 'ring-8 ring-amber-500'
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

  const status = statusConfig[character.status] || statusConfig.home;
  const borderColor = rarityBorderColor[character.rarity] || rarityBorderColor.common;
  const distanceStar = getDistanceStar(character.total_distance_traveled || 0);
  const cityStar = getCityStar(character.unique_cities_visited || 0);

  const icon = L.divIcon({
    html: `
      <div class="text-2xl flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-lg border-4 ${borderColor} cursor-pointer">
        ${character.avatar_url ? `<img src="${character.avatar_url}" alt="${character.name}" class="w-full h-full rounded-full object-cover" />` : (character.avatar_emoji || '🎭')}
      </div>
    `,
    iconSize: [32, 32],
    className: 'character-marker',
  });

  return (
    <Marker 
      position={[character.current_lat, character.current_lng]} 
      icon={icon}
    >
      <Popup className="character-popup">
        <div className="p-3 min-w-[250px] text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              {character.avatar_url ? (
                <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg flex items-center justify-center">{character.avatar_emoji || '🎭'}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold">{character.name}</h3>
              {distanceStar && (
                <Star className={`w-3.5 h-3.5 ${distanceStar.color} fill-current`} title={`${distanceStar.label} - ${Math.round(character.total_distance_traveled).toLocaleString()} km`} />
              )}
              {cityStar && (
                <Star className={`w-3.5 h-3.5 ${cityStar.color} fill-current`} title={`${cityStar.label} - ${character.unique_cities_visited} cities`} />
              )}
            </div>
          </div>
          
          <div className="space-y-2 text-xs">
            <div><span className="text-gray-500">Owner:</span> <button 
              onClick={(e) => {
                e.stopPropagation();
                onOwnerClick?.(character.owner_email);
              }}
              className="font-medium text-violet-600 hover:underline cursor-pointer"
            >{character.owner_display_name || character.owner_name || 'Unknown'}</button></div>
            <div><span className="text-gray-500">Location:</span> <span className="font-medium">{character.current_location_name || 'Unknown'}</span></div>
            <div><span className="text-gray-500">Distance traveled:</span> <span className="font-medium">{Math.round(character.total_distance_traveled || 0).toLocaleString()} km</span></div>
            <div><span className="text-gray-500">Times returned:</span> <span className="font-medium">{character.times_returned || 0}</span></div>
            <div className="flex gap-2 flex-wrap pt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${status.color}`}>{status.label}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium inline-block capitalize ${{
                common: 'bg-gray-100 text-gray-700',
                uncommon: 'bg-green-100 text-green-700',
                rare: 'bg-blue-100 text-blue-700',
                epic: 'bg-purple-100 text-purple-700',
                legendary: 'bg-amber-100 text-amber-700'
              }[character.rarity] || 'bg-gray-100 text-gray-700'}`}>{character.rarity || 'common'}</span>
            </div>
          </div>
          
          {character.picked_up_by_name && character.status === 'picked_up' && (
            <div className="mt-2 p-2 bg-sky-50 rounded text-xs text-sky-700">
              Carried by <span className="font-semibold">{character.picked_up_by_display_name || character.picked_up_by_name}</span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

const calculateDistance = (loc1, loc2) => {
  const R = 6371;
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function GlobalMap({ 
  onCitySelect, 
  onCharacterSelect,
  showCharacters = true,
  showCities = true,
  userLocation = null,
  visitedCities = [],
  characters = [],
  height = '500px',
  onOwnerClick
}) {
  const [isLoading, setIsLoading] = useState(characters.length === 0);

  useEffect(() => {
    if (characters.length === 0 && showCharacters) {
      setIsLoading(false);
    }
  }, [characters, showCharacters]);

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-200 shadow-lg" style={{ height }}>
      {isLoading ? (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      ) : (
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />

          {showCities && MAJOR_CITIES.map((city) => (
            <CityMarker
              key={city.name}
              city={city}
              isVisited={visitedCities.includes(city.name)}
              onCityClick={onCitySelect}
              userLocation={userLocation}
            />
          ))}

          {showCharacters && characters.filter(char => 
            char.current_lat !== null && 
            char.current_lat !== undefined && 
            char.current_lng !== null && 
            char.current_lng !== undefined
          ).map((char) => (
            <CharacterMarker
              key={char.id}
              character={char}
              onCharacterClick={onCharacterSelect}
              onOwnerClick={onOwnerClick}
            />
          ))}
        </MapContainer>
      )}

      <style>{`
        .city-marker {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .character-marker {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
      `}</style>
    </div>
  );
}