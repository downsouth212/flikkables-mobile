import React, { useState } from 'react';
import { X, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HostRaceModal({ open, onClose, character, onHost, userStamps = 0 }) {
  const [minutes, setMinutes] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxParticipants, setMaxParticipants] = useState(0);

  const handleHost = () => {
    if (minutes < 1 || minutes > 1440) {
      alert('Start time must be between 1 and 1440 minutes');
      return;
    }
    if (durationMinutes < 1 || durationMinutes > 1440) {
      alert('Duration must be between 1 and 1440 minutes');
      return;
    }
    onHost({ minutes, durationMinutes, maxParticipants });
    setMinutes(5);
    setDurationMinutes(60);
    setMaxParticipants(0);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-[90vw]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">🏁 Host a Race</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Race to pick up <span className="font-semibold">{character?.name}</span>. Winner gets double stamps!
        </p>

        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700">
            <p className="font-semibold">5 stamps to host</p>
            <p>You'll be charged when participants join</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Race starts in (minutes)
            </label>
            <Input
              type="number"
              min="1"
              max="1440"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">1 minute - 24 hours</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Race duration (minutes)
            </label>
            <Input
              type="number"
              min="1"
              max="1440"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">How long until race ends (1-1440 min)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Max participants
            </label>
            <Input
              type="number"
              min="2"
              value={maxParticipants === 0 ? '' : maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 0)}
              placeholder="Leave empty for unlimited"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">2+ or leave empty for unlimited</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button 
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleHost}
            disabled={userStamps < 5}
            className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {userStamps < 5 ? `Not enough stamps (need 5)` : 'Host Race'}
          </Button>
        </div>
      </div>
    </div>
  );
}