import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, Check, Loader2, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function PostcardCamera({ open, onClose, character, onPostcardSaved, userLocation }) {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      toast.error('Failed to access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.75);
    setCapturedImage(imageData);
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const processPostcard = async () => {
    if (!capturedImage || !character) return;

    setIsProcessing(true);
    try {
      const locationName = character?.current_location_name || 'Unknown Location';
      const characterEmoji = character?.avatar_emoji || '✈️';

      // Upload selfie and fetch user in parallel
      const selfieBlob = await (await fetch(capturedImage)).blob();
      const selfieFile = new File([selfieBlob], 'selfie.jpg', { type: 'image/jpeg' });

      const [{ file_url: uploadedUrl }, me] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: selfieFile }),
        base44.auth.me(),
      ]);

      // AI: transform faces into Disney-style while keeping bodies and background photorealistic
      const { url: postcardUrl } = await base44.integrations.Core.GenerateImage({
        prompt: `Transform every person's face in this photo into a Disney/Pixar 3D animated CGI style — like characters from Encanto or Moana. Smooth glowing skin, soft rounded features, slightly idealized facial proportions. Natural Disney character expressions. Apply to ALL people in the photo including background and babies. Keep all hair, clothing, bodies, and the entire background completely photorealistic and unchanged — only the faces change. Add a travel postcard decorative border on the left side of the image. Stamp "${locationName}" at the bottom. Add a small "${characterEmoji}" sticker in the top corner.`,
        existing_image_urls: [uploadedUrl],
      });

      await base44.entities.Postcard.create({
        user_email: me.email,
        user_name: me.full_name,
        character_id: character.id,
        character_name: character.name,
        character_avatar_url: character.avatar_url || '',
        postcard_image_url: postcardUrl,
        location_name: locationName,
        lat: userLocation?.lat || character.current_lat || 0,
        lng: userLocation?.lng || character.current_lng || 0,
        sent_to_owner: false,
      });

      queryClient.invalidateQueries({ queryKey: ['postcards'] });
      queryClient.invalidateQueries({ queryKey: ['postcards', me.email] });
      toast.success('Postcard saved to your gallery!');
      onPostcardSaved?.(postcardUrl);
      onClose();
    } catch (err) {
      toast.error('Failed to create postcard: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden z-[9999]">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Take a Selfie Postcard</DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] bg-black">
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {/* Character Preview Overlay (simulated AR) */}
          {character && !isProcessing && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute bottom-20 right-8 w-24 h-24 rounded-full border-4 border-white shadow-2xl"
            >
              {character.avatar_url ? (
                <img 
                  src={character.avatar_url} 
                  alt={character.name} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-3xl">
                  {character.avatar_emoji}
                </div>
              )}
            </motion.div>
          )}

          {/* Location Label */}
          {character && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm font-medium text-center">
              📍 {character.current_location_name}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3">
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              <span className="text-sm text-gray-600">Creating your AR postcard...</span>
            </div>
          ) : !capturedImage ? (
            <Button
              onClick={capturePhoto}
              className="w-full h-12 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture Postcard
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={retake}
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={processPostcard}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Postcard
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}