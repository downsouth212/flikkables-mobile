import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSound } from '@/components/audio/useSound';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LogOut, Bell, Users, Eye, Loader2, Volume2, VolumeX, User as UserIcon, Sparkles } from 'lucide-react';
import AvatarSelector from '@/components/avatar/AvatarSelector';
import HomeLocationChanger from '@/components/settings/HomeLocationChanger';
import TemplateAvatarGenerator from '@/components/avatar/TemplateAvatarGenerator';

export default function UserSettingsMenu({ open, onClose, user, userLocation }) {
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    notifications_popups: true,
    allow_friend_requests: true,
    show_online_status: true,
    private_profile: false,
    theme: 'light',
  });
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showTemplateGenerator, setShowTemplateGenerator] = useState(false);
  const { soundEnabled, toggleSound } = useSound();

  useEffect(() => {
    if (open && user) {
      // Load user settings from data field
      if (user.data) {
        setSettings(prev => ({
          ...prev,
          ...user.data
        }));
      }
    }
  }, [open, user]);

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    setLoading(true);
    
    try {
      await base44.auth.updateMe({
        data: {
          ...settings,
          [key]: newValue
        }
      });
    } catch (err) {
      console.error('Failed to update settings:', err);
      setSettings(prev => ({ ...prev, [key]: !newValue }));
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setSettings(prev => ({ ...prev, theme: newTheme }));
    setLoading(true);
    
    try {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      await base44.auth.updateMe({
        data: {
          ...settings,
          theme: newTheme
        }
      });
    } catch (err) {
      console.error('Failed to update theme:', err);
      setSettings(prev => ({ ...prev, theme: settings.theme }));
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Apply theme on mount
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Avatar Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <UserIcon className="w-4 h-4" />
              Profile Avatar
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAvatarSelector(true)}
                className="flex-1 justify-start"
              >
                {user?.data?.avatar_url ? (
                  <img src={user.data.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full mr-2" />
                ) : (
                  <UserIcon className="w-4 h-4 mr-2" />
                )}
                Selfie
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTemplateGenerator(true)}
                className="flex-1 justify-start"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Template
              </Button>
            </div>
          </div>

          {/* Home Location Section */}
          <div className="space-y-3">
            <HomeLocationChanger 
              user={user} 
              userLocation={userLocation}
              onLocationChanged={() => {
                // Don't reload, just stay in settings
              }}
            />
          </div>

          {/* Notifications Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Bell className="w-4 h-4" />
              Notifications
            </div>
            <div className="space-y-3 pl-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications_enabled" className="text-sm cursor-pointer">
                  Enable Notifications
                </Label>
                <Switch
                  id="notifications_enabled"
                  checked={settings.notifications_enabled}
                  onCheckedChange={() => handleToggle('notifications_enabled')}
                  disabled={loading}
                />
              </div>
              {settings.notifications_enabled && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications_popups" className="text-sm cursor-pointer">
                    Pop-up Notifications
                  </Label>
                  <Switch
                    id="notifications_popups"
                    checked={settings.notifications_popups}
                    onCheckedChange={() => handleToggle('notifications_popups')}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Friends Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Users className="w-4 h-4" />
              Friends
            </div>
            <div className="flex items-center justify-between pl-4">
              <Label htmlFor="allow_friend_requests" className="text-sm cursor-pointer">
                Allow Friend Requests
              </Label>
              <Switch
                id="allow_friend_requests"
                checked={settings.allow_friend_requests}
                onCheckedChange={() => handleToggle('allow_friend_requests')}
                disabled={loading}
              />
            </div>
          </div>

          {/* Privacy Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Eye className="w-4 h-4" />
                Privacy
              </div>
              <div className="space-y-3 pl-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_online_status" className="text-sm cursor-pointer">
                    Show Online Status
                  </Label>
                  <Switch
                    id="show_online_status"
                    checked={settings.show_online_status}
                    onCheckedChange={() => handleToggle('show_online_status')}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="private_profile" className="text-sm cursor-pointer">
                    Private Profile (hidden from searches)
                  </Label>
                  <Switch
                    id="private_profile"
                    checked={settings.private_profile}
                    onCheckedChange={() => handleToggle('private_profile')}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Audio Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Audio
              </div>
              <div className="flex items-center justify-between pl-4">
                <Label htmlFor="sound_toggle" className="text-sm cursor-pointer">
                  Sound Effects
                </Label>
                <Switch
                  id="sound_toggle"
                  checked={soundEnabled}
                  onCheckedChange={toggleSound}
                />
              </div>
            </div>

          </div>

        <div className="flex gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button
            onClick={() => base44.auth.logout()}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <AvatarSelector
          open={showAvatarSelector}
          onClose={() => setShowAvatarSelector(false)}
          user={user}
        />
        <TemplateAvatarGenerator
          open={showTemplateGenerator}
          onClose={() => setShowTemplateGenerator(false)}
          user={user}
        />
      </DialogContent>
    </Dialog>
  );
}