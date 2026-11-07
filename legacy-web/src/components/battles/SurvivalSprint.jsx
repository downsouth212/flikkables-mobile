import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SurvivalSprint({ battle, onComplete }) {
  const [phase, setPhase] = useState('racing');
  const [yourReturns, setYourReturns] = useState(0);
  const [oppReturns, setOppReturns] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10); // 10 rounds
  const [winner, setWinner] = useState(null);

  const handleYourReturn = () => {
    const success = Math.random() > 0.3; // 70% success
    if (success) {
      setYourReturns(yourReturns + 1);
    }
    handleTick();
  };

  const handleTick = () => {
    const newTime = timeLeft - 1;
    setTimeLeft(newTime);
    
    // Simulate opponent return
    const oppSuccess = Math.random() > 0.3;
    if (oppSuccess) {
      setOppReturns(oppReturns + 1);
    }
    
    if (newTime <= 0) {
      const battleWinner = yourReturns > oppReturns ? 'initiator' : 'opponent';
      setWinner(battleWinner);
      setPhase('results');
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Survival Sprint</DialogTitle>
        </DialogHeader>

        {phase === 'racing' && (
          <div className="space-y-4">
            <Card className="p-4 bg-blue-50">
              <p className="text-center font-semibold">Time Left: {timeLeft}</p>
              <p className="text-center text-sm text-gray-600 mt-2">You: {yourReturns} returns | {battle.opponent_name}: {oppReturns}</p>
            </Card>
            <p className="text-sm text-gray-600">Return home as many times as possible! (Success: 70%)</p>
            <Button
              onClick={handleYourReturn}
              disabled={timeLeft <= 0}
              className="w-full bg-violet-500"
            >
              Return Home
            </Button>
          </div>
        )}

        {phase === 'results' && (
          <div className="space-y-4">
            <Card className="p-4">
              <p className="text-center font-semibold mb-2">Final Score</p>
              <p className="text-center">You: {yourReturns} returns | {battle.opponent_name}: {oppReturns}</p>
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