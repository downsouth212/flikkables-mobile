import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, UserPlus, CheckCircle, AlertCircle, Lock, Trash2, MapPin, User, Swords, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import BattleToggle from '@/components/admin/BattleToggle';
import DropNearMe from '@/components/admin/DropNearMe';

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [showManageUsers, setShowManageUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateDummy, setShowCreateDummy] = useState(false);
  const [dummyEmail, setDummyEmail] = useState('');
  const [dummyPassword, setDummyPassword] = useState('');
  const [dummyName, setDummyName] = useState('');
  const [isCreatingDummy, setIsCreatingDummy] = useState(false);
  const [showSetLocation, setShowSetLocation] = useState(false);
  const [locationUser, setLocationUser] = useState(null);
  const [locationLat, setLocationLat] = useState('');
  const [locationLng, setLocationLng] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showDropNearMe, setShowDropNearMe] = useState(false);
  const [pickupRadius, setPickupRadius] = useState('0.05');
  const [isSavingRadius, setIsSavingRadius] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
    loadUsers();
    loadSettings();
    
    // Refresh users every 5 seconds
    const interval = setInterval(loadUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const [showGuilds, setShowGuilds] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showRaces, setShowRaces] = useState(true);
  const [isSavingPageVisibility, setIsSavingPageVisibility] = useState(false);

  const loadSettings = async () => {
    try {
      const settings = await base44.entities.Settings.filter({});
      settings.forEach(s => {
        if (s.setting_key === 'pickup_radius') setPickupRadius(s.setting_value);
        if (s.setting_key === 'show_guilds') setShowGuilds(s.setting_value === 'true');
        if (s.setting_key === 'show_map') setShowMap(s.setting_value === 'true');
        if (s.setting_key === 'show_races') setShowRaces(s.setting_value === 'true');
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveRadius = async () => {
    if (!pickupRadius || parseFloat(pickupRadius) <= 0) {
      toast.error('Please enter a valid radius');
      return;
    }
    
    setIsSavingRadius(true);
    try {
      const existing = await base44.entities.Settings.filter({ setting_key: 'pickup_radius' });
      if (existing.length > 0) {
        await base44.entities.Settings.update(existing[0].id, { setting_value: pickupRadius });
      } else {
        await base44.entities.Settings.create({
          setting_key: 'pickup_radius',
          setting_value: pickupRadius,
          description: 'Distance in km required to pick up a flikkable'
        });
      }
      toast.success(`Pickup radius updated to ${pickupRadius} km`);
    } catch (error) {
      toast.error('Failed to save radius');
      console.error(error);
    } finally {
      setIsSavingRadius(false);
    }
  };

  const handleSavePageVisibility = async () => {
    setIsSavingPageVisibility(true);
    try {
      // Save show_guilds setting
      const existingGuilds = await base44.entities.Settings.filter({ setting_key: 'show_guilds' });
      if (existingGuilds.length > 0) {
        await base44.entities.Settings.update(existingGuilds[0].id, { setting_value: showGuilds.toString() });
      } else {
        await base44.entities.Settings.create({
          setting_key: 'show_guilds',
          setting_value: showGuilds.toString(),
          description: 'Show Guilds page in navigation'
        });
      }

      // Save show_map setting
      const existingMap = await base44.entities.Settings.filter({ setting_key: 'show_map' });
      if (existingMap.length > 0) {
        await base44.entities.Settings.update(existingMap[0].id, { setting_value: showMap.toString() });
      } else {
        await base44.entities.Settings.create({
          setting_key: 'show_map',
          setting_value: showMap.toString(),
          description: 'Show Map page in navigation'
        });
      }

      // Save show_races setting
      const existingRaces = await base44.entities.Settings.filter({ setting_key: 'show_races' });
      if (existingRaces.length > 0) {
        await base44.entities.Settings.update(existingRaces[0].id, { setting_value: showRaces.toString() });
      } else {
        await base44.entities.Settings.create({
          setting_key: 'show_races',
          setting_value: showRaces.toString(),
          description: 'Enable Race functionality'
        });
      }

      toast.success('Feature settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setIsSavingPageVisibility(false);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const isUserOnline = (user) => {
    if (!user.last_seen) return false;
    const lastSeen = new Date(user.last_seen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / (1000 * 60);
    return diffMinutes < 5; // Online if seen within last 5 minutes
  };

  const getLastSeenText = (user) => {
    if (!user.last_seen) return 'Not set';
    const lastSeen = new Date(user.last_seen);
    const now = new Date();
    const diffMs = now - lastSeen;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 5) return 'Online now';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return diffHours === 0 ? `${diffMinutes} min ago` : diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }
  };

  const onlineUsers = users.filter(isUserOnline);

  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Inviting user:', email, role);
      await base44.users.inviteUser(email, role);
      toast.success(`Invitation sent to ${email}!`);
      setEmail('');
    } catch (error) {
      console.error('Invitation error:', error);
      toast.error(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLockUser = async () => {
    if (!selectedUser) return;
    try {
      await base44.entities.User.update(selectedUser.id, { locked: true });
      toast.success(`${selectedUser.email} has been locked`);
      setShowLockDialog(false);
      await loadUsers();
    } catch (error) {
      toast.error('Failed to lock user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await base44.entities.User.delete(selectedUser.id);
      toast.success(`${selectedUser.email} has been deleted`);
      setShowDeleteDialog(false);
      await loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleCreateDummy = async (e) => {
    e.preventDefault();
    if (!dummyEmail || !dummyPassword || !dummyName) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsCreatingDummy(true);
    try {
      await base44.users.inviteUser(dummyEmail, 'user');
      toast.success(`Dummy user ${dummyEmail} created!`);
      setDummyEmail('');
      setDummyPassword('');
      setDummyName('');
      await loadUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to create dummy user');
    } finally {
      setIsCreatingDummy(false);
    }
  };

  const handleSetLocation = async () => {
    if (!locationUser || !locationLat || !locationLng) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      // Update user data with home location coordinates
      const currentData = locationUser.data || {};
      await base44.entities.User.update(locationUser.id, {
        data: {
          ...currentData,
          home_location_lat: parseFloat(locationLat),
          home_location_lng: parseFloat(locationLng)
        }
      });
      toast.success(`Location set for ${locationUser.email || locationUser.display_name}`);
      setShowSetLocation(false);
      setLocationUser(null);
      setLocationLat('');
      setLocationLng('');
      await loadUsers();
    } catch (error) {
      toast.error('Failed to set location: ' + (error.message || 'Unknown error'));
      console.error('Set location error:', error);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600 mb-8">Manage your app users and settings</p>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            onClick={() => {
              setShowManageUsers(false);
              setShowCreateDummy(false);
              setShowSettings(false);
              setShowDropNearMe(false);
            }}
            variant={!showManageUsers && !showCreateDummy && !showSettings && !showDropNearMe ? "default" : "outline"}
            className={!showManageUsers && !showCreateDummy && !showSettings && !showDropNearMe ? "bg-gradient-to-r from-violet-500 to-pink-500" : ""}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Users
          </Button>
          <Button
            onClick={() => {
              setShowManageUsers(true);
              setShowCreateDummy(false);
              setShowSettings(false);
              setShowDropNearMe(false);
            }}
            variant={showManageUsers && !showCreateDummy && !showSettings && !showDropNearMe ? "default" : "outline"}
            className={showManageUsers && !showCreateDummy && !showSettings && !showDropNearMe ? "bg-gradient-to-r from-violet-500 to-pink-500" : ""}
          >
            Manage Users
          </Button>
          <Button
            onClick={() => {
              setShowCreateDummy(true);
              setShowManageUsers(false);
              setShowSettings(false);
              setShowDropNearMe(false);
            }}
            variant={showCreateDummy ? "default" : "outline"}
            className={showCreateDummy ? "bg-gradient-to-r from-violet-500 to-pink-500" : ""}
          >
            <User className="w-4 h-4 mr-2" />
            Create Dummy
          </Button>
          <Button
            onClick={() => {
              setShowSettings(true);
              setShowManageUsers(false);
              setShowCreateDummy(false);
              setShowDropNearMe(false);
            }}
            variant={showSettings ? "default" : "outline"}
            className={showSettings ? "bg-gradient-to-r from-violet-500 to-pink-500" : ""}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button
            onClick={() => {
              setShowDropNearMe(true);
              setShowManageUsers(false);
              setShowCreateDummy(false);
              setShowSettings(false);
            }}
            variant={showDropNearMe ? "default" : "outline"}
            className={showDropNearMe ? "bg-gradient-to-r from-violet-500 to-pink-500" : ""}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Drop Near Me
          </Button>
        </div>

        {showCreateDummy && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Create Dummy User
              </CardTitle>
              <CardDescription>
                Create test users with dummy credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDummy} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="dummy@test.com"
                    value={dummyEmail}
                    onChange={(e) => setDummyEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Password
                  </label>
                  <Input
                    type="text"
                    placeholder="dummy123"
                    value={dummyPassword}
                    onChange={(e) => setDummyPassword(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Password is for documentation only - Base44 handles auth</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Test User"
                    value={dummyName}
                    onChange={(e) => setDummyName(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isCreatingDummy}
                  className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
                >
                  {isCreatingDummy ? 'Creating...' : 'Create Dummy User'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {showDropNearMe && (
          <DropNearMe />
        )}

        {showSettings && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Game Settings
                </CardTitle>
                <CardDescription>
                  Configure game mechanics and parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Pickup Radius (km)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.05"
                      value={pickupRadius}
                      onChange={(e) => setPickupRadius(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      Distance in kilometers within which players can pick up flikkables
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveRadius}
                    disabled={isSavingRadius}
                    className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
                  >
                    {isSavingRadius ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Feature Settings
                </CardTitle>
                <CardDescription>
                  Control which features are enabled in the app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-guilds">Enable Guilds</Label>
                      <p className="text-xs text-gray-500">Display Guilds page in navigation</p>
                    </div>
                    <Switch
                      id="show-guilds"
                      checked={showGuilds}
                      onCheckedChange={setShowGuilds}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-map">Enable Map</Label>
                      <p className="text-xs text-gray-500">Display Map page in navigation</p>
                    </div>
                    <Switch
                      id="show-map"
                      checked={showMap}
                      onCheckedChange={setShowMap}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-races">Enable Races</Label>
                      <p className="text-xs text-gray-500">Enable race functionality in Explore</p>
                    </div>
                    <Switch
                      id="show-races"
                      checked={showRaces}
                      onCheckedChange={setShowRaces}
                    />
                  </div>
                  <Button
                    onClick={handleSavePageVisibility}
                    disabled={isSavingPageVisibility}
                    className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
                  >
                    {isSavingPageVisibility ? 'Saving...' : 'Save Feature Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="w-5 h-5" />
                  Friend Battles
                </CardTitle>
                <CardDescription>
                  Manage which battle types are available to players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BattleToggle />
              </CardContent>
            </Card>
          </div>
        )}

        {!showManageUsers && !showCreateDummy && !showSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Users
              </CardTitle>
              <CardDescription>
                Send email invitations to new users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Role
                  </label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {role === 'admin' 
                      ? 'Admins can invite other users and manage the app' 
                      : 'Regular users can play the game'}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
                >
                  {isLoading ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">How it works</p>
                    <p className="text-blue-700">
                      An email invitation will be sent to the user. They'll receive a link to create their account and start playing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showManageUsers && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manage Users</CardTitle>
                  <CardDescription>Lock or delete user accounts</CardDescription>
                </div>
                <div className="flex gap-3">
                  <div className="bg-emerald-50 px-4 py-2 rounded-lg">
                    <p className="text-xs text-gray-600">Online</p>
                    <p className="text-2xl font-bold text-emerald-600">{onlineUsers.length}</p>
                  </div>
                  <div className="bg-violet-50 px-4 py-2 rounded-lg">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-violet-600">{users.length}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-gray-500">No users found</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-2 h-2 rounded-full ${isUserOnline(u) ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{u.username || u.full_name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Last seen: {getLastSeenText(u)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLocationUser(u);
                            setLocationLat(u.home_location_lat?.toString() || u.data?.home_location_lat?.toString() || '');
                            setLocationLng(u.home_location_lng?.toString() || u.data?.home_location_lng?.toString() || '');
                            setShowSetLocation(true);
                          }}
                          className="text-blue-600"
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(u);
                            setShowLockDialog(true);
                          }}
                          className="text-amber-600"
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(u);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showLockDialog} onOpenChange={setShowLockDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lock User?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to lock {selectedUser?.email}? They will not be able to access the app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLockUser} className="bg-amber-600">Lock</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600">Delete</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSetLocation} onOpenChange={setShowSetLocation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Set User Location</AlertDialogTitle>
              <AlertDialogDescription>
                Manually set home location for {locationUser?.email}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="40.7128"
                  value={locationLat}
                  onChange={(e) => setLocationLat(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="-74.0060"
                  value={locationLng}
                  onChange={(e) => setLocationLng(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSetLocation} className="bg-blue-600">Set Location</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        </div>
        );
        }