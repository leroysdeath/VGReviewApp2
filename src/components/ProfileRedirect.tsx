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
        console.log('🔄 ProfileRedirect: Starting user ID fetch...');
        
        // Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('🔐 ProfileRedirect: Auth user result:', { 
          hasUser: !!user, 
          userId: user?.id, 
          authError: authError?.message 
        });
        
        if (authError || !user) {
          console.error('❌ ProfileRedirect: Auth error or no user:', authError);
          console.log('🔀 ProfileRedirect: Redirecting to /users due to auth failure');
          setError(true);
          return;
        }

        console.log('🔍 ProfileRedirect: Looking up database user for provider_id:', user.id);
        
        // Get database user ID from provider_id
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('id')
          .eq('provider_id', user.id)
          .single();

        console.log('💾 ProfileRedirect: Database lookup result:', { 
          userData, 
          userError: userError?.message,
          errorCode: userError?.code 
        });

        if (userError || !userData) {
          console.error('❌ ProfileRedirect: Error fetching user data:', userError);
          console.log('🔀 ProfileRedirect: Redirecting to /users due to database error');
          setError(true);
          return;
        }

        console.log('✅ ProfileRedirect: Successfully found user ID:', userData.id);
        console.log('🔀 ProfileRedirect: Will redirect to /user/' + userData.id);
        setUserId(userData.id);
      } catch (err) {
        console.error('💥 ProfileRedirect: Unexpected error:', err);
        console.log('🔀 ProfileRedirect: Redirecting to /users due to unexpected error');
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

  if (error) {
    // If error, redirect to home page instead of users page
    console.log('🔀 ProfileRedirect: Redirecting to home due to error');
    return <Navigate to="/" replace />;
  }
  
  if (!userId) {
    // Still loading or no user found
    return <LoadingSpinner size="lg" text="Finding your profile..." />;
  }

  // Redirect to user's profile page
  return <Navigate to={`/user/${userId}`} replace />;
};