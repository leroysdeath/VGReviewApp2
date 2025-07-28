import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the user's profile page using their ID
    if (user?.id) {
      navigate(`/user/${user.id}`, { replace: true });
    }
  }, [user, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading profile...</div>
    </div>
  );
};

export default ProfilePage;
