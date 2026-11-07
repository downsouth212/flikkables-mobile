import React from 'react';
import { Card } from '@/components/ui/card';
import { Trees } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GardenView({ characters, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        onClick={onClick}
        className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-100 h-[160px] cursor-pointer hover:shadow-lg transition-shadow"
      >
        {/* Garden Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute bottom-8 left-8 text-6xl">🌳</div>
          <div className="absolute bottom-12 right-12 text-5xl">🌲</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl opacity-50">⛲</div>
        </div>

        {/* Flowers */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute bottom-16 left-1/4 text-3xl">🌸</div>
          <div className="absolute bottom-20 right-1/4 text-3xl">🌺</div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <Trees className="w-16 h-16 text-emerald-600 mb-4" />
          <p className="text-2xl font-bold text-emerald-700 mb-2">{characters.length}</p>
          <p className="text-sm text-emerald-600 font-semibold">Relaxing in garden</p>
          <p className="text-xs text-gray-500 mt-2">Click to view</p>
        </div>

        {/* Counter badge */}
        <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          {characters.length}
        </div>
      </Card>
    </motion.div>
  );
}