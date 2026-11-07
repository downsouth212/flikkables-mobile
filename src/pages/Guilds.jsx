import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Search, TrendingUp, Trophy, MessageCircle, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function GuildsPage() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent, level, members, countries
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: guilds = [] } = useQuery({
    queryKey: ['guilds'],
    queryFn: () => base44.entities.Guild.list('-created_date', 100),
  });

  const { data: countryOwnerships = [] } = useQuery({
    queryKey: ['country-ownerships-guilds'],
    queryFn: () => base44.entities.CountryOwnership.filter({ owner_type: 'guild' }),
  });

  const { data: myMembership } = useQuery({
    queryKey: ['my-guild', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const memberships = await base44.entities.GuildMember.filter(
        { user_email: user.email },
        '-created_date',
        1
      );
      return memberships[0] || null;
    },
    enabled: !!user?.email,
  });

  const createGuildMutation = useMutation({
    mutationFn: async (data) => {
      const guild = await base44.entities.Guild.create({
        ...data,
        leader_email: user.email,
        leader_name: user.display_name || user.full_name,
        member_count: 1,
        total_distance: 0,
        total_flicks: 0,
        total_stamps: 0,
        level: 1,
      });

      await base44.entities.GuildMember.create({
        guild_id: guild.id,
        guild_name: guild.name,
        user_email: user.email,
        user_name: user.display_name || user.full_name,
        role: 'leader',
      });

      return guild;
    },
    onSuccess: (guild) => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['my-guild'] });
      setShowCreateModal(false);
      toast.success('Guild created!');
      navigate(createPageUrl('GuildDetail') + `?id=${guild.id}`);
    },
  });

  const joinGuildMutation = useMutation({
    mutationFn: async (guild) => {
      if (myMembership) {
        throw new Error('Already in a guild');
      }

      if ((user.passport_stamps || 0) < guild.join_requirement_stamps) {
        throw new Error(`Need ${guild.join_requirement_stamps} stamps to join`);
      }

      if (guild.member_count >= guild.max_members) {
        throw new Error('Guild is full');
      }

      const totalFee = (guild.joining_fee || 0);
      if ((user.passport_stamps || 0) < totalFee) {
        throw new Error('Not enough stamps for joining fee');
      }

      // Deduct joining fee
      if (totalFee > 0) {
        await base44.auth.updateMe({ 
          passport_stamps: (user.passport_stamps || 0) - totalFee 
        });

        // Add to guild treasury
        await base44.entities.Guild.update(guild.id, {
          treasury: (guild.treasury || 0) + totalFee
        });
      }

      await base44.entities.GuildMember.create({
        guild_id: guild.id,
        guild_name: guild.name,
        user_email: user.email,
        user_name: user.display_name || user.full_name,
        role: 'member',
        last_daily_fee_paid: new Date().toISOString().split('T')[0]
      });

      await base44.entities.Guild.update(guild.id, {
        member_count: (guild.member_count || 0) + 1,
      });

      // Log activity
      await base44.entities.GuildActivity.create({
        guild_id: guild.id,
        user_email: user.email,
        user_name: user.display_name || user.full_name,
        activity_type: 'member_joined',
        description: `${user.display_name || user.full_name} joined the guild`
      });
    },
    onSuccess: (_, guild) => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['my-guild'] });
      toast.success(`Joined ${guild.name}!`);
      navigate(createPageUrl('GuildDetail') + `?id=${guild.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Add country count to each guild
  const guildsWithCountries = guilds.map(g => ({
    ...g,
    country_count: countryOwnerships.filter(o => o.owner_id === g.id).length
  }));

  const filteredAndSortedGuilds = guildsWithCountries
    .filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'level') return b.level - a.level;
      if (sortBy === 'members') return b.member_count - a.member_count;
      if (sortBy === 'countries') return b.country_count - a.country_count;
      return 0; // recent (default order from API)
    });

  const getLevelProgress = (guild) => {
    const xpNeeded = guild.level * 10000;
    return Math.min((guild.total_distance / xpNeeded) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-16">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Guilds</h1>
          <p className="text-sm text-gray-500">Join forces with other players</p>
        </div>
        
        {!myMembership && (
          <div className="mb-6">
            <Button onClick={() => setShowCreateModal(true)} className="bg-violet-500 hover:bg-violet-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Guild
            </Button>
          </div>
        )}

        {myMembership && (
          <Card className="p-4 mb-6 bg-gradient-to-br from-violet-50 to-pink-50 border-violet-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Your Guild</p>
                <h3 className="text-lg font-bold text-gray-900">{myMembership.guild_name}</h3>
              </div>
              <Button 
                onClick={() => navigate(createPageUrl('GuildDetail') + `?id=${myMembership.guild_id}`)}
                size="sm"
              >
                View
              </Button>
            </div>
          </Card>
        )}

        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search guilds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('recent')}
              className="whitespace-nowrap"
            >
              Recent
            </Button>
            <Button
              variant={sortBy === 'level' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('level')}
              className="whitespace-nowrap"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              By Level
            </Button>
            <Button
              variant={sortBy === 'members' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('members')}
              className="whitespace-nowrap"
            >
              <Users className="w-3 h-3 mr-1" />
              By Members
            </Button>
            <Button
              variant={sortBy === 'countries' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('countries')}
              className="whitespace-nowrap"
            >
              <Trophy className="w-3 h-3 mr-1" />
              By Countries
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredAndSortedGuilds.map((guild) => (
            <motion.div
              key={guild.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-2xl">
                    {guild.emoji || '🏰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{guild.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{guild.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (myMembership?.guild_id === guild.id) {
                            navigate(createPageUrl('GuildDetail') + `?id=${guild.id}`);
                          } else if (myMembership) {
                            toast.error('Already in a guild');
                          } else {
                            joinGuildMutation.mutate(guild);
                          }
                        }}
                        disabled={joinGuildMutation.isPending}
                        className={myMembership?.guild_id === guild.id ? 'bg-violet-500' : ''}
                      >
                        {myMembership?.guild_id === guild.id ? 'View' : 'Join'}
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {guild.member_count}/{guild.max_members}
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Level {guild.level}
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {guild.country_count || 0} countries
                      </div>
                      {(guild.joining_fee > 0 || guild.daily_fee > 0) && (
                        <div className="flex items-center gap-1 text-amber-600">
                          🛂 {guild.joining_fee || 0}{guild.daily_fee > 0 ? `+${guild.daily_fee}/day` : ''}
                        </div>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                          style={{ width: `${getLevelProgress(guild)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {filteredAndSortedGuilds.length === 0 && (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No guilds found</p>
            </Card>
          )}
        </div>
      </div>

      <CreateGuildModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => createGuildMutation.mutate(data)}
        isPending={createGuildMutation.isPending}
      />
    </div>
  );
}

function CreateGuildModal({ open, onClose, onCreate, isPending }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    emoji: '🏰',
    is_public: true,
    join_requirement_stamps: 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Guild name required');
      return;
    }
    onCreate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Guild</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter guild name"
              maxLength={30}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your guild"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Emoji</label>
            <Input
              value={formData.emoji}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              placeholder="🏰"
              maxLength={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Minimum Stamps to Join</label>
            <Input
              type="number"
              value={formData.join_requirement_stamps}
              onChange={(e) => setFormData({ ...formData, join_requirement_stamps: parseInt(e.target.value) || 0 })}
              min={0}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1 bg-violet-500">
              {isPending ? 'Creating...' : 'Create Guild'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}