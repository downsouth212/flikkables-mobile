import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const majorCities = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
];

export default function TimedChallenge({ battle, onComplete }) {
  const [phase, setPhase] = useState('setup');
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedTime, setSelectedTime] = useState('30');
  const [winner, setWinner] = useState(null);

  const handleStart = () => {
    if (selectedCity && selectedTime) {
      setPhase('racing');
    }
  };

  const handleFinish = () => {
    const battleWinner = Math.random() > 0.5 ? 'initiator' : 'opponent';
    setWinner(battleWinner);
    setPhase('results');
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Timed Challenge</DialogTitle>
        </DialogHeader>

        {phase === 'setup' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Destination:</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a city" />
                </SelectTrigger>
                <SelectContent>
                  {majorCities.map((city) => (
                    <SelectItem key={city.name} value={city.name}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Time Limit:</label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStart}
              disabled={!selectedCity || !selectedTime}
              className="w-full bg-violet-500"
            >
              Start Race
            </Button>
          </div>
        )}

        {phase === 'racing' && (
          <div className="space-y-4">
            <p className="text-center text-gray-600">Race to {selectedCity} within {selectedTime} minutes!</p>
            <Card className="p-4 bg-blue-50">
              <p className="text-center font-semibold">Racing...</p>
              <p className="text-center text-sm text-gray-600 mt-2">⏱️ {selectedTime} min timer active</p>
            </Card>
            <Button
              onClick={handleFinish}
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