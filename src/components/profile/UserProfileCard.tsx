import React from 'react';
import { 
  User, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Edit, 
  Settings,
  MessageSquare,
  Trophy,
  Gamepad2,
  Users
} from 'lucide-react';

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate: string;
  stats: {
    gamesPlayed: number;
    gamesCompleted: number;
    reviewsWritten: number;
    averageRating: number;
    followers: number;
    following: number;
  };
  badges?: {
    id: string;
    name: string;
    icon: string;
    description: string;
  }[];
  isCurrentUser?: boolean;
}

interface UserProfileCardProps {
  profile: UserProfile;
  onEditProfile?: () => void;
  onFollowToggle?: () => void;
  isFollowing?: boolean;
  className?: string;
  onOpenSettings?: () => void; // New prop for opening settings modal
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  onEditProfile,
  onFollowToggle,
  isFollowing = false,
  className = '',
  onOpenSettings
}) => {
  // Generate user initial from username
  const getUserInitial = (username: string): string => {
    return username.charAt(0).toUpperCase();
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Cover Image / Banner */}
      <div className="h-32 bg-gradient-to-r from-purple-900 to-blue-900 relative">
        {/* Edit button (only shown for current user) */}
        {profile.isCurrentUser && onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors backdrop-blur-sm"
            aria-label="Edit profile"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Profile Content */}
      <div className="px-6 pb-6">
        {/* Avatar and Action Buttons */}
        <div className="flex justify-between items-end -mt-12 mb-4">
          {/* Avatar */}
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-24 h-24 rounded-full border-4 border-gray-800 object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-gray-800 bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                {getUserInitial(profile.username)}
              </div>
            )}
            
            {/* Verification badge or premium status */}
            <div className="absolute bottom-1 right-1 bg-purple-600 rounded-full p-1 border-2 border-gray-800">
              <Trophy className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!profile.isCurrentUser && (
              <>
                <button
                  onClick={onFollowToggle}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isFollowing
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>
                <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Message</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            {profile.displayName || profile.username}
          </h2>
          <p className="text-gray-400 text-sm mb-3">@{profile.username}</p>
          
          {profile.bio && (
            <p className="text-gray-300 mb-4">{profile.bio}</p>
          )}
          
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {profile.joinDate}</span>
            </div>
            
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            )}
            
            {profile.website && (
              <div className="flex items-center gap-1">
                <ExternalLink className="h-4 w-4" />
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {profile.website.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-white mb-1">
              <Gamepad2 className="h-5 w-5 text-purple-400" />
              <span>{profile.stats.gamesPlayed}</span>
            </div>
            <p className="text-xs text-gray-400">Games Played</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-white mb-1">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span>{profile.stats.gamesCompleted}</span>
            </div>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-white mb-1">
              <Star className="h-5 w-5 text-orange-400" />
              <span>{profile.stats.reviewsWritten}</span>
            </div>
            <p className="text-xs text-gray-400">Reviews</p>
          </div>
        </div>

        {/* Additional Stats Bar */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Average Rating</span>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="font-semibold text-white">{profile.stats.averageRating.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Community</span>
            <div className="flex items-center gap-3">
              <span className="text-white">
                <span className="font-semibold">{profile.stats.followers}</span>
                <span className="text-gray-400 text-xs ml-1">followers</span>
              </span>
              <span className="text-white">
                <span className="font-semibold">{profile.stats.following}</span>
                <span className="text-gray-400 text-xs ml-1">following</span>
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Achievements</h3>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map(badge => (
                <div
                  key={badge.id}
                  className="group relative"
                >
                  <div className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                    <span className="text-2xl">{badge.icon}</span>
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div className="font-semibold">{badge.name}</div>
                    <div className="text-xs text-gray-400">{badge.description}</div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
