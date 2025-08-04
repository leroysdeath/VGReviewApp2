import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { UserPageLayout } from '../components/UserPageLayout';
import { UserPageContent } from '../components/UserPageContent';
import { supabase } from '../services/supabase';
import { useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'top5' | 'last5' | 'reviews' | 'activity' | 'lists'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [user, setUser] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        console.log('🔍 Loading user data with real follower/following counts...');
        
        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('*')
          .eq('id', id)
          .single();
          
        if (userError) throw userError;
        
        // Fetch user reviews
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('rating')
          .select(`
            *,
            game:game_id(*)
          `)
          .eq('user_id', id);
          
        if (reviewsError) throw reviewsError;
        
        // Get game IDs from reviews
        const gameIds = reviewsData?.map(review => review.game_id) || [];
        
        // Fetch games data (only if there are game IDs)
        let gamesData = [];
        if (gameIds.length > 0) {
          const { data: fetchedGames, error: gamesError } = await supabase
            .from('game')
            .select('*')
            .in('id', gameIds);
            
          if (gamesError) throw gamesError;
          gamesData = fetchedGames || [];
        }
        
        // Fetch follower count (users who follow this user)
        const { count: followerCount, error: followerError } = await supabase
          .from('user_follow')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', id);
          
        if (followerError) {
          console.error('❌ Error fetching follower count:', followerError);
        }
        
        // Fetch following count (users this user follows)
        const { count: followingCount, error: followingError } = await supabase
          .from('user_follow')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', id);
          
        if (followingError) {
          console.error('❌ Error fetching following count:', followingError);
        }
        
        console.log('📊 User stats:', {
          userId: id,
          username: userData.name,
          reviews: reviewsData?.length || 0,
          followers: followerCount || 0,
          following: followingCount || 0
        });
        
        // Store the counts for use in stats calculation
        userData._followerCount = followerCount || 0;
        userData._followingCount = followingCount || 0;
        
        setUser(userData);
        setUserReviews(reviewsData || []);
        setGames(gamesData);
      } catch (err) {
        console.error('💥 Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading user profile..." />;
  }
  
  if (error || !user) {
    return <Navigate to="/users" replace />;
  }
  
  // Transform user data to match expected format
  const transformedUser = {
    id: user.id,
    username: user.name,
    avatar: user.picurl || '', // No placeholder avatar, let UI handle default
    bio: user.bio || '', // No placeholder bio, let UI handle empty state
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    location: user.location,
    website: user.website
  };
  
  // Calculate user stats with real data
  const stats = {
    films: userReviews.length,
    thisYear: userReviews.filter(r => new Date(r.post_date_time).getFullYear() === new Date().getFullYear()).length,
    lists: 0, // To be implemented with real data when lists feature is added
    following: user._followingCount || 0, // Real following count from database
    followers: user._followerCount || 0 // Real follower count from database
  };

  const sortedReviews = [...userReviews].sort((a, b) => {
    switch (reviewFilter) {
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'oldest':
        return new Date(a.post_date_time).getTime() - new Date(b.post_date_time).getTime();
      default:
        return new Date(b.post_date_time).getTime() - new Date(a.post_date_time).getTime();
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
