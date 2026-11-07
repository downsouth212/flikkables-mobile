import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const getRankIcon = (rank) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-amber-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-700" />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-400">{rank}</span>;
  }
};

const getRankStyle = (rank) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200';
    case 2:
      return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
    case 3:
      return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
    default:
      return 'bg-white border-gray-100';
  }
};

export default function LeaderboardItem({ user, rank, isCurrentUser, type = 'returners' }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-4 p-4 rounded-xl border ${getRankStyle(rank)} ${isCurrentUser ? 'ring-2 ring-violet-500' : ''}`}
    >
      <div className="w-8 flex justify-center">
        {getRankIcon(rank)}
      </div>
      
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-lg font-bold text-violet-600">
        {user.full_name?.[0]?.toUpperCase() || '?'}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">
          {user.full_name || 'Anonymous'}
          {isCurrentUser && <span className="text-xs text-violet-500 ml-2">(You)</span>}
        </p>
        <p className="text-xs text-gray-500">
          {type === 'returners' ? `${user.characters_returned || 0} characters returned` : `${user.pickups || 0} pikkups`}
        </p>
      </div>
      
      <div className="text-right">
         <p className="font-bold text-lg bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
           {(user.kms || 0).toLocaleString()}
         </p>
         <p className="text-xs text-gray-400">{type === 'returners' ? 'km' : 'pikks'}</p>
       </div>
    </motion.div>
  );
}