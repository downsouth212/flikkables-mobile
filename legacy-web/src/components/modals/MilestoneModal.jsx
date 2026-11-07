import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function MilestoneModal({ open, onClose, distance }) {
  React.useEffect(() => {
    if (open) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [open]);

  const formatDistance = (km) => {
    if (!km) return '0';
    if (km >= 1000000) return `${(km / 1000000).toFixed(1)}M`;
    if (km >= 1000) return `${(km / 1000).toFixed(0)}K`;
    return km.toString();
  };

  if (!open || !distance) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-0 bg-gradient-to-br from-amber-400 via-pink-400 to-purple-400 max-w-sm">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="text-center py-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          
          <h2 className="text-3xl font-black text-white drop-shadow-lg mb-2">
            Milestone Reached!
          </h2>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-black text-white drop-shadow-lg mb-4"
          >
            {formatDistance(distance)} km
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg text-white drop-shadow-lg"
          >
            Your Flikkables have traveled an amazing distance!
          </motion.p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}