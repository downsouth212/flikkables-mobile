import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import { Ban, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

export default function BlockUserButton({ targetEmail, targetName, currentUserEmail, variant = "ghost", size = "sm" }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  // Check if already blocked
  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users', currentUserEmail],
    queryFn: () => base44.entities.BlockedUser.filter({ blocker_email: currentUserEmail }),
    enabled: !!currentUserEmail,
  });

  const isBlocked = blockedUsers.some(b => b.blocked_email === targetEmail);

  const blockMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BlockedUser.create({
        blocker_email: currentUserEmail,
        blocked_email: targetEmail,
        blocked_name: targetName,
      });
    },
    onSuccess: () => {
      toast.success(`Blocked ${targetName}`);
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['guild-members'] });
      setShowConfirm(false);
    },
    onError: () => {
      toast.error('Failed to block user');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async () => {
      const blocked = blockedUsers.find(b => b.blocked_email === targetEmail);
      if (blocked) {
        await base44.entities.BlockedUser.delete(blocked.id);
      }
    },
    onSuccess: () => {
      toast.success(`Unblocked ${targetName}`);
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['guild-members'] });
    },
    onError: () => {
      toast.error('Failed to unblock user');
    },
  });

  if (isBlocked) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => unblockMutation.mutate()}
        className="text-green-600"
      >
        <ShieldOff className="w-4 h-4 mr-2" />
        Unblock
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowConfirm(true)}
        className="text-red-600"
      >
        <Ban className="w-4 h-4 mr-2" />
        Block
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {targetName}?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see each other in searches, guild chats, or be able to interact. You can unblock them later from settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => blockMutation.mutate()} className="bg-red-600 hover:bg-red-700">
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}