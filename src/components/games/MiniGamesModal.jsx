import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Utensils, Sparkles, Puzzle } from 'lucide-react';
import FeedingGame from './FeedingGame';
import GroomingGame from './GroomingGame';
import PuzzleGame from './PuzzleGame';

export default function MiniGamesModal({ open, onOpenChange, character, onGameComplete }) {
  const [activeGame, setActiveGame] = useState(null);

  const games = [
    {
      id: 'feeding',
      name: 'Feeding Time',
      icon: Utensils,
      description: 'Catch falling treats!',
      component: FeedingGame,
      color: 'from-orange-400 to-red-400'
    },
    {
      id: 'grooming',
      name: 'Grooming',
      icon: Sparkles,
      description: 'Clean your Flikkable!',
      component: GroomingGame,
      color: 'from-blue-400 to-cyan-400'
    },
    {
      id: 'puzzle',
      name: 'Memory Match',
      icon: Puzzle,
      description: 'Match the pairs!',
      component: PuzzleGame,
      color: 'from-purple-400 to-pink-400'
    }
  ];

  const handleGameComplete = (success, happinessBoost) => {
    setActiveGame(null);
    onGameComplete?.(success, happinessBoost);
  };

  if (activeGame) {
    const GameComponent = activeGame.component;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <activeGame.icon className="w-5 h-5" />
              {activeGame.name}
            </DialogTitle>
          </DialogHeader>
          <GameComponent 
            character={character}
            onComplete={handleGameComplete}
            onCancel={() => setActiveGame(null)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Play with {character?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          <p className="text-sm text-gray-600">Choose a mini-game to boost happiness!</p>
          <div className="grid gap-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => setActiveGame(game)}
                className={`p-4 rounded-xl bg-gradient-to-r ${game.color} text-white hover:shadow-lg transition-all flex items-center gap-3 group`}
              >
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <game.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">{game.name}</h3>
                  <p className="text-sm opacity-90">{game.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}