import React, { useState, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

export default function FlickArea({ character, onFlick, disabled, userLocation }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const controls = useAnimation();
  const containerRef = useRef(null);
  const lastPosition = useRef({ x: 0, y: 0 });
  const lastTime = useRef(Date.now());

  const handleDragStart = (e) => {
    if (disabled) return;
    const point = e.touches ? e.touches[0] : e;
    setIsDragging(true);
    setDragStart({ x: point.clientX, y: point.clientY });
    lastPosition.current = { x: point.clientX, y: point.clientY };
    lastTime.current = Date.now();
  };

  const handleDrag = (e) => {
    if (!isDragging || disabled) return;
    const point = e.touches ? e.touches[0] : e;
    const now = Date.now();
    const dt = now - lastTime.current;
    
    if (dt > 0) {
      const vx = (point.clientX - lastPosition.current.x) / dt * 1000;
      const vy = (point.clientY - lastPosition.current.y) / dt * 1000;
      setVelocity({ x: vx, y: vy });
    }
    
    lastPosition.current = { x: point.clientX, y: point.clientY };
    lastTime.current = now;
  };

  const handleDragEnd = async () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);
    
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    
    if (speed > 300) {
      // Calculate direction and animate flying away
      const angle = Math.atan2(-velocity.y, velocity.x);
      const flyDistance = Math.min(speed * 2, 2000);
      
      await controls.start({
        x: Math.cos(angle) * flyDistance,
        y: -Math.sin(angle) * flyDistance,
        scale: 0,
        rotate: 720,
        transition: { duration: 0.8, ease: "easeOut" }
      });
      
      onFlick?.(speed, angle);
      
      // Reset position
      setTimeout(() => {
        controls.set({ x: 0, y: 0, scale: 1, rotate: 0 });
      }, 500);
    }
    
    setVelocity({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-96 rounded-3xl overflow-hidden"
      onMouseDown={handleDragStart}
      onMouseMove={handleDrag}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleDrag}
      onTouchEnd={handleDragEnd}
    >
      {/* Map Background */}
      {userLocation && (
        <MapContainer 
          center={[userLocation.lat, userLocation.lng]} 
          zoom={12} 
          style={{ width: '100%', height: '100%', zIndex: 0 }}
          dragging={false}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={L.divIcon({ className: 'home-marker', html: '🏠' })} />
        </MapContainer>
      )}

      {/* Fallback Background */}
      {!userLocation && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-pink-500/10 to-sky-500/10" />
      )}

      {/* Overlay to dim map */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-violet-300 animate-pulse" />
        <div className="absolute top-8 right-8 w-3 h-3 rounded-full bg-pink-300 animate-pulse delay-100" />
        <div className="absolute bottom-6 left-8 w-2 h-2 rounded-full bg-sky-300 animate-pulse delay-200" />
        <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-emerald-300 animate-pulse delay-300" />
      </div>
      
      {/* Direction indicator */}
      {isDragging && velocity.x !== 0 && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
        >
          <svg className="w-full h-full">
            <line
              x1="50%"
              y1="50%"
              x2={`${50 + velocity.x / 20}%`}
              y2={`${50 - velocity.y / 20}%`}
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#F472B6" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      )}
      
      {/* Character */}
      <motion.div
        animate={controls}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 ${disabled ? 'opacity-50' : ''}`}
        whileHover={!disabled ? { scale: 1.1 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
      >
        <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl shadow-violet-500/30 flex items-center justify-center text-5xl select-none overflow-hidden">
          {character.avatar_url ? (
            <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            character.avatar_emoji
          )}
        </div>
        <p className="text-center mt-2 font-medium text-gray-700">{character.name}</p>
      </motion.div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-500">
        {disabled ? 'Flikkable is not at home' : 'Flick to send on an adventure!'}
      </div>
    </div>
  );
}