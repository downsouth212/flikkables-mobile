import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function AirportLounge({ characters, onCharacterClick, user }) {
  // Fetch placed airport items
  const { data: placedItems = [] } = useQuery({
    queryKey: ['user-airport-items-placed', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const items = await base44.entities.UserAirportItem.filter({ 
        user_email: user.email,
        is_placed: true 
      });
      return items;
    },
    enabled: !!user?.email,
  });

  const getRarityBorder = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'border-2 border-amber-400';
      case 'epic': return 'border-2 border-purple-400';
      case 'rare': return 'border-2 border-blue-400';
      case 'uncommon': return 'border-2 border-green-400';
      default: return 'border border-gray-300';
    }
  };

  if (characters.length === 0) {
    return (
      <div className="relative h-96 rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 overflow-hidden border border-blue-100">
        {/* Placed Airport Items */}
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
            <p className="text-4xl mb-4">✈️</p>
            <p className="text-gray-500 text-sm">Move Flikkables here from the Garden</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate bench positions (3 rows of benches)
  const benchPositions = [
    // Row 1
    { x: 20, y: 25 },
    { x: 40, y: 25 },
    { x: 60, y: 25 },
    { x: 80, y: 25 },
    // Row 2
    { x: 20, y: 50 },
    { x: 40, y: 50 },
    { x: 60, y: 50 },
    { x: 80, y: 50 },
    // Row 3
    { x: 20, y: 75 },
    { x: 40, y: 75 },
    { x: 60, y: 75 },
    { x: 80, y: 75 },
  ];

  return (
    <div className="relative h-[500px] rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 overflow-hidden border border-blue-100 shadow-lg">
      {/* Airport Background Elements */}
      <div className="absolute inset-0 opacity-40">
        {/* Airport Decorations */}
        <div className="absolute top-8 left-8 text-4xl">✈️</div>
        <div className="absolute top-8 right-8 text-4xl">🛫</div>
        <div className="absolute bottom-8 left-12 text-3xl">🛬</div>
        <div className="absolute bottom-8 right-12 text-3xl">🌍</div>
        
        {/* Departure Board */}
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-2xl">🗓️</div>
        
        {/* Information Signs */}
        <div className="absolute top-20 left-16 text-xl">ℹ️</div>
        <div className="absolute top-20 right-16 text-xl">🚻</div>
        
        {/* Luggage */}
        <div className="absolute bottom-16 left-1/4 text-xl">🧳</div>
        <div className="absolute bottom-20 right-1/4 text-xl">🎒</div>
      </div>

      {/* Runway Lines */}
      <div className="absolute inset-0 flex flex-col justify-center gap-6 px-4 opacity-20">
        <div className="h-0.5 bg-blue-300 w-full"></div>
        <div className="h-0.5 bg-blue-300 w-full"></div>
        <div className="h-0.5 bg-blue-300 w-full"></div>
      </div>

      {/* Placed Airport Items */}
      <AnimatePresence>
        {placedItems.map(item => (
          <motion.div
            key={`item-${item.id}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute pointer-events-none z-10"
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

      {/* Characters on Benches */}
      <AnimatePresence>
        {characters.map((char, index) => {
          const benchPos = benchPositions[index % benchPositions.length];
          if (!benchPos) return null;

          return (
            <motion.div
              key={char.id}
              className="absolute cursor-pointer group z-20"
              initial={{ 
                left: `${benchPos.x}%`, 
                top: `${benchPos.y}%`,
                scale: 0,
                opacity: 0 
              }}
              animate={{ 
                scale: 1,
                opacity: 1,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                duration: 0.3,
                delay: index * 0.05
              }}
              onClick={() => onCharacterClick(char)}
              style={{ transform: 'translate(-50%, -50%)' }}
            >
              {/* Bench */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-3xl opacity-60 pointer-events-none">
                🪑
              </div>

              {/* Character sitting on bench */}
              <motion.div
                className={cn(
                  "relative w-12 h-12 rounded-xl overflow-hidden transition-all duration-300 mb-6",
                  getRarityBorder(char.rarity),
                  "group-hover:ring-2 group-hover:ring-blue-400 bg-white"
                )}
                whileHover={{ scale: 1.15, y: -5 }}
              >
                {char.avatar_url ? (
                  <img 
                    src={char.avatar_url} 
                    alt={char.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <span className="text-2xl">{char.avatar_emoji}</span>
                  </div>
                )}
                
                {/* Ready indicator */}
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>

              {/* Name label on hover */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                whileHover={{ opacity: 1, y: 0 }}
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
              >
                <div className="bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-900">{char.name}</p>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Collection Counter */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700">
            {characters.length} Flikkable{characters.length !== 1 ? 's' : ''} ready for departure
          </p>
        </div>
      </div>
    </div>
  );
}