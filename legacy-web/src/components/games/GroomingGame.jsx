import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

const SPOTS_COUNT = 8;

export default function GroomingGame({ character, onComplete, onCancel }) {
  const [dirtySpots, setDirtySpots] = useState([]);
  const [cleanedCount, setCleanedCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    // Generate random dirty spots
    const spots = Array.from({ length: SPOTS_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 70 + 15,
      y: Math.random() * 70 + 15,
    }));
    setDirtySpots(spots);
  }, []);

  const cleanSpot = (spotId) => {
    setDirtySpots(prev => prev.filter(s => s.id !== spotId));
    setCleanedCount(prev => prev + 1);
  };

  useEffect(() => {
    if (cleanedCount === SPOTS_COUNT && !gameComplete) {
      setGameComplete(true);
      setTimeout(() => onComplete(true, 1), 1000); // +1 happiness for completing
    }
  }, [cleanedCount, gameComplete, onComplete]);

  const progress = (cleanedCount / SPOTS_COUNT) * 100;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">Clean the spots!</span>
          <span className="font-semibold">{cleanedCount}/{SPOTS_COUNT}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative h-80 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl overflow-hidden border-2 border-gray-200">
        {/* Character */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="text-9xl">
            {character?.avatar_url ? (
              <img src={character.avatar_url} alt={character.name} className="w-48 h-48 rounded-full" />
            ) : (
              character?.avatar_emoji
            )}
          </div>
        </div>

        {/* Dirty spots */}
        <AnimatePresence>
          {dirtySpots.map(spot => (
            <motion.button
              key={spot.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => cleanSpot(spot.id)}
              className="absolute w-10 h-10 rounded-full bg-amber-900/40 border-2 border-amber-800/60 cursor-pointer hover:bg-amber-900/60 transition-all"
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            >
              <span className="text-xl">💧</span>
            </motion.button>
          ))}
        </AnimatePresence>

        {gameComplete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
          >
            <div className="bg-white rounded-xl p-6 text-center">
              <p className="text-4xl mb-2">✨</p>
              <p className="font-bold text-lg">Sparkling Clean!</p>
              <p className="text-green-600 text-sm mt-2">+1 happiness</p>
            </div>
          </motion.div>
        )}
      </div>

      <Button variant="outline" onClick={onCancel} className="w-full">
        Quit
      </Button>
    </div>
  );
}