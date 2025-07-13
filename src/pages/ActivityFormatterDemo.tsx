import React, { useState } from 'react';
import { 
  formatActivity, 
  formatActivityText, 
  formatRelativeTime, 
  formatCount,
  truncateText,
  ActivityType
} from '../utils/activityFormatters';
import { ActivityItem } from '../components/ActivityItem';

// Sample activity data
const sampleActivities = [
  {
    id: '1',
    type: 'review' as ActivityType,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    actor: {
      id: '101',
      username: 'GamerPro',
      avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '201',
      name: 'Elden Ring',
      coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    content: 'Elden Ring is an absolute masterpiece. The open world is breathtaking and the freedom of exploration is unmatched.'
  },
  {
    id: '2',
    type: 'review_like' as ActivityType,
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    actor: {
      id: '102',
      username: 'RPGFanatic',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    target: {
      id: '301',
      type: 'review' as const,
      name: 'GameCritic'
    },
    game: {
      id: '202',
      name: 'The Witcher 3: Wild Hunt',
      coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  },
  {
    id: '3',
    type: 'comment' as ActivityType,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    actor: {
      id: '103',
      username: 'CasualGamer',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    target: {
      id: '302',
      type: 'review' as const,
      name: 'GameMaster'
    },
    game: {
      id: '203',
      name: 'Cyberpunk 2077',
      coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    content: 'I agree with most of your points, but I think the game still has some performance issues on last-gen consoles.'
  },
  {
    id: '4',
    type: 'comment_like' as ActivityType,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    actor: {
      id: '104',
      username: 'GameDev',
      avatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    target: {
      id: '401',
      type: 'comment' as const,
      name: 'StrategyFan'
    },
    game: {
      id: '204',
      name: 'God of War Ragnarök',
      coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  },
  {
    id: '5',
    type: 'comment_reply' as ActivityType,
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    actor: {
      id: '105',
      username: 'IndieEnthusiast',
      avatar: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    target: {
      id: '402',
      type: 'comment' as const,
      name: 'AdventureSeeker'
    },
    game: {
      id: '205',
      name: 'Hollow Knight',
      coverImage: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    content: 'I completely agree! The art style is also incredible. Team Cherry did an amazing job with the atmosphere and world-building.'
  }
];

export const ActivityFormatterDemo: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [selectedActivity, setSelectedActivity] = useState(sampleActivities[0]);
  
  // Toggle between viewing as current user or another user
  const toggleCurrentUser = () => {
    setCurrentUserId(prev => prev ? undefined : '101'); // GamerPro's ID
  };
  
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-6">Activity Formatters Demo</h1>
        
        {/* Demo Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Demo Controls</h2>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={toggleCurrentUser}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {currentUserId ? 'View as Other User' : 'View as Current User'}
            </button>
            
            <div className="text-gray-300">
              Current view: <span className="font-medium text-purple-400">
                {currentUserId ? 'Viewing as GamerPro' : 'Viewing as guest'}
              </span>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Select Activity Type:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {sampleActivities.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className={`p-3 rounded-lg text-left transition-colors ${
                    selectedActivity.id === activity.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{activity.type}</div>
                  <div className="text-sm opacity-80">{activity.actor.username}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Activity Display */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Activity Display</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">React Component:</h3>
            <div className="bg-gray-700 rounded-lg p-4 mb-2">
              <div className="text-white">
                {formatActivity(selectedActivity, currentUserId)}
              </div>
            </div>
            <div className="text-sm text-gray-400">
              This is the output of the formatActivity() function, which returns React nodes with links.
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">Plain Text:</h3>
            <div className="bg-gray-700 rounded-lg p-4 mb-2">
              <div className="text-white">
                {formatActivityText(selectedActivity, currentUserId)}
              </div>
            </div>
            <div className="text-sm text-gray-400">
              This is the output of the formatActivityText() function, which returns a plain string.
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-2">Activity Item Component:</h3>
            <ActivityItem
              id={selectedActivity.id}
              type={selectedActivity.type}
              timestamp={selectedActivity.timestamp}
              actor={selectedActivity.actor}
              target={selectedActivity.target}
              game={selectedActivity.game}
              content={selectedActivity.content}
              currentUserId={currentUserId}
            />
            <div className="mt-2 text-sm text-gray-400">
              This is the ActivityItem component that uses the formatting functions.
            </div>
          </div>
        </div>
        
        {/* Helper Functions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Helper Functions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">formatRelativeTime()</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Just now:</span>
                  <span className="text-white">{formatRelativeTime(new Date())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">30 minutes ago:</span>
                  <span className="text-white">{formatRelativeTime(new Date(Date.now() - 30 * 60 * 1000))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">2 hours ago:</span>
                  <span className="text-white">{formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">1 day ago:</span>
                  <span className="text-white">{formatRelativeTime(new Date(Date.now() - 24 * 60 * 60 * 1000))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">2 weeks ago:</span>
                  <span className="text-white">{formatRelativeTime(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">3 months ago:</span>
                  <span className="text-white">{formatRelativeTime(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">2 years ago:</span>
                  <span className="text-white">{formatRelativeTime(new Date(Date.now() - 730 * 24 * 60 * 60 * 1000))}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">formatCount()</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">0 likes:</span>
                  <span className="text-white">{formatCount(0, 'like', 'likes')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">1 like:</span>
                  <span className="text-white">{formatCount(1, 'like', 'likes')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">2 likes:</span>
                  <span className="text-white">{formatCount(2, 'like', 'likes')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">1 comment:</span>
                  <span className="text-white">{formatCount(1, 'comment', 'comments')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">5 comments:</span>
                  <span className="text-white">{formatCount(5, 'comment', 'comments')}</span>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-white mt-6 mb-2">truncateText()</h3>
              <div className="space-y-2">
                <div>
                  <div className="text-gray-300 mb-1">Original text:</div>
                  <div className="text-white bg-gray-700 p-2 rounded">
                    This is a long text that will be truncated to show how the truncateText function works.
                  </div>
                </div>
                <div>
                  <div className="text-gray-300 mb-1">Truncated to 20 chars:</div>
                  <div className="text-white bg-gray-700 p-2 rounded">
                    {truncateText('This is a long text that will be truncated to show how the truncateText function works.', 20)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Usage Examples */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Usage Examples</h2>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <pre className="text-gray-300 text-sm overflow-x-auto">
{`// Format activity with React components and links
const activityElement = formatActivity(activity, currentUserId);

// Format activity as plain text
const activityText = formatActivityText(activity, currentUserId);

// Format relative time
const timeAgo = formatRelativeTime(timestamp);

// Format count with proper pluralization
const likesText = formatCount(likeCount, 'like', 'likes');

// Truncate text with ellipsis
const previewText = truncateText(content, 100);`}
            </pre>
          </div>
          
          <div className="text-gray-300">
            <p>These utility functions can be used throughout your application to format activity data consistently.</p>
            <p className="mt-2">The <code className="bg-gray-600 px-2 py-1 rounded">formatActivity()</code> function returns React nodes with proper links, while <code className="bg-gray-600 px-2 py-1 rounded">formatActivityText()</code> returns plain strings for use in non-JSX contexts.</p>
          </div>
        </div>
      </div>
    </div>
  );
};