import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { aiHeadToHead } from './AIBattleLogic';

const rarityMultipliers = { common: 1, uncommon: 1.1, rare: 1.2, epic: 1.4, legendary: 1.5 };

export default function HeadToHead({ battle, character, opponentCharacter, onComplete }) {
  const [phase, setPhase] = useState('flick');
  const [winner, setWinner] = useState(null);

  const handleFlick = () => {
    // Base distance with rarity multiplier
    const yourMult = rarityMultipliers[character?.rarity] || 1;
    const yourDist = Math.floor(Math.random() * 5000) * yourMult;
    
    const oppDist = battle.is_ai
      ? aiHeadToHead(battle.ai_difficulty, opponentCharacter)
      : Math.floor(Math.random() * 5000) * (rarityMultipliers[opponentCharacter?.rarity] || 1);
    
    const battleWinner = yourDist > oppDist ? 'initiator' : 'opponent';
    setWinner(battleWinner);
    setPhase('results');
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Head-to-Head Journey</DialogTitle>
        </DialogHeader>

        {phase === 'flick' && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="font-semibold mb-3">Character Bonuses:</p>
              <div className="space-y-2 text-sm">
                <p>Your {character?.rarity}: +{Math.round((rarityMultipliers[character?.rarity] - 1) * 100)}% distance</p>
                <p>{opponentCharacter?.name} {opponentCharacter?.rarity}: +{Math.round((rarityMultipliers[opponentCharacter?.rarity] - 1) * 100)}% distance</p>
              </div>
            </Card>
            <p className="text-sm text-gray-600">Rarity determines distance bonus. Flick to compete!</p>
            <Button
              onClick={handleFlick}
              className="w-full bg-violet-500"
            >
              Flick!
            </Button>
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-4">
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