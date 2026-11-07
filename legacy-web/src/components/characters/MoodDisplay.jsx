import React from 'react';
import { Heart } from 'lucide-react';

export default function MoodDisplay({ happinessLevel = 5, size = 'md', showLabel = false }) {
  const sizes = {
    sm: { container: 'h-6', heart: 'w-3 h-3', text: 'text-xs' },
    md: { container: 'h-8', heart: 'w-5 h-5', text: 'text-sm' },
    lg: { container: 'h-10', heart: 'w-6 h-6', text: 'text-base' }
  };
  const s = sizes[size];

  return (
    <div className={`${s.container} flex items-center gap-2 bg-red-50 rounded-full px-3 border border-red-200`}>
      {showLabel && <span className={`${s.text} font-medium text-gray-700 whitespace-nowrap`}>Happiness</span>}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <Heart
            key={level}
            className={`${s.heart} ${
              level <= happinessLevel
                ? 'fill-red-500 text-red-500'
                : 'text-gray-300'
            } transition-colors`}
          />
        ))}
      </div>
    </div>
  );
}