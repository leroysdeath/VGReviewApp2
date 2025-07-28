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
    // Remove the redirect - let ProtectedRoute handle authentication
    if (user) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      setAvatarUrl(publicUrl);
    } catch (error: any) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading profile...</div>
      </div>
    );
  }

  // If no user, ProtectedRoute will handle showing the auth modal
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-gray-400">👤</span>
                </div>
              )}
              <div>
                <h2 className="text-2xl font-semibold">
                  {profile?.display_name || profile?.username || user?.email}
                </h2>
                <p className="text-gray-400">@{profile?.username || 'user'}</p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Edit Profile
            </button>
          </div>

          {profile?.bio && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Bio</h3>
              <p className="text-gray-300">{profile.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile?.location && (
              <div>
                <span className="text-gray-400">Location:</span>
                <span className="ml-2">{profile.location}</span>
              </div>
            )}
            {profile?.website && (
              <div>
                <span className="text-gray-400">Website:</span>
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-purple-400 hover:underline"
                >
                  {profile.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
            
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
