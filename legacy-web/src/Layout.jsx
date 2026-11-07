import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Compass, Trophy, User, Settings, ArrowLeftRight, Sparkles, LogOut, Users, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Toaster } from '@/components/ui/sonner';
import { useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from '@tanstack/react-query';
import NotificationMenu from '@/components/notifications/NotificationMenu';
import { useSound } from '@/components/audio/useSound';
import UserSettingsMenu from '@/components/settings/UserSettingsMenu';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);
  const [showSettings, setShowSettings] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState(null);
  const { soundEnabled, toggleSound } = useSound();
  const [pageSettings, setPageSettings] = React.useState({ show_guilds: true, show_map: true });

  useEffect(() => {
    // Apply theme from user settings
    const applyTheme = async () => {
      try {
        const userData = await base44.auth.me();
        const theme = userData?.data?.theme || 'light';
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch (err) {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme();
  }, []);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
    
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation(null)
      );
    }
    
    // Load page visibility settings
    const loadPageSettings = async () => {
      try {
        const settings = await base44.entities.Settings.filter({});
        const newSettings = { show_guilds: true, show_map: true };
        settings.forEach(s => {
          if (s.setting_key === 'show_guilds') newSettings.show_guilds = s.setting_value === 'true';
          if (s.setting_key === 'show_map') newSettings.show_map = s.setting_value === 'true';
        });
        setPageSettings(newSettings);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadPageSettings();
    
    // Update last_seen every 3 minutes
    const updateLastSeen = async () => {
      try {
        await base44.auth.updateMe({ last_seen: new Date().toISOString() });
      } catch (err) {
        // silently ignore - not critical
      }
    };
    
    const timeout = setTimeout(updateLastSeen, 3000); // Delay initial update by 3s
    const interval = setInterval(updateLastSeen, 3 * 60 * 1000); // Every 3 minutes
    
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, []);

  const isAdmin = user?.role === 'admin';

  // Get pending trades count for badge
  const { data: pendingTrades = [] } = useQuery({
    queryKey: ['pending-trades', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.TradeOffer.filter(
        { to_user_email: user.email, status: 'pending' },
        '-created_date'
      );
    },
    enabled: !!user?.email,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // every 60s instead of 5s
  });

  // Get unread nearby notifications for badge
  const { data: nearbyNotifications = [] } = useQuery({
    queryKey: ['nearby-notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const notifications = await base44.entities.Notification.filter(
        { user_email: user.email, read: false },
        '-created_date'
      );
      return notifications.filter(n => n.type === 'flick_landed' && n.metadata);
    },
    enabled: !!user?.email,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000, // every 60s instead of 5s
  });

  const allNavItems = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Explore', icon: Compass, page: 'Explore', badgeCount: nearbyNotifications.length },
    { name: 'Map', icon: Globe, page: 'CountryMap', visible: pageSettings.show_map },
    { name: 'Friends', icon: Users, page: 'Friends' },
    { name: 'Guilds', icon: Users, page: 'Guilds', visible: pageSettings.show_guilds },
    { name: 'Trade', icon: ArrowLeftRight, page: 'Trade' },
  ];

  const navItems = allNavItems.filter(item => item.visible !== false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" richColors />

      {currentPageName !== 'Onboarding' && (
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
          <NotificationMenu />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center hover:from-violet-200 hover:to-pink-200 transition-colors shadow-lg">
                <User className="w-5 h-5 text-violet-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowSettings(true)} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {children}

      <UserSettingsMenu
        open={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        userLocation={userLocation}
      />

      {currentPageName !== 'Onboarding' && user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 safe-area-pb z-50">
        <div className="max-w-lg mx-auto px-2">
          <div className="flex items-center justify-between py-2 overflow-x-auto scrollbar-hide">
            {navItems.map(({ name, icon: Icon, page, badgeCount = 0 }) => {
              const isActive = currentPageName === page;
              const hasBadge = (page === 'Trade' && pendingTrades.length > 0) || (page === 'Explore' && badgeCount > 0);
              const count = page === 'Trade' ? pendingTrades.length : badgeCount;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className="relative flex flex-col items-center py-2 px-3 flex-shrink-0"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-0.5 w-12 h-1 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                    />
                  )}
                  <div className="relative">
                    <Icon 
                      className={`w-6 h-6 transition-colors ${
                        isActive ? 'text-violet-600' : 'text-gray-400'
                      }`} 
                    />
                    {hasBadge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                      >
                        {count > 9 ? '9+' : count}
                      </motion.span>
                    )}
                  </div>
                  <span className={`text-xs mt-1 transition-colors ${
                    isActive ? 'text-violet-600 font-medium' : 'text-gray-400'
                  }`}>
                    {name}
                  </span>
                </Link>
              );
            })}
            {isAdmin && (
              <>
                <Link
                  to={createPageUrl('Admin')}
                  className="relative flex flex-col items-center py-2 px-3 flex-shrink-0"
                >
                  {currentPageName === 'Admin' && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-0.5 w-12 h-1 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                    />
                  )}
                  <Settings 
                    className={`w-6 h-6 transition-colors ${
                      currentPageName === 'Admin' ? 'text-violet-600' : 'text-gray-400'
                    }`} 
                  />
                  <span className={`text-xs mt-1 transition-colors ${
                    currentPageName === 'Admin' ? 'text-violet-600 font-medium' : 'text-gray-400'
                  }`}>
                    Admin
                  </span>
                </Link>
                <Link
                  to={createPageUrl('AdminTemplates')}
                  className="relative flex flex-col items-center py-2 px-3 flex-shrink-0"
                >
                  {currentPageName === 'AdminTemplates' && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -top-0.5 w-12 h-1 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                    />
                  )}
                  <Sparkles 
                    className={`w-6 h-6 transition-colors ${
                      currentPageName === 'AdminTemplates' ? 'text-violet-600' : 'text-gray-400'
                    }`} 
                  />
                  <span className={`text-xs mt-1 transition-colors ${
                    currentPageName === 'AdminTemplates' ? 'text-violet-600 font-medium' : 'text-gray-400'
                  }`}>
                    Templates
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
        </nav>
      )}

      <style>{`
        .safe-area-pb {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }

        .emoji-marker {
          background: transparent !important;
          border: none !important;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}