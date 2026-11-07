import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Navigation, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function JourneyHistory({ characterId, characterName, open, onOpenChange }) {
  const { data: journeys = [] } = useQuery({
    queryKey: ['journeys', characterId],
    queryFn: () => base44.entities.Journey.filter({ character_id: characterId }, '-created_date', 100),
    enabled: !!characterId && open,
  });

  const totalDistance = journeys.reduce((sum, j) => sum + (j.distance_km || 0), 0);
  const cities = [...new Set(journeys.map(j => j.location_name))].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{characterName}'s Adventures</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 bg-violet-50 border-violet-200">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Total Distance</p>
              <p className="text-lg font-bold text-violet-600">{Math.round(totalDistance).toLocaleString()} km</p>
            </Card>
            <Card className="p-3 bg-pink-50 border-pink-200">
              <p className="text-xs text-gray-600 uppercase tracking-wide">Cities Visited</p>
              <p className="text-lg font-bold text-pink-600">{cities.length}</p>
            </Card>
          </div>

          {/* Journey List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Adventures</h3>
            <div className="space-y-2">
              {journeys.map((journey, idx) => (
                <motion.div
                  key={journey.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="p-3 bg-white border border-gray-100 hover:border-violet-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-violet-500 shrink-0" />
                          <p className="font-medium text-sm text-gray-900">{journey.location_name}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Navigation className="w-3 h-3" />
                          <span>{journey.distance_km ? Math.round(journey.distance_km) : 0} km</span>
                        </div>
                        {journey.by_user_name && (
                          <p className="text-xs text-gray-400 mt-1">Via {journey.by_user_name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(journey.created_date), { addSuffix: true })}
                        </p>
                        <span className={`text-xs font-medium mt-1 block ${
                          journey.event_type === 'flicked' ? 'text-blue-600' :
                          journey.event_type === 'landed' ? 'text-violet-600' :
                          journey.event_type === 'picked_up' ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {journey.event_type === 'picked_up' ? 'Pikkd up' :
                           journey.event_type === 'flicked' ? 'Flikkd' :
                           journey.event_type.charAt(0).toUpperCase() + journey.event_type.slice(1)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}