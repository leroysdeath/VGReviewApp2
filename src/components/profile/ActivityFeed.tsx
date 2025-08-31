import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star, Play, CheckCircle, ScrollText, Gift, BookOpen } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { getGameUrl } from '../../utils/gameUrls';

interface Activity {
  id: string;
  type: 'review' | 'rating' | 'started' | 'completed' | 'comment' | 'wishlist' | 'collection';
  date: string;
  game?: {
    id: number;
    igdb_id?: number;
    slug?: string;
    name: string;
    cover_url?: string;
  };
  rating?: number;
  review?: string;
  is_recommended?: boolean;
}

interface ActivityFeedProps {
  userId: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ userId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Priority map for sorting activities with same timestamp
  // Lower number = should appear first when timestamps are equal
  const activityPriority: Record<Activity['type'], number> = {
    'wishlist': 1,     // Planning stage (appears first)
    'collection': 2,   // Ownership stage
    'started': 3,      // Beginning play
    'completed': 4,    // Finished play
    'rating': 5,       // Quick score
    'review': 6,       // Detailed thoughts (appears last)
    'comment': 7       // Comments (if any)
  };

  const fetchActivities = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch recent ratings/reviews
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('rating')
        .select(`
          id,
          rating,
          review,
          post_date_time,
          is_recommended,
          game:game_id (
            id,
            igdb_id,
            slug,
            name,
            cover_url
          )
        `)
        .eq('user_id', parseInt(userId))
        .not('rating', 'is', null)
        .order('post_date_time', { ascending: false })
        .limit(20);

      if (ratingsError) throw ratingsError;

      // Fetch game progress activities
      const { data: progressData, error: progressError } = await supabase
        .from('game_progress')
        .select(`
          started,
          completed,
          started_date,
          completed_date,
          game:game_id (
            id,
            igdb_id,
            slug,
            name,
            cover_url
          )
        `)
        .eq('user_id', parseInt(userId))
        .order('updated_at', { ascending: false })
        .limit(20);

      if (progressError) throw progressError;

      // Fetch wishlist activities
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('user_wishlist')
        .select(`
          created_at,
          game:game_id (
            id,
            igdb_id,
            slug,
            name,
            cover_url
          )
        `)
        .eq('user_id', parseInt(userId))
        .order('created_at', { ascending: false })
        .limit(20);

      if (wishlistError) throw wishlistError;

      // Fetch collection activities
      const { data: collectionData, error: collectionError } = await supabase
        .from('user_collection')
        .select(`
          created_at,
          game:game_id (
            id,
            igdb_id,
            slug,
            name,
            cover_url
          )
        `)
        .eq('user_id', parseInt(userId))
        .order('created_at', { ascending: false })
        .limit(20);

      if (collectionError) throw collectionError;

      // Transform and combine activities
      const combinedActivities: Activity[] = [];

      // Add rating/review activities
      ratingsData?.forEach(item => {
        if (!item.game) return;
        
        // Add as review if has text, otherwise as rating
        const activityType = item.review ? 'review' : 'rating';
        
        combinedActivities.push({
          id: `${activityType}-${item.id}`,
          type: activityType,
          date: item.post_date_time,
          game: item.game,
          rating: item.rating,
          review: item.review || undefined,
          is_recommended: item.is_recommended
        });
      });

      // Add game progress activities
      progressData?.forEach(item => {
        if (!item.game) return;
        
        if (item.started && item.started_date) {
          combinedActivities.push({
            id: `started-${item.game.id}`,
            type: 'started',
            date: item.started_date,
            game: item.game
          });
        }
        
        if (item.completed && item.completed_date) {
          combinedActivities.push({
            id: `completed-${item.game.id}`,
            type: 'completed', 
            date: item.completed_date,
            game: item.game
          });
        }
      });

      // Add wishlist activities
      wishlistData?.forEach(item => {
        if (!item.game) return;
        
        combinedActivities.push({
          id: `wishlist-${item.game.id}`,
          type: 'wishlist',
          date: item.created_at,
          game: item.game
        });
      });

      // Add collection activities
      collectionData?.forEach(item => {
        if (!item.game) return;
        
        combinedActivities.push({
          id: `collection-${item.game.id}`,
          type: 'collection',
          date: item.created_at,
          game: item.game
        });
      });

      // Sort by date (most recent first), with secondary sort by activity type for same timestamps
      const sortedActivities = combinedActivities
        .sort((a, b) => {
          const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          
          // If timestamps are different, sort by time (newest first)
          if (timeDiff !== 0) return timeDiff;
          
          // If timestamps are equal, sort by activity type priority
          // This ensures logical order: started → completed → rating → review
          const priorityA = activityPriority[a.type] || 999;
          const priorityB = activityPriority[b.type] || 999;
          return priorityA - priorityB;
        })
        .slice(0, 25); // Keep most recent 25 activities

      setActivities(sortedActivities);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'review':
        return <ScrollText className="h-5 w-5 text-purple-400" />;
      case 'rating':
        return <Star className="h-5 w-5 text-yellow-400" />;
      case 'wishlist':
        return <Gift className="h-5 w-5 text-red-400" />;
      case 'collection':
        return <BookOpen className="h-5 w-5 text-orange-400" />;
      case 'started':
        return <Play className="h-5 w-5 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-400" />;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'review':
        return (
          <span>
            wrote a review for{' '}
            <Link to={getGameUrl(activity.game!)} className="text-purple-400 hover:text-purple-300">
              {activity.game?.name}
            </Link>
            {activity.rating && (
              <span className="text-yellow-400 ml-2">
                ({activity.rating === 10 ? '10' : activity.rating.toFixed(1)}/10)
              </span>
            )}
          </span>
        );
      case 'rating':
        return (
          <span>
            rated{' '}
            <Link to={getGameUrl(activity.game!)} className="text-purple-400 hover:text-purple-300">
              {activity.game?.name}
            </Link>
            <span className="text-yellow-400 ml-2">
              {activity.rating === 10 ? '10' : activity.rating?.toFixed(1)}/10
            </span>
          </span>
        );
      case 'wishlist':
        return (
          <span>
            added{' '}
            <Link to={getGameUrl(activity.game!)} className="text-purple-400 hover:text-purple-300">
              {activity.game?.name}
            </Link>
            {' '}to wishlist
          </span>
        );
      case 'collection':
        return (
          <span>
            added{' '}
            <Link to={getGameUrl(activity.game!)} className="text-purple-400 hover:text-purple-300">
              {activity.game?.name}
            </Link>
            {' '}to collection
          </span>
        );
      case 'started':
        return (
          <span>
            started playing{' '}
            <Link to={getGameUrl(activity.game!)} className="text-purple-400 hover:text-purple-300">
              {activity.game?.name}
            </Link>
          </span>
        );
      case 'completed':
        return (
          <span>
            completed{' '}
            <Link to={getGameUrl(activity.game!)} className="text-purple-400 hover:text-purple-300">
              {activity.game?.name}
            </Link>
          </span>
        );
      default:
        return 'had some activity';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex gap-4 p-4 bg-gray-800 rounded-lg animate-pulse">
            <div className="w-12 h-16 bg-gray-700 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              <div className="h-12 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchActivities}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No recent activity</p>
        <p className="text-gray-500 text-sm">
          Start rating games and tracking your progress to see activity here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
      
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-4 p-4 bg-gray-800 rounded-lg">
          {/* Game cover */}
          <Link 
            to={getGameUrl(activity.game!)} 
            className="flex-shrink-0 group"
          >
            <img
              src={activity.game?.cover_url || '/default-cover.png'}
              alt={activity.game?.name || 'Game cover'}
              className="w-12 h-16 object-cover rounded group-hover:scale-105 transition-transform"
              onError={(e) => {
                e.currentTarget.src = '/default-cover.png';
              }}
            />
          </Link>

          {/* Activity content */}
          <div className="flex-1 min-w-0">
            {/* Activity header */}
            <div className="flex items-center gap-2 mb-2">
              {getActivityIcon(activity.type)}
              <span className="text-gray-300 text-sm">
                {getActivityDescription(activity)}
              </span>
            </div>

            {/* Review text if available */}
            {activity.review && (
              <p className="text-gray-400 text-sm mb-2 line-clamp-3">
                "{activity.review}"
              </p>
            )}

            {/* Recommendation badge */}
            {activity.is_recommended !== null && activity.is_recommended !== undefined && (
              <div className="mb-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  activity.is_recommended 
                    ? 'bg-green-900 text-green-300' 
                    : 'bg-red-900 text-red-300'
                }`}>
                  {activity.is_recommended ? 'Recommended' : 'Not Recommended'}
                </span>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center text-gray-500 text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(activity.date)}
            </div>
          </div>
        </div>
      ))}
      
      {/* Show more placeholder */}
      {activities.length >= 20 && (
        <div className="text-center mt-6">
          <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-sm disabled:opacity-50" disabled>
            Load More Activity (Coming Soon)
          </button>
        </div>
      )}
    </div>
  );
};