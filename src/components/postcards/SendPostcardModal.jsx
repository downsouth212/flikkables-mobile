import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SendPostcardModal({ open, onClose, character, onSend }) {
  const [selectedPostcard, setSelectedPostcard] = useState(null);
  const [sending, setSending] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: postcards = [], isLoading } = useQuery({
    queryKey: ['character-postcards', character?.id],
    queryFn: async () => {
      if (!character?.id || !user?.email) return [];
      return await base44.entities.Postcard.filter({
        user_email: user.email,
        character_id: character.id,
        sent_to_owner: false
      }, '-created_date');
    },
    enabled: !!character?.id && !!user?.email && open,
  });

  const handleSend = async () => {
    if (!selectedPostcard) return;
    setSending(true);
    
    try {
      // Mark postcard as sent
      await base44.entities.Postcard.update(selectedPostcard.id, {
        sent_to_owner: true,
        return_date: new Date().toISOString()
      });
      
      toast.success('Postcard sent with return!');
      onSend?.(selectedPostcard);
      onClose();
    } catch (error) {
      toast.error('Failed to send postcard');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Postcard?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose a postcard to send back with {character?.name} to the owner!
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : postcards.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-500">No postcards available for this Flikkable</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
              {postcards.map((postcard) => (
                <motion.div
                  key={postcard.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPostcard(postcard)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                    selectedPostcard?.id === postcard.id ? 'border-violet-500' : 'border-gray-200'
                  }`}
                >
                  <img
                    src={postcard.postcard_image_url}
                    alt="Postcard"
                    className="w-full aspect-[3/4] object-cover"
                  />
                  {selectedPostcard?.id === postcard.id && (
                    <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-2">
                        <Send className="w-4 h-4 text-violet-600" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                onSend?.(null);
                onClose();
              }} 
              className="flex-1"
            >
              Skip
            </Button>
            {postcards.length > 0 && (
              <Button
                onClick={handleSend}
                disabled={!selectedPostcard || sending}
                className="flex-1 bg-violet-600"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Postcard
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}