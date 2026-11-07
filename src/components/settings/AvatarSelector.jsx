import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AvatarSelector({ open, onClose, user }) {
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: presetAvatars = [] } = useQuery({
    queryKey: ['preset-avatars'],
    queryFn: () => base44.entities.UserAvatar.filter({ is_default: true }),
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async (avatarUrl) => {
      await base44.auth.updateMe({ avatar_url: avatarUrl });
    },
    onSuccess: () => {
      toast.success('Avatar updated!');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      onClose();
    },
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    
    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Generate caricature using AI
      const result = await base44.integrations.Core.GenerateImage({
        prompt: 'Create a modern, friendly 3D caricature avatar based on this photo. Style should be colorful, fun, and appropriate for all ages. Make it look like a Pixar-style character with exaggerated but friendly features.',
        existing_image_urls: [file_url]
      });
      
      setSelectedAvatar(result.url);
      setShowConfirm(true);
    } catch (error) {
      toast.error('Failed to generate avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (selectedAvatar) {
      saveMutation.mutate(selectedAvatar);
    }
  };

  const maleAvatars = presetAvatars.filter(a => a.gender === 'male');
  const femaleAvatars = presetAvatars.filter(a => a.gender === 'female');
  const neutralAvatars = presetAvatars.filter(a => a.gender === 'neutral');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="presets" className="flex-1">Preset Avatars</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Create Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            {/* Male Avatars */}
            {maleAvatars.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Male</h3>
                <div className="grid grid-cols-4 gap-3">
                  {maleAvatars.map((avatar) => (
                    <motion.div
                      key={avatar.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedAvatar(avatar.avatar_url);
                        setShowConfirm(true);
                      }}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                        selectedAvatar === avatar.avatar_url ? 'border-violet-500' : 'border-gray-200'
                      }`}
                    >
                      <img src={avatar.avatar_url} alt={avatar.name} className="w-full h-24 object-cover" />
                      {selectedAvatar === avatar.avatar_url && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-violet-600" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Female Avatars */}
            {femaleAvatars.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Female</h3>
                <div className="grid grid-cols-4 gap-3">
                  {femaleAvatars.map((avatar) => (
                    <motion.div
                      key={avatar.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedAvatar(avatar.avatar_url);
                        setShowConfirm(true);
                      }}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                        selectedAvatar === avatar.avatar_url ? 'border-violet-500' : 'border-gray-200'
                      }`}
                    >
                      <img src={avatar.avatar_url} alt={avatar.name} className="w-full h-24 object-cover" />
                      {selectedAvatar === avatar.avatar_url && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-violet-600" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Neutral Avatars */}
            {neutralAvatars.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-gray-700">Neutral</h3>
                <div className="grid grid-cols-4 gap-3">
                  {neutralAvatars.map((avatar) => (
                    <motion.div
                      key={avatar.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedAvatar(avatar.avatar_url);
                        setShowConfirm(true);
                      }}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                        selectedAvatar === avatar.avatar_url ? 'border-violet-500' : 'border-gray-200'
                      }`}
                    >
                      <img src={avatar.avatar_url} alt={avatar.name} className="w-full h-24 object-cover" />
                      {selectedAvatar === avatar.avatar_url && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-violet-600" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-amber-900 mb-1">⚠️ Important:</p>
              <p className="text-amber-800">No nudity or inappropriate content is allowed. Photos will be rejected if they violate guidelines.</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('camera-upload').click()}
                  disabled={uploading}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('file-upload').click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </Button>
              </div>

              <input
                id="camera-upload"
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />

              {uploading && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                  <span className="text-sm text-gray-600">Generating your avatar...</span>
                </div>
              )}

              {selectedAvatar && showConfirm && !presetAvatars.find(a => a.avatar_url === selectedAvatar) && (
                <div className="space-y-3">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img src={selectedAvatar} alt="Generated avatar" className="w-32 h-32 mx-auto rounded-lg object-cover" />
                  </div>
                  <p className="text-sm text-center text-gray-600">Preview your custom avatar</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {showConfirm && selectedAvatar && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => {
              setShowConfirm(false);
              setSelectedAvatar(user?.avatar_url || null);
            }} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Avatar'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}