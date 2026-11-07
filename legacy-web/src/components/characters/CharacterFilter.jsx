import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, Filter, RotateCcw } from 'lucide-react';

const sortOptions = [
  { value: 'last_flicked', label: 'Last Flikkd/Returned' },
  { value: 'distance', label: 'Total KM Traveled' },
  { value: 'cities', label: 'Cities Visited' },
  { value: 'rarity', label: 'Rarity Level' },
];

const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

export default function CharacterFilter({ onFilterChange, showFilters = false }) {
  const [sortBy, setSortBy] = useState('last_flicked');
  const [ascending, setAscending] = useState(false);
  const [continent, setContinent] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [pickedUpBy, setPickedUpBy] = useState('all');

  const handleSortChange = (value) => {
    setSortBy(value);
    onFilterChange({ sortBy: value, ascending, continent, rarity, pickedUpBy });
  };

  const handleToggleOrder = () => {
    const newAscending = !ascending;
    setAscending(newAscending);
    onFilterChange({ sortBy, ascending: newAscending, continent, rarity, pickedUpBy });
  };

  const handleContinentChange = (value) => {
    setContinent(value);
    onFilterChange({ sortBy, ascending, continent: value, rarity, pickedUpBy });
  };

  const handleRarityChange = (value) => {
    setRarity(value);
    onFilterChange({ sortBy, ascending, continent, rarity: value, pickedUpBy });
  };

  const handlePickedUpByChange = (value) => {
    setPickedUpBy(value);
    onFilterChange({ sortBy, ascending, continent, rarity, pickedUpBy: value });
  };

  const handleReset = () => {
    setSortBy('last_flicked');
    setAscending(false);
    setContinent('all');
    setRarity('all');
    setPickedUpBy('all');
    onFilterChange({ sortBy: 'last_flicked', ascending: false, continent: 'all', rarity: 'all', pickedUpBy: 'all' });
  };

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="flex-1 h-9 text-sm">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleOrder}
          className="h-9 w-9"
          title={ascending ? "Descending" : "Ascending"}
        >
          <ArrowUpDown className={`w-4 h-4 transition-transform ${ascending ? 'rotate-180' : ''}`} />
        </Button>

        {showFilters && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="h-9 w-9"
            title="Reset filters"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-3 gap-2">
          <Select value={continent} onValueChange={handleContinentChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Continent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Continents</SelectItem>
              <SelectItem value="africa">Africa</SelectItem>
              <SelectItem value="asia">Asia</SelectItem>
              <SelectItem value="europe">Europe</SelectItem>
              <SelectItem value="north_america">North America</SelectItem>
              <SelectItem value="south_america">South America</SelectItem>
              <SelectItem value="oceania">Oceania</SelectItem>
              <SelectItem value="antarctica">Antarctica</SelectItem>
            </SelectContent>
          </Select>

          <Select value={rarity} onValueChange={handleRarityChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Rarity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rarities</SelectItem>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="uncommon">Uncommon</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pickedUpBy} onValueChange={handlePickedUpByChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Picked Up" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="me">Picked by Me</SelectItem>
              <SelectItem value="others">Picked by Others</SelectItem>
              <SelectItem value="none">Not Picked Up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

const getContinent = (lat, lng) => {
  if (!lat || !lng) return null;
  
  // Simple continent detection based on coordinates
  if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) return 'africa';
  if (lat >= -47 && lat <= 81 && lng >= 25 && lng <= 180) return 'asia';
  if (lat >= 36 && lat <= 71 && lng >= -25 && lng <= 40) return 'europe';
  if (lat >= 15 && lat <= 72 && lng >= -170 && lng <= -52) return 'north_america';
  if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) return 'south_america';
  if (lat >= -47 && lat <= 0 && lng >= 110 && lng <= 180) return 'oceania';
  if (lat < -60) return 'antarctica';
  
  return null;
};

export function sortCharacters(characters, sortBy, ascending) {
  const sorted = [...characters].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'last_flicked':
        const dateA = a.last_flicked ? new Date(a.last_flicked).getTime() : new Date(a.created_date).getTime();
        const dateB = b.last_flicked ? new Date(b.last_flicked).getTime() : new Date(b.created_date).getTime();
        compareValue = dateB - dateA; // Default: newest first
        break;

      case 'distance':
        compareValue = (b.total_distance_traveled || 0) - (a.total_distance_traveled || 0);
        break;

      case 'cities':
        // Count unique cities visited from journeys
        const citiesA = new Set(a.cities_visited || []).size;
        const citiesB = new Set(b.cities_visited || []).size;
        compareValue = citiesB - citiesA;
        break;

      case 'rarity':
        const rarityA = rarityOrder[a.rarity] || 0;
        const rarityB = rarityOrder[b.rarity] || 0;
        compareValue = rarityB - rarityA; // Default: legendary first
        break;

      default:
        compareValue = 0;
    }

    return ascending ? -compareValue : compareValue;
  });

  return sorted;
}

export function filterCharacters(characters, filters, userEmail) {
  return characters.filter(char => {
    // Continent filter
    if (filters.continent && filters.continent !== 'all') {
      const charContinent = getContinent(char.current_lat, char.current_lng);
      if (charContinent !== filters.continent) return false;
    }

    // Rarity filter
    if (filters.rarity && filters.rarity !== 'all') {
      if (char.rarity !== filters.rarity) return false;
    }

    // Picked up by filter
    if (filters.pickedUpBy && filters.pickedUpBy !== 'all') {
      if (filters.pickedUpBy === 'me' && char.picked_up_by !== userEmail) return false;
      if (filters.pickedUpBy === 'others' && (!char.picked_up_by || char.picked_up_by === userEmail)) return false;
      if (filters.pickedUpBy === 'none' && char.picked_up_by) return false;
    }

    return true;
  });
}