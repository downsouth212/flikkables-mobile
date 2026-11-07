import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Sparkles } from 'lucide-react';

export const rarityConfig = {
  common: { 
    label: 'Common', 
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    multiplier: 1,
    chance: 0.50
  },
  uncommon: { 
    label: 'Uncommon', 
    color: 'bg-green-100 text-green-700 border-green-200',
    multiplier: 1.5,
    chance: 0.30
  },
  rare: { 
    label: 'Rare', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    multiplier: 2,
    chance: 0.13
  },
  epic: { 
    label: 'Epic', 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    multiplier: 3,
    chance: 0.05
  },
  legendary: { 
    label: 'Legendary', 
    color: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-300',
    multiplier: 5,
    chance: 0.02
  }
};

export function getRandomRarity() {
  const roll = Math.random();
  let cumulative = 0;
  for (const [rarity, config] of Object.entries(rarityConfig)) {
    cumulative += config.chance;
    if (roll < cumulative) return rarity;
  }
  return 'common';
}

export default function RarityBadge({ rarity, showMultiplier = false }) {
  const config = rarityConfig[rarity] || rarityConfig.common;
  
  return (
    <Badge variant="outline" className={`${config.color} border text-xs`}>
      {rarity === 'legendary' && <Sparkles className="w-3 h-3 mr-1" />}
      {config.label}
      {showMultiplier && <span className="ml-1 opacity-70">×{config.multiplier}</span>}
    </Badge>
  );
}