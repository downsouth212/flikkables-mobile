import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Filter from 'bad-words';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

const filter = new Filter();

const emojiOptions = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
  '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
  '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐',
  '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈'
];

export default function CreateCharacterModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [user, setUser] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [templateToUnlock, setTemplateToUnlock] = useState(null);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: unlockedTemplates = [] } = useQuery({
    queryKey: ['unlocked-templates', user?.email],
    queryFn: () => base44.entities.UnlockedTemplate.filter({ user_email: user?.email }),
    enabled: !!user?.email && open,
  });

  const unlockedTemplateIds = unlockedTemplates.map(ut => ut.template_id);

  const { data: allTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['published-templates'],
    queryFn: () => base44.entities.CharacterTemplate.list('-created_date', 100),
    enabled: open,
  });

  const templates = allTemplates.filter(t => t.published || unlockedTemplateIds.includes(t.id));

  const handleCreate = async () => {
     if (!name.trim() || (!selectedEmoji && !selectedTemplate)) return;

     if (filter.isProfane(name)) {
       alert('Please choose an appropriate name');
       return;
     }

     // Only Flikkstars cost stamps, regular Flikkables are free
     const stampCost = selectedTemplate ? 10 : 0;
     const userStamps = user?.passport_stamps || 0;

     if (userStamps < stampCost) {
       toast.error(`Not enough stamps! You need ${stampCost} but have ${userStamps}`);
       setShowCreateConfirm(false);
       return;
     }

     // Deduct stamps only if it's a Flikkstar
     if (stampCost > 0) {
       await base44.auth.updateMe({ passport_stamps: userStamps - stampCost });
       setUser({ ...user, passport_stamps: userStamps - stampCost });
     }

    onCreate({
      name: name.trim(),
      avatar_emoji: selectedEmoji,
      avatar_url: selectedTemplate?.avatar_url,
      status: 'home',
    });
    
    setName('');
    setSelectedEmoji(null);
    setSelectedTemplate(null);
    setShowCreateConfirm(false);
  };

  const [unlockingId, setUnlockingId] = React.useState(null);

  const handleUnlockTemplate = async (template) => {
    if (!user || unlockingId) return;
    
    const userStamps = user.passport_stamps || 0;
    if (userStamps < template.stamp_cost) {
      toast.error(`Not enough stamps! You need ${template.stamp_cost} but have ${userStamps}`);
      setShowUnlockDialog(false);
      return;
    }

    setUnlockingId(template.id);

    try {
      await base44.entities.UnlockedTemplate.create({
        user_email: user.email,
        template_id: template.id,
        template_name: template.name,
        stamp_cost: template.stamp_cost,
      });

      await base44.auth.updateMe({ passport_stamps: userStamps - template.stamp_cost });

      toast.success('Flikkstar unlocked!');
      setUser({ ...user, passport_stamps: userStamps - template.stamp_cost });
      setShowUnlockDialog(false);
      
      // Refresh unlocked templates immediately
      queryClient.invalidateQueries({ queryKey: ['unlocked-templates'] });
    } catch (error) {
      toast.error('Failed to unlock template');
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Flikkable</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give your Flikkable a name..."
              className="mt-1.5"
            />
          </div>

          <Tabs defaultValue="emoji" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="emoji" className="flex-1">Flikkables</TabsTrigger>
              <TabsTrigger value="templates" className="flex-1">Flikkstars</TabsTrigger>
            </TabsList>

            <TabsContent value="emoji" className="mt-4">
              <Label>Choose an Emoji</Label>
              <div className="grid grid-cols-8 gap-2 mt-2 max-h-60 overflow-y-scroll p-2 bg-gray-50 rounded-xl border border-gray-200">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      setSelectedTemplate(null);
                      setPreviewImage(emoji);
                    }}
                    className={`text-3xl p-2 rounded-lg transition-all flex items-center justify-center ${
                      selectedEmoji === emoji
                        ? 'bg-violet-500 scale-110'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="mt-4">
              {templatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No templates available yet</p>
              ) : (
                <div>
                  <Label>Choose a Flikkstar</Label>
                  <div className="grid grid-cols-6 gap-3 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200 mt-2">
                    {templates.map((template) => {
                      const isLocked = template.locked && !unlockedTemplateIds.includes(template.id);
                      const isUnlocking = unlockingId === template.id;
                      return (
                        <button
                          key={template.id}
                          type="button"
                          disabled={isUnlocking}
                          onClick={() => {
                            if (isLocked && !isUnlocking) {
                              setTemplateToUnlock(template);
                              setShowUnlockDialog(true);
                            } else if (!isLocked) {
                              setSelectedTemplate(template);
                              setSelectedEmoji(null);
                              setPreviewImage(template.avatar_url);
                            }
                          }}
                          className={`relative p-0.5 rounded-lg transition-all overflow-hidden ${
                            selectedTemplate?.id === template.id
                              ? 'bg-violet-500 ring-2 ring-violet-500 scale-110'
                              : 'bg-white hover:bg-gray-100'
                          } ${isUnlocking ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <div className="w-full aspect-square rounded overflow-hidden">
                            <img
                              src={template.avatar_url}
                              alt={template.name}
                              loading="eager"
                              className={`w-full h-full object-cover ${isLocked ? 'opacity-70' : ''}`}
                            />
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <Lock className="w-5 h-5 text-white drop-shadow-lg" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => setShowCreateConfirm(true)}
              disabled={!name.trim() || (!selectedEmoji && !selectedTemplate)}
              className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            >
              Create Flikkable
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Preview Image Dialog */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="sm:max-w-md">
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-center">
                {typeof previewImage === 'string' && previewImage.startsWith('http') ? (
                  <img src={previewImage} alt="Preview" className="w-48 h-48 object-cover rounded-xl" />
                ) : (
                  <div className="text-9xl">{previewImage}</div>
                )}
              </div>
              {selectedTemplate && (
                <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl p-4 space-y-2">
                  <p className="font-semibold text-center text-violet-900">Flikkstar Advantages</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-violet-800">
                      <span className="text-lg">⚡</span>
                      <span>+20% stamp bonus on all flikks</span>
                    </div>
                    <div className="flex items-center gap-2 text-violet-800">
                      <span className="text-lg">🏠</span>
                      <span>Return home after 4 hours (vs 8 hours)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Confirmation Dialog */}
      {showCreateConfirm && (
        <Dialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Flikkable</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-center text-lg font-medium">
                {selectedTemplate ? 'This Flikkstar will cost 10 stamps. Are you sure?' : 'Create your new Flikkable!'}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Unlock Confirmation Dialog */}
      {showUnlockDialog && templateToUnlock && (
        <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Unlock Flikkstar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex justify-center">
                <img 
                  src={templateToUnlock.avatar_url} 
                  alt={templateToUnlock.name}
                  className="w-48 h-48 object-cover rounded-xl"
                />
              </div>
              <p className="text-center text-lg font-medium">
                Unlock Flikkstar for {templateToUnlock.stamp_cost} stamps?
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUnlockDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUnlockTemplate(templateToUnlock)}
                  disabled={unlockingId === templateToUnlock.id}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
                >
                  {unlockingId === templateToUnlock.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}