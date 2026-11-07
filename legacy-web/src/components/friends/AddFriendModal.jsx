import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useQueryClient } from '@tanstack/react-query';

export default function AddFriendModal({ open, onClose, userEmail, onFriendAdded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [existingFriends, setExistingFriends] = useState([]);
    const [usersLoaded, setUsersLoaded] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (open && !usersLoaded) {
      const loadData = async () => {
        try {
          // Get existing friendships to exclude from search
          const allFriends = await base44.entities.Friend.filter({});
          const friendEmails = new Set();
          
          allFriends.forEach(f => {
            if (f.user_email === userEmail) friendEmails.add(f.friend_email);
            if (f.friend_email === userEmail) friendEmails.add(f.user_email);
          });
          setExistingFriends(Array.from(friendEmails));
          setUsersLoaded(true);
        } catch (err) {
          console.error('Failed to load data:', err);
          setUsersLoaded(true);
        }
      };
      loadData();
    }
  }, [open, usersLoaded, userEmail]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await base44.functions.invoke('searchUsersByDisplayName', { userEmail, searchQuery: query });
      setSearchResults(response.data.users || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendUser) => {
   setIsAdding(true);
   try {
     // Get sender's display name for notification
     const senderUser = await base44.auth.me();

     // Fetch fresh friend data to get current display_name
     const freshFriendData = await base44.auth.me();
     if (friendUser.email !== senderUser.email) {
       const friendUsers = await base44.entities.User.list();
       const freshFriend = friendUsers.find(u => u.email === friendUser.email);
       if (freshFriend) friendUser = { ...friendUser, display_name: freshFriend.display_name };
     }

     // Create friend request
     await base44.entities.Friend.create({
       user_email: userEmail,
       user_display_name: senderUser.display_name,
       friend_email: friendUser.email,
       friend_display_name: friendUser.display_name,
       status: 'pending'
     });

     // Notify receiver of friend request
     await base44.entities.Notification.create({
       user_email: friendUser.email,
       type: 'friend_request_sent',
       title: 'Friend Request',
       message: `${senderUser.display_name} sent you a friend request`,
       related_user_email: userEmail,
       related_user_name: senderUser.display_name
     });

     // Optimistically update the cache
     queryClient.setQueryData(['friendships', userEmail], (old = []) => [
       ...old,
       {
         id: 'temp-' + Date.now(),
         user_email: userEmail,
         user_display_name: senderUser.display_name,
         friend_email: friendUser.email,
         friend_display_name: friendUser.display_name,
         status: 'pending',
         created_date: new Date().toISOString()
       }
     ]);

     setExistingFriends([...existingFriends, friendUser.email]);
     setSearchQuery('');
     setSearchResults([]);
     onFriendAdded?.();
   } catch (err) {
     console.error('Failed to add friend:', err);
   } finally {
     setIsAdding(false);
   }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by display name..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isSearching && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            )}
            
            {!isSearching && searchResults.length === 0 && searchQuery && (
              <p className="text-sm text-gray-500 text-center py-8">No users found matching "{searchQuery}"</p>
            )}

            {!isSearching && searchResults.map(user => (
              <Card key={user.id} className="p-3 bg-white">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-gray-900">{user.display_name}</p>
                  <Button
                    size="sm"
                    onClick={() => handleAddFriend(user)}
                    disabled={isAdding}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Add
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}