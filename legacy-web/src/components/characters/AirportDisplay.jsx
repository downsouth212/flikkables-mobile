import React from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AirportDisplay({ characters, onCharacterClick }) {
  const getRarityBorder = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'ring-4 ring-amber-400';
      case 'epic': return 'ring-4 ring-purple-400';
      case 'rare': return 'ring-4 ring-blue-400';
      case 'uncommon': return 'ring-4 ring-green-400';
      default: return 'ring-2 ring-gray-300';
    }
  };

  if (characters.length === 0) {
    return (
      <div className="relative h-96 rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 overflow-hidden border border-blue-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Plane className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Send Flikkables here from the Garden</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[500px] rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 overflow-hidden border border-blue-100 shadow-lg p-6">
      {/* Airport Background */}
      <div className="absolute inset-0 opacity-10">
        {/* Runway lines */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-blue-400" style={{ transform: 'translateY(-50%)' }} />
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-300" style={{ transform: 'translateY(-30px)' }} />
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-300" style={{ transform: 'translateY(30px)' }} />
      </div>

      {/* Planes decoration */}
      <div className="absolute top-8 right-8 text-6xl opacity-20">✈️</div>
      <div className="absolute bottom-8 left-8 text-4xl opacity-20">🛫</div>

      {/* Grid of characters */}
      <div className="relative z-10 grid grid-cols-3 gap-4">
        {characters.map((char, index) => (
          <motion.div
            key={char.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05, y: -5 }}
            onClick={() => onCharacterClick(char)}
            className="cursor-pointer"
          >
            <div className="relative">
              {/* Character card */}
              <div className={cn(
                "relative rounded-2xl overflow-hidden bg-white shadow-lg transition-all",
                getRarityBorder(char.rarity)
              )}>
                <div className="aspect-square">
                  {char.avatar_url ? (
                    <img 
                      src={char.avatar_url} 
                      alt={char.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                      <span className="text-5xl">{char.avatar_emoji}</span>
                    </div>
                  )}
                </div>
                
                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white text-xs font-semibold truncate">{char.name}</p>
                </div>
              </div>

              {/* Ready indicator */}
              <motion.div
                className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Plane className="w-3 h-3" />
                Ready
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-700">
            {characters.length} ready for flikking
          </p>
        </div>
      </div>
    </div>
  );
}