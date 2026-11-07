import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['🌟', '🎈', '🎨', '🎭', '🎪', '🎯', '🎲', '🎮'];
const GRID_SIZE = 4; // 4x4 grid = 16 cards (8 pairs)

export default function PuzzleGame({ character, onComplete, onCancel }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    // Create pairs and shuffle
    const pairs = EMOJIS.flatMap((emoji, i) => [
      { id: i * 2, emoji, pairId: i },
      { id: i * 2 + 1, emoji, pairId: i }
    ]);
    setCards(pairs.sort(() => Math.random() - 0.5));
  }, []);

  const handleCardClick = (cardId) => {
    if (flipped.length === 2 || flipped.includes(cardId) || matched.includes(cardId)) {
      return;
    }

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [first, second] = newFlipped;
      const firstCard = cards.find(c => c.id === first);
      const secondCard = cards.find(c => c.id === second);

      if (firstCard.pairId === secondCard.pairId) {
        // Match!
        setMatched(prev => [...prev, first, second]);
        setFlipped([]);
      } else {
        // No match
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0 && !gameComplete) {
      setGameComplete(true);
      const happinessBoost = 1; // +1 happiness
      setTimeout(() => onComplete(true, happinessBoost), 1000);
    }
  }, [matched, cards, gameComplete, moves, onComplete]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">Moves: {moves}</span>
        <span className="font-semibold">Pairs: {matched.length / 2}/{GRID_SIZE * 2}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-gray-200">
        {cards.map(card => {
          const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
          return (
            <motion.button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className="aspect-square rounded-lg relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="w-full h-full rounded-lg flex items-center justify-center text-2xl font-bold"
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div 
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400"
                  style={{ backfaceVisibility: 'hidden' }}
                />
                <div 
                  className="absolute inset-0 rounded-lg bg-white border-2 border-purple-200 flex items-center justify-center"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  {card.emoji}
                </div>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {gameComplete && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 text-center"
        >
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-bold">Puzzle Complete!</p>
          <p className="text-sm opacity-90">Finished in {moves} moves</p>
          <p className="text-sm mt-1">+1 happiness</p>
        </motion.div>
      )}

      <Button variant="outline" onClick={onCancel} className="w-full">
        Quit
      </Button>
    </div>
  );
}