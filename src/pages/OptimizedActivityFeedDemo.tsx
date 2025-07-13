import React, { useState, useCallback } from 'react';
import { OptimizedActivityFeed, Activity } from '../components/OptimizedActivityFeed';
import { 
  MessageSquare, 
  RefreshCw, 
  AlertTriangle, 
  Settings,
  Sliders
} from 'lucide-react';

// Sample activity data generator
const generateMockActivities = (count: number, startIndex = 0, olderTimestamps = false): Activity[] => {
  const activityTypes: Activity['type'][] = ['review', 'review_like', 'comment', 'comment_like', 'comment_reply'];
  const usernames = ['GamerPro', 'RPGFanatic', 'CasualGamer', 'GameDev', 'IndieEnthusiast', 'AdventureSeeker'];
  const gameNames = ['Elden Ring', 'The Witcher 3', 'Cyberpunk 2077', 'God of War Ragnarök', 'Hollow Knight'];
  const avatars = [
    'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150',
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
    'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150',
    'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=150'
  ];
  const gameImages = [
    'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400'
  ];
  
  return Array.from({ length: count }).map((_, i) => {
    const index = startIndex + i;
    const type = activityTypes[index % activityTypes.length];
    const userId = `user-${index % 6 + 1}`;
    const username = usernames[index % usernames.length];
    const gameId = `game-${index % 5 + 1}`;
    const gameName = gameNames[index % gameNames.length];
    
    // Calculate timestamp - newer for first page, older for subsequent pages
    const hoursAgo = olderTimestamps 
      ? 24 * 7 * (Math.floor(index / 20) + 1) + index % 20 // Weeks ago for pagination
      : index * 2 + 1; // Hours ago for first page
    
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    // Base activity
    const activity: Activity = {
      id: `activity-${index}`,
      type,
      timestamp,
      user: {
        id: userId,
        username,
        avatar: avatars[index % avatars.length]
      },
      game: {
        id: gameId,
        name: gameName,
        coverImage: gameImages[index % gameImages.length]
      }
    };
    
    // Add type-specific properties
    if (type === 'review' || type === 'comment') {
      activity.content = `This is a sample ${type} content for ${gameName}. It's designed to demonstrate how the activity feed handles different types of content with varying lengths.`;
    }
    
    if (type === 'review_like' || type === 'comment_like' || type === 'comment_reply') {
      activity.targetUser = {
        id: `user-${(index + 3) % 6 + 1}`,
        name: usernames[(index + 3) % usernames.length]
      };
    }
    
    return activity;
  });
};

// Mock API function that simulates pagination with a cursor
const fetchMockActivities = async ({ userId, cursor, limit = 20 }: { 
  userId: string; 
  cursor?: string; 
  limit: number 
}): Promise<{
  activities: Activity[];
  nextCursor?: string;
  totalCount: number;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Parse cursor to get page number
  let page = 0;
  if (cursor) {
    const match = cursor.match(/page-(\d+)/);
    if (match) {
      page = parseInt(match[1], 10);
    }
  }
  
  // Simulate error for testing
  if (page === 3 && Math.random() < 0.3) {
    throw new Error('Simulated network error while fetching activities');
  }
  
  // Generate activities for this page
  const startIndex = page * limit;
  const activities = generateMockActivities(limit, startIndex, page > 0);
  
  // Simulate end of data after 5 pages
  const hasMore = page < 4;
  
  return {
    activities,
    nextCursor: hasMore ? `page-${page + 1}` : undefined,
    totalCount: 100 // Mock total count
  };
};

const OptimizedActivityFeedDemo: React.FC = () => {
  const [userId, setUserId] = useState('user-1');
  const [pageSize, setPageSize] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  
  // Memoized fetch function
  const fetchActivities = useCallback(async (params: { 
    userId: string; 
    cursor?: string; 
    limit: number 
  }) => {
    return fetchMockActivities(params);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Optimized Activity Feed</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-medium text-white">Demo Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  User ID
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="user-1">GamerPro</option>
                  <option value="user-2">RPGFanatic</option>
                  <option value="user-3">CasualGamer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Page Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="10">10 items</option>
                  <option value="20">20 items</option>
                  <option value="30">30 items</option>
                  <option value="50">50 items</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-white">Demo Notes</span>
              </div>
              <ul className="text-sm text-gray-400 space-y-1 list-disc pl-5">
                <li>Page 4 has a 30% chance of simulated error</li>
                <li>Scroll to 80% of visible content to load more</li>
                <li>Debounce is set to 150ms for scroll events</li>
                <li>Virtual list renders only visible items for performance</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Performance Metrics */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium text-white">Performance Optimizations</h2>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-400">Optimized</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="font-medium text-white mb-1">Virtual Scrolling</div>
              <div className="text-gray-400">Only renders visible items</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="font-medium text-white mb-1">Memoization</div>
              <div className="text-gray-400">Prevents unnecessary re-renders</div>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="font-medium text-white mb-1">SWR Caching</div>
              <div className="text-gray-400">Reduces network requests</div>
            </div>
          </div>
        </div>
        
        {/* Activity Feed */}
        <div className="bg-gray-800 rounded-lg p-6">
          <OptimizedActivityFeed
            fetchActivities={fetchActivities}
            userId={userId}
            pageSize={pageSize}
            emptyStateMessage="No activities to display. Try changing the user or adding some activities."
            currentUserId="user-1" // Current user for UI personalization
          />
        </div>
        
        {/* Implementation Details */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Implementation Details</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Infinite Scroll</h3>
              <p className="text-gray-400">
                Implemented using react-window for virtualization and SWR for data fetching.
                Scroll events are debounced to prevent excessive API calls, and new data is
                loaded when the user scrolls to 80% of the current content.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Performance Optimizations</h3>
              <ul className="list-disc pl-5 text-gray-400 space-y-1">
                <li>React.memo for ActivityItem components to prevent unnecessary re-renders</li>
                <li>useCallback for event handlers and callbacks</li>
                <li>useMemo for expensive computations and derived state</li>
                <li>Dynamic height calculations for optimal rendering</li>
                <li>Virtualized list rendering only visible items</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Request Caching</h3>
              <p className="text-gray-400">
                SWR handles caching of API responses, with configurable revalidation strategies.
                Scroll events are debounced at 150ms to prevent excessive API calls, and the
                cache is cleared when filter parameters change.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedActivityFeedDemo;