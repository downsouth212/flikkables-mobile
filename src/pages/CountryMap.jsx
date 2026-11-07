import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Globe, Trophy, Users, User, Search, Crown, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CountryMap() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, individual, guild

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: ownerships = [] } = useQuery({
    queryKey: ['country-ownerships'],
    queryFn: () => base44.entities.CountryOwnership.list('-flikkable_count', 100),
    refetchInterval: 10000,
  });

  const { data: myGuild } = useQuery({
    queryKey: ['my-guild', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const memberships = await base44.entities.GuildMember.filter({ user_email: user.email });
      return memberships[0] || null;
    },
    enabled: !!user?.email,
  });

  const filteredOwnerships = ownerships
    .filter(o => {
      if (filterType === 'individual') return o.owner_type === 'individual';
      if (filterType === 'guild') return o.owner_type === 'guild';
      return true;
    })
    .filter(o => 
      o.country_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const myOwnedCountries = ownerships.filter(o => 
    (o.owner_type === 'individual' && o.owner_id === user?.email) ||
    (o.owner_type === 'guild' && o.owner_id === myGuild?.guild_id)
  );

  const individualOwned = ownerships.filter(o => o.owner_type === 'individual').length;
  const guildOwned = ownerships.filter(o => o.owner_type === 'guild').length;

  const topOwners = [...ownerships]
    .reduce((acc, curr) => {
      const key = `${curr.owner_type}-${curr.owner_id}`;
      if (!acc[key]) {
        acc[key] = {
          type: curr.owner_type,
          id: curr.owner_id,
          name: curr.owner_name,
          count: 0,
          totalFlikkables: 0
        };
      }
      acc[key].count++;
      acc[key].totalFlikkables += curr.flikkable_count;
      return acc;
    }, {});

  const leaderboard = Object.values(topOwners)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Country Ownership
            </h1>
          </div>
          <p className="text-gray-600">Compete to control countries around the world</p>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-700">{ownerships.length}</p>
            <p className="text-xs text-gray-600">Countries Claimed</p>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
            <User className="w-8 h-8 text-violet-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-violet-700">{individualOwned}</p>
            <p className="text-xs text-gray-600">Individual</p>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <Users className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-700">{guildOwned}</p>
            <p className="text-xs text-gray-600">Guild</p>
          </Card>
        </div>

        {/* My Countries */}
        {myOwnedCountries.length > 0 && (
          <Card className="p-4 mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Your Countries ({myOwnedCountries.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {myOwnedCountries.map(country => (
                <Badge key={country.id} className="bg-green-600 text-white">
                  {country.country_name} ({country.flikkable_count})
                </Badge>
              ))}
            </div>
            <p className="text-xs text-green-700 mt-3">
              💰 Earning {myOwnedCountries.reduce((sum, c) => sum + 10 + Math.floor(c.total_flikkables_in_country / 5) * 5, 0)} stamps/day from ownership
            </p>
          </Card>
        )}

        <Tabs defaultValue="map" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="map">
              <MapPin className="w-4 h-4 mr-2" />
              Country List
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search countries or owners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All
              </Button>
              <Button
                variant={filterType === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('individual')}
              >
                <User className="w-4 h-4 mr-1" />
                Individual
              </Button>
              <Button
                variant={filterType === 'guild' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('guild')}
              >
                <Users className="w-4 h-4 mr-1" />
                Guild
              </Button>
            </div>

            {/* Country Cards */}
            <div className="grid gap-3">
              <AnimatePresence>
                {filteredOwnerships.map((country, index) => {
                  const isOwner = (country.owner_type === 'individual' && country.owner_id === user?.email) ||
                                  (country.owner_type === 'guild' && country.owner_id === myGuild?.guild_id);
                  const benefit = 10 + Math.floor(country.total_flikkables_in_country / 5) * 5;

                  return (
                    <motion.div
                      key={country.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card className={`p-4 ${isOwner ? 'border-green-300 bg-green-50' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{country.country_name}</h3>
                              {isOwner && <Crown className="w-4 h-4 text-green-600" />}
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                {country.owner_type === 'individual' ? (
                                  <User className="w-4 h-4 text-violet-500" />
                                ) : (
                                  <Users className="w-4 h-4 text-amber-500" />
                                )}
                                <span className="font-medium">{country.owner_name}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {country.flikkable_count} flikkables
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                              <span>📍 {country.total_flikkables_in_country} total in country</span>
                              <span>•</span>
                              <span>💰 {benefit} stamps/day</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredOwnerships.length === 0 && (
                <Card className="p-12 text-center">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No countries found</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-3">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Top Country Owners
              </h3>
              <p className="text-sm text-gray-600">Most countries controlled</p>
            </div>

            {leaderboard.map((owner, index) => (
              <Card key={`${owner.type}-${owner.id}`} className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-700' :
                    index === 1 ? 'bg-gray-200 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {owner.type === 'individual' ? (
                        <User className="w-4 h-4 text-violet-500" />
                      ) : (
                        <Users className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="font-semibold">{owner.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{owner.count} countries</span>
                      <span>•</span>
                      <span>{owner.totalFlikkables} flikkables</span>
                    </div>
                  </div>
                  {index < 3 && (
                    <Trophy className={`w-6 h-6 ${
                      index === 0 ? 'text-amber-500' :
                      index === 1 ? 'text-gray-400' :
                      'text-orange-500'
                    }`} />
                  )}
                </div>
              </Card>
            ))}

            {leaderboard.length === 0 && (
              <Card className="p-12 text-center">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No country owners yet</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Benefits Info */}
        <Card className="p-4 mt-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Country Ownership Benefits
          </h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Base: 10 stamps per day per country</li>
            <li>• Bonus: +5 stamps per 5 flikkables in country</li>
            <li>• Guild ownership adds to guild treasury</li>
            <li>• Individual ownership goes to your account</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}