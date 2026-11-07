import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Target, TrendingUp, Send, Crown, Shield, LogOut, UserPlus, Settings, Activity, ShoppingBag, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BlockUserButton from '@/components/user/BlockUserButton';
import GuildSettings from '@/components/guild/GuildSettings';
import GuildTreasury from '@/components/guild/GuildTreasury';
import ActivityFeed from '@/components/guild/ActivityFeed';
import GuildEvents from '@/components/guild/GuildEvents';
import GuildShop from '@/components/guild/GuildShop';
import GuildQuests from '@/components/guild/GuildQuests';

export default function GuildDetailPage() {
  const [user, setUser] = useState(null);
  const [guildId, setGuildId] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser);
    const params = new URLSearchParams(window.location.search);
    setGuildId(params.get('id'));
  }, []);

  const { data: guild } = useQuery({
    queryKey: ['guild', guildId],
    queryFn: async () => {
      const guilds = await base44.entities.Guild.filter({ id: guildId });
      return guilds[0];
    },
    enabled: !!guildId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['guild-members', guildId],
    queryFn: () => base44.entities.GuildMember.filter({ guild_id: guildId }, '-created_date', 100),
    enabled: !!guildId,
  });

  // Fetch blocked users
  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blocked-users', user?.email],
    queryFn: () => base44.entities.BlockedUser.filter({ blocker_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['guild-chat', guildId],
    queryFn: () => base44.entities.GuildChat.filter({ guild_id: guildId }, '-created_date', 100),
    enabled: !!guildId,
    refetchInterval: 3000,
  });

  // Filter out messages from blocked users
  const blockedEmails = new Set(blockedUsers.map(b => b.blocked_email));
  const filteredMessages = messages.filter(msg => !blockedEmails.has(msg.user_email));

  const { data: goals = [] } = useQuery({
    queryKey: ['guild-goals', guildId],
    queryFn: () => base44.entities.GuildGoal.filter({ guild_id: guildId }, '-created_date', 50),
    enabled: !!guildId,
  });

  const myMembership = members.find(m => m.user_email === user?.email);
  const isLeader = myMembership?.role === 'leader';
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const sendMessageMutation = useMutation({
    mutationFn: async (message) => {
      return base44.entities.GuildChat.create({
        guild_id: guildId,
        user_email: user.email,
        user_name: user.display_name || user.full_name,
        message: message.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild-chat'] });
      setChatMessage('');
    },
  });

  const leaveGuildMutation = useMutation({
    mutationFn: async () => {
      const leaderCount = members.filter(m => m.role === 'leader').length;
      if (isLeader && leaderCount === 1) {
        throw new Error('Last leader must appoint another leader before leaving');
      }
      await base44.entities.GuildMember.delete(myMembership.id);
      await base44.entities.Guild.update(guildId, {
        member_count: (guild.member_count || 1) - 1,
      });
    },
    onSuccess: () => {
      toast.success('Left guild');
      navigate(-1);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const appointLeaderMutation = useMutation({
    mutationFn: async (newLeaderMembership) => {
      // Update new member's role to leader
      await base44.entities.GuildMember.update(newLeaderMembership.id, {
        role: 'leader'
      });
    },
    onSuccess: () => {
      toast.success('New leader appointed');
      queryClient.invalidateQueries({ queryKey: ['guild-members'] });
      queryClient.invalidateQueries({ queryKey: ['guild'] });
      setShowMemberActions(false);
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: async (member) => {
      // Check if already friends
      const allFriends = await base44.entities.Friend.filter({});
      const existingFriendship = allFriends.find(f =>
        (f.user_email === user.email && f.friend_email === member.user_email) ||
        (f.friend_email === user.email && f.user_email === member.user_email)
      );

      if (existingFriendship) {
        throw new Error('Already friends or request pending');
      }

      // Create friend request
      await base44.entities.Friend.create({
        user_email: user.email,
        user_display_name: user.display_name || user.full_name,
        friend_email: member.user_email,
        friend_display_name: member.user_name,
        status: 'pending'
      });

      // Send notification
      await base44.entities.Notification.create({
        user_email: member.user_email,
        type: 'friend_request_sent',
        title: 'Friend Request',
        message: `${user.display_name || user.full_name} sent you a friend request`,
        related_user_email: user.email,
        related_user_name: user.display_name || user.full_name
      });
    },
    onSuccess: () => {
      toast.success('Friend request sent!');
      setShowMemberActions(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendMessageMutation.mutate(chatMessage);
    }
  };

  if (!guild || !myMembership) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const getLevelProgress = () => {
    const xpNeeded = guild.level * 10000;
    return Math.min((guild.total_distance / xpNeeded) * 100, 100);
  };

  const roleIcons = {
    leader: <Crown className="w-3 h-3" />,
    officer: <Shield className="w-3 h-3" />,
    member: <Users className="w-3 h-3" />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-violet-50 to-pink-50 border-violet-200">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center text-3xl">
              {guild.emoji || '🏰'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{guild.name}</h1>
              <p className="text-sm text-gray-600 mt-1">{guild.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-4 h-4" />
                  {guild.member_count}/{guild.max_members}
                </div>
                <div className="flex items-center gap-1 text-violet-600 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  Level {guild.level}
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress to Level {guild.level + 1}</span>
                  <span>{Math.round(getLevelProgress())}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                    style={{ width: `${getLevelProgress()}%` }}
                  />
                </div>
              </div>
            </div>
            {isLeader && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="mt-4"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </Card>

        {/* Treasury */}
        <GuildTreasury guild={guild} user={user} canManage={isLeader} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{Math.round(guild.total_distance).toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Total KM</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-pink-600">{guild.total_flicks.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Flicks</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{guild.total_stamps.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Stamps</p>
          </Card>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="w-4 h-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="events">
              <Swords className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="shop">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Shop
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <Card className="p-4 h-96 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                <AnimatePresence>
                  {filteredMessages.slice().reverse().map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.user_email === user?.email ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        msg.user_email === user?.email
                          ? 'bg-violet-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {msg.user_email !== user?.email && (
                          <p className="text-xs opacity-75 mb-1">{msg.user_name}</p>
                        )}
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!chatMessage.trim() || sendMessageMutation.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4 space-y-2">
            {members.map((member) => (
              <Card 
                key={member.id} 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (member.user_email !== user?.email) {
                    setSelectedMember(member);
                    setShowMemberActions(true);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{member.user_name}</p>
                        <Badge variant="outline" className="text-xs">
                          {roleIcons[member.role]}
                          <span className="ml-1">{member.role}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {Math.round(member.contribution_distance).toLocaleString()} km contributed
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="goals" className="mt-4 space-y-3">
            {goals.map((goal) => (
              <Card key={goal.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
                    <Target className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{goal.title}</h3>
                        <p className="text-sm text-gray-600">{goal.description}</p>
                      </div>
                      {goal.completed && (
                        <Badge className="bg-green-100 text-green-700">Completed</Badge>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</span>
                        <span>{Math.round((goal.current / goal.target) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                          style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {goals.length === 0 && (
              <Card className="p-12 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active goals</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityFeed guildId={guildId} />
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <GuildEvents guildId={guildId} />
          </TabsContent>

          <TabsContent value="shop" className="mt-4">
            <GuildShop guild={guild} isLeader={isLeader} />
          </TabsContent>
        </Tabs>

        {/* Quests Section */}
        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Guild Quests
          </h2>
          <GuildQuests guildId={guildId} userEmail={user?.email} />
        </div>

        <Button
          variant="outline"
          onClick={() => leaveGuildMutation.mutate()}
          disabled={leaveGuildMutation.isPending}
          className="w-full mt-6 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Leave Guild
        </Button>
      </div>

      {/* Member Actions Dialog */}
      <Dialog open={showMemberActions} onOpenChange={setShowMemberActions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMember?.user_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              onClick={() => addFriendMutation.mutate(selectedMember)}
              disabled={addFriendMutation.isPending}
              className="w-full justify-start"
              variant="outline"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
            {selectedMember && (
              <BlockUserButton
                targetEmail={selectedMember.user_email}
                targetName={selectedMember.user_name}
                currentUserEmail={user?.email}
                variant="outline"
                size="default"
              />
            )}
            {isLeader && selectedMember?.role !== 'leader' && (
              <Button
                onClick={() => {
                  if (window.confirm(`Appoint ${selectedMember.user_name} as guild leader? They will share leadership with you.`)) {
                    appointLeaderMutation.mutate(selectedMember);
                  }
                }}
                disabled={appointLeaderMutation.isPending}
                className="w-full justify-start bg-violet-600 hover:bg-violet-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Appoint as Leader
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GuildSettings
        guild={guild}
        isLeader={isLeader}
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}