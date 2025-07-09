import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MobileUserPageLayout } from './MobileUserPageLayout';
import { ProfileData } from '../ProfileData';
import { mockUsers, mockGames, mockReviews } from '../../data/mockData';

export const MobileUserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'top5' | 'top50' | 'reviews'>('top5');
  const [reviewFilter, setReviewFilter] = useState('recent');

  const user = mockUsers.find(u => u.id === id) || mockUsers[0];
  const userReviews = mockReviews.filter(r => r.userId === id);

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

  const userInfo = {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    joinDate: user.joinDate,
    location: 'San Francisco, CA',
    website: 'https://gamevault.card.co'
  };

  return (
    <MobileUserPageLayout
      user={userInfo}
      stats={stats}
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as any)}
    >
      <ProfileData
        activeTab={activeTab}
        allGames={mockGames}
        sortedReviews={sortedReviews}
        reviewFilter={reviewFilter}
        onReviewFilterChange={setReviewFilter}
      />
    </MobileUserPageLayout>
  );
};