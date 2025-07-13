import React from 'react';
import { Link } from 'react-router-dom';
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
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  onEditProfile,
  onFollowToggle,
  isFollowing = false,
  className = ''
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
        {profile.isCurrentUser && (
          <button
            onClick={onEditProfile}
            className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors backdrop-blur-sm"
            aria-label="Edit profile"
          >
            <Edit className="h-5 w-5" />
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
            {profile.isCurrentUser ? (
              <Link
                to="/settings"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            ) : (
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
          <div className="bg-gray-700/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-white">{profile.stats.gamesPlayed}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Games</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-white">{profile.stats.reviewsWritten}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Reviews</div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-white">{profile.stats.averageRating.toFixed(1)}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Avg Rating</div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div>
            <h3 className="text-white font-medium mb-3">Badges</h3>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map(badge => (
                <div 
                  key={badge.id}
                  className="bg-gray-700/50 rounded-full px-3 py-1.5 flex items-center gap-2"
                  title={badge.description}
                >
                  <span className="text-lg">{badge.icon}</span>
                  <span className="text-sm text-gray-300">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};