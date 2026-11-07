import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, Gift, TrendingUp, Send, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';

const notificationConfig = {
  flick_landed: {
    icon: Zap,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600'
  },
  character_returned: {
    icon: Gift,
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600'
  },
  stamps_earned: {
    icon: Gift,
    color: 'bg-yellow-50 border-yellow-200',
    iconColor: 'text-yellow-600'
  },
  leaderboard_change: {
    icon: TrendingUp,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600'
  },
  trade_received: {
    icon: Send,
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-600'
  },
  trade_accepted: {
    icon: CheckCircle2,
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600'
  },
  trade_declined: {
    icon: XCircle,
    color: 'bg-red-50 border-red-200',
    iconColor: 'text-red-600'
  }
};

export default function NotificationItem({ notification, onMarkRead, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = notificationConfig[notification.type] || notificationConfig.stamps_earned;
  const Icon = config.icon;
  const isLongMessage = notification.message?.length > 100;

  const getTimeAgo = () => {
    const now = new Date();
    const created = new Date(notification.created_date);
    const diffMs = now - created;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onClick={onMarkRead}
      className={`p-4 border-l-4 cursor-pointer transition-all ${config.color} ${
        !notification.read ? 'bg-opacity-100' : 'bg-opacity-50'
      }`}
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 mt-1 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
              <p className={`text-gray-600 text-sm mt-1 ${!isExpanded && isLongMessage ? 'line-clamp-2' : ''}`}>
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-400 text-xs">{getTimeAgo()}</p>
                {isLongMessage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="text-violet-600 hover:text-violet-700 text-xs font-medium flex items-center gap-1"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!notification.read && (
            <div className="mt-2">
              <span className="inline-block w-2 h-2 bg-violet-600 rounded-full"></span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}