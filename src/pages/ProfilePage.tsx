import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../utils/supabaseClient';
import { SettingsModal } from '../components/SettingsModal';

interface Profile {
  username: string;
  display_name: string;
  bio: string;
  location: string;
  website: string;
  avatar_url: string;
}

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // REMOVED the useEffect that was redirecting to login

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Settings form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        // Initialize settings form with profile data
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setSettingsLoading(true);
      const { error } = await supabase.from('profiles').upsert({
        id: user?.id,
        display_name: displayName,
        bio,
        location,
        website,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Update local profile state
      setProfile(prev => prev ? {
        ...prev,
        display_name: displayName,
        bio,
        location,
        website,
        avatar_url: avatarUrl
      } : null);

      alert('Profile updated successfully!');
      setIsSettingsOpen(false); // Close modal on success
    } catch (error: any) {
      alert('Error updating profile: ' + error.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setSettingsLoading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
    } catch (error: any) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Profile not found</div>;
  }

  // Generate user initial from username
  const getUserInitial = (username: string): string => {
    return username.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-900 py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-purple-900 to-blue-900 relative">
            {/* Gear Button - positioned top-right */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors backdrop-blur-sm"
              aria-label="Edit profile settings"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          
          <div className="px-6 pb-6">
            <div className="flex justify-between items-end -mt-12 mb-4">
              {/* Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-24 h-24 rounded-full border-4 border-gray-800 object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-gray-800 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                    {getUserInitial(profile.username)}
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {profile.display_name || profile.username}
              </h2>
              <p className="text-gray-400 text-sm mb-3">@{profile.username}</p>
              
              {profile.bio && (
                <p className="text-gray-300 mb-4">{profile.bio}</p>
              )}
              
              <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-400">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{profile.location}</span>
                  </div>
                )}
                
                {profile.website && (
                  <div className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {profile.website.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
          <div className="p-6">
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent h-32 resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
                  Website
                </label>
                <input
                  id="website"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Avatar */}
              <div>
                <label htmlFor="avatar" className="block text-sm font-medium text-gray-300 mb-2">
                  Avatar
                </label>
                <input 
                  id="avatar" 
                  type="file" 
                  accept="image/*" 
                  onChange={uploadAvatar}
                  className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />
                {avatarUrl && (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar Preview" 
                    className="mt-2 w-20 h-20 rounded-full object-cover"
                  />
                )}
              </div>

              {/* Update Button */}
              <button
                onClick={updateProfile}
                disabled={settingsLoading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingsLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </SettingsModal>
      </div>
    </div>
  );
};

export default ProfilePage;
