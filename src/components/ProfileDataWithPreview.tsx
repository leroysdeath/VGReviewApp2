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
  sortedReviews: Review[];
  allGames: Game[];
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
  isDummy?: boolean;
  forceMobileView?: boolean;
  viewMode?: string;
  onViewModeChange?: (mode: string) => void;
  userFavoriteGames?: Game[];
  userRecentGames?: Game[];
  stats?: any;
}

export const ProfileDataWithPreview: React.FC<ProfileDataWithPreviewProps> = ({
  activeTab,
  allGames,
  sortedReviews,
  reviewFilter,
  onReviewFilterChange,
  forceMobileView = false,
  isDummy = false,
  viewMode,
  onViewModeChange,
  userFavoriteGames,
  userRecentGames,
  stats
}) => {
  return (
    <div className={forceMobileView ? 'mobile-preview-context' : ''}>
      <ProfileData
        activeTab={activeTab}
        allGames={allGames}
        sortedReviews={sortedReviews}
        reviewFilter={reviewFilter}
        onReviewFilterChange={onReviewFilterChange}
        isDummy={isDummy}
      />
    </div>
  );
};