import React from 'react';
import { Link } from 'react-router-dom';
import { ContentCreatorWithStats } from '../types/social';
import { User, ExternalLink, Youtube, Twitch, Twitter, Globe, CheckCircle } from 'lucide-react';
import { LazyImage } from './LazyImage';

interface ContentCreatorCardProps {
  creator: ContentCreatorWithStats;
  onFollow?: (creatorId: number) => Promise<boolean>;
  isFollowing?: boolean;
  className?: string;
}

export const ContentCreatorCard: React.FC<ContentCreatorCardProps> = ({
  creator,
  onFollow,
  isFollowing = false,
  className = ''
}) => {
  // Get platform icons
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      case 'twitch':
        return <Twitch className="h-4 w-4 text-purple-500" />;
      case 'twitter':
        return <Twitter className="h-4 w-4 text-blue-400" />;
      default:
        return <Globe className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Creator header */}
      <div className="relative">
        <div className="aspect-[3/1] bg-gradient-to-r from-purple-900 to-blue-900"></div>
        
        <div className="absolute -bottom-10 left-6">
          <div className="relative">
            {creator.user?.picurl ? (
              <LazyImage
                src={creator.user.picurl}
                alt={creator.user.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-800"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center border-4 border-gray-800">
                <User className="h-10 w-10 text-gray-500" />
              </div>
            )}
            
            {creator.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Creator info */}
      <div className="pt-12 px-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link
              to={`/user/${creator.user?.id}`}
              className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
            >
              {creator.user?.name}
            </Link>
            
            <div className="text-sm text-gray-400">
              {creator.creator_type
                ? creator.creator_type.charAt(0).toUpperCase() + creator.creator_type.slice(1)
                : 'Content Creator'}
            </div>
          </div>
          
          {onFollow && (
            <button
              onClick={() => onFollow(creator.user_id)}
              className={`px-4 py-1 rounded-full text-sm font-medium ${
                isFollowing
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              } transition-colors`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        
        {/* Creator stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-gray-750 rounded-lg">
            <div className="text-white font-semibold">{creator.follower_count || 0}</div>
            <div className="text-xs text-gray-400">Followers</div>
          </div>
          
          <div className="text-center p-2 bg-gray-750 rounded-lg">
            <div className="text-white font-semibold">{creator.content_count || 0}</div>
            <div className="text-xs text-gray-400">Content</div>
          </div>
          
          <div className="text-center p-2 bg-gray-750 rounded-lg">
            <div className="text-white font-semibold">{creator.average_rating?.toFixed(1) || '0.0'}</div>
            <div className="text-xs text-gray-400">Avg. Rating</div>
          </div>
        </div>
        
        {/* Platform links */}
        {creator.platform_links && Object.keys(creator.platform_links).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(creator.platform_links).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1 bg-gray-750 rounded-full text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                {getPlatformIcon(platform)}
                <span>{platform}</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};