import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Gift } from 'lucide-react';
import { toast } from 'sonner';

const WHEEL_SEGMENTS = [
  { type: 'stamps', value: 5, color: 'from-blue-400 to-blue-500', weight: 25 },
  { type: 'garden', value: 'random', color: 'from-green-400 to-green-500', weight: 10 },
  { type: 'stamps', value: 10, color: 'from-purple-400 to-purple-500', weight: 25 },
  { type: 'garden', value: 'random', color: 'from-emerald-400 to-emerald-500', weight: 10 },
  { type: 'stamps', value: 20, color: 'from-pink-400 to-pink-500', weight: 20 },
  { type: 'garden', value: 'random', color: 'from-teal-400 to-teal-500', weight: 5 },
  { type: 'flikkstar', value: 'unlock', color: 'from-yellow-400 to-orange-500', weight: 5 },
];

export default function SpinTheWheel({ open, onOpenChange, user, onRewardClaimed }) {
  const [spinning, setSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [reward, setReward] = useState(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open && user?.email) {
      checkSpinAvailability();
    }
  }, [open, user?.email]);

  const checkSpinAvailability = async () => {
    const today = new Date().toISOString().split('T')[0];
    const spins = await base44.entities.SpinHistory.filter({
      user_email: user.email,
      spin_date: today
    });
    setCanSpin(spins.length === 0);
  };

  const selectReward = () => {
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      random -= WHEEL_SEGMENTS[i].weight;
      if (random <= 0) {
        return i;
      }
    }
    return 0;
  };

  const handleSpin = async () => {
    if (!canSpin || spinning) return;

    setSpinning(true);
    const winningIndex = selectReward();
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const targetRotation = 360 * 5 + (winningIndex * segmentAngle) + (segmentAngle / 2);
    
    setRotation(targetRotation);

    // Wait for animation
    setTimeout(async () => {
      const winningSegment = WHEEL_SEGMENTS[winningIndex];
      await processReward(winningSegment);
      setSpinning(false);
    }, 4000);
  };

  const processReward = async (segment) => {
    const today = new Date().toISOString().split('T')[0];
    let rewardDescription = '';
    let rewardValue = '';

    if (segment.type === 'stamps') {
      rewardValue = segment.value.toString();
      rewardDescription = `${segment.value} stamps`;
      await base44.auth.updateMe({
        passport_stamps: (user.passport_stamps || 0) + segment.value
      });
    } else if (segment.type === 'garden') {
      const decorations = await base44.entities.GardenDecoration.list();
      const unownedDecorations = decorations.filter(async (d) => {
        const userItems = await base44.entities.UserGardenItem.filter({
          user_email: user.email,
          decoration_id: d.id
        });
        return userItems.length === 0;
      });

      if (unownedDecorations.length > 0) {
        const randomDeco = unownedDecorations[Math.floor(Math.random() * unownedDecorations.length)];
        await base44.entities.UserGardenItem.create({
          user_email: user.email,
          decoration_id: randomDeco.id,
          decoration_name: randomDeco.name,
          decoration_emoji: randomDeco.emoji,
          is_placed: false,
          is_active_theme: randomDeco.is_theme || false
        });
        rewardValue = randomDeco.id;
        rewardDescription = `${randomDeco.emoji} ${randomDeco.name}`;
      } else {
        // Fallback to stamps if no decorations available
        await base44.auth.updateMe({
          passport_stamps: (user.passport_stamps || 0) + 10
        });
        rewardDescription = '10 stamps (no new decorations)';
        rewardValue = '10';
      }
    } else if (segment.type === 'flikkstar') {
      const templates = await base44.entities.CharacterTemplate.filter({ locked: true });
      
      if (templates.length > 0) {
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        await base44.entities.CharacterTemplate.update(randomTemplate.id, { locked: false });
        await base44.entities.UnlockedTemplate.create({
          user_email: user.email,
          template_id: randomTemplate.id,
          template_name: randomTemplate.name
        });
        rewardValue = randomTemplate.id;
        rewardDescription = `Unlocked: ${randomTemplate.name}`;
      } else {
        // Fallback to stamps
        await base44.auth.updateMe({
          passport_stamps: (user.passport_stamps || 0) + 50
        });
        rewardDescription = '50 stamps (all unlocked)';
        rewardValue = '50';
      }
    }

    await base44.entities.SpinHistory.create({
      user_email: user.email,
      spin_date: today,
      reward_type: segment.type,
      reward_value: rewardValue,
      reward_description: rewardDescription
    });

    setReward({ type: segment.type, description: rewardDescription });
    setCanSpin(false);
    onRewardClaimed?.();
    toast.success(`You won: ${rewardDescription}!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Daily Lucky Spin
          </DialogTitle>
        </DialogHeader>

        {canSpin ? (
          <div className="py-8">
            {/* Wheel */}
            <div className="relative w-72 h-72 mx-auto mb-6">
              <motion.div
                className="w-full h-full rounded-full border-8 border-yellow-400 shadow-2xl"
                style={{ position: 'relative' }}
                animate={{ rotate: rotation }}
                transition={{ duration: 4, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {WHEEL_SEGMENTS.map((segment, index) => {
                  const angle = (360 / WHEEL_SEGMENTS.length) * index;
                  return (
                    <div
                      key={index}
                      className={`absolute inset-0 bg-gradient-to-br ${segment.color}`}
                      style={{
                        clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((angle + 360 / WHEEL_SEGMENTS.length - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle + 360 / WHEEL_SEGMENTS.length - 90) * Math.PI / 180)}%)`
                      }}
                    >
                      <div
                        className="absolute text-white font-bold text-lg drop-shadow-lg"
                        style={{
                          top: '25%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${angle + 360 / WHEEL_SEGMENTS.length / 2}deg)`
                        }}
                      >
                        {segment.type === 'stamps' ? `${segment.value}🛂` : 
                         segment.type === 'garden' ? '🌸' : '⭐'}
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              {/* Pointer */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-t-[40px] border-l-transparent border-r-transparent border-t-red-500 z-10 drop-shadow-2xl" />
              
              {/* Center */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-200 to-orange-300 border-4 border-yellow-400 flex items-center justify-center shadow-2xl">
                <Gift className="w-10 h-10 text-yellow-600" />
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={handleSpin}
                disabled={spinning}
                size="lg"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-12 py-6 text-xl font-bold shadow-xl"
              >
                {spinning ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  '🎰 SPIN NOW!'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">🎡</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Come Back Tomorrow!</h3>
            <p className="text-gray-600">
              {reward ? `You won: ${reward.description}` : 'Your next spin will be available in 24 hours'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}