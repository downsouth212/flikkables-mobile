import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSound } from '@/components/audio/useSound';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, UserPlus, Users, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FriendCard from '@/components/friends/FriendCard';
import AddFriendModal from '@/components/friends/AddFriendModal';
import BattleSelector from '@/components/battles/BattleSelector';
import FlickDuel from '@/components/battles/FlickDuel';
import PickupRace from '@/components/battles/PickupRace';
import TimedChallenge from '@/components/battles/TimedChallenge';
import HeadToHead from '@/components/battles/HeadToHead';
import DistanceDerby from '@/components/battles/DistanceDerby';
import LocationChain from '@/components/battles/LocationChain';
import SurvivalSprint from '@/components/battles/SurvivalSprint';
import LandmarkHunt from '@/components/battles/LandmarkHunt';
import { toast } from 'sonner';

export default function Friends() {
  const [user, setUser] = useState(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showBattleSelector, setShowBattleSelector] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [activeBattle, setActiveBattle] = useState(null);
  const queryClient = useQueryClient();
  const { play: playSound } = useSound();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: friendships = [], isLoading } = useQuery({
    queryKey: ['friendships', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // Get all friendships where user is involved
      const allFriends = await base44.entities.Friend.filter({});
      const sent = allFriends.filter(f => f.user_email === user.email);
      const received = allFriends.filter(f => f.friend_email === user.email);
      
      // Fetch all users to enrich friend data with display_name
      const allUsers = await base44.entities.User.list();
      const userMap = allUsers.reduce((acc, u) => {
        acc[u.email] = u.display_name;
        return acc;
      }, {});
      
      // Enrich friendships with display_name from user data if missing
      const enriched = [...sent, ...received].map(f => ({
        ...f,
        user_display_name: f.user_display_name || userMap[f.user_email],
        friend_display_name: f.friend_display_name || userMap[f.friend_email]
      }));
      
      return enriched;
    },
    enabled: !!user?.email,
  });

  const acceptMutation = useMutation({
    mutationFn: async (friend) => {
      await base44.entities.Friend.update(friend.id, { status: 'accepted' });
      
      // Notify sender that request was accepted
       await base44.entities.Notification.create({
         user_email: friend.user_email,
         type: 'friend_request_accepted',
         title: 'Friend Request Accepted',
         message: `${friend.friend_display_name} accepted your friend request`,
         related_user_email: user.email,
         related_user_name: user.display_name || user.full_name
       });
    },
    onSuccess: () => {
       playSound('success');
       queryClient.invalidateQueries({ queryKey: ['friendships'] });
     },
    });

    const rejectMutation = useMutation({
    mutationFn: async (friend) => {
      await base44.entities.Friend.delete(friend.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (friend) => {
      await base44.entities.Friend.delete(friend.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (friend) => {
      // Find and delete the friendship record
      const friendshipToDelete = friendships.find(
        f => f.status === 'accepted' && 
        ((f.user_email === user.email && f.friend_email === friend.friend_email) ||
         (f.friend_email === user.email && f.user_email === friend.friend_email))
      );
      if (friendshipToDelete) {
        await base44.entities.Friend.delete(friendshipToDelete.id);
      }
    },
    onSuccess: () => {
      playSound('notification');
      toast.success('Friend removed');
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  const handleBattleSelected = (battleType, wagerAmount, aiDifficulty = null) => {
    setActiveBattle({ 
      type: battleType, 
      wager: wagerAmount,
      is_ai: !!aiDifficulty,
      ai_difficulty: aiDifficulty,
      opponent_name: aiDifficulty ? `${aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)} AI` : selectedFriend?.friend_name
    });
  };

  const handleBattleComplete = async (won) => {
    if (!activeBattle) return;
    
    const stakes = activeBattle.wager || 0;
    const isAI = activeBattle.is_ai;
    const winner = won ? user.email : (isAI ? 'AI' : selectedFriend.friend_email);
    const loser = won ? (isAI ? 'AI' : selectedFriend.friend_email) : user.email;

    try {
      await base44.entities.Battle.create({
        battle_type: activeBattle.type,
        initiator_email: user.email,
          initiator_name: user.display_name,
        opponent_email: isAI ? 'AI' : selectedFriend.friend_email,
        opponent_name: isAI ? activeBattle.opponent_name : selectedFriend.friend_name,
        status: 'completed',
        winner_email: winner,
        stakes,
        is_ai: isAI,
        ai_difficulty: isAI ? activeBattle.ai_difficulty : null,
      });

      // Award stamps only if wager > 0 and won (no stamps deducted for AI losses)
      if (stakes > 0 && won) {
        await base44.auth.updateMe({ passport_stamps: (user.passport_stamps || 0) + stakes });
        setUser({ ...user, passport_stamps: (user.passport_stamps || 0) + stakes });
      }

      playSound(won ? 'success' : 'notification');
      if (stakes > 0 && won) {
        toast.success(`You won ${stakes} stamps! 🎉`);
      } else {
        toast.success(won ? 'You won! 🎉' : 'Better luck next time!');
      }
      setActiveBattle(null);
      setSelectedFriend(null);
    } catch (err) {
      toast.error('Failed to save battle result');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // Separate friendships
  const acceptedFriends = friendships.filter(
    f => f.status === 'accepted' && (f.user_email === user.email || f.friend_email === user.email)
  );
  
  const pendingRequests = friendships.filter(
    f => f.status === 'pending' && f.friend_email === user.email
  );
  
  const sentRequests = friendships.filter(
    f => f.status === 'pending' && f.user_email === user.email
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50">
      <div className="max-w-lg mx-auto px-4 pt-20 py-6 pb-24">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              Friends
            </h1>
            <p className="text-sm text-gray-500 mt-1">Connect with other players</p>
          </div>
          <Button
            onClick={() => setShowAddFriend(true)}
            className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        </motion.div>

        {/* Tabs */}
         <Tabs defaultValue="friends" className="w-full">
           <TabsList className="w-full bg-white/50 border border-gray-100 p-1 rounded-xl mb-4 grid grid-cols-4">
             <TabsTrigger value="friends" className="rounded-lg data-[state=active]:bg-white text-xs">
               Friends ({acceptedFriends.length})
             </TabsTrigger>
             <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-white text-xs">
               Requests ({pendingRequests.length})
             </TabsTrigger>
             <TabsTrigger value="sent" className="rounded-lg data-[state=active]:bg-white text-xs">
               Sent ({sentRequests.length})
             </TabsTrigger>
             <TabsTrigger value="battles" className="rounded-lg data-[state=active]:bg-white text-xs">
               Battles
             </TabsTrigger>
           </TabsList>

          <TabsContent value="friends" className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : acceptedFriends.length === 0 ? (
              <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No Friends Yet</h3>
                <p className="text-sm text-gray-500 mb-4">Add friends to share adventures!</p>
                <Button
                  onClick={() => setShowAddFriend(true)}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Friend
                </Button>
              </Card>
            ) : (
               <AnimatePresence>
                 {acceptedFriends.map(friend => {
                    const displayFriend = friend.user_email === user.email 
                      ? { ...friend, friend_display_name: friend.friend_display_name, friend_email: friend.friend_email }
                      : { ...friend, friend_display_name: friend.user_display_name, friend_email: friend.user_email };
                    return (
                     <div key={friend.id} className="flex gap-2">
                       <div className="flex-1">
                         <FriendCard
                           friend={displayFriend}
                           type="accepted"
                           onRemove={() => removeMutation.mutate(friend)}
                           isLoading={removeMutation.isPending}
                           currentUserEmail={user?.email}
                         />
                       </div>
                       <div className="flex items-center">
                         <Button
                           onClick={() => {
                             setSelectedFriend(displayFriend);
                             setShowBattleSelector(true);
                           }}
                           size="sm"
                           variant="outline"
                           className="border-violet-200 hover:bg-violet-50"
                           title="Challenge to battle"
                         >
                           <Swords className="w-4 h-4" />
                         </Button>
                       </div>
                     </div>
                   );
                 })}
               </AnimatePresence>
             )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
                <p className="text-sm text-gray-500">No pending friend requests</p>
              </Card>
            ) : (
              <AnimatePresence>
                {pendingRequests.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={{ ...friend, friend_display_name: friend.user_display_name }}
                    type="pending"
                      onAccept={() => acceptMutation.mutate(friend)}
                      onReject={() => rejectMutation.mutate(friend)}
                      isLoading={acceptMutation.isPending || rejectMutation.isPending}
                      />
                      ))}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : sentRequests.length === 0 ? (
              <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
                <p className="text-sm text-gray-500">No sent friend requests</p>
              </Card>
            ) : (
              <AnimatePresence>
                {sentRequests.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    type="sent"
                    onReject={() => cancelMutation.mutate(friend)}
                    isLoading={cancelMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            )}
            </TabsContent>

            <TabsContent value="battles" className="space-y-3">
            <Card className="p-8 text-center bg-white/80 backdrop-blur border-0 shadow-lg">
              <Swords className="w-12 h-12 text-violet-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Friend Battles</h3>
              <p className="text-sm text-gray-500">Select a friend from the Friends tab and click the battle icon to challenge them!</p>
            </Card>
            </TabsContent>
            </Tabs>
            </div>

            {selectedFriend && (
            <BattleSelector
            open={showBattleSelector}
            onClose={() => setShowBattleSelector(false)}
            friend={selectedFriend}
            onSelectBattle={handleBattleSelected}
            user={user}
            allowAI={true}
            />
            )}

            {activeBattle && (selectedFriend || activeBattle.is_ai) && (
              <>
                {activeBattle.type === 'flick_duel' && (
                  <FlickDuel battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
                {activeBattle.type === 'pickup_race' && (
                  <PickupRace battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
                {activeBattle.type === 'timed_challenge' && (
                  <TimedChallenge battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
                {activeBattle.type === 'head_to_head' && (
                  <HeadToHead battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
                {activeBattle.type === 'distance_derby' && (
                  <DistanceDerby battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
                {activeBattle.type === 'location_chain' && (
                  <LocationChain battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
                {activeBattle.type === 'survival_sprint' && (
                  <SurvivalSprint battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
                {activeBattle.type === 'landmark_hunt' && (
                  <LandmarkHunt battle={{ ...activeBattle }} onComplete={handleBattleComplete} user={user} />
                )}
              </>
            )}

            <AddFriendModal
        open={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        userEmail={user.email}
        onFriendAdded={() => {
          setShowAddFriend(false);
          queryClient.invalidateQueries({ queryKey: ['friendships'] });
        }}
      />
    </div>
  );
}