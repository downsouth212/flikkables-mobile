import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function PostcardCamera({ open, onClose, character, onSave, userLocation }) {
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [postcardImage, setPostcardImage] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  React.useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      toast.error('Could not access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    setCapturing(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
      const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
      
      setCapturedImage(canvas.toDataURL());
      setProcessing(true);
      
      // Upload captured image
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Generate postcard with AR-style effect
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Create a fun postcard image: Transform the person's face into a 3D cartoon/caricature style (Pixar-like, friendly and colorful). In the background, show "${character.name}" the Flikkable character (cute travel mascot) in augmented reality style at the location "${userLocation?.name || 'unknown location'}". Add postcard-style text overlay saying "Greetings from ${userLocation?.name || 'my adventure'}!". Make it look like a fun travel postcard with the character appearing in AR behind the person.`,
        existing_image_urls: [file_url, character.avatar_url].filter(Boolean)
      });
      
      setPostcardImage(result.url);
      stopCamera();
    } catch (error) {
      toast.error('Failed to create postcard');
      setCapturedImage(null);
    } finally {
      setCapturing(false);
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!postcardImage) return;
    
    try {
      await onSave(postcardImage);
      toast.success('Postcard saved!');
      onClose();
    } catch (error) {
      toast.error('Failed to save postcard');
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setPostcardImage(null);
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take a Postcard Selfie</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!capturedImage ? (
            <>
              <div className="relative aspect-[3/4] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {capturing && (
                  <div className="absolute inset-0 bg-white animate-pulse" />
                )}
              </div>
              <Button
                onClick={capturePhoto}
                disabled={capturing || processing}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500"
              >
                <Camera className="w-4 h-4 mr-2" />
                {capturing ? 'Capturing...' : 'Capture Postcard'}
              </Button>
            </>
          ) : processing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mb-3" />
              <p className="text-sm text-gray-600">Creating your postcard...</p>
              <p className="text-xs text-gray-500 mt-1">Adding AR effects and caricature style</p>
            </div>
          ) : (
            <>
              <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                <img src={postcardImage} alt="Postcard" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetake} className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={handleSave} className="flex-1 bg-violet-600">
                  Save Postcard
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}