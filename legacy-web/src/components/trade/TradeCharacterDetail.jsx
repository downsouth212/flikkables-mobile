import React from 'react';
import { Card } from "@/components/ui/card";
import { Navigation, MapPin, Star } from 'lucide-react';
import RarityBadge from '@/components/characters/RarityBadge';

const getDistanceStar = (distance) => {
  if (distance >= 100000) return { color: 'text-amber-500', label: 'Gold ⭐' };
  if (distance >= 50000) return { color: 'text-gray-400', label: 'Silver ⭐' };
  if (distance >= 20000) return { color: 'text-orange-600', label: 'Bronze ⭐' };
  return null;
};

const getCityStar = (cities) => {
  if (cities >= 50) return { color: 'text-amber-500', label: 'Gold ⭐' };
  if (cities >= 20) return { color: 'text-gray-400', label: 'Silver ⭐' };
  if (cities >= 10) return { color: 'text-orange-600', label: 'Bronze ⭐' };
  return null;
};

export default function TradeCharacterDetail({ character }) {
  if (!character) return null;

  const distanceStar = getDistanceStar(character.total_distance_traveled || 0);
  const cityStar = getCityStar(character.unique_cities_visited || 0);

  return (
    <Card className="p-3 bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-100">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-violet-100 flex items-center justify-center flex-shrink-0">
          {character.avatar_url ? (
            <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{character.avatar_emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{character.name}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <RarityBadge rarity={character.rarity} />
            {distanceStar && <span className={`text-xs font-medium ${distanceStar.color}`}>{distanceStar.label}</span>}
            {cityStar && <span className={`text-xs font-medium ${cityStar.color}`}>{cityStar.label}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white rounded-lg p-2 border border-violet-100">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Navigation className="w-3 h-3" />
            <span className="font-medium">Distance</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{Math.round(character.total_distance_traveled || 0).toLocaleString()} km</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-violet-100">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <MapPin className="w-3 h-3" />
            <span className="font-medium">Cities</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{character.unique_cities_visited || 0}</p>
        </div>
      </div>
    </Card>
  );
}