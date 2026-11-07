import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function TemplateAvatarGenerator({ open, onClose, user }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (avatarUrl) => {
      await base44.auth.updateMe({
        data: {
          ...user.data,
          avatar_url: avatarUrl
        }
      });
    },
    onSuccess: () => {
      toast.success('Avatar updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setGeneratedAvatar(null);
      onClose();
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: 'Single unique character portrait, cute mascot style avatar for a travel game app, vibrant colors, white background, square format, one character centered, modern fun design, friendly and colorful, original character design'
      });

      setGeneratedAvatar(url);
    } catch (err) {
      toast.error('Failed to generate avatar: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (generatedAvatar) {
      saveMutation.mutate(generatedAvatar);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Your Unique Avatar</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Avatar */}
          {user?.data?.avatar_url && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Current Avatar</p>
              <img 
                src={user.data.avatar_url} 
                alt="Current avatar" 
                className="w-24 h-24 rounded-full mx-auto border-4 border-violet-200"
              />
            </div>
          )}

          {/* Generated Avatar */}
          {generatedAvatar ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <p className="text-sm font-semibold mb-3">Your Generated Avatar</p>
              <img 
                src={generatedAvatar} 
                alt="Generated avatar" 
                className="w-32 h-32 rounded-full mx-auto border-4 border-green-200 mb-4"
              />
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setGeneratedAvatar(null)}
                >
                  Generate Again
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Use This Avatar
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-6">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-violet-500" />
                <h3 className="font-semibold mb-2">Create Your Unique Avatar</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a completely unique, AI-created avatar just for you!
                </p>
              </div>
              
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Your Avatar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Avatar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}