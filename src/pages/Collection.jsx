import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Heart, Lock, Unlock, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const rarityConfig = {
  common: { label: 'Common', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  uncommon: { label: 'Uncommon', color: 'bg-green-100 text-green-700 border-green-300' },
  rare: { label: 'Rare', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  epic: { label: 'Epic', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  legendary: { label: 'Legendary', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
};

export default function Collection() {
  const [user, setUser] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => base44.entities.FlikkableTemplate.list(),
  });

  const { data: myCharacters = [] } = useQuery({
    queryKey: ['my-characters', user?.email],
    queryFn: () => base44.entities.Character.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ['wishlist', user?.email],
    queryFn: () => base44.entities.Wishlist.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: unlockedTemplates = [] } = useQuery({
    queryKey: ['unlocked-templates', user?.email],
    queryFn: () => base44.entities.UnlockedTemplate.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const totalStamps = user?.passport_stamps || 0;

  const addToWishlistMutation = useMutation({
    mutationFn: async (template) => {
      return await base44.entities.Wishlist.create({
        user_email: user.email,
        template_id: template.id,
        template_name: template.name,
        template_avatar_url: template.avatar_url,
        template_rarity: template.rarity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist']);
      toast.success('Added to wishlist!');
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (templateId) => {
      const item = wishlist.find(w => w.template_id === templateId);
      if (item) {
        await base44.entities.Wishlist.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['wishlist']);
      toast.success('Removed from wishlist');
    },
  });

  const unlockTemplateMutation = useMutation({
    mutationFn: async (template) => {
      if (totalStamps < template.stamp_cost) {
        throw new Error('Not enough stamps');
      }
      await base44.entities.UnlockedTemplate.create({
        user_email: user.email,
        template_id: template.id,
        template_name: template.name,
        stamp_cost: template.stamp_cost,
      });
      await base44.entities.StampTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        transaction_type: 'trophy_exchanged',
        stamps: -template.stamp_cost,
        processed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['unlocked-templates']);
      queryClient.invalidateQueries(['stamp-transactions']);
      setUnlockDialogOpen(false);
      toast.success('Template unlocked!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getTemplateStatus = (template) => {
    const owned = myCharacters.some(c => c.name === template.name || c.avatar_url === template.avatar_url);
    const isUnlocked = unlockedTemplates.some(u => u.template_id === template.id);
    const isWishlisted = wishlist.some(w => w.template_id === template.id);
    const isLocked = template.locked && !isUnlocked;
    return { owned, isUnlocked, isWishlisted, isLocked };
  };

  const freeTemplates = templates.filter(t => !t.locked);
  const lockedTemplates = templates.filter(t => t.locked);

  const renderTemplateCard = (template) => {
    const { owned, isUnlocked, isWishlisted, isLocked } = getTemplateStatus(template);
    const config = rarityConfig[template.rarity] || rarityConfig.common;

    return (
      <motion.div
        key={template.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <Card className={`overflow-hidden ${isLocked ? 'opacity-60' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                {template.avatar_url ? (
                  <img
                    src={template.avatar_url}
                    alt={template.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center text-3xl">
                    🎭
                  </div>
                )}
                {isLocked && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                )}
                {owned && !isLocked && (
                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{template.name}</h3>
                <Badge className={`${config.color} text-xs mt-1`}>
                  {config.label}
                </Badge>
                {template.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                )}
                {isLocked && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {template.stamp_cost} 🎫
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setUnlockDialogOpen(true);
                      }}
                      disabled={totalStamps < template.stamp_cost}
                    >
                      <Unlock className="w-3 h-3 mr-1" />
                      Unlock
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant={isWishlisted ? 'default' : 'ghost'}
                  onClick={() => {
                    if (isWishlisted) {
                      removeFromWishlistMutation.mutate(template.id);
                    } else {
                      addToWishlistMutation.mutate(template);
                    }
                  }}
                  disabled={owned || isLocked}
                >
                  <Heart
                    className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`}
                  />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const ownedCount = templates.filter(t => getTemplateStatus(t).owned).length;
  const totalCount = templates.length;
  const collectionProgress = Math.round((ownedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-blue-50 pb-24">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            Collection
          </h1>
          <p className="text-gray-600 mt-1">Track and unlock Flikkables</p>
        </div>

        <Card className="mb-6 bg-gradient-to-r from-violet-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm opacity-90">Collection Progress</p>
                <p className="text-3xl font-bold">{ownedCount}/{totalCount}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Stamps Available</p>
                <p className="text-3xl font-bold">🎫 {totalStamps}</p>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mt-4">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{ width: `${collectionProgress}%` }}
              />
            </div>
            <p className="text-sm opacity-90 mt-2 text-center">{collectionProgress}% Complete</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="owned">Owned</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="locked">Locked</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {templates.map(renderTemplateCard)}
          </TabsContent>

          <TabsContent value="owned" className="space-y-3">
            {templates.filter(t => getTemplateStatus(t).owned).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No Flikkables owned yet</p>
              </div>
            ) : (
              templates.filter(t => getTemplateStatus(t).owned).map(renderTemplateCard)
            )}
          </TabsContent>

          <TabsContent value="wishlist" className="space-y-3">
            {wishlist.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No Flikkables in wishlist</p>
                <p className="text-sm mt-2">Add Flikkables you want to find or trade for!</p>
              </div>
            ) : (
              templates.filter(t => getTemplateStatus(t).isWishlisted).map(renderTemplateCard)
            )}
          </TabsContent>

          <TabsContent value="locked" className="space-y-3">
            {lockedTemplates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No locked Flikkables</p>
              </div>
            ) : (
              lockedTemplates.map(renderTemplateCard)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Flikkable</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlock {selectedTemplate?.name} for {selectedTemplate?.stamp_cost} stamps?
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="flex items-center gap-4 py-4">
              {selectedTemplate.avatar_url ? (
                <img
                  src={selectedTemplate.avatar_url}
                  alt={selectedTemplate.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center text-4xl">
                  🎭
                </div>
              )}
              <div>
                <h3 className="font-semibold">{selectedTemplate.name}</h3>
                <Badge className={rarityConfig[selectedTemplate.rarity]?.color}>
                  {rarityConfig[selectedTemplate.rarity]?.label}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  You have {totalStamps} stamps
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => unlockTemplateMutation.mutate(selectedTemplate)}
              disabled={unlockTemplateMutation.isPending || totalStamps < (selectedTemplate?.stamp_cost || 0)}
            >
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}