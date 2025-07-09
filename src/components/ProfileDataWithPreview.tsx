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

interface ProfileDataWithPreviewProps {
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
  forceMobileView?: boolean;
}

export const ProfileDataWithPreview: React.FC<ProfileDataWithPreviewProps> = ({
  activeTab,
  allGames,
  sortedReviews,
  reviewFilter,
  onReviewFilterChange,
  forceMobileView = false,
  ...props
}) => {
  return (
    <div className={forceMobileView ? 'mobile-preview-context' : ''}>
      <ProfileData
        activeTab={activeTab}
        allGames={allGames}
        sortedReviews={sortedReviews}
        reviewFilter={reviewFilter}
        onReviewFilterChange={onReviewFilterChange}
      />
    </div>
  );
};