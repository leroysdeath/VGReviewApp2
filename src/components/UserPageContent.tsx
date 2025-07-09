import React from 'react';
import { ProfileData } from './ProfileData';

interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating: number;
  description: string;
  developer: string;
  publisher: string;
}

interface Review {
  id: string;
  userId: string;
  gameId: string;
  rating: number;
  text: string;
  date: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
}

interface UserPageContentProps {
  activeTab: string;
  userFavoriteGames: Game[];
  userRecentGames: Game[];
  sortedReviews: Review[];
  allGames: Game[];
  stats: {
    films: number;
    thisYear: number;
    lists: number;
    following: number;
    followers: number;
  };
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  isDummy?: boolean;
}

export const UserPageContent: React.FC<UserPageContentProps> = ({
  activeTab,
  sortedReviews,
  allGames,
  reviewFilter,
  onReviewFilterChange,
}) => {
  return (
    <ProfileData
      activeTab={activeTab}
      allGames={allGames}
      sortedReviews={sortedReviews}
      reviewFilter={reviewFilter}
      onReviewFilterChange={onReviewFilterChange}
    />
  );
};