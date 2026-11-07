import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, UserPlus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BlockUserButton from '@/components/user/BlockUserButton';

export default function FriendCard({ friend, type, onAccept, onReject, onAdd, onRemove, isLoading, currentUserEmail }) {
  // type: 'accepted', 'pending', 'sent'
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="p-4 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center text-sm font-bold text-violet-600">
              {friend.friend_display_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{friend.friend_display_name}</p>
            </div>
          </div>
          
          <div className="flex gap-2 ml-2">
            {type === 'accepted' && (
              <>
                <BlockUserButton
                  targetEmail={friend.friend_email}
                  targetName={friend.friend_display_name}
                  currentUserEmail={currentUserEmail}
                  variant="ghost"
                  size="sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRemoveDialog(true)}
                  disabled={isLoading}
                  className="w-9 h-9 p-0 text-gray-400 hover:text-red-600"
                  title="Remove friend"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  Friends
                </span>
              </>
            )}
            {type === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAccept(friend)}
                  disabled={isLoading}
                  className="w-9 h-9 p-0"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(friend)}
                  disabled={isLoading}
                  className="w-9 h-9 p-0 text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
            {type === 'sent' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject?.(friend)}
                  disabled={isLoading}
                  className="w-9 h-9 p-0 text-red-600 hover:text-red-700"
                  title="Cancel request"
                >
                  <X className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  Pending
                </span>
              </>
            )}
          </div>
        </div>
      </Card>

      {type === 'accepted' && (
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Friend</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {friend.friend_display_name} from your friends list? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onRemove?.(friend);
                  setShowRemoveDialog(false);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
}