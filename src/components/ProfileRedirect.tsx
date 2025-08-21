import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from './LoadingSpinner';

export const ProfileRedirect: React.FC = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('Auth error or no user:', authError);
          setError(true);
          return;
        }

        // Get database user ID from provider_id
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('id')
          .eq('provider_id', user.id)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user data:', userError);
          setError(true);
          return;
        }

        setUserId(userData.id);
      } catch (err) {
        console.error('Error in ProfileRedirect:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserId();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" text="Redirecting to your profile..." />;
  }

  if (error || !userId) {
    // If error or no user, redirect to users page
    return <Navigate to="/users" replace />;
  }

  // Redirect to user's profile page
  return <Navigate to={`/user/${userId}`} replace />;
};