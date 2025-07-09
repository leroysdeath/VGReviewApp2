import React from 'react';
import { ProfileDataWithPreview } from './ProfileDataWithPreview';
import { MobilePreviewToggle } from './MobilePreviewToggle';

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
  showPreviewToggle?: boolean;
}

export const UserPageContent: React.FC<UserPageContentProps> = ({
  activeTab,
  sortedReviews,
  allGames,
  reviewFilter,
  onReviewFilterChange,
  showPreviewToggle = false,
}) => {
  const [forceMobileView, setForceMobileView] = React.useState(false);

  return (
    <>
      {showPreviewToggle && (
        <MobilePreviewToggle onViewChange={setForceMobileView} />
      )}
      <ProfileDataWithPreview
        activeTab={activeTab}
        allGames={allGames}
        sortedReviews={sortedReviews}
        reviewFilter={reviewFilter}
        onReviewFilterChange={onReviewFilterChange}
        forceMobileView={forceMobileView}
      />
    </>
  );
};