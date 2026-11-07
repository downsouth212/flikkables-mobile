import React, { useState, useEffect } from 'react';
import { X, Clock, Users, Zap, AlertCircle, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RaceDisplay({ open, onClose, race, onJoinRace, onPickUp, user, isJoining, isPicking, userStamps = 0, character }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [raceActive, setRaceActive] = useState(false);
  const [participantNames, setParticipantNames] = useState({});

  useEffect(() => {
    if (!open || !race) return;

    // Fetch participant display names
    const fetchParticipantNames = async () => {
      const participants = race.participants ? JSON.parse(race.participants) : [];
      const names = {};
      for (const email of participants) {
        try {
          const users = await base44.entities.User.filter({ email });
          if (users[0]) {
            names[email] = users[0].display_name || users[0].full_name || email;
          }
        } catch (err) {
          names[email] = email;
        }
      }
      setParticipantNames(names);
    };
    fetchParticipantNames();

    const updateTimer = () => {
      const now = new Date();
      const startTime = new Date(race.start_time);
      const finishTime = race.finish_time ? new Date(race.finish_time) : null;
      const startDiff = startTime - now;
      const finishDiff = finishTime ? finishTime - now : null;

      // Check if race has expired
      if (finishTime && finishDiff <= 0 && race.status !== 'completed') {
        setRaceActive(false);
        setTimeRemaining({ expired: true });
        return;
      }

      if (startDiff <= 0) {
        setRaceActive(true);
        if (finishTime) {
          const minutes = Math.floor(finishDiff / 60000);
          const seconds = Math.floor((finishDiff % 60000) / 1000);
          setTimeRemaining({ minutes, seconds, remaining: true });
        } else {
          setTimeRemaining(null);
        }
      } else {
        setRaceActive(false);
        const minutes = Math.floor(startDiff / 60000);
        const seconds = Math.floor((startDiff % 60000) / 1000);
        setTimeRemaining({ minutes, seconds, remaining: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [race, open]);

  if (!open || !race) return null;

  const participants = race.participants ? JSON.parse(race.participants) : [];
  const isParticipant = participants.includes(user?.email);
  const isHost = race.host_email === user?.email;
  const isFull = race.max_participants > 0 && participants.length >= race.max_participants;
  const isWinner = race.winner_email === user?.email;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-[90vw] max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">🏁 {race.character_name} Race</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status */}
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-violet-50 to-pink-50 border border-violet-200">
          {timeRemaining?.expired ? (
            <div>
              <p className="text-sm font-semibold text-gray-900">⏱️ Race Expired</p>
              <p className="text-xs text-gray-600 mt-1">Time limit reached with no winner</p>
            </div>
          ) : race.status === 'completed' ? (
            <div>
              <p className="text-sm font-semibold text-gray-900">🎉 Race Completed!</p>
              <p className="text-xs text-gray-600 mt-1">Winner: <span className="font-medium">{race.winner_name}</span></p>
            </div>
          ) : raceActive ? (
            <div>
              <p className="text-sm font-semibold text-red-600">⚡ Race is LIVE!</p>
              {timeRemaining?.remaining && (
                <p className="text-xs text-gray-600 mt-1">
                  Ends in: {timeRemaining.minutes}m {timeRemaining.seconds}s
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-600">Starts in:</p>
              <p className="text-lg font-bold text-violet-600 mt-1">
                {timeRemaining?.minutes}m {timeRemaining?.seconds}s
              </p>
            </div>
          )}
        </div>

        {/* Host Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">Hosted by</p>
          <p className="text-sm font-semibold text-gray-900">{race.host_name}</p>
        </div>

        {/* Participants */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-600" />
            <p className="text-sm font-semibold text-gray-900">
              Participants ({participants.length}{race.max_participants > 0 ? `/${race.max_participants}` : ''})
            </p>
          </div>
          <div className="space-y-1 bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
            {participants.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No participants yet</p>
            ) : (
              participants.map((email, idx) => (
                <p key={idx} className="text-xs text-gray-700">
                  {email === user?.email ? '👤 You' : (participantNames[email] || email)}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {race.status === 'completed' || timeRemaining?.expired ? (
            <p className="text-xs text-center text-gray-500 py-2">This race has ended</p>
          ) : (
            <>
              {raceActive && !isWinner && (
                <Button
                  onClick={onPickUp}
                  disabled={isPicking}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  {isPicking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  {isPicking ? 'Picking up...' : 'Pick Up Now!'}
                </Button>
              )}
              {isWinner && (
                <div className="w-full p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                  <p className="text-sm font-bold text-emerald-700">🏆 You won! All stamps are yours!</p>
                </div>
              )}
              {!isParticipant && !isWinner && race.status !== 'completed' && !isFull && (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      <p className="font-semibold">⚠️ Winner takes all!</p>
                      <p>5 stamps to join - only winner gets all stamps back</p>
                    </div>
                  </div>
                  <Button
                    onClick={onJoinRace}
                    disabled={isJoining || userStamps < 5}
                    variant="outline"
                    className="w-full"
                  >
                    {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {userStamps < 5 ? `Not enough stamps (need 5)` : isJoining ? 'Joining...' : 'Join Race'}
                  </Button>
                </>
              )}
              {isFull && !isParticipant && (
                <div className="w-full p-3 bg-gray-100 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Race is full</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Get Directions */}
        {character?.current_lat && character?.current_lng && (
          <Button 
            onClick={() => {
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${character.current_lat},${character.current_lng}`;
              window.open(mapsUrl, '_blank');
            }}
            variant="outline"
            className="w-full mt-2"
          >
            <Compass className="w-4 h-4 mr-2" />
            Get Directions
          </Button>
        )}

        <Button 
          onClick={onClose}
          variant="outline"
          className="w-full mt-2"
        >
          Close
        </Button>
      </div>
    </div>
  );
}