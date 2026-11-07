import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MoodDisplay from './MoodDisplay';

export default function GardenDisplay({ characters, onCharacterClick, user }) {
  const [floatingPositions, setFloatingPositions] = useState({});
  
  // Fetch placed garden items
  const { data: placedItems = [] } = useQuery({
    queryKey: ['user-garden-items-placed', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const items = await base44.entities.UserGardenItem.filter({ 
        user_email: user.email,
        is_placed: true 
      });
      return items;
    },
    enabled: !!user?.email,
  });

  // Initialize random positions and movement patterns for each character
  useEffect(() => {
    const initialPositions = {};
    characters.forEach((char) => {
      initialPositions[char.id] = {
        x: Math.random() * 80 + 10, // 10-90% of width
        y: Math.random() * 70 + 15, // 15-85% of height
        targetX: Math.random() * 80 + 10,
        targetY: Math.random() * 70 + 15,
        rotation: Math.random() * 360,
      };
    });
    setFloatingPositions(initialPositions);

    // Update target positions every 6-10 seconds
    const interval = setInterval(() => {
      setFloatingPositions(prev => {
        const updated = { ...prev };
        characters.forEach(char => {
          if (updated[char.id]) {
            updated[char.id] = {
              ...updated[char.id],
              targetX: Math.random() * 80 + 10,
              targetY: Math.random() * 70 + 15,
              rotation: Math.random() * 360,
            };
          }
        });
        return updated;
      });
    }, Math.random() * 4000 + 6000); // 6-10 seconds

    return () => clearInterval(interval);
  }, [characters.length]);

  const getRarityGlow = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'shadow-[0_0_20px_rgba(251,191,36,0.6)]';
      case 'epic': return 'shadow-[0_0_15px_rgba(168,85,247,0.5)]';
      case 'rare': return 'shadow-[0_0_12px_rgba(59,130,246,0.4)]';
      case 'uncommon': return 'shadow-[0_0_8px_rgba(34,197,94,0.3)]';
      default: return 'shadow-[0_0_5px_rgba(255,255,255,0.3)]';
    }
  };

  const getStatusIndicator = (character) => {
    if (character.status === 'landed') {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <MapPin className="w-3 h-3 text-white" />
        </motion.div>
      );
    }
    if (character.status === 'traveling') {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <Navigation className="w-3 h-3 text-white" />
        </motion.div>
      );
    }
    return null;
  };

  // Component to display mood on character avatar
  const CharacterMoodBadge = ({ characterId }) => {
    const { data: mood } = useQuery({
      queryKey: ['mood', characterId],
      queryFn: async () => {
        const moods = await base44.entities.CharacterMood.filter(
          { character_id: characterId },
          '-created_date',
          1
        );
        return moods[0] || null;
      },
    });

    if (!mood) return null;

    return (
      <>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-0 left-0"
        >
          <span className="text-xs">❤️</span>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-0 right-0"
        >
          <span className="text-xs font-bold text-red-600 bg-white/80 rounded-full w-4 h-4 flex items-center justify-center">{mood.happiness_level}</span>
        </motion.div>
      </>
    );
  };

  // Component to display character name and mood on hover
  const CharacterLabel = ({ character }) => {
    const { data: mood } = useQuery({
      queryKey: ['mood', character.id],
      queryFn: async () => {
        const moods = await base44.entities.CharacterMood.filter(
          { character_id: character.id },
          '-created_date',
          1
        );
        return moods[0] || null;
      },
    });

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        whileHover={{ opacity: 1, y: 0 }}
        className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 whitespace-nowrap flex flex-col items-center gap-1"
      >
        <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-900">{character.name}</p>
        </div>
        {mood && (
          <MoodDisplay happinessLevel={mood.happiness_level} size="sm" />
        )}
      </motion.div>
    );
  };

  if (characters.length === 0) {
    return (
      <div className="relative h-96 rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden border border-green-100">
        {/* Placed Garden Items */}
        <AnimatePresence>
          {placedItems.map(item => (
            <motion.div
              key={item.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute pointer-events-none"
              style={{ 
                left: `${item.position_x}%`, 
                top: `${item.position_y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <span className="text-2xl">{item.decoration_emoji}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-4xl mb-4">🌳</p>
            <p className="text-gray-500 text-sm">Move Flikkables here from the Airport</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[500px] rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden border border-green-100 shadow-lg">
      {/* Garden Background Elements */}
      <div className="absolute inset-0 opacity-60">
        {/* Trees */}
        <div className="absolute bottom-8 left-8 text-4xl">🌳</div>
        <div className="absolute bottom-12 right-12 text-3xl">🌲</div>
        <div className="absolute top-16 left-16 text-3xl">🌴</div>
        
        {/* Flowers */}
        <div className="absolute bottom-16 left-1/4 text-2xl">🌸</div>
        <div className="absolute bottom-20 right-1/4 text-2xl">🌺</div>
        <div className="absolute top-20 right-1/3 text-xl">🌻</div>
        
        {/* Fountain */}
        <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 text-3xl">⛲</div>
        
        {/* Benches */}
        <div className="absolute bottom-1/4 left-1/4 text-xl opacity-60">🪑</div>
        <div className="absolute top-1/3 right-1/4 text-xl opacity-60">🪑</div>
      </div>

      {/* Placed Garden Items */}
      <AnimatePresence>
        {placedItems.map(item => (
          <motion.div
            key={`item-${item.id}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute pointer-events-none"
            style={{ 
              left: `${item.position_x}%`, 
              top: `${item.position_y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="text-2xl">{item.decoration_emoji}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Floating Characters */}
      <AnimatePresence>
        {characters.map((char) => {
          const position = floatingPositions[char.id];
          if (!position) return null;

          return (
            <motion.div
              key={char.id}
              className="absolute cursor-pointer group"
              initial={{ 
                left: `${position.x}%`, 
                top: `${position.y}%`,
                scale: 0,
                opacity: 0 
              }}
              animate={{ 
               left: `${position.targetX}%`, 
               top: `${position.targetY}%`,
               scale: 1,
               opacity: 1,
               rotate: [0, 5, -5, 0],
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
               duration: 6,
               ease: "easeInOut",
               rotate: {
                 duration: 4,
                 repeat: Infinity,
                 ease: "easeInOut"
               }
              }}
              onClick={() => onCharacterClick(char)}
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              {/* Shadow */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black/10 rounded-full blur-sm" />
              
              {/* Character Container */}
              <motion.div
                className={cn(
                  "relative w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300",
                  getRarityGlow(char.rarity),
                  "group-hover:ring-2 group-hover:ring-violet-300"
                )}
                whileHover={{ scale: 1.1, y: -5 }}
              >
                {char.avatar_url ? (
                  <img 
                    src={char.avatar_url} 
                    alt={char.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                    <span className="text-3xl">{char.avatar_emoji}</span>
                  </div>
                )}
                
                {/* Mood Indicator */}
                <CharacterMoodBadge characterId={char.id} />

                {/* Status Indicator */}
                {getStatusIndicator(char)}

                {/* Traveling Trail Effect */}
                {char.status === 'traveling' && (
                  <motion.div
                    className="absolute inset-0 border-2 border-dashed border-violet-400 rounded-2xl"
                    animate={{
                      opacity: [0.3, 0.7, 0.3],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </motion.div>

              {/* Name and Mood Label on Hover */}
              <CharacterLabel character={char} />
              
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Collection Counter */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700">
            {characters.length} Flikkable{characters.length !== 1 ? 's' : ''} relaxing
          </p>
        </div>
      </div>
    </div>
  );
}