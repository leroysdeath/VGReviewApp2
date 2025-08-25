import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { UserPageLayout } from '../components/UserPageLayout';
import { UserPageContent } from '../components/UserPageContent';
import { supabase } from '../services/supabase';
import { useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: authUser, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'top5' | 'top10' | 'reviews' | 'activity'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [user, setUser] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  // Component lifecycle debugging
  console.log('🎯 UserPage: Component mounted/re-rendered', { 
    id, 
    isAuthenticated, 
    authUserId: authUser?.id,
    currentUrl: window.location.pathname,
    urlParams: useParams(),
    timestamp: new Date().toISOString()
  });
  
  // Check if component is being rendered at all
  console.log('🔍 UserPage: Component is rendering - this should appear in console');
  
  // Check useEffect dependencies
  console.log('🔗 UserPage: Dependencies for useEffect:', { id, isAuthenticated, authUser: !!authUser });

  useEffect(() => {
    const fetchUserData = async () => {
      console.log('🚀 UserPage: Starting fetchUserData', { id, isAuthenticated, authUser: authUser?.id });
      
      if (!id) {
        console.log('❌ UserPage: No ID provided');
        return;
      }
      
      // Parse ID to integer for database queries
      const numericId = parseInt(id);
      console.log('🔢 UserPage: Parsing ID:', { originalId: id, numericId, isValid: !isNaN(numericId) });
      
      if (isNaN(numericId)) {
        console.error('❌ UserPage: Invalid user ID, redirecting to /users');
        setError('Invalid user ID');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log('🔍 UserPage: Loading user data for ID:', numericId);
        
        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('*')
          .eq('id', numericId)
          .single();
          
        console.log('💾 UserPage: Database user query result:', { 
          userData: userData ? { id: userData.id, name: userData.name } : null, 
          userError: userError?.message 
        });
        
        if (userError) {
          console.error('❌ UserPage: User query failed, will redirect to /users:', userError);
          throw userError;
        }
        
        // Check if this is the current user's own profile
        try {
          if (isAuthenticated && authUser?.id) {
            console.log('🔍 UserPage: Checking if own profile for auth user:', authUser.id);
            const { data: currentUserData, error: currentUserError } = await supabase
              .from('user')
              .select('id')
              .eq('provider_id', authUser.id)
              .single();
            
            console.log('👤 UserPage: Current user lookup result:', { currentUserData, currentUserError });
            
            if (!currentUserError && currentUserData) {
              setIsOwnProfile(currentUserData.id === numericId);
              console.log('✅ UserPage: Own profile check:', { 
                currentUserId: currentUserData.id, 
                viewingUserId: numericId, 
                isOwnProfile: currentUserData.id === numericId 
              });
            } else {
              console.log('⚠️ UserPage: Could not determine if own profile, defaulting to false');
              setIsOwnProfile(false);
            }
          } else {
            console.log('ℹ️ UserPage: Not authenticated, not own profile');
            setIsOwnProfile(false);
          }
        } catch (ownProfileError) {
          console.error('❌ UserPage: Error checking own profile:', ownProfileError);
          setIsOwnProfile(false);
        }
        
        // Fetch user reviews (only those with valid ratings)
        // Use explicit relationship name to avoid ambiguity
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('rating')
          .select(`
            *,
            game:game_id(*)
          `)
          .eq('user_id', numericId)
          .not('rating', 'is', null);
          
        if (reviewsError) throw reviewsError;
        
        // Filter out any reviews with invalid ratings as an extra safety measure
        const validReviewsData = reviewsData?.filter(review => 
          review.rating != null && 
          !isNaN(review.rating) && 
          typeof review.rating === 'number'
        ) || [];
        
        // Query games marked as started from game_progress table
        const { data: startedGamesData, error: startedGamesError } = await supabase
          .from('game_progress')
          .select('game_id')
          .eq('user_id', numericId)
          .eq('started', true);
          
        if (startedGamesError) throw startedGamesError;
        
        const startedGamesCount = startedGamesData?.length || 0;
        
        // Get game IDs from valid reviews
        const gameIds = validReviewsData.map(review => review.game_id);
        
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
        
        // Get follower/following counts from computed columns (much faster - no COUNT queries)
        const followerCount = userData.follower_count || 0;
        const followingCount = userData.following_count || 0;
        
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
        userData._startedGamesCount = startedGamesCount;
        
        setUser(userData);
        setUserReviews(validReviewsData);
        setGames(gamesData);
      } catch (err) {
        console.error('💥 UserPage: Error fetching user data, redirecting to /users:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [id, isAuthenticated, authUser]);

  // Debug current state before any redirects
  console.log('📊 UserPage: Current state before renders', {
    loading,
    error,
    user: user ? { id: user.id, name: user.name } : null,
    hasError: !!error,
    hasUser: !!user,
    timestamp: new Date().toISOString()
  });

  if (loading) {
    console.log('⏳ UserPage: Showing loading spinner');
    return <LoadingSpinner size="lg" text="Loading user profile..." />;
  }
  
  if (error) {
    console.log('❌ UserPage: ERROR DETECTED - Redirecting to home due to error:', error);
    console.log('❌ UserPage: This is why no further logs appear - early redirect!');
    return <Navigate to="/" replace />;
  }
  
  if (!user) {
    console.log('👤 UserPage: NO USER FOUND - Redirecting to users page');
    console.log('👤 UserPage: This is why no further logs appear - early redirect!');
    return <Navigate to="/users" replace />;
  }
  
  // Transform user data to match expected format
  const transformedUser = {
    id: user.id,
    username: user.username || user.name,
    avatar: user.avatar_url || '', // No placeholder avatar, let UI handle default
    bio: user.bio || '', // No placeholder bio, let UI handle empty state
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    location: user.location,
    website: user.website
  };
  
  // Calculate user stats with real data
  const stats = {
    films: user._startedGamesCount || 0, // Total games marked as started
    thisYear: userReviews.length, // Total reviews count
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
    <>
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
          userId={id}
          isOwnProfile={isOwnProfile}
        />
      </UserPageLayout>

    </>
  );
};
