import React from 'react';
import { UserPageLayout } from './UserPageLayout';
import { ProfileDataWithPreview } from './ProfileDataWithPreview';
import { mockGames, mockReviews } from '../data/mockData';

export const MobilePreview: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'top5' | 'top50' | 'reviews'>('top5');
  const [reviewFilter, setReviewFilter] = React.useState('recent');

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

  // User's reviews
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
    <div className="flex justify-center items-start min-h-screen bg-gray-100 p-8">
      {/* iPhone 16 Frame */}
      <div className="relative bg-black rounded-[3rem] p-2 shadow-2xl">
        {/* iPhone 16 Screen */}
        <div 
          className="bg-gray-900 rounded-[2.5rem] overflow-hidden relative"
          style={{ width: '393px', height: '852px' }}
        >
          {/* Status Bar */}
          <div className="bg-gray-900 h-12 flex items-center justify-between px-6 text-white text-sm">
            <span className="font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-white rounded-sm">
                <div className="w-3 h-1 bg-white rounded-sm m-0.5"></div>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="h-full overflow-y-auto">
            <UserPageLayout
              user={currentUser}
              stats={stats}
              activeTab={activeTab}
              onTabChange={(tab) => setActiveTab(tab as any)}
              isDummy={true}
            >
              <ProfileDataWithPreview
                activeTab={activeTab}
                allGames={mockGames}
                sortedReviews={sortedReviews}
                reviewFilter={reviewFilter}
                onReviewFilterChange={setReviewFilter}
                forceMobileView={true}
              />
            </UserPageLayout>
          </div>
        </div>

        {/* iPhone 16 Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-60"></div>
      </div>

      {/* Device Label */}
      <div className="ml-8 mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">iPhone 16 Preview</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Dimensions: 393px × 852px</p>
          <p>Scale: 1:1</p>
          <p>Mobile-optimized layout</p>
        </div>
      </div>
    </div>
  );
};