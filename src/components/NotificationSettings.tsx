import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  UserPlus, 
  Calendar, 
  DollarSign,
  Trophy,
  Users,
  Info,
  Save,
  RefreshCw
} from 'lucide-react';
import { NotificationType, NotificationPreference, NotificationSettings as NotificationSettingsType } from '../types/activity';
import { activityService } from '../services/activityService';
import { useAuth } from '../hooks/useAuth';
import { CollapsibleSection } from './CollapsibleSection';

interface NotificationSettingsProps {
  onSave?: (settings: NotificationSettingsType) => void;
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onSave,
  className = ''
}) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digestFrequency, setDigestFrequency] = useState<'daily' | 'weekly' | 'never'>('weekly');
  const [muteAll, setMuteAll] = useState(false);
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00'
  });

  // Notification types with descriptions
  const notificationTypes: { type: NotificationType; label: string; description: string; icon: React.ReactNode }[] = [
    {
      type: 'review_mention',
      label: 'Review Mentions',
      description: 'When someone mentions you in a review',
      icon: <MessageSquare className="h-5 w-5 text-purple-400" />
    },
    {
      type: 'comment_reply',
      label: 'Comment Replies',
      description: 'When someone replies to your comment',
      icon: <MessageSquare className="h-5 w-5 text-blue-400" />
    },
    {
      type: 'user_followed',
      label: 'New Followers',
      description: 'When someone follows you',
      icon: <UserPlus className="h-5 w-5 text-green-400" />
    },
    {
      type: 'game_release',
      label: 'Game Releases',
      description: 'When a game on your wishlist is released',
      icon: <Calendar className="h-5 w-5 text-orange-400" />
    },
    {
      type: 'price_drop',
      label: 'Price Drops',
      description: 'When a game on your wishlist drops in price',
      icon: <DollarSign className="h-5 w-5 text-green-400" />
    },
    {
      type: 'community_milestone',
      label: 'Community Milestones',
      description: 'When you or the community reaches a milestone',
      icon: <Trophy className="h-5 w-5 text-yellow-400" />
    },
    {
      type: 'friend_activity',
      label: 'Friend Activity',
      description: 'When users you follow post reviews or ratings',
      icon: <Users className="h-5 w-5 text-blue-400" />
    },
    {
      type: 'system_announcement',
      label: 'System Announcements',
      description: 'Important updates about GameVault',
      icon: <Info className="h-5 w-5 text-purple-400" />
    },
    {
      type: 'weekly_digest',
      label: 'Weekly Digest',
      description: 'A summary of activity from the past week',
      icon: <Mail className="h-5 w-5 text-purple-400" />
    }
  ];

  // Load notification preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const userId = parseInt(user.id);
        const userPreferences = await activityService.getNotificationPreferences(userId);
        
        // If no preferences exist, create default ones
        if (userPreferences.length === 0) {
          const defaultPreferences: NotificationPreference[] = notificationTypes.map(({ type }) => ({
            id: 0,
            user_id: userId,
            notification_type: type,
            email_enabled: true,
            push_enabled: true,
            in_app_enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          setPreferences(defaultPreferences);
        } else {
          setPreferences(userPreferences);
        }
      } catch (err) {
        console.error('Error loading notification preferences:', err);
        setError('Failed to load notification preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user, notificationTypes]);

  // Update a preference
  const updatePreference = (
    type: NotificationType,
    channel: 'email' | 'push' | 'in_app',
    enabled: boolean
  ) => {
    setPreferences(prev => 
      prev.map(pref => 
        pref.notification_type === type
          ? {
              ...pref,
              email_enabled: channel === 'email' ? enabled : pref.email_enabled,
              push_enabled: channel === 'push' ? enabled : pref.push_enabled,
              in_app_enabled: channel === 'in_app' ? enabled : pref.in_app_enabled
            }
          : pref
      )
    );
  };

  // Save all preferences
  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const userId = parseInt(user.id);
      
      // Save each preference
      for (const pref of preferences) {
        await activityService.updateNotificationPreference(
          userId,
          pref.notification_type,
          pref.email_enabled,
          pref.push_enabled,
          pref.in_app_enabled
        );
      }
      
      // Prepare settings object for callback
      const settings: NotificationSettingsType = {
        preferences: preferences.reduce((acc, pref) => ({
          ...acc,
          [pref.notification_type]: {
            email: pref.email_enabled,
            push: pref.push_enabled,
            inApp: pref.in_app_enabled
          }
        }), {} as Record<NotificationType, { email: boolean; push: boolean; inApp: boolean }>),
        digestFrequency,
        muteAll,
        quietHours
      };
      
      if (onSave) {
        onSave(settings);
      }
      
      // Show success message
      alert('Notification preferences saved successfully');
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  // Toggle all notifications for a channel
  const toggleAllForChannel = (channel: 'email' | 'push' | 'in_app', enabled: boolean) => {
    setPreferences(prev => 
      prev.map(pref => ({
        ...pref,
        email_enabled: channel === 'email' ? enabled : pref.email_enabled,
        push_enabled: channel === 'push' ? enabled : pref.push_enabled,
        in_app_enabled: channel === 'in_app' ? enabled : pref.in_app_enabled
      }))
    );
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (!user) return;

    const userId = parseInt(user.id);
    const defaultPreferences: NotificationPreference[] = notificationTypes.map(({ type }) => ({
      id: 0,
      user_id: userId,
      notification_type: type,
      email_enabled: true,
      push_enabled: true,
      in_app_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    setPreferences(defaultPreferences);
    setDigestFrequency('weekly');
    setMuteAll(false);
    setQuietHours({
      enabled: false,
      start: '22:00',
      end: '08:00'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-600 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-600 rounded"></div>
                <div className="h-10 bg-gray-600 rounded"></div>
                <div className="h-10 bg-gray-600 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset</span>
          </button>
          
          <button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Global settings */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-white mb-4">Global Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium text-white">Mute All Notifications</h4>
              <p className="text-sm text-gray-400">Temporarily disable all notifications</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={muteAll}
                onChange={(e) => setMuteAll(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium text-white">Quiet Hours</h4>
              <p className="text-sm text-gray-400">Disable notifications during specific hours</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={quietHours.enabled}
                onChange={(e) => setQuietHours(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          
          {quietHours.enabled && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={quietHours.start}
                    onChange={(e) => setQuietHours(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={quietHours.end}
                    onChange={(e) => setQuietHours(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium text-white">Weekly Digest</h4>
              <p className="text-sm text-gray-400">Receive a summary of activity</p>
            </div>
            
            <select
              value={digestFrequency}
              onChange={(e) => setDigestFrequency(e.target.value as 'daily' | 'weekly' | 'never')}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Channel toggles */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-white mb-4">Notification Channels</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-3 px-4"></th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-purple-400" />
                    <span className="text-white">Email</span>
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-purple-400" />
                    <span className="text-white">Push</span>
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-purple-400" />
                    <span className="text-white">In-App</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700 text-sm">
                <td className="py-3 px-4 text-gray-400">All Notifications</td>
                <td className="py-3 px-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.every(p => p.email_enabled)}
                      onChange={(e) => toggleAllForChannel('email', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </td>
                <td className="py-3 px-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.every(p => p.push_enabled)}
                      onChange={(e) => toggleAllForChannel('push', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </td>
                <td className="py-3 px-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.every(p => p.in_app_enabled)}
                      onChange={(e) => toggleAllForChannel('in_app', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Notification type preferences */}
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Notification Types</h3>
        
        <div className="space-y-4">
          {notificationTypes.map(({ type, label, description, icon }) => {
            const preference = preferences.find(p => p.notification_type === type) || {
              email_enabled: true,
              push_enabled: true,
              in_app_enabled: true
            };
            
            return (
              <CollapsibleSection
                key={type}
                title={label}
                icon={icon}
                defaultOpen={false}
                headerClassName="bg-gray-700 hover:bg-gray-650"
                contentClassName="bg-gray-750"
              >
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">{description}</p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <Mail className="h-5 w-5 text-purple-400" />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preference.email_enabled}
                          onChange={(e) => updatePreference(type, 'email', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className="text-xs text-gray-400">Email</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <Smartphone className="h-5 w-5 text-purple-400" />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preference.push_enabled}
                          onChange={(e) => updatePreference(type, 'push', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className="text-xs text-gray-400">Push</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2">
                      <Bell className="h-5 w-5 text-purple-400" />
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preference.in_app_enabled}
                          onChange={(e) => updatePreference(type, 'in_app', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                      <span className="text-xs text-gray-400">In-App</span>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            );
          })}
        </div>
      </div>
    </div>
  );
};