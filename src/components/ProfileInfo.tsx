import React from 'react';
import { Settings, ExternalLink } from 'lucide-react';

interface ProfileInfoProps {
  user: {
    id: string;
    username: string;
    avatar: string;
    bio: string;
    joinDate?: string;
    location?: string;
    website?: string;
    platform?: string;
  } | null;
  isDummy?: boolean;
  onEditClick?: () => void;
}

export const ProfileInfo: React.FC<ProfileInfoProps> = ({ user, isDummy = false, onEditClick }) => {
  // Handle null user case
  if (!user) {
    return (
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-gray-700 animate-pulse"></div>
        <div className="flex-1">
          <div className="h-8 bg-gray-700 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded w-48 mb-3 animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-6">
      <div className="relative flex-shrink-0">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.username || 'User'}
            className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-600">
            {(user.username || 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white">{user.username || 'Loading...'}</h1>
          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
            PATRON
          </span>
          <button onClick={onEditClick} className="text-gray-400 hover:text-white">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <p className="text-blue-400 text-sm mb-3">{user.bio || ''}</p>
        {(user.platform || user.website) && (
          <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
            {user.platform && (
              <>
                <span>🎮 {user.platform}</span>
                {user.website && <span className="mx-2">🔗</span>}
              </>
            )}
            {user.website && (
              <a 
                href={user.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                {user.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
        {user.location && (
          <div className="text-gray-400 text-sm">
            📍 {user.location}
          </div>
        )}
        {user.joinDate && (
          <div className="text-gray-400 text-sm mt-1">
            📅 Joined {user.joinDate}
          </div>
        )}
      </div>
    </div>
  );
};
