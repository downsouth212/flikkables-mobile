import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, Calendar, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function PostcardGallery({ user }) {
  const { data: postcards = [], isLoading } = useQuery({
    queryKey: ['postcards', user?.email],
    queryFn: () => base44.entities.Postcard.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (postcards.length === 0) {
    return (
      <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8 text-violet-500" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">No Postcards Yet</h3>
        <p className="text-sm text-gray-500">Take a postcard selfie when you pick up a Flikkable!</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {postcards.map((postcard) => (
        <motion.div
          key={postcard.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Card className="overflow-hidden cursor-pointer">
            <div className="relative aspect-[3/4]">
              <img
                src={postcard.postcard_image_url}
                alt={`Postcard with ${postcard.character_name}`}
                className="w-full h-full object-cover"
              />
              {postcard.sent_to_owner && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Sent ✓
                </div>
              )}
            </div>
            <div className="p-3 space-y-1">
              <p className="font-semibold text-sm truncate">{postcard.character_name}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{postcard.location_name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(postcard.created_date), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}