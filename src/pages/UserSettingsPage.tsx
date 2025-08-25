import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  MapPin, 
  Link as LinkIcon, 
  Edit,
  Gamepad2,
  Calendar,
  Shield,
  Bell,
  Globe,
  AtSign
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUserProfile, updateUserProfile, ProfileUpdateData } from '../services/profileService';
import type { UserProfile } from '../services/profileService';
import { UserSettingsModal } from '../components/profile/UserSettingsModal';

const UserSettingsPage: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, loading, navigate]);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await getCurrentUserProfile();
        
        if (response.success && response.data) {
          setUserProfile(response.data);
        } else {
          setError(response.error || 'Failed to load profile');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user]);

  // Handle profile save - memoized to prevent unnecessary re-renders
  const handleSaveProfile = useCallback(async (profileData: ProfileUpdateData) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const updateResult = await updateUserProfile(user.id, profileData);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Profile update failed');
      }

      // Update local state with the updated data (cache is automatically updated in service)
      setUserProfile(updateResult.data);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }, [user?.id]); // Only recreate if user ID changes

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-4">Unable to load your profile.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-gray-400">
            Manage your account information and preferences.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
          {/* Profile Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  {userProfile.avatar_url || userProfile.avatar_url ? (
                    <img
                      src={userProfile.avatar_url || userProfile.avatar_url}
                      alt={userProfile.username || userProfile.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                      {(userProfile.username || userProfile.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {userProfile.display_name || userProfile.username || userProfile.name}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-400">
                    <AtSign className="h-4 w-4" />
                    <span>{userProfile.username || userProfile.name}</span>
                  </div>
                  {userProfile.bio && (
                    <p className="text-gray-300 mt-2 max-w-md">
                      {userProfile.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{userProfile.email}</p>
                  </div>
                </div>

                {userProfile.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Location</p>
                      <p className="text-white">{userProfile.location}</p>
                    </div>
                  </div>
                )}

                {userProfile.website && (
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Website</p>
                      <a 
                        href={userProfile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {userProfile.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-3">Account Information</h3>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Member since</p>
                    <p className="text-white">{formatJoinDate(userProfile.created_at)}</p>
                  </div>
                </div>

                {userProfile.platform && (
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Gaming Platforms</p>
                      <p className="text-white">{userProfile.platform}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Account Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-white">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors text-left"
          >
            <Edit className="h-5 w-5 text-purple-400 mb-2" />
            <h3 className="font-semibold text-white mb-1">Edit Profile</h3>
            <p className="text-sm text-gray-400">Update your profile information</p>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors text-left"
          >
            <Shield className="h-5 w-5 text-blue-400 mb-2" />
            <h3 className="font-semibold text-white mb-1">Security</h3>
            <p className="text-sm text-gray-400">Change password and email</p>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors text-left"
          >
            <Bell className="h-5 w-5 text-yellow-400 mb-2" />
            <h3 className="font-semibold text-white mb-1">Account</h3>
            <p className="text-sm text-gray-400">Manage account settings</p>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          userId={user?.id || ''}
          userData={userProfile ? {
            username: userProfile.username || userProfile.name || '',
            displayName: userProfile.display_name || '',
            email: userProfile.email || '',
            bio: userProfile.bio || '',
            location: userProfile.location || '',
            website: userProfile.website || '',
            platform: userProfile.platform || '',
            avatar: userProfile.avatar_url || userProfile.avatar_url || ''
          } : undefined}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

export default UserSettingsPage;