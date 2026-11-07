import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { aiFlickDuel, getAIDelay } from './AIBattleLogic';

const majorCities = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
];

export default function FlickDuel({ battle, onComplete, user }) {
  const [phase, setPhase] = useState('select_target'); // select_target, initiator_flick, opponent_flick, results
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [initiatorResult, setInitiatorResult] = useState(null);
  const [opponentResult, setOpponentResult] = useState(null);
  const [winner, setWinner] = useState(null);

  const handleSelectTarget = (city) => {
    setSelectedTarget(city);
  };

  const handleInitiatorFlick = () => {
    // Simulate flick result - random success/failure
    const success = Math.random() > 0.3; // 70% success rate
    const distance = success ? Math.floor(Math.random() * 5000) + 100 : 0;
    setInitiatorResult({ success, distance });
    setPhase('opponent_flick');
  };

  const handleOpponentFlick = () => {
    const result = battle.is_ai 
      ? aiFlickDuel(battle.ai_difficulty, selectedTarget)
      : { success: Math.random() > 0.3, distance: Math.floor(Math.random() * 5000) + 100 };
    
    setOpponentResult(result);
    
    // Determine winner
    if (initiatorResult.success && !result.success) {
      setWinner('initiator');
    } else if (!initiatorResult.success && result.success) {
      setWinner('opponent');
    } else if (initiatorResult.success && result.success) {
      setWinner(initiatorResult.distance > result.distance ? 'initiator' : 'opponent');
    }
    
    setPhase('results');
  };

  // Auto-trigger AI opponent flick
  useEffect(() => {
    if (phase === 'opponent_flick' && battle.is_ai) {
      const delay = getAIDelay(battle.ai_difficulty) * 1000;
      const timer = setTimeout(handleOpponentFlick, delay);
      return () => clearTimeout(timer);
    }
  }, [phase, battle.is_ai]);

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Flick Duel</DialogTitle>
        </DialogHeader>

        {phase === 'select_target' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Select a destination for both to flick towards:</p>
            <div className="grid grid-cols-2 gap-2">
              {majorCities.map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleSelectTarget(city)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTarget?.name === city.name
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-gray-200 bg-white hover:border-violet-300'
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
            <Button
              onClick={handleInitiatorFlick}
              disabled={!selectedTarget}
              className="w-full bg-violet-500"
            >
              Your Turn: Flick!
            </Button>
          </div>
        )}

        {phase === 'opponent_flick' && (
          <div className="space-y-4">
            <p className="text-center font-semibold">Your Result: {initiatorResult.success ? `${initiatorResult.distance}km` : 'Missed'}</p>
            <p className="text-center text-gray-600">
              {battle.is_ai ? `${battle.opponent_name} is flicking...` : `Waiting for ${battle.opponent_name} to flick...`}
            </p>
            {!battle.is_ai && (
              <Button
                onClick={handleOpponentFlick}
                className="w-full bg-violet-500"
              >
                {battle.opponent_name}'s Flick
              </Button>
            )}
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="font-semibold mb-2">Results:</p>
              <div className="space-y-2 text-sm">
                <p>You: {initiatorResult.success ? `${initiatorResult.distance}km` : 'Missed'}</p>
                <p>{battle.opponent_name}: {opponentResult.success ? `${opponentResult.distance}km` : 'Missed'}</p>
              </div>
            </Card>
            <div className="bg-gradient-to-r from-violet-50 to-pink-50 p-4 rounded-lg">
              <p className="text-center font-bold text-lg">
                {winner === 'initiator' ? '🎉 You Won!' : '😢 You Lost'}
              </p>
            </div>
            <Button
              onClick={() => onComplete(winner === 'initiator')}
              className="w-full bg-gradient-to-r from-violet-500 to-pink-500"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}