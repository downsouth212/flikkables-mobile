import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Camera, RotateCcw, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function AvatarSelector({ open, onClose, user }) {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  // Front camera via getUserMedia
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      toast.error('Could not access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };



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
      onClose();
      setSelectedAvatar(null);
      setGeneratedAvatar(null);
      setUploadedFile(null);
    },
  });

  const handleGenerateFromCapture = async () => {
    if (!capturedImage) return;
    setIsGenerating(true);
    setCapturedImage(null);
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const { url: caricatureUrl } = await base44.integrations.Core.GenerateImage({
        prompt: 'Cute mascot style cartoon avatar for a travel game app, vibrant colors, white background, square format, one character centered, modern fun design, friendly and colorful, based on the person in the photo',
        existing_image_urls: [file_url]
      });

      setGeneratedAvatar(caricatureUrl);
    } catch (err) {
      toast.error('Failed to generate avatar: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAvatar = () => {
    const avatarToSave = generatedAvatar || selectedAvatar;
    if (avatarToSave) {
      setShowConfirm(true);
    }
  };

  const handleConfirmSave = () => {
    const avatarToSave = generatedAvatar || selectedAvatar;
    saveMutation.mutate(avatarToSave);
    setShowConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
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

          {/* Camera / Selfie Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Create Custom Avatar
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Take a selfie and we'll turn it into a fun cartoon avatar!
            </p>

            {isGenerating ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                <span className="text-sm text-gray-600">Generating your avatar...</span>
              </div>
            ) : generatedAvatar ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <img src={generatedAvatar} alt="Generated avatar" className="w-32 h-32 rounded-full mx-auto border-4 border-green-200 mb-4" />
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => setGeneratedAvatar(null)}>
                    <X className="w-4 h-4 mr-1" /> Try Again
                  </Button>
                  <Button size="sm" onClick={handleSaveAvatar} className="bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-1" /> Use This Avatar
                  </Button>
                </div>
              </motion.div>
            ) : capturedImage ? (
              <div className="text-center">
                <img src={capturedImage} alt="Captured" className="w-32 h-32 rounded-full mx-auto border-4 border-violet-200 mb-4 object-cover" />
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => { setCapturedImage(null); startCamera(); }}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Retake
                  </Button>
                  <Button size="sm" onClick={handleGenerateFromCapture} className="bg-violet-600 hover:bg-violet-700">
                    <Check className="w-4 h-4 mr-1" /> Generate Avatar
                  </Button>
                </div>
              </div>
            ) : showCamera ? (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-square max-w-xs mx-auto">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={stopCamera}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={capturePhoto}>
                    <Camera className="w-4 h-4 mr-1" /> Snap
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={startCamera}>
                <Camera className="w-4 h-4 mr-2" />
                Take Selfie (Front Camera)
              </Button>
            )}
          </div>

        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Avatar Change?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <img 
                  src={generatedAvatar || selectedAvatar} 
                  alt="Selected avatar" 
                  className="w-32 h-32 rounded-full mx-auto border-4 border-violet-200"
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                This will be your new profile avatar.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSave}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}