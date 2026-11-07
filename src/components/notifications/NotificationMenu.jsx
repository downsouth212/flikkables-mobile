import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import NotificationItem from './NotificationItem';

export default function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showMarkAllDialog, setShowMarkAllDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allNotifications = await base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date',
        50
      );
      return allNotifications;
    },
    enabled: !!user?.email,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user?.email) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === user?.email) {
        // Immediate refetch for real-time updates
        refetch();
      }
    });
    return unsubscribe;
  }, [user?.email, refetch]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notification) => {
    if (!notification.read) {
      await base44.entities.Notification.update(notification.id, { read: true });
      refetch();
    }
  };

  const handleDelete = async (notificationId) => {
    await base44.entities.Notification.delete(notificationId);
    refetch();
  };

  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    await Promise.all(
      unreadNotifications.map(n => base44.entities.Notification.update(n.id, { read: true }))
    );
    refetch();
    setShowMarkAllDialog(false);
  };

  const handleDeleteAll = async () => {
    await Promise.all(
      notifications.map(n => base44.entities.Notification.delete(n.id))
    );
    refetch();
    setShowDeleteAllDialog(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-violet-600 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {notifications.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={() => setShowMarkAllDialog(true)}
                        className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteAllDialog(true)}
                      className="px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete all
                    </button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => handleMarkRead(notification)}
                      onDelete={() => handleDelete(notification.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AlertDialog open={showMarkAllDialog} onOpenChange={setShowMarkAllDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Mark all notifications as read?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark all unread notifications as read. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAllRead} className="bg-blue-600 hover:bg-blue-700">
              Mark all read
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete all notifications?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
              Delete all
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}