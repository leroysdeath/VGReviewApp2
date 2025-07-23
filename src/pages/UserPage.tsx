import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { UserPageLayout } from '../components/UserPageLayout';
import { UserPageContent } from '../components/UserPageContent';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface User {
  id: string;
  name: string;
  bio?: string;
  picurl?: string;
  created_at: string;
}

interface UserReview {
  id: string;
  rating: number;
  review?: string;
  created_at: string;
  game_id: string;
  user_id: string;
  game?: any;
}

interface Game {
  id: string;
  title: string;
  cover_image?: string;
  // Add other game properties as needed
}

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'top5' | 'last5' | 'reviews' | 'activity' | 'lists'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [user, setUser] = useState<User | null>(null);
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) {
        setError('No user ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user data with error handling
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('*')
          .eq('id', id)
          .single();
          
        if (userError) {
          console.error('User fetch error:', userError);
          throw new Error('User not found');
        }

        if (!userData) {
          throw new Error('User not found');
        }
        
        // Fetch user reviews with proper error handling
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('rating')
          .select(`
            *,
            game:game_id(*)
          `)
          .eq('user_id', id);
          
        if (reviewsError) {
          console.error('Reviews fetch error:', reviewsError);
          // Don't throw here, just log and continue with empty reviews
          setUserReviews([]);
        } else {
          setUserReviews(reviewsData || []);
        }
        
        // Get game IDs from reviews safely
        const gameIds = (reviewsData || []).map(review => review.game_id).filter(Boolean);
        
        if (gameIds.length > 0) {
          // Fetch games data
          const { data: gamesData, error: gamesError } = await supabase
            .from('game')
            .select('*')
            .in('id', gameIds);
            
          if (gamesError) {
            console.error('Games fetch error:', gamesError);
            setGames([]);
          } else {
            setGames(gamesData || []);
          }
        } else {
          setGames([]);
        }
        
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [id]);

  // Loading state
  if (loading) {
    return <LoadingSpinner size="lg" text="Loading user profile..." />;
  }
  
  // Error state or user not found
  if (error || !user) {
    return <Navigate to="/users" replace />;
  }
  
  // Transform user data to match expected format with safe avatar handling
  const transformedUser = {
    id: user.id,
    username: user.name || 'Unknown User',
    avatar: user.picurl || null, // Explicitly handle null/undefined
    bio: user.bio || 'Gaming enthusiast',
    joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown',
    stats: {
      gamesPlayed: games.length,
      reviews: userReviews.length,
      averageRating: userReviews.length > 0 
        ? userReviews.reduce((acc, review) => acc + (review.rating || 0), 0) / userReviews.length 
        : 0,
      followers: 0, // Add actual followers count if available
      following: 0  // Add actual following count if available
    }
  };

  // Safe avatar URL function
  const getAvatarUrl = (avatarUrl?: string | null) => {
    if (!avatarUrl) {
      return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150';
    }
    return avatarUrl;
  };

  // Update transformed user with safe avatar
  const safeTransformedUser = {
    ...transformedUser,
    avatar: getAvatarUrl(transformedUser.avatar)
  };

  return (
    <UserPageLayout user={safeTransformedUser}>
      <UserPageContent
        user={safeTransformedUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reviewFilter={reviewFilter}
        setReviewFilter={setReviewFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        games={games}
        reviews={userReviews}
      />
    </UserPageLayout>
  );
};
