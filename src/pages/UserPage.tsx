import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserPageLayout } from '../components/UserPageLayout';
import { UserPageContent } from '../components/UserPageContent';
import { mockUsers, mockGames, mockReviews } from '../data/mockData';

export const UserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'profile' | 'films' | 'diary' | 'reviews' | 'watchlist' | 'lists' | 'likes' | 'tags' | 'network' | 'stats'>('profile');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const user = mockUsers.find(u => u.id === id) || mockUsers[0];
  const userReviews = mockReviews.filter(r => r.userId === id);
  const userFavoriteGames = mockGames.slice(0, 4); // Top 4 favorite games
  const userRecentGames = mockGames.slice(0, 8); // Recent games

  const stats = {
    films: 1322,
    thisYear: 169,
    lists: 10,
    following: 39,
    followers: 9342
  };

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

  // Transform user data to match layout component interface
  const userInfo = {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    joinDate: user.joinDate
  };

  return (
    <UserPageLayout
      user={userInfo}
      stats={stats}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
      isDummy={false}
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
        isDummy={false}
      />
    </UserPageLayout>
  );
};