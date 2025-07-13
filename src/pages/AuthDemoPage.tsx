import React, { useState } from 'react';
import { AuthModal } from '../components/auth/AuthModal';
import { UserProfileCard } from '../components/profile/UserProfileCard';
import { UserActivityFeed } from '../components/profile/UserActivityFeed';
import { UserStatsPanel } from '../components/profile/UserStatsPanel';
import { UserSettingsPanel } from '../components/profile/UserSettingsPanel';
import { UserDashboard } from '../components/profile/UserDashboard';

export const AuthDemoPage: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeDemo, setActiveDemo] = useState<'login' | 'profile' | 'activity' | 'stats' | 'settings' | 'dashboard'>('login');

  // Sample user data
  const sampleUser = {
    id: '1',
    username: 'GamerPro',
    displayName: 'Alex Johnson',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Passionate gamer exploring virtual worlds and sharing honest reviews. Love RPGs, indie games, and anything with great storytelling.',
    location: 'San Francisco, CA',
    website: 'https://mygamingblog.com',
    joinDate: 'March 2023',
    stats: {
      gamesPlayed: 247,
      gamesCompleted: 156,
      gamesInProgress: 8,
      gamesInWishlist: 42,
      totalPlaytime: 1247 * 60, // in minutes
      averageRating: 7.8,
      reviewsWritten: 89,
      achievementsUnlocked: 1834,
      mostPlayedGenre: 'RPG',
      accountAge: 365, // in days
      followers: 234,
      following: 67
    },
    badges: [
      { id: '1', name: 'Early Adopter', icon: '🚀', description: 'Joined during the beta phase' },
      { id: '2', name: 'RPG Expert', icon: '🎭', description: 'Completed 50+ RPG games' },
      { id: '3', name: 'Reviewer', icon: '✍️', description: 'Written 50+ reviews' }
    ],
    isCurrentUser: true
  };

  // Sample activity data
  const sampleActivity = [
    {
      id: '1',
      type: 'review',
      date: '2023-06-01T12:00:00Z',
      user: {
        id: '1',
        username: 'GamerPro',
        avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
      },
      game: {
        id: '101',
        title: 'Elden Ring',
        coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400'
      },
      review: {
        id: '201',
        rating: 9.5,
        text: 'Elden Ring is an absolute masterpiece. The open world is breathtaking and the freedom of exploration is unmatched. The combat system is challenging but fair, and the boss fights are some of the best in gaming history.'
      }
    },
    {
      id: '2',
      type: 'completion',
      date: '2023-05-28T15:30:00Z',
      user: {
        id: '1',
        username: 'GamerPro',
        avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
      },
      game: {
        id: '102',
        title: 'The Witcher 3: Wild Hunt',
        coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400'
      }
    },
    {
      id: '3',
      type: 'achievement',
      date: '2023-05-25T09:15:00Z',
      user: {
        id: '1',
        username: 'GamerPro',
        avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
      },
      game: {
        id: '103',
        title: 'Cyberpunk 2077',
        coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400'
      },
      achievement: {
        id: '301',
        title: 'The Fool',
        description: 'Complete all tarot card collections',
        icon: '🃏'
      }
    },
    {
      id: '4',
      type: 'started',
      date: '2023-05-20T18:45:00Z',
      user: {
        id: '1',
        username: 'GamerPro',
        avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
      },
      game: {
        id: '104',
        title: 'Baldur\'s Gate 3',
        coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400'
      }
    },
    {
      id: '5',
      type: 'wishlist',
      date: '2023-05-15T14:20:00Z',
      user: {
        id: '1',
        username: 'GamerPro',
        avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
      },
      game: {
        id: '105',
        title: 'Starfield',
        coverImage: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400'
      }
    }
  ];

  // Sample games data
  const sampleGames = [
    {
      id: '101',
      title: 'Elden Ring',
      coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2022-02-25',
      genre: 'Action RPG',
      rating: 9.6,
      userRating: 9.5,
      completed: true
    },
    {
      id: '102',
      title: 'The Witcher 3: Wild Hunt',
      coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2015-05-19',
      genre: 'RPG',
      rating: 9.3,
      userRating: 9.0,
      completed: true
    },
    {
      id: '103',
      title: 'Cyberpunk 2077',
      coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2020-12-10',
      genre: 'Action RPG',
      rating: 7.8,
      userRating: 8.0,
      completed: true
    },
    {
      id: '104',
      title: 'Baldur\'s Gate 3',
      coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2023-08-03',
      genre: 'RPG',
      rating: 9.5,
      userRating: 9.0,
      completed: false
    },
    {
      id: '105',
      title: 'Starfield',
      coverImage: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2023-09-06',
      genre: 'Action RPG',
      rating: 8.5
    },
    {
      id: '106',
      title: 'God of War Ragnarök',
      coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2022-11-09',
      genre: 'Action-Adventure',
      rating: 9.4,
      userRating: 9.5,
      completed: true
    },
    {
      id: '107',
      title: 'Horizon Forbidden West',
      coverImage: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2022-02-18',
      genre: 'Action RPG',
      rating: 8.8,
      userRating: 8.5,
      completed: false
    },
    {
      id: '108',
      title: 'Final Fantasy XVI',
      coverImage: 'https://images.pexels.com/photos/3945656/pexels-photo-3945656.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: '2023-06-22',
      genre: 'Action RPG',
      rating: 8.7
    }
  ];

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
  };

  const handleSignupSuccess = () => {
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
  };

  const handleSaveProfile = async (data: any) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Profile data saved:', data);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Demo Header */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">User Authentication & Profile Components</h1>
          <p className="text-gray-300 mb-6">
            Explore the authentication and user profile components for the gaming review app.
            These components include login/signup modals, profile cards, activity feeds, and settings panels.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <button
              onClick={() => {
                setActiveDemo('login');
                setIsLoginModalOpen(true);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDemo === 'login' && isLoginModalOpen
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Auth Modal
            </button>
            <button
              onClick={() => {
                setActiveDemo('profile');
                setIsLoginModalOpen(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDemo === 'profile'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Profile Card
            </button>
            <button
              onClick={() => {
                setActiveDemo('activity');
                setIsLoginModalOpen(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDemo === 'activity'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Activity Feed
            </button>
            <button
              onClick={() => {
                setActiveDemo('stats');
                setIsLoginModalOpen(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDemo === 'stats'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Stats Panel
            </button>
            <button
              onClick={() => {
                setActiveDemo('settings');
                setIsLoginModalOpen(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDemo === 'settings'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => {
                setActiveDemo('dashboard');
                setIsLoginModalOpen(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeDemo === 'dashboard'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Component Demos */}
        <div className="space-y-8">
          {/* Auth Modal */}
          <AuthModal 
            isOpen={isLoginModalOpen} 
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
            onSignupSuccess={handleSignupSuccess}
          />

          {/* Profile Card */}
          {activeDemo === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">User Profile Card</h2>
              <p className="text-gray-400 mb-6">
                Displays user information, stats, and badges with action buttons for following or editing.
              </p>
              <UserProfileCard profile={sampleUser} />
            </div>
          )}

          {/* Activity Feed */}
          {activeDemo === 'activity' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">User Activity Feed</h2>
              <p className="text-gray-400 mb-6">
                Shows a chronological feed of user activities including reviews, completions, and achievements.
              </p>
              <UserActivityFeed activities={sampleActivity} />
            </div>
          )}

          {/* Stats Panel */}
          {activeDemo === 'stats' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">User Stats Panel</h2>
              <p className="text-gray-400 mb-6">
                Displays detailed gaming statistics including completion rates, playtime, and achievements.
              </p>
              <UserStatsPanel stats={sampleUser.stats} />
            </div>
          )}

          {/* Settings Panel */}
          {activeDemo === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">User Settings Panel</h2>
              <p className="text-gray-400 mb-6">
                Allows users to update their profile information, account settings, and notification preferences.
              </p>
              <UserSettingsPanel 
                initialData={{
                  username: sampleUser.username,
                  displayName: sampleUser.displayName,
                  email: 'user@example.com',
                  bio: sampleUser.bio,
                  location: sampleUser.location,
                  website: sampleUser.website,
                  avatar: sampleUser.avatar,
                  notifications: {
                    email: true,
                    push: true,
                    reviews: true,
                    mentions: true,
                    followers: true,
                    achievements: true
                  }
                }}
                onSave={handleSaveProfile}
                onPasswordChange={() => console.log('Password change requested')}
                onDeleteAccount={() => console.log('Delete account requested')}
              />
            </div>
          )}

          {/* User Dashboard */}
          {activeDemo === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">User Dashboard</h2>
              <p className="text-gray-400 mb-6">
                Complete user dashboard with profile, activity feed, games library, and stats.
              </p>
              <UserDashboard 
                profile={sampleUser}
                stats={sampleUser.stats}
                recentActivity={sampleActivity}
                recentGames={sampleGames}
                inProgressGames={sampleGames.filter(game => !game.completed && game.userRating)}
                completedGames={sampleGames.filter(game => game.completed)}
                wishlistGames={sampleGames.filter(game => !game.userRating)}
                onEditProfile={() => console.log('Edit profile clicked')}
              />
            </div>
          )}

          {/* Default State - Show Login Button */}
          {activeDemo === 'login' && !isLoginModalOpen && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-white mb-4">User Authentication</h2>
              <p className="text-gray-400 mb-6">
                Click the button below to open the authentication modal.
              </p>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Open Login Modal
              </button>
            </div>
          )}
        </div>

        {/* Features Overview */}
        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Component Features</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-750 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Authentication</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Email/password login with validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Social login options (Google, Discord, Steam)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Password strength indicator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Password reset functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Form validation with error states</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Loading states and success feedback</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-750 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-3">User Profile</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Profile card with avatar and user info</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>User stats display (games, reviews, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Achievement badges</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Follow/unfollow functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Edit profile button for current user</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Responsive design for all devices</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-750 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Activity & Stats</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Activity feed with multiple event types</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Detailed stats panel with visualizations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Game completion tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Rating and review history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Achievement tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Playtime statistics</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-750 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Settings</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Profile information editing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Password change functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Notification preferences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Privacy settings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Connected accounts management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Account deletion option</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-750 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Dashboard</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Tabbed interface for different sections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Games library with filtering options</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Grid and list view options</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Search functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Recent activity summary</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Stats overview with visualizations</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-750 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-white mb-3">Technical Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>TypeScript interfaces for type safety</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Form validation with Zod and React Hook Form</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Responsive design with Tailwind CSS</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Loading states and error handling</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Accessibility features (ARIA, focus management)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Dark theme with gaming aesthetics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};