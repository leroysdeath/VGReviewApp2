import React from 'react';
import { Link } from 'react-router-dom';
import { ForumCategoryWithStats } from '../types/social';
import { MessageSquare, Users, Clock } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

interface ForumCategoryListProps {
  categories: ForumCategoryWithStats[];
  loading?: boolean;
  className?: string;
}

export const ForumCategoryList: React.FC<ForumCategoryListProps> = ({
  categories,
  loading = false,
  className = ''
}) => {
  // Format date for last post
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-8 bg-gray-700 rounded"></div>
              <div className="h-8 bg-gray-700 rounded"></div>
              <div className="h-8 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {categories.map((category) => (
        <div key={category.id} className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-4">
              {category.icon_url ? (
                <img
                  src={category.icon_url}
                  alt={category.name}
                  className="w-12 h-12 object-cover rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-600 bg-opacity-20 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-purple-400" />
                </div>
              )}
              
              <div>
                <Link
                  to={`/forum/category/${category.id}/${category.slug}`}
                  className="text-lg font-semibold text-white hover:text-purple-400 transition-colors"
                >
                  {category.name}
                </Link>
                {category.description && (
                  <p className="text-gray-400 text-sm">{category.description}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-700">
            <div className="p-4 flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              <div>
                <div className="text-white font-medium">{category.thread_count}</div>
                <div className="text-xs text-gray-400">Threads</div>
              </div>
            </div>
            
            <div className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-white font-medium">{category.post_count}</div>
                <div className="text-xs text-gray-400">Posts</div>
              </div>
            </div>
            
            <div className="p-4">
              {category.last_post ? (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-green-400" />
                  <div>
                    <div className="text-white font-medium line-clamp-1">
                      <Link
                        to={`/forum/thread/${category.last_post.thread_id}`}
                        className="hover:text-purple-400 transition-colors"
                      >
                        {category.last_post.user_name}
                      </Link>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(category.last_post.created_at)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">No posts yet</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};