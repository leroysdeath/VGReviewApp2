import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserSettingsPanel } from '../components/profile/UserSettingsPanel';
import { authService } from '../services/authService';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current authenticated user
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          navigate('/login');
          return;
        }

        // Fetch user profile data from database
        const { data: userProfile, error: profileError } = await supabase
          .from('user')
          .select('*')
          .eq('provider_id', currentUser.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          // If user doesn't exist in database, create default profile
          const defaultUserData = {
            username: currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email || '',
            displayName: currentUser.user_metadata?.full_name || '',
            bio: '',
            location: '',
            website: '',
            avatar: currentUser.user_metadata?.avatar_url || null,
            notifications: {
              email: true,
              push: true,
              reviews: true,
              mentions: true,
              followers: true,
              achievements: true
            }
          };
          setUserData(defaultUserData);
        } else {
          // Transform database user data to match UserSettingsPanel interface
          const transformedUserData = {
            username: userProfile.name || currentUser.email?.split('@')[0] || 'User',
            email: userProfile.email || currentUser.email || '',
            displayName: userProfile.display_name || userProfile.name || '',
            bio: userProfile.bio || '',
            location: userProfile.location || '',
            website: userProfile.website || '',
            avatar: userProfile.picurl || currentUser.user_metadata?.avatar_url || null,
            notifications: {
              email: true,
              push: true,
              reviews: true,
              mentions: true,
              followers: true,
              achievements: true
            }
          };
          setUserData(transformedUserData);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load user settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  const handleSave = async (data: any) => {
    try {
      // Update auth user metadata
      const { error: authError } = await authService.updateProfile({
        username: data.username,
        avatar: data.avatar
      });

      if (authError) {
        throw new Error('Failed to update auth profile');
      }

      // Update user profile in database
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        const { error: dbError } = await supabase
          .from('user')
          .upsert({
            provider_id: currentUser.id,
            provider: 'supabase',
            email: data.email,
            name: data.username,
            display_name: data.displayName,
            bio: data.bio,
            location: data.location,
            website: data.website,
            picurl: data.avatar || currentUser.user_metadata?.avatar_url
          }, {
            onConflict: 'provider_id'
          });

        if (dbError) {
          console.error('Database update error:', dbError);
          throw new Error('Failed to update profile in database');
        }
      }

      // Update local state
      setUserData(data);
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  const handlePasswordChange = async () => {
    // Handle password change logic
    console.log('Password change requested');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        // Delete user data from database
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          await supabase
            .from('user')
            .delete()
            .eq('provider_id', currentUser.id);
        }

        // Sign out and redirect
        await authService.signOut();
        navigate('/');
      } catch (error) {
        console.error('Error deleting account:', error);
        setError('Failed to delete account. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingSpinner size="lg" text="Loading settings..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-300 font-medium mb-2">Error Loading Settings</h3>
              <p className="text-red-200 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        <UserSettingsPanel
          initialData={userData}
          onSave={handleSave}
          onPasswordChange={handlePasswordChange}
          onDeleteAccount={handleDeleteAccount}
        />
      </div>
    </div>
  );
};
