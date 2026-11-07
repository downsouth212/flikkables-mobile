import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const randomLocation = () => {
  const lat = (Math.random() * 180) - 90;
  const lng = (Math.random() * 360) - 180;
  return { lat, lng };
};

export default function PickupRace({ battle, onComplete }) {
  const [phase, setPhase] = useState('location_revealed');
  const [location] = useState(randomLocation());
  const [winner, setWinner] = useState(null);

  const calculateDistance = (userLat, userLng) => {
    const R = 6371;
    const dLat = ((location.lat - userLat) * Math.PI) / 180;
    const dLng = ((location.lng - userLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) * Math.cos((location.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleResult = () => {
    // Simulate both players' distances
    const initiatorDist = Math.floor(Math.random() * 5000);
    const opponentDist = Math.floor(Math.random() * 5000);
    const battleWinner = initiatorDist < opponentDist ? 'initiator' : 'opponent';
    setWinner(battleWinner);
    setPhase('results');
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pickup Race</DialogTitle>
        </DialogHeader>

        {phase === 'location_revealed' && (
          <div className="space-y-4">
            <p className="text-center text-gray-600">A location has been revealed!</p>
            <Card className="p-4 bg-blue-50">
              <p className="text-center font-semibold">Coordinates:</p>
              <p className="text-center text-lg">{location.lat.toFixed(2)}°, {location.lng.toFixed(2)}°</p>
            </Card>
            <p className="text-sm text-gray-600">Both characters are placed here. Whoever gets closest wins!</p>
            <Button
              onClick={handleResult}
              className="w-full bg-violet-500"
            >
              Check Results
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