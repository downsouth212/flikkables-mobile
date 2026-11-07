import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const cities = ['Tokyo', 'London', 'Paris', 'New York', 'Sydney', 'Dubai', 'Singapore', 'Barcelona', 'Rome', 'Amsterdam'];

export default function LocationChain({ battle, onComplete }) {
  const [phase, setPhase] = useState('game');
  const [yourCount, setYourCount] = useState(0);
  const [oppCount, setOppCount] = useState(0);
  const [round, setRound] = useState(1);
  const [winner, setWinner] = useState(null);

  const handleYourTurn = () => {
    const success = Math.random() > 0.2; // 80% success
    if (success) {
      setYourCount(yourCount + 1);
    }
    setPhase('opponent_turn');
  };

  const handleOppTurn = () => {
    const success = Math.random() > 0.2;
    if (success) {
      setOppCount(oppCount + 1);
    }
    
    if (round >= 5) {
      const battleWinner = yourCount >= oppCount ? 'initiator' : 'opponent';
      setWinner(battleWinner);
      setPhase('results');
    } else {
      setRound(round + 1);
      setPhase('game');
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Location Chain</DialogTitle>
        </DialogHeader>

        {phase === 'game' && (
          <div className="space-y-4">
            <Card className="p-4 bg-blue-50">
              <p className="text-center font-semibold">Round {round}/5</p>
              <p className="text-center text-sm text-gray-600 mt-2">You: {yourCount} | {battle.opponent_name}: {oppCount}</p>
            </Card>
            <p className="text-sm text-gray-600">Your turn to reach a city! (Success: 80%)</p>
            <Button
              onClick={handleYourTurn}
              className="w-full bg-violet-500"
            >
              Your Turn
            </Button>
          </div>
        )}

        {phase === 'opponent_turn' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{battle.opponent_name}'s turn...</p>
            <Button
              onClick={handleOppTurn}
              className="w-full bg-violet-500"
            >
              {battle.opponent_name}'s Turn
            </Button>
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="text-center font-semibold mb-2">Final Score</p>
              <p className="text-center">You: {yourCount} | {battle.opponent_name}: {oppCount}</p>
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