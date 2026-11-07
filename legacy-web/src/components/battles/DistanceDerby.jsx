import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { aiDistanceDerby, getAIDelay } from './AIBattleLogic';

export default function DistanceDerby({ battle, onComplete }) {
  const [phase, setPhase] = useState('select-character'); // select-character -> flick -> waiting -> results
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [yourDistance, setYourDistance] = useState(null);
  const [oppDistance, setOppDistance] = useState(null);
  const [isFlicking, setIsFlicking] = useState(false);

  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const user = await base44.auth.me();
        const chars = await base44.entities.Character.filter({ owner_email: user.email });
        setCharacters(chars);
      } catch (err) {
        console.error('Failed to load characters:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCharacters();
  }, []);

  const handleCharacterSelect = (char) => {
    setSelectedCharacter(char);
    setPhase('flick');
  };

  const handleFlick = async () => {
    setIsFlicking(true);
    const your = Math.floor(Math.random() * 10000) + 100;
    const opp = battle.is_ai 
      ? aiDistanceDerby(battle.ai_difficulty)
      : Math.floor(Math.random() * 10000) + 100;
    
    setYourDistance(your);
    setOppDistance(opp);
    
    // Simulate waiting for opponent
    const delay = battle.is_ai ? getAIDelay(battle.ai_difficulty) * 1000 : 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
    setPhase('results');
    setIsFlicking(false);
  };

  const winner = yourDistance > oppDistance ? 'initiator' : 'opponent';

  return (
    <Dialog open={true} onOpenChange={() => {}} disableOutsideClose={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Distance Derby</DialogTitle>
        </DialogHeader>

        {phase === 'select-character' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Select your character to flick</p>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {characters.map(char => (
                  <Card 
                    key={char.id}
                    onClick={() => handleCharacterSelect(char)}
                    className="p-3 cursor-pointer hover:bg-violet-50 transition"
                  >
                    <p className="font-medium text-sm">{char.name}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'flick' && selectedCharacter && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              You selected <span className="font-bold">{selectedCharacter.name}</span>. Ready to flick?
            </p>
            <p className="text-xs text-gray-500 text-center">Your flick distance will be compared to {battle.opponent_name}'s distance.</p>
            <Button
              onClick={handleFlick}
              disabled={isFlicking}
              className="w-full bg-violet-500"
            >
              {isFlicking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Flick Now!
            </Button>
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">Your distance: <span className="font-bold">{yourDistance}km</span></p>
              <p className="text-sm">{battle.opponent_name}'s: <span className="font-bold">{oppDistance}km</span></p>
            </div>
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