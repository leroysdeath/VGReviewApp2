import React, { useState } from 'react';
import { UserPageLayout } from '../components/UserPageLayout';
import { UserPageContent } from '../components/UserPageContent';
import { mockGames, mockReviews } from '../data/mockData';

export const DummyUserPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'top5' | 'top50' | 'reviews'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Current user data (dummy data for testing) - matches new Letterboxd-style structure
  const currentUser = {
    id: 'dummy-user',
    username: 'DummyTestUser',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'beCAUSE it\'s so much FUN, jAn. GET IT',
    joinDate: 'January 2024',
    location: 'Test City, TC',
    website: 'https://dummytestuser.com'
  };

  // User's gaming stats - matches Letterboxd structure
  const stats = {
    films: 1322,
    thisYear: 169,
    lists: 10,
    following: 39,
    followers: 9342
  };

  // User's favorite games (top 4 for the grid)
  const userFavoriteGames = mockGames.slice(0, 4);
  const userRecentGames = mockGames.slice(0, 8);
  const userReviews = mockReviews.slice(0, 6);

  const sortedReviews = [...userReviews].sort((a, b) => {
    switch (reviewFilter) {
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  return (
    <UserPageLayout
      user={currentUser}
      stats={stats}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      isDummy={true}
    >
      <UserPageContent
        activeTab={activeTab}
        userFavoriteGames={userFavoriteGames}
        userRecentGames={userRecentGames}
        sortedReviews={sortedReviews}
        allGames={mockGames}
        stats={stats}
        reviewFilter={reviewFilter}
        onReviewFilterChange={setReviewFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isDummy={true}
      />
    </UserPageLayout>
  );
};