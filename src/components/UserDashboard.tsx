import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  User, 
  Star, 
  MessageSquare, 
  Heart, 
  Clock, 
  Trophy, 
  Bell, 
  LogOut,
  Calendar,
  Gamepad2,
  ArrowRight
} from 'lucide-react';
import { UserProfileCard } from './UserProfileCard';

interface UserActivity {
  id: string;
  type: 'review' | 'rating' | 'achievement' | 'completed' | 'started' | 'wishlist';
  gameId: string;
  gameTitle: string;
  gameCover?: string;
  date: string;
  rating?: number;
  achievementName?: string;
}

interface UserDashboardProps {
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    joinDate: string;
  };
  stats: {
    gamesPlayed: number;
    gamesCompleted: number;
    reviewsWritten: number;
    averageRating: number;
    achievements: number;
    followers: number;
    following: number;
  };
  recentActivity: UserActivity[];
  favoriteGames: {
    id: string;
    title: string;
    coverUrl?: string;
    rating: number;
  }[];
  onLogout: () => void;
  className?: string;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  stats,
  recentActivity,
  favoriteGames,
  onLogout,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'games' | 'reviews' | 'settings'>('overview');

  // Get activity icon based on type
  const getActivityIcon = (type: UserActivity['type']) => {
    switch (type) {
      case 'review':
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      case 'rating':
        return <Star className="h-4 w-4 text-yellow-400" />;
      case 'achievement':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'completed':
        return <svg className="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>;
      case 'started':
        return <Clock className="h-4 w-4 text-blue-400" />;
      case 'wishlist':
        return <Heart className="h-4 w-4 text-red-400" />;
      default:
        return <Gamepad2 className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get activity text based on type
  const getActivityText = (activity: UserActivity) => {
    switch (activity.type) {
      case 'review':
        return `Reviewed ${activity.gameTitle}`;
      case 'rating':
        return `Rated ${activity.gameTitle} ${activity.rating}/10`;
      case 'achievement':
        return `Unlocked "${activity.achievementName}" in ${activity.gameTitle}`;
      case 'completed':
        return `Completed ${activity.gameTitle}`;
      case 'started':
        return `Started playing ${activity.gameTitle}`;
      case 'wishlist':
        return `Added ${activity.gameTitle} to wishlist`;
      default:
        return `Interacted with ${activity.gameTitle}`;
    }
  };

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Card */}
          <UserProfileCard
            userId={user.id}
            username={user.username}
            avatarUrl={user.avatarUrl}
            bio={user.bio}
            joinDate={user.joinDate}
            stats={stats}
            isCurrentUser={true}
            onEditProfile={() => setActiveTab('settings')}
          />
          
          {/* Navigation */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <nav className="flex flex-col">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                  activeTab === 'overview' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <User className="h-5 w-5" />
                <span>Overview</span>
              </button>
              
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                  activeTab === 'activity' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Bell className="h-5 w-5" />
                <span>Activity</span>
              </button>
              
              <button
                onClick={() => setActiveTab('games')}
                className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                  activeTab === 'games' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Gamepad2 className="h-5 w-5" />
                <span>Games</span>
              </button>
              
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                  activeTab === 'reviews' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <MessageSquare className="h-5 w-5" />
                <span>Reviews</span>
              </button>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                  activeTab === 'settings' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
              
              <button
                onClick={onLogout}
                className="flex items-center gap-3 px-6 py-4 text-left text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-gray-800 rounded-xl p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>
              
              {/* Recent Activity */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                  <Link to="/activity" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    View All
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1">
                        <p className="text-gray-200">{getActivityText(activity)}</p>
                        <p className="text-xs text-gray-400 mt-1">{activity.date}</p>
                      </div>
                      {activity.gameCover && (
                        <img 
                          src={activity.gameCover} 
                          alt={activity.gameTitle}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Favorite Games */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Favorite Games</h3>
                  <Link to="/games/favorites" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    View All
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {favoriteGames.slice(0, 4).map((game) => (
                    <Link 
                      key={game.id}
                      to={`/game/${game.id}`}
                      className="group"
                    >
                      <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden mb-2 relative">
                        {game.coverUrl ? (
                          <img 
                            src={game.coverUrl} 
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="h-10 w-10 text-gray-500" />
                          </div>
                        )}
                        
                        {/* Rating badge */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2 flex items-center justify-center">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-white text-xs font-bold">{game.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <h4 className="text-white text-sm font-medium line-clamp-1 group-hover:text-purple-400 transition-colors">
                        {game.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Activity Feed</h2>
              
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{user.username}</span>
                        <span className="text-gray-400 text-xs">{activity.date}</span>
                      </div>
                      <p className="text-gray-200">{getActivityText(activity)}</p>
                      
                      {activity.type === 'review' && (
                        <Link 
                          to={`/game/${activity.gameId}`}
                          className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1"
                        >
                          View Review <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    {activity.gameCover && (
                      <Link to={`/game/${activity.gameId}`}>
                        <img 
                          src={activity.gameCover} 
                          alt={activity.gameTitle}
                          className="w-16 h-20 object-cover rounded"
                        />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Games Tab */}
          {activeTab === 'games' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">My Games</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Playing Now</h3>
                  <div className="text-3xl font-bold text-blue-400 mb-2">12</div>
                  <Link 
                    to="/games/playing"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View Games
                  </Link>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Completed</h3>
                  <div className="text-3xl font-bold text-green-400 mb-2">{stats.gamesCompleted}</div>
                  <Link 
                    to="/games/completed"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View Games
                  </Link>
                </div>
                
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Wishlist</h3>
                  <div className="text-3xl font-bold text-red-400 mb-2">24</div>
                  <Link 
                    to="/games/wishlist"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View Games
                  </Link>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">All Games</h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {favoriteGames.concat(favoriteGames).slice(0, 10).map((game, index) => (
                    <Link 
                      key={`${game.id}-${index}`}
                      to={`/game/${game.id}`}
                      className="group"
                    >
                      <div className="aspect-[3/4] bg-gray-700 rounded-lg overflow-hidden mb-2 relative">
                        {game.coverUrl ? (
                          <img 
                            src={game.coverUrl} 
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="h-10 w-10 text-gray-500" />
                          </div>
                        )}
                        
                        {/* Rating badge */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 px-2 flex items-center justify-center">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-white text-xs font-bold">{game.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <h4 className="text-white text-sm font-medium line-clamp-1 group-hover:text-purple-400 transition-colors">
                        {game.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">My Reviews</h2>
              
              <div className="space-y-4">
                {recentActivity
                  .filter(activity => activity.type === 'review')
                  .map((review) => (
                    <div key={review.id} className="flex gap-4 p-4 bg-gray-700 rounded-lg">
                      {review.gameCover ? (
                        <img 
                          src={review.gameCover} 
                          alt={review.gameTitle}
                          className="w-16 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-20 bg-gray-600 rounded flex items-center justify-center">
                          <Gamepad2 className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Link 
                            to={`/game/${review.gameId}`}
                            className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                          >
                            {review.gameTitle}
                          </Link>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const rating = review.rating || 0;
                                const normalizedRating = rating / 2; // Convert 10-scale to 5-scale
                                return (
                                  <Star 
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < normalizedRating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                            <span className="text-white">{review.rating}/10</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-300 line-clamp-2">
                          This is a placeholder for the review text. In a real application, this would contain the actual review content written by the user for this specific game.
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm text-gray-400">{review.date}</span>
                          
                          <div className="flex gap-3">
                            <button className="text-gray-400 hover:text-purple-400 transition-colors">
                              Edit
                            </button>
                            <button className="text-gray-400 hover:text-red-400 transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
              
              <div className="space-y-8">
                {/* Profile Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        defaultValue={user.username}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        rows={3}
                        defaultValue={user.bio}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="avatar" className="block text-sm font-medium text-gray-300 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.username}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${getAvatarGradient()}`}>
                            {getUserInitial()}
                          </div>
                        )}
                        
                        <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                          Change Avatar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Account Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        defaultValue="user@example.com"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <button className="text-purple-400 hover:text-purple-300 transition-colors">
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Notification Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">Email Notifications</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">Push Notifications</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">Game Release Alerts</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">Weekly Digest</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Privacy Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">Public Profile</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">Show Activity Feed</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between">
                      <span className="text-gray-300">Show Game Collection</span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="pt-4">
                  <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};