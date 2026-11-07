import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, Image as ImageIcon, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SendPostcardDialog({ open, onClose, character, onSendWithPostcard, onSendWithoutPostcard }) {
  const [selectedPostcard, setSelectedPostcard] = useState(null);

  const { data: postcards = [] } = useQuery({
    queryKey: ['character-postcards', character?.id],
    queryFn: async () => {
      if (!character?.id) return [];
      const user = await base44.auth.me();
      return await base44.entities.Postcard.filter({
        user_email: user.email,
        character_id: character.id,
        sent_to_owner: false
      }, '-created_date');
    },
    enabled: !!character?.id && open,
  });

  const handleSend = () => {
    if (selectedPostcard) {
      onSendWithPostcard(selectedPostcard);
    } else {
      onSendWithoutPostcard();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return {character?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {postcards.length > 0 ? (
            <>
              <p className="text-sm text-gray-600">
                Send a postcard with your return?
              </p>

              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {postcards.map((postcard) => (
                  <motion.button
                    key={postcard.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPostcard(selectedPostcard?.id === postcard.id ? null : postcard)}
                    className={`relative aspect-[3/4] rounded-lg overflow-hidden border-4 transition-all ${
                      selectedPostcard?.id === postcard.id
                        ? 'border-violet-500 ring-2 ring-violet-300'
                        : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={postcard.postcard_image_url}
                      alt="Postcard"
                      className="w-full h-full object-cover"
                    />
                    {selectedPostcard?.id === postcard.id && (
                      <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-violet-600" />
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </>
          ) : (
            <div className="p-6 text-center bg-gray-50 rounded-lg">
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                No postcards available for this Flikkable
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onSendWithoutPostcard}
              className="flex-1"
            >
              Send Without Postcard
            </Button>
            {postcards.length > 0 && (
              <Button
                onClick={handleSend}
                disabled={!selectedPostcard}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {selectedPostcard ? 'Send with Postcard' : 'Select Postcard'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}