import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function AnimatedMapView({ start, end, progress }) {
  const map = useMap();
  
  useEffect(() => {
    if (!start || !end) return;
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;
    
    // Calculate appropriate zoom based on distance
    const latDiff = Math.abs(end.lat - start.lat);
    const lngDiff = Math.abs(end.lng - start.lng);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 5;
    if (maxDiff < 1) zoom = 10;
    else if (maxDiff < 5) zoom = 7;
    else if (maxDiff < 20) zoom = 5;
    else if (maxDiff < 50) zoom = 4;
    else zoom = 3;
    
    map.setView([lat, lng], zoom, { animate: true, duration: 0.3 });
  }, [progress, start, end, map]);
  
  return null;
}

function createCharacterIcon(character) {
  const emojiOnly = !character.avatar_url;
  return L.divIcon({
    html: emojiOnly ? 
      `<span style="font-size: 28px; line-height: 1; display: block;">${character.avatar_emoji}</span>` :
      `<div style="width: 24px; height: 24px; border-radius: 6px; overflow: hidden; box-shadow: 0 3px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <img src="${character.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />
      </div>`,
    className: 'character-flying-marker',
    iconSize: emojiOnly ? [32, 32] : [24, 24],
    iconAnchor: emojiOnly ? [16, 16] : [12, 12],
  });
}

export default function FlightAnimation({ 
  character, 
  startCoords, 
  endCoords, 
  endLocationName,
  onComplete 
}) {
  const [progress, setProgress] = useState(0);
  const [weeeLength, setWeeeLength] = useState(3);
  const audioRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Animate progress over 4 seconds
    const duration = 4000;
    const startTime = Date.now();
    let animationFrameId;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);
      
      // Grow the "weee" as it flies
      setWeeeLength(Math.floor(3 + newProgress * 15));
      
      if (newProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => onCompleteRef.current(), 1000);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  // Calculate great circle path for long distances
  const generatePathPoints = () => {
    const numPoints = 50;
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const lat = startCoords.lat + (endCoords.lat - startCoords.lat) * t;
      const lng = startCoords.lng + (endCoords.lng - startCoords.lng) * t;
      points.push([lat, lng]);
    }
    return points;
  };

  // Validate coordinates
  const isValidCoords = (coords) => coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' && !isNaN(coords.lat) && !isNaN(coords.lng);

  if (!startCoords || !endCoords || !isValidCoords(startCoords) || !isValidCoords(endCoords)) {
    return null;
  }

  const fullPath = generatePathPoints();
   // Smoothly interpolate position along path
   const exactIndex = progress * (fullPath.length - 1);
   const currentPointIndex = Math.floor(exactIndex);
   const nextPointIndex = Math.min(currentPointIndex + 1, fullPath.length - 1);
   const interpolationFactor = exactIndex - currentPointIndex;

   const currentPoint = fullPath[currentPointIndex];
   const nextPoint = fullPath[nextPointIndex];
   const currentLat = currentPoint[0] + (nextPoint[0] - currentPoint[0]) * interpolationFactor;
   const currentLng = currentPoint[1] + (nextPoint[1] - currentPoint[1]) * interpolationFactor;

   // Always show at least start-to-end line
   const visiblePath = progress === 0 ? [fullPath[0], fullPath[1]] : fullPath.slice(0, currentPointIndex + 2);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      {/* Map Background */}
      <div className="absolute inset-0 bg-sky-100">
        <MapContainer
          center={[startCoords.lat, startCoords.lng]}
          zoom={3}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          dragging={false}
          key={`map-${startCoords.lat}-${startCoords.lng}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
            opacity={0.95}
          />
          <AnimatedMapView start={startCoords} end={endCoords} progress={progress} />
          {fullPath.length > 1 && (
            <Polyline 
              positions={visiblePath}
              pathOptions={{ 
                color: '#3B82F6', 
                weight: 4, 
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}
          <Marker 
            key={`marker-${progress}`}
            position={[currentLat, currentLng]}
            icon={createCharacterIcon(character)}
          />
        </MapContainer>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300/40 via-transparent to-sky-100/40 pointer-events-none" />

      {/* Weeeee text */}
      <motion.div
        className="absolute top-1/4 left-1/2 -translate-x-1/2"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [-2, 2, -2]
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <p className="text-4xl md:text-6xl font-black text-white drop-shadow-lg tracking-wider">
          w{'e'.repeat(weeeLength)}!
        </p>
      </motion.div>

      {/* Flikkable name */}
      <div className="absolute top-8 left-0 right-0 text-center">
        <p className="text-white text-xl font-bold drop-shadow-lg">
          {character.name} is flying!
        </p>
      </div>

      <style>{`
        .character-flying-marker {
          background: transparent !important;
          border: none !important;
          animation: bounce 0.8s ease-in-out infinite;
          transform-origin: center center;
        }
        @keyframes bounce {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(0, -3px) rotate(-5deg); }
          75% { transform: translate(0, -1px) rotate(5deg); }
        }
      `}</style>

      {/* Progress & destination */}
      <div className="absolute bottom-20 left-0 right-0 px-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Traveling...</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {progress > 0.8 && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mt-3 text-gray-700"
              >
                Landing in <span className="font-bold text-violet-600">{endLocationName}</span>
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}