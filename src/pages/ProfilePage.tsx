import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../components/AuthProvider';
import { UserDashboard } from '../components/UserDashboard';
import { LoginModal } from '../components/LoginModal';

// Sample data for demonstration
const sampleActivity = [
  {
    id: '1',
    type: 'review' as const,
    gameId: '1',
    gameTitle: 'The Witcher 3: Wild Hunt',
    gameCover: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '2 days ago',
    rating: 9.5
  },
  {
    id: '2',
    type: 'completed' as const,
    gameId: '2',
    gameTitle: 'Cyberpunk 2077',
    gameCover: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '1 week ago'
  },
  {
    id: '3',
    type: 'achievement' as const,
    gameId: '3',
    gameTitle: 'Elden Ring',
    gameCover: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '2 weeks ago',
    achievementName: 'Master of Blades'
  },
  {
    id: '4',
    type: 'wishlist' as const,
    gameId: '4',
    gameTitle: 'God of War Ragnarök',
    gameCover: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '3 weeks ago'
  },
  {
    id: '5',
    type: 'started' as const,
    gameId: '5',
    gameTitle: 'Horizon Forbidden West',
    gameCover: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '1 month ago'
  },
  {
    id: '6',
    type: 'rating' as const,
    gameId: '6',
    gameTitle: 'Hades',
    gameCover: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
    date: '1 month ago',
    rating: 9.0
  }
];

const sampleFavoriteGames = [
  {
    id: '1',
    title: 'The Witcher 3: Wild Hunt',
    coverUrl: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 9.5
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    coverUrl: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 7.8
  },
  {
    id: '3',
    title: 'Elden Ring',
    coverUrl: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 9.7
  },
  {
    id: '4',
    title: 'God of War Ragnarök',
    coverUrl: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 9.2
  }
];

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Handle login success
  const handleLoginSuccess = (userData: any) => {
    console.log('Login successful:', userData);
    setShowLoginModal(false);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 py-16">
        <Helmet>
          <title>Sign In | GameVault</title>
          <meta name="description" content="Sign in to access your gaming profile" />
        </Helmet>
        
        <div className="max-w-md mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">Sign In Required</h1>
            <p className="text-gray-400 mb-6">
              Please sign in to view your profile and manage your game collection
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Sign In
            </button>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Why Create an Account?</h2>
            
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Track your game collection and progress</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Write and share reviews with the community</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Get personalized game recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Earn achievements and track your gaming stats</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Connect with other gamers who share your interests</span>
              </li>
            </ul>
          </div>
        </div>
        
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => setShowLoginModal(false)} 
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Authenticated state
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>{user?.username} | GameVault</title>
        <meta name="description" content="View and manage your gaming profile" />
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <UserDashboard
          user={{
            id: user?.id || '1',
            username: user?.username || 'User',
            avatarUrl: user?.avatarUrl,
            bio: 'Passionate gamer with a love for RPGs and strategy games. Always looking for new gaming experiences!',
            joinDate: 'January 2023'
          }}
          stats={{
            gamesPlayed: 87,
            gamesCompleted: 42,
            reviewsWritten: 36,
            averageRating: 8.4,
            achievements: 156,
            followers: 24,
            following: 36
          }}
          recentActivity={sampleActivity}
          favoriteGames={sampleFavoriteGames}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
};