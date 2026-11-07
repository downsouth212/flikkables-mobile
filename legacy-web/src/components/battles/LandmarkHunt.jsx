import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const landmarks = [
  { name: 'Eiffel Tower', emoji: '🗼', city: 'Paris' },
  { name: 'Big Ben', emoji: '⏰', city: 'London' },
  { name: 'Statue of Liberty', emoji: '🗽', city: 'New York' },
  { name: 'Colosseum', emoji: '🏛️', city: 'Rome' },
  { name: 'Mount Fuji', emoji: '🗻', city: 'Tokyo' },
  { name: 'Taj Mahal', emoji: '🕌', city: 'India' },
];

export default function LandmarkHunt({ battle, onComplete }) {
  const [phase, setPhase] = useState('hunting');
  const [yourCount, setYourCount] = useState(0);
  const [oppCount, setOppCount] = useState(0);
  const [visitedLandmarks, setVisitedLandmarks] = useState([]);

  const handleHunt = () => {
    const success = Math.random() > 0.4; // 60% success
    if (success) {
      setYourCount(yourCount + 1);
      const newLandmark = landmarks[Math.floor(Math.random() * landmarks.length)];
      setVisitedLandmarks([...visitedLandmarks, newLandmark.name]);
    }
    
    // Opponent hunt
    const oppSuccess = Math.random() > 0.4;
    if (oppSuccess) {
      setOppCount(oppCount + 1);
    }
    
    // Check win condition
    if (yourCount + 1 >= 3 || oppCount + 1 >= 3) {
      const winner = yourCount + 1 >= 3 ? 'initiator' : 'opponent';
      setTimeout(() => onComplete(winner === 'initiator'), 500);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Landmark Hunt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-blue-50">
            <p className="text-center font-semibold">First to 3 landmarks wins!</p>
            <p className="text-center text-sm text-gray-600 mt-2">You: {yourCount} | {battle.opponent_name}: {oppCount}</p>
          </Card>

          {visitedLandmarks.length > 0 && (
            <Card className="p-3 bg-gray-50">
              <p className="text-xs font-semibold mb-2">Your Landmarks:</p>
              <div className="text-sm space-y-1">
                {visitedLandmarks.map((lm, idx) => (
                  <p key={idx}>✓ {lm}</p>
                ))}
              </div>
            </Card>
          )}

          <p className="text-sm text-gray-600">Hunt for landmarks! (Success: 60%)</p>
          <Button
            onClick={handleHunt}
            className="w-full bg-violet-500"
          >
            Hunt for Landmark
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}