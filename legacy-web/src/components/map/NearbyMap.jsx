import React, { useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import RarityBadge from '@/components/characters/RarityBadge';
import { Navigation, Star } from 'lucide-react';

// Fix for default marker icons
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createEmojiIcon = (emoji, avatarUrl) => {
   if (avatarUrl) {
     return new DivIcon({
       html: `<div style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; box-shadow: 2px 2px 8px rgba(0,0,0,0.3);"><img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`,
       className: 'emoji-marker',
       iconSize: [40, 40],
       iconAnchor: [20, 20],
     });
   }
   return new DivIcon({
     html: `<div style="font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${emoji}</div>`,
     className: 'emoji-marker',
     iconSize: [40, 40],
     iconAnchor: [20, 20],
   });
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

function MapEventHandler({ onBoundsChange }) {
  const map = useMap();

  const handleMapChange = useCallback(() => {
    if (!map || !map._container) return;
    try {
      const bounds = map.getBounds();
      if (bounds) {
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    } catch (e) {
      console.error('Error getting map bounds:', e);
    }
  }, [map, onBoundsChange]);

  React.useEffect(() => {
    if (!map || !map._container) return;

    map.on('moveend', handleMapChange);
    map.on('zoomend', handleMapChange);

    // Call once to initialize
    setTimeout(handleMapChange, 100);

    return () => {
      map.off('moveend', handleMapChange);
      map.off('zoomend', handleMapChange);
    };
  }, [map, handleMapChange]);

  return null;
}

export default function NearbyMap({ center, characters, onCharacterClick, onBoundsChange, mapRef, onOwnerClick }) {
   if (!center) return null;

   return (
      <div className="w-full h-[400px] rounded-2xl overflow-hidden shadow-lg relative" style={{ touchAction: 'pan-y pinch-zoom', zIndex: 0 }}>
        <MapContainer
         center={[center.lat, center.lng]}
         zoom={13}
         style={{ height: '100%', width: '100%' }}
         ref={mapRef}
         touchZoom={true}
         doubleClickZoom={true}
         scrollWheelZoom={true}
         dragging={true}
       >
         <TileLayer
           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
         />

         <MapEventHandler onBoundsChange={onBoundsChange} />

         {/* User marker */}
         <Marker position={[center.lat, center.lng]}>
           <Popup>You are here</Popup>
         </Marker>
        
        {/* Character markers */}
        {characters && characters.length > 0 && characters.map((char) => {
          if (!char.current_lat || !char.current_lng) return null;
          const distanceStar = getDistanceStar(char.total_distance_traveled || 0);
          const cityStar = getCityStar(char.unique_cities_visited || 0);

          return (
            <Marker
              key={char.id}
              position={[char.current_lat, char.current_lng]}
              icon={createEmojiIcon(char.avatar_emoji, char.avatar_url)}
              eventHandlers={{
                click: (e) => {
                  onCharacterClick?.(char);
                  e.target.openPopup();
                },
              }}
            >
              <Popup minWidth={200}>
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-2">
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="text-3xl">{char.avatar_emoji}</div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <div className="font-bold">{char.name}</div>
                        {distanceStar && (
                          <Star className={`w-3 h-3 ${distanceStar.color} fill-current`} />
                        )}
                        {cityStar && (
                          <Star className={`w-3 h-3 ${cityStar.color} fill-current`} />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        by <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onOwnerClick?.(char.owner_email);
                          }}
                          className="text-violet-600 hover:underline font-medium"
                        >
                          {char.owner_display_name || char.owner_name}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <RarityBadge rarity={char.rarity} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Navigation className="w-3 h-3" />
                    <span className="font-semibold">{Math.round(char.total_distance_traveled || 0).toLocaleString()} km</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}