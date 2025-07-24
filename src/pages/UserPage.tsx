import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { ResponsiveUserPageLayout } from '../components/ResponsiveUserPageLayout';  // Changed from UserPageLayout
// Remove UserPageContent import since we'll integrate it directly
import { ProfileDataWithPreview } from '../components/ProfileDataWithPreview';  // Import the component that UserPageContent was wrapping
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
        const gameIds = reviewsData.map(review => review.game_id);
        
        // Fetch games data
        const { data: gamesData, error: gamesError } = await supabase
          .from('game')
          .select('*')
          .in('id', gameIds);
          
        if (gamesError) throw gamesError;
        
        setUser(userData);
        setUserReviews(reviewsData);
        setGames(gamesData);
      } catch (err) {
        console.error('Error fetching user data:', err);
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
    avatar: user.picurl || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: user.bio || 'Gaming enthusiast',
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    location: user.location,
    website: user.website
  };
  
  // Calculate user stats
  const stats = {
    films: userReviews.length,
    thisYear: userReviews.filter(r => new Date(r.post_date_time).getFullYear() === new Date().getFullYear()).length,
    lists: 0, // To be implemented with real data
    following: 0, // To be implemented with real data
    followers: 0 // To be implemented with real data
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
    <ResponsiveUserPageLayout
      user={transformedUser}
      stats={stats}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      isDummy={false}
    >
      {/* Directly use ProfileDataWithPreview instead of UserPageContent wrapper */}
      <ProfileDataWithPreview
        activeTab={activeTab}
        allGames={games}
        sortedReviews={sortedReviews}
        reviewFilter={reviewFilter}
        onReviewFilterChange={setReviewFilter}
        forceMobileView={false}
        isDummy={false}
      />
    </ResponsiveUserPageLayout>
  );
};
