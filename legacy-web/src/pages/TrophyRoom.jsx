import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const rarityColors = {
  common: "from-gray-400 to-gray-600",
  uncommon: "from-green-400 to-green-600",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-yellow-400 to-yellow-600"
};

export default function TrophyRoom() {
  const [user, setUser] = useState(null);
  const [selectedTrophy, setSelectedTrophy] = useState(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: trophies = [], isLoading } = useQuery({
    queryKey: ['trophies', user?.email],
    queryFn: () => base44.entities.Trophy.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const exchangeMutation = useMutation({
    mutationFn: async (trophy) => {
      await Promise.all([
        base44.entities.Trophy.update(trophy.id, { exchanged: true }),
        base44.auth.updateMe({ passport_stamps: (user.passport_stamps || 0) + 10 })
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trophies'] });
      setShowExchangeModal(false);
      setSelectedTrophy(null);
    },
  });

  const unclaimedTrophies = trophies.filter(t => !t.exchanged);
  const exchangedTrophies = trophies.filter(t => t.exchanged);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trophy Room</h1>
            <p className="text-sm text-gray-500">Collect trophies and exchange for stamps</p>
          </div>
        </div>

        {/* Stats */}
        {user && (
          <Card className="p-4 bg-white/80 backdrop-blur border-0 shadow-lg mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Trophies</p>
                <p className="text-2xl font-bold text-amber-600">{trophies.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Available</p>
                <p className="text-2xl font-bold text-violet-600">{unclaimedTrophies.length}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Unclaimed Trophies */}
        {unclaimedTrophies.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Ready to Exchange
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {unclaimedTrophies.map((trophy) => (
                  <motion.div
                    key={trophy.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => {
                      setSelectedTrophy(trophy);
                      setShowExchangeModal(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Card className={`p-4 bg-gradient-to-br ${rarityColors[trophy.rarity]} text-white border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
                      <div className="text-3xl mb-2">{trophy.icon}</div>
                      <h3 className="font-semibold text-sm">{trophy.name}</h3>
                      <p className="text-xs opacity-90 mt-1">{trophy.stamps_value} 🛂</p>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Exchanged Trophies */}
        {exchangedTrophies.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Exchanged ({exchangedTrophies.length})</h2>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {exchangedTrophies.map((trophy) => (
                  <motion.div
                    key={trophy.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Card className="p-4 bg-white/50 border border-gray-200 shadow">
                      <div className="text-3xl mb-2 opacity-50">{trophy.icon}</div>
                      <h3 className="font-semibold text-sm text-gray-600">{trophy.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">Exchanged</p>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!isLoading && trophies.length === 0 && (
          <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No Trophies Yet</h3>
            <p className="text-sm text-gray-500">Complete quests to earn trophies!</p>
          </Card>
        )}
      </div>

      {/* Exchange Modal */}
      {selectedTrophy && (
        <Dialog open={showExchangeModal} onOpenChange={setShowExchangeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Exchange Trophy?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className={`p-6 bg-gradient-to-br ${rarityColors[selectedTrophy.rarity]} text-white rounded-xl text-center`}>
                <div className="text-6xl mb-2">{selectedTrophy.icon}</div>
                <h3 className="text-xl font-semibold">{selectedTrophy.name}</h3>
              </div>
              <p className="text-sm text-gray-600">{selectedTrophy.description}</p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">+10 🛂 Passport Stamps</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowExchangeModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => exchangeMutation.mutate(selectedTrophy)}
                  disabled={exchangeMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {exchangeMutation.isPending ? 'Exchanging...' : 'Exchange'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}