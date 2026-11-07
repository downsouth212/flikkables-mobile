import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Sparkles, Trees, Flower2, Armchair, Star, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GardenShop({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const BULK_UNLOCK_COST = 2000;

  const { data: decorations = [] } = useQuery({
    queryKey: ['garden-decorations'],
    queryFn: () => base44.entities.GardenDecoration.list(),
  });

  const { data: userItems = [] } = useQuery({
    queryKey: ['user-garden-items', user?.email],
    queryFn: () => base44.entities.UserGardenItem.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (decoration) => {
      // Check if user has enough stamps
      if ((user.passport_stamps || 0) < decoration.stamp_cost) {
        throw new Error('Not enough stamps!');
      }

      // Deduct stamps
      await base44.auth.updateMe({
        passport_stamps: (user.passport_stamps || 0) - decoration.stamp_cost
      });

      // Add to user's items
      await base44.entities.UserGardenItem.create({
        user_email: user.email,
        decoration_id: decoration.id,
        decoration_name: decoration.name,
        decoration_emoji: decoration.emoji,
        is_placed: false,
        is_active_theme: decoration.is_theme ? true : false
      });

      return decoration;
    },
    onSuccess: async (decoration) => {
      // Optimistically update the cache immediately
      queryClient.setQueryData(['user-garden-items', user.email], (old = []) => [
        ...old,
        {
          user_email: user.email,
          decoration_id: decoration.id,
          decoration_name: decoration.name,
          decoration_emoji: decoration.emoji,
          is_placed: false,
          is_active_theme: decoration.is_theme ? true : false
        }
      ]);
      
      // Update user object in background
      base44.auth.me().then(updatedUser => Object.assign(user, updatedUser));
      
      toast.success(`Purchased ${decoration.name}!`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const bulkUnlockMutation = useMutation({
    mutationFn: async () => {
      // Check if user has enough stamps
      if ((user.passport_stamps || 0) < BULK_UNLOCK_COST) {
        throw new Error('Not enough stamps to unlock all items!');
      }

      const lockedDecorations = decorations.filter(d => d.locked);

      // Deduct stamps
      await base44.auth.updateMe({
        passport_stamps: (user.passport_stamps || 0) - BULK_UNLOCK_COST
      });

      // Unlock all locked decorations
      for (const decoration of lockedDecorations) {
        await base44.entities.GardenDecoration.update(decoration.id, {
          locked: false,
          level_requirement: 0
        });
      }

      return lockedDecorations.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['garden-decorations'] });
      toast.success(`Unlocked all ${count} locked items!`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const ownedItemIds = userItems.map(item => item.decoration_id);
  const lockedCount = decorations.filter(d => d.locked).length;
  const userLevel = user?.level || 1;

  const categories = [
    { id: 'background', label: 'Themes', icon: Sparkles, items: decorations.filter(d => d.is_theme) },
    { id: 'small', label: 'Small', icon: Flower2, items: decorations.filter(d => d.category === 'small') },
    { id: 'medium', label: 'Medium', icon: Armchair, items: decorations.filter(d => d.category === 'medium') },
    { id: 'large', label: 'Large', icon: Trees, items: decorations.filter(d => d.category === 'large') },
    { id: 'interactive', label: 'Special', icon: Star, items: decorations.filter(d => d.category === 'interactive') }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Garden Shop
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-2 rounded-full border-2 border-amber-200 shadow-lg">
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                {user?.passport_stamps || 0}
              </span>
              <span className="ml-1 text-xl">🛂</span>
            </div>
          </DialogTitle>
        </DialogHeader>



        <Tabs defaultValue="background" className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                <cat.icon className="w-3 h-3 mr-1" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                {cat.items.map(decoration => {
                  const owned = ownedItemIds.includes(decoration.id);
                  const isLocked = decoration.locked && decoration.level_requirement > userLevel;
                  
                  return (
                    <motion.div
                      key={decoration.id}
                      whileHover={{ scale: isLocked ? 1 : 1.02 }}
                      className={`p-4 rounded-xl border-2 ${
                        owned ? 'bg-green-50 border-green-300' : 
                        isLocked ? 'bg-gray-50 border-gray-300 opacity-70' :
                        'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <div className="text-3xl relative mb-2">
                          {decoration.emoji}
                          {isLocked && (
                            <Lock className="w-4 h-4 absolute -top-1 -right-1 text-gray-600" />
                          )}
                        </div>
                        <div className="w-full">
                          <h3 className="font-semibold text-sm">{decoration.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{decoration.description}</p>
                          {decoration.happiness_boost > 0 && (
                            <p className="text-xs text-purple-600 mt-1">
                              +{decoration.happiness_boost} happiness/day
                            </p>
                          )}
                          {isLocked && (
                            <p className="text-xs text-orange-600 mt-1 font-medium">
                              🔒 Level {decoration.level_requirement} required
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2 gap-1">
                            <span className="text-sm font-bold text-violet-600">
                              {decoration.stamp_cost} stamps
                            </span>
                            {owned ? (
                              <span className="text-xs text-green-600 font-medium">Owned ✓</span>
                            ) : isLocked ? (
                              <span className="text-xs text-gray-500">Locked</span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => purchaseMutation.mutate(decoration)}
                                disabled={purchaseMutation.isPending || (user.passport_stamps || 0) < decoration.stamp_cost}
                                className="h-7 text-xs"
                              >
                                Buy
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {cat.items.length === 0 && (
                  <p className="col-span-2 text-center text-gray-500 py-8">
                    Coming soon!
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}