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
  activeTab: 'top5' | 'top10' | 'reviews' | 'activity';
  sortedReviews: Review[];
  allGames: Game[];
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
  isDummy?: boolean;
  showPreviewToggle?: boolean;
  userId?: string;
  isOwnProfile?: boolean;
}

export const UserPageContent: React.FC<UserPageContentProps> = ({
  activeTab,
  sortedReviews,
  allGames,
  reviewFilter,
  onReviewFilterChange,
  showPreviewToggle = false,
  isDummy = false,
  userId,
  isOwnProfile = false
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
        isDummy={isDummy}
        userId={userId}
        isOwnProfile={isOwnProfile}
      />
    </>
  );
};
