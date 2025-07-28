import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get the user's database profile to find their user.id
        const { data: userProfile, error } = await authService.getUserProfile(user.id);
        
        if (!error && userProfile?.id) {
          // Redirect to the user page with the database user ID
          navigate(`/user/${userProfile.id}`, { replace: true });
        } else {
          console.error('Error fetching user profile:', error);
          // If we can't find the profile, just use the auth user ID
          // This might need adjustment based on your ID structure
          navigate(`/user/${user.id}`, { replace: true });
        }
      } catch (error) {
        console.error('Error in profile redirect:', error);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, navigate]);

  // Show loading while determining where to redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If no user, the ProtectedRoute should handle this
  return null;
};

export default ProfilePage;
