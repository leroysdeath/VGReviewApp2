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
        
        // Fetch user reviews (only those with valid ratings)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('rating')
          .select(`
            *,
            game:game_id(*)
          `)
          .eq('user_id', id)
          .not('rating', 'is', null);
          
        if (reviewsError) throw reviewsError;
        
        // Filter out any reviews with invalid ratings as an extra safety measure
        const validReviewsData = reviewsData?.filter(review => 
          review.rating != null && 
          !isNaN(review.rating) && 
          typeof review.rating === 'number'
        ) || [];
        
        // Get game IDs from valid reviews
        const gameIds = validReviewsData.map(review => review.game_id);
        
        // Fetch games data (only if there are game IDs)
        let gamesData = [];
        if (gameIds.length > 0) {
          const { data: fetchedGames, error: gamesError } = await supabase
            .from('game')
            .select('id, igdb_id, name, pic_url, genre, release_date, dev, publisher, description')
            .in('id', gameIds);
            
          if (gamesError) throw gamesError;
          // Transform games to use IGDB ID for linking
          gamesData = (fetchedGames || []).map(game => ({
            ...game,
            id: game.igdb_id || game.id.toString() // Use IGDB ID for linking
          }));
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
          totalReviews: reviewsData?.length || 0,
          validReviews: validReviewsData.length,
          followers: followerCount || 0,
          following: followingCount || 0
        });
        
        // Store the counts for use in stats calculation
        userData._followerCount = followerCount || 0;
        userData._followingCount = followingCount || 0;
        
        setUser(userData);
        setUserReviews(validReviewsData);
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
        // Safety check for ratings before comparison
        const aRating = typeof a.rating === 'number' ? a.rating : 0;
        const bRating = typeof b.rating === 'number' ? b.rating : 0;
        return bRating - aRating;
      case 'lowest':
        // Safety check for ratings before comparison
        const aRatingLow = typeof a.rating === 'number' ? a.rating : 0;
        const bRatingLow = typeof b.rating === 'number' ? b.rating : 0;
        return aRatingLow - bRatingLow;
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
