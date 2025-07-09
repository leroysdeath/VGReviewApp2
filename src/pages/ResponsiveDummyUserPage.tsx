import React, { useState } from 'react';
import { UserPageLayout } from '../components/UserPageLayout';
import { UserPageContent } from '../components/UserPageContent';
import { mockGames, mockReviews } from '../data/mockData';
import { useResponsive } from '../hooks/useResponsive';

export const ResponsiveDummyUserPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'top5' | 'top50' | 'reviews'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');
  const { isMobile } = useResponsive();

  // Current user data (dummy data for testing) - matches new Letterboxd-style structure
  const currentUser = {
    id: 'dummy-user',
    username: 'DummyTestUser',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'beCAUSE it\'s so much FUN, jAn. GET IT',
    joinDate: 'January 2024',
    location: 'Test City, TC', 
    website: 'https://dummytestuser.card.co'
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
    <div className="min-h-screen bg-gray-900">
      {/* Dummy Test Banner */}
      <div className="bg-blue-600 text-white p-4 text-center">
        <h2 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
          👤 Dummy Test User Profile - {isMobile ? 'Mobile' : 'Desktop'} Layout
        </h2>
        <p className={`opacity-90 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {isMobile 
            ? 'Mobile-optimized user profile showcasing responsive design'
            : 'This is a comprehensive test profile showcasing the new Letterboxd-inspired design'
          }
        </p>
      </div>

      <UserPageLayout
        user={currentUser}
        stats={stats}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        isDummy={true}
      >
        <UserPageContent
          activeTab={activeTab}
          userFavoriteGames={mockGames.slice(0, 5)}
          userRecentGames={mockGames.slice(5, 10)}
          sortedReviews={sortedReviews}
          allGames={mockGames}
          stats={stats}
          reviewFilter={reviewFilter}
          onReviewFilterChange={setReviewFilter}
          viewMode="grid"
          onViewModeChange={() => {}}
          isDummy={true}
        />
      </UserPageLayout>
    </div>
  );
};