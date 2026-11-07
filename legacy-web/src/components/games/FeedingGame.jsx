import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

const GAME_DURATION = 20000; // 20 seconds
const FOODS = ['🍎', '🍕', '🍔', '🍰', '🍪', '🥕'];

export default function FeedingGame({ character, onComplete, onCancel }) {
  const [score, setScore] = useState(0);
  const [fallingFoods, setFallingFoods] = useState([]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION / 1000);
  const [gameActive, setGameActive] = useState(true);

  useEffect(() => {
    if (!gameActive) return;

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Spawn food items
    const spawner = setInterval(() => {
      const newFood = {
        id: Date.now() + Math.random(),
        emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
        position: Math.random() * 80 + 10, // 10-90% of width
      };
      setFallingFoods(prev => [...prev, newFood]);
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(spawner);
    };
  }, [gameActive]);

  useEffect(() => {
    if (!gameActive && timeLeft === 0) {
      const success = score >= 5;
      const happinessBoost = success ? 1 : 0; // +1 happiness if successful
      setTimeout(() => onComplete(success, happinessBoost), 1000);
    }
  }, [gameActive, timeLeft, score, onComplete]);

  const catchFood = (foodId) => {
    setScore(prev => prev + 1);
    setFallingFoods(prev => prev.filter(f => f.id !== foodId));
  };

  const removeMissed = (foodId) => {
    setFallingFoods(prev => prev.filter(f => f.id !== foodId));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold">Score: {score}</span>
        <span className="font-semibold">Time: {timeLeft}s</span>
      </div>

      <div className="relative h-80 bg-gradient-to-b from-sky-100 to-green-100 rounded-xl overflow-hidden border-2 border-gray-200">
        {/* Character at bottom */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-4xl">
          {character?.avatar_url ? (
            <img src={character.avatar_url} alt={character.name} className="w-16 h-16 rounded-full" />
          ) : (
            character?.avatar_emoji
          )}
        </div>

        {/* Falling food items */}
        <AnimatePresence>
          {fallingFoods.map(food => (
            <motion.button
              key={food.id}
              initial={{ y: -40, x: `${food.position}%` }}
              animate={{ y: '100%' }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 4, ease: 'linear' }}
              onAnimationComplete={() => removeMissed(food.id)}
              onClick={() => catchFood(food.id)}
              className="absolute text-3xl hover:scale-125 transition-transform cursor-pointer"
              style={{ left: `${food.position}%` }}
            >
              {food.emoji}
            </motion.button>
          ))}
        </AnimatePresence>

        {!gameActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-bold text-lg">Game Over!</p>
              <p className="text-gray-600">Score: {score}</p>
              {score >= 5 ? (
                <p className="text-green-600 text-sm mt-2">Great job! +1 happiness</p>
              ) : (
                <p className="text-orange-600 text-sm mt-2">Try to catch more next time!</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Quit
        </Button>
      </div>
    </div>
  );
}