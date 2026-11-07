import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, MapPin, Calendar, Send, X, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function PostcardGallery({ user }) {
  const [selectedPostcard, setSelectedPostcard] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tab, setTab] = useState('sent');

  const { data: postcards = [], isLoading } = useQuery({
    queryKey: ['postcards', user?.email],
    queryFn: () => base44.entities.Postcard.filter({ user_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // Received = postcards sent to owner where owner_email matches this user's characters
  const { data: myCharacters = [] } = useQuery({
    queryKey: ['myCharacters-ids', user?.email],
    queryFn: () => base44.entities.Character.filter({ owner_email: user.email }),
    enabled: !!user?.email,
  });

  const myCharacterIds = myCharacters.map(c => c.id);

  const { data: receivedPostcards = [], isLoading: loadingReceived } = useQuery({
    queryKey: ['received-postcards', user?.email],
    queryFn: async () => {
      // Get all postcards sent to owner for user's characters
      const all = await base44.entities.Postcard.filter({ sent_to_owner: true }, '-created_date');
      return all.filter(p => myCharacterIds.includes(p.character_id));
    },
    enabled: !!user?.email && myCharacterIds.length > 0,
  });

  const handlePostcardClick = (postcard) => {
    setSelectedPostcard(postcard);
    setShowDetail(true);
  };

  const displayList = tab === 'sent' ? postcards : receivedPostcards;
  const loading = tab === 'sent' ? isLoading : loadingReceived;

  return (
    <>
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="sent" className="flex-1">📸 My Postcards</TabsTrigger>
          <TabsTrigger value="received" className="flex-1">
            <Inbox className="w-4 h-4 mr-1" />
            Received {receivedPostcards.length > 0 && `(${receivedPostcards.length})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-gray-500">Loading postcards...</div>
        </div>
      ) : displayList.length === 0 ? (
        <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">
            {tab === 'sent' ? 'No Postcards Yet' : 'No Received Postcards'}
          </h3>
          <p className="text-sm text-gray-500">
            {tab === 'sent'
              ? 'Take selfie postcards when picking up Flikkables to build your collection!'
              : 'When someone returns your Flikkable with a postcard, it will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <AnimatePresence>
            {displayList.map((postcard) => (
              <motion.div
                key={postcard.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePostcardClick(postcard)}
                className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
              >
                <img
                  src={postcard.postcard_image_url}
                  alt={`Postcard with ${postcard.character_name}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                  <p className="text-xs font-semibold truncate">{postcard.character_name}</p>
                  {tab === 'received' && postcard.user_name && (
                    <p className="text-xs opacity-90 truncate">From: {postcard.user_name}</p>
                  )}
                  <p className="text-xs opacity-80 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {postcard.location_name}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Postcard Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {selectedPostcard && (
            <>
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <img
                src={selectedPostcard.postcard_image_url}
                alt={`Postcard with ${selectedPostcard.character_name}`}
                className="w-full aspect-[3/4] object-cover"
              />
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-lg">{selectedPostcard.character_name}</h3>
                  {tab === 'received' && selectedPostcard.user_name && (
                    <div className="flex items-center gap-2 text-sm text-violet-700 mt-1 font-medium">
                      <Send className="w-4 h-4" />
                      From: {selectedPostcard.user_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    {selectedPostcard.location_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedPostcard.created_date), 'MMM d, yyyy')}
                  </div>
                </div>
                
                {tab === 'received' ? (
                  <div className="p-3 bg-violet-50 rounded-lg text-sm text-violet-700 flex items-center gap-2">
                    <Inbox className="w-4 h-4" />
                    Postcard received with the return of {selectedPostcard.character_name}
                  </div>
                ) : selectedPostcard.sent_to_owner ? (
                  <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Sent to owner on {format(new Date(selectedPostcard.return_date), 'MMM d, yyyy')}
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    💡 This postcard can be sent when you return the Flikkable
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}