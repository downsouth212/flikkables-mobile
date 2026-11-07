import React from 'react';
import { Card } from '@/components/ui/card';
import { Plane } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AirportView({ characters, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        onClick={onClick}
        className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border border-blue-100 h-[160px] cursor-pointer hover:shadow-lg transition-shadow"
      >
        {/* Airport Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-6xl">✈️</div>
          <div className="absolute bottom-4 right-4 text-6xl">🛫</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl opacity-50">🛬</div>
        </div>

        {/* Runway lines */}
        <div className="absolute inset-0 flex flex-col justify-center gap-3 px-4">
          <div className="h-0.5 bg-white/40 w-full" style={{ marginLeft: '20%' }}></div>
          <div className="h-0.5 bg-white/40 w-full" style={{ marginLeft: '40%' }}></div>
          <div className="h-0.5 bg-white/40 w-full" style={{ marginLeft: '10%' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <Plane className="w-16 h-16 text-blue-500 mb-4" />
          <p className="text-2xl font-bold text-blue-700 mb-2">{characters.length}</p>
          <p className="text-sm text-blue-600 font-semibold">Ready for flikking!</p>
          <p className="text-xs text-gray-500 mt-2">Click to view</p>
        </div>

        {/* Counter badge */}
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          {characters.length}
        </div>
      </Card>
    </motion.div>
  );
}