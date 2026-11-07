import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Balloon = ({ delay, side }) => (
  <motion.div
    initial={{ y: 600, x: side === 'left' ? -100 : 100, opacity: 0 }}
    animate={{ y: -100, opacity: [0, 1, 1, 0], x: side === 'left' ? 50 : -50 }}
    transition={{ duration: 3, delay, ease: 'easeInOut' }}
    className="fixed pointer-events-none"
    style={{ [side]: '20px' }}
  >
    <div className="w-8 h-10 rounded-full border-2 border-current relative">
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-current" />
    </div>
  </motion.div>
);

const Streamer = ({ delay, x }) => (
  <motion.div
    initial={{ y: -50, x, rotate: 0, opacity: 0 }}
    animate={{ y: 400, rotate: 360, opacity: [0, 1, 0] }}
    transition={{ duration: 2.5, delay, ease: 'easeIn' }}
    className="fixed pointer-events-none w-1 h-32 rounded-full"
    style={{ left: `${x}%`, background: 'linear-gradient(to bottom, currentColor, transparent)' }}
  />
);

export default function LevelUpModal({ isOpen, newLevel, onClose }) {
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti burst from center
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      });

      // Second burst after a moment
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
        });
      }, 300);

      // Auto close after 4 seconds
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-0 bg-transparent shadow-none flex items-center justify-center">
        <div className="relative w-full h-96 flex items-center justify-center">
          {/* Background level number */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="absolute text-9xl font-black text-purple-600"
          >
            {newLevel}
          </motion.div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
            className="relative z-10 text-center"
          >
            <motion.h1
              className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400 mb-6"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: 2 }}
            >
              You Just Leveled Up!
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-7xl font-black text-gradient bg-gradient-to-r from-violet-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg"
            >
              {newLevel}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-lg text-gray-600 mt-6"
            >
              Keep it up! 🎉
            </motion.p>
          </motion.div>

          {/* Balloons */}
          <Balloon delay={0} side="left" />
          <Balloon delay={0.2} side="right" />
          <Balloon delay={0.4} side="left" />
          <Balloon delay={0.6} side="right" />

          {/* Streamers */}
          <Streamer delay={0.1} x={15} />
          <Streamer delay={0.3} x={35} />
          <Streamer delay={0.5} x={65} />
          <Streamer delay={0.7} x={85} />
        </div>
      </DialogContent>
    </Dialog>
  );
}