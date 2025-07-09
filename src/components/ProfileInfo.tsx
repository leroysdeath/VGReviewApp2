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
  };
  isDummy?: boolean;
}

export const ProfileInfo: React.FC<ProfileInfoProps> = ({ user, isDummy = false }) => {
  return (
    <div className="flex items-start gap-6">
      {/* Profile Image */}
      <div className="relative flex-shrink-0">
        <img
          src={user.avatar}
          alt={user.username}
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
        />
      </div>
      
      {/* Profile Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white">{user.username}</h1>
          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
            PATRON
          </span>
          <button className="text-gray-400 hover:text-white">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        
        <p className="text-blue-400 text-sm mb-3">{user.bio}</p>
        
        <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
          <span>🎮 platform 9¾</span>
          <span className="mx-2">🔗</span>
          {user.website ? (
            <a 
              href={user.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              {isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span>{isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}</span>
          )}
        </div>
        
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