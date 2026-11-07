import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BATTLES } from './BattleConfig';
import { motion } from 'framer-motion';

export default function BattleSelector({ open, onClose, friend, onSelectBattle, user, allowAI = false }) {
  const [selectedBattle, setSelectedBattle] = useState(null);
  const [wager, setWager] = useState('0');
  const [isAI, setIsAI] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState('medium');

  const { data: enabledBattles = {} } = useQuery({
    queryKey: ['enabled-battles'],
    queryFn: async () => {
      const settings = await base44.entities.Settings.filter({ setting_key: 'enabled_battles' });
      if (settings.length > 0) {
        try {
          return JSON.parse(settings[0].setting_value);
        } catch {
          return {};
        }
      }
      // Default: all enabled
      return Object.keys(BATTLES).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    },
  });

  const availableBattles = Object.entries(BATTLES).filter(([key]) => enabledBattles[key] !== false);

  const handleSelect = (battleType) => {
    setSelectedBattle(battleType);
  };

  const handleConfirm = () => {
    if (selectedBattle) {
      const wagerAmount = parseInt(wager) || 0;
      if (wagerAmount > (user?.passport_stamps || 0)) {
        alert(`You don't have enough stamps! You have ${user?.passport_stamps || 0} stamps.`);
        return;
      }
      onSelectBattle(selectedBattle, wagerAmount, isAI ? aiDifficulty : null);
      setSelectedBattle(null);
      setWager('0');
      setIsAI(false);
      setAiDifficulty('medium');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {allowAI ? 'Choose Battle Mode' : `Challenge ${friend?.display_name} to Battle`}
          </DialogTitle>
        </DialogHeader>

        {allowAI && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={!isAI ? "default" : "outline"}
              onClick={() => setIsAI(false)}
              className="flex-1"
            >
              vs {friend?.display_name}
            </Button>
            <Button
              variant={isAI ? "default" : "outline"}
              onClick={() => setIsAI(true)}
              className="flex-1"
            >
              🤖 vs AI
            </Button>
          </div>
        )}

        {isAI && (
          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              AI Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={aiDifficulty === 'easy' ? "default" : "outline"}
                onClick={() => setAiDifficulty('easy')}
                className="text-sm"
              >
                Easy
              </Button>
              <Button
                variant={aiDifficulty === 'medium' ? "default" : "outline"}
                onClick={() => setAiDifficulty('medium')}
                className="text-sm"
              >
                Medium
              </Button>
              <Button
                variant={aiDifficulty === 'hard' ? "default" : "outline"}
                onClick={() => setAiDifficulty('hard')}
                className="text-sm"
              >
                Hard
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {aiDifficulty === 'easy' && '50% win rate, slower reactions'}
              {aiDifficulty === 'medium' && '65% win rate, normal speed'}
              {aiDifficulty === 'hard' && '80% win rate, fast reactions'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          {availableBattles.map(([key, battle]) => (
            <motion.button
              key={key}
              onClick={() => handleSelect(key)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedBattle === key
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 bg-white hover:border-violet-300'
              }`}
            >
              <div className="text-3xl mb-2">{battle.icon}</div>
              <p className="font-semibold text-sm text-gray-900">{battle.name}</p>
              <p className="text-xs text-gray-600 mt-1">{battle.description}</p>
              <p className="text-xs font-medium text-violet-600 mt-2">💰 10 stamps per battle</p>
            </motion.button>
          ))}
        </div>

        {availableBattles.length === 0 && (
          <p className="text-center text-gray-500 py-8">No battles available</p>
        )}

        {selectedBattle && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Wager Stamps
            </label>
            <input
              type="number"
              min="0"
              max={user?.passport_stamps || 0}
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="0"
            />
            <p className="text-xs text-gray-600 mt-2">
              You have {user?.passport_stamps || 0} stamps available. Winner takes all!
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBattle}
            className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
          >
            Challenge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}