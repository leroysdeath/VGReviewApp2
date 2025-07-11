import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Trophy, Calendar, Settings, ExternalLink } from 'lucide-react';

interface UserStats {
  gamesPlayed: number;
  gamesCompleted: number;
  reviewsWritten: number;
  averageRating: number;
  achievements: number;
  followers: number;
  following: number;
}

interface UserProfileCardProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  joinDate: string;
  stats: UserStats;
  isCurrentUser?: boolean;
  onEditProfile?: () => void;
  className?: string;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  userId,
  username,
  avatarUrl,
  bio,
  joinDate,
  stats,
  isCurrentUser = false,
  onEditProfile,
  className = ''
}) => {
  // Get user initial for avatar fallback
  const getUserInitial = () => {
    return username?.charAt(0).toUpperCase() || '?';
  };

  // Get avatar gradient background
  const getAvatarGradient = () => {
    // Generate a consistent color based on username
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `bg-gradient-to-br from-[hsl(${hue},70%,40%)] to-[hsl(${(hue + 60) % 360},70%,30%)]`;
  };

  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden ${className}`}>
      {/* Cover image/banner */}
      <div className="h-32 bg-gradient-to-r from-purple-900 to-blue-900"></div>
      
      {/* Profile info */}
      <div className="px-6 pb-6 relative">
        {/* Avatar */}
        <div className="absolute -top-12 left-6 ring-4 ring-gray-800 rounded-full">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={username}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold ${getAvatarGradient()}`}>
              {getUserInitial()}
            </div>
          )}
        </div>
        
        {/* User actions */}
        <div className="flex justify-end pt-4 mb-12">
          {isCurrentUser ? (
            <button
              onClick={onEditProfile}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              <span>Follow</span>
            </button>
          )}
        </div>
        
        {/* User info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">{username}</h1>
          
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
            <Calendar className="h-4 w-4" />
            <span>Joined {joinDate}</span>
          </div>
          
          {bio && (
            <p className="text-gray-300 mb-4">{bio}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to={`/user/${userId}/followers`} className="text-purple-400 hover:text-purple-300 transition-colors">
              <span className="font-bold text-white">{stats.followers}</span> Followers
            </Link>
            <Link to={`/user/${userId}/following`} className="text-purple-400 hover:text-purple-300 transition-colors">
              <span className="font-bold text-white">{stats.following}</span> Following
            </Link>
            <a href="#" className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
              <span>gamevault.card.co/user/{username}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
              <Gamepad2 className="h-5 w-5" />
              <span className="text-xl font-bold text-white">{stats.gamesPlayed}</span>
            </div>
            <p className="text-xs text-gray-400">Games Played</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span className="text-xl font-bold text-white">{stats.gamesCompleted}</span>
            </div>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
              <MessageSquare className="h-5 w-5" />
              <span className="text-xl font-bold text-white">{stats.reviewsWritten}</span>
            </div>
            <p className="text-xs text-gray-400">Reviews</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-1">
              <Star className="h-5 w-5" />
              <span className="text-xl font-bold text-white">{stats.averageRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-400">Avg. Rating</p>
          </div>
        </div>
        
        {/* Achievement badges */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span>Achievements</span>
            </h3>
            <Link to={`/user/${userId}/achievements`} className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View All
            </Link>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center"
                title={`Achievement ${i + 1}`}
              >
                <Trophy className="h-5 w-5 text-yellow-400" />
              </div>
            ))}
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
              +{stats.achievements - 5}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};