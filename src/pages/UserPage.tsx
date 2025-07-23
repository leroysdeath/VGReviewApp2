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
  location?: string;
  website?: string;
}

interface UserReview {
  id: string;
  rating: number;
  review?: string;
  post_date_time: string;
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

  // Safe avatar URL function
  const getSafeAvatarUrl = (avatarUrl?: string | null): string => {
    if (!avatarUrl || avatarUrl.trim() === '') {
      return 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150';
    }
    return avatarUrl;
  };

  // Safe string access function
  const getSafeString = (value?: string | null, fallback: string = ''): string => {
    return value && typeof value === 'string' ? value : fallback;
  };

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
        
        // Fetch user data with comprehensive error handling
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('*')
          .eq('id', id)
          .single();
          
        if (userError || !userData) {
          console.error('User fetch error:', userError);
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
        const gameIds = (reviewsData || [])
          .map(review => review?.game_id)
          .filter(Boolean);
        
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
  
  // Transform user data to match expected format with comprehensive null safety
  const transformedUser = {
    id: user.id || '',
    username: getSafeString(user.name, 'Unknown User'),
    avatar: getSafeAvatarUrl(user.picurl),
    bio: getSafeString(user.bio, 'Gaming enthusiast'),
    joinDate: user.created_at 
      ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : 'Unknown',
    location: getSafeString(user.location),
    website: getSafeString(user.website)
  };
  
  // Calculate user stats safely
  const stats = {
    films: userReviews.length,
    thisYear: userReviews.filter(r => {
      try {
        return r.post_date_time && new Date(r.post_date_time).getFullYear() === new Date().getFullYear();
      } catch {
        return false;
      }
    }).length,
    lists: 0, // To be implemented with real data
    following: 0, // To be implemented with real data
    followers: 0 // To be implemented with real data
  };

  // Sort reviews safely
  const sortedReviews = [...userReviews].sort((a, b) => {
    try {
      switch (reviewFilter) {
        case 'highest':
          return (b.rating || 0) - (a.rating || 0);
        case 'lowest':
          return (a.rating || 0) - (b.rating || 0);
        case 'oldest':
          if (!a.post_date_time || !b.post_date_time) return 0;
          return new Date(a.post_date_time).getTime() - new Date(b.post_date_time).getTime();
        default:
          if (!a.post_date_time || !b.post_date_time) return 0;
          return new Date(b.post_date_time).getTime() - new Date(a.post_date_time).getTime();
      }
    } catch (error) {
      console.error('Error sorting reviews:', error);
      return 0;
    }
  });

  return (
    <UserPageLayout
      user={transformedUser}
      stats={stats}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      isDummy={false}
    >
      <UserPageContent
        activeTab={activeTab}
        sortedReviews={sortedReviews}
        allGames={games}
        reviewFilter={reviewFilter}
        onReviewFilterChange={setReviewFilter}
        isDummy={false}
      />
    </UserPageLayout>
  );
};
