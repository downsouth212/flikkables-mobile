import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Thermometer, Landmark, Home, ExternalLink, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CityInfoModal({ open, onClose, character, onReturnHome }) {
  const [loadingAttractions, setLoadingAttractions] = useState(false);
  const [localAttractions, setLocalAttractions] = useState(null);

  if (!character || !character.city_info) return null;

  let cityData;
  try {
    cityData = JSON.parse(character.city_info);
  } catch {
    return null;
  }

  const attractions = localAttractions ?? cityData.attractions ?? [];

  const fetchAttractions = async () => {
    setLoadingAttractions(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `For the city "${cityData.city_name || character.current_location_name}", list the top 3 tourist attractions. Return only their names.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            attractions: { type: "array", items: { type: "string" } }
          }
        }
      });
      const fetched = result?.attractions || [];
      setLocalAttractions(fetched);
      // Persist to character
      await base44.entities.Character.update(character.id, {
        city_info: JSON.stringify({ ...cityData, attractions: fetched })
      });
    } finally {
      setLoadingAttractions(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-violet-500" />
            {character.current_location_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Character */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center">
              {character.avatar_url ? (
                <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{character.avatar_emoji}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{character.name}</p>
              <p className="text-xs text-gray-500">is visiting here</p>
            </div>
          </div>

          {/* City Stats */}
          <div className="space-y-3">
            {cityData.population && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Population</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {cityData.population.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {cityData.temperature !== null && cityData.temperature !== undefined && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Thermometer className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Temperature</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {cityData.temperature}°C
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Landmark className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Top Attractions</p>
                {attractions.length > 0 ? (
                  <ul className="space-y-1">
                    {attractions.map((attraction, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(attraction + ' ' + character.current_location_name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:underline flex items-center gap-1 transition-colors"
                        >
                          {attraction}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchAttractions}
                    disabled={loadingAttractions}
                    className="text-xs"
                  >
                    {loadingAttractions ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
                    ) : (
                      'Load Attractions'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={() => {
              onReturnHome?.(character);
              onClose();
            }}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}