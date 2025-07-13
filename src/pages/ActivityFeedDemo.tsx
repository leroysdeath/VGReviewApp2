import React, { useState } from 'react';
import { ActivityFeed, Activity } from '../components/ActivityFeed';

// Sample activity data
const sampleActivities: Activity[] = [
  {
    id: '1',
    type: 'review',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    user: {
      id: '101',
      name: 'GamerPro',
      avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '201',
      title: 'Elden Ring',
      coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    review: {
      id: '301',
      rating: 9.5,
      content: 'Elden Ring is an absolute masterpiece. The open world is breathtaking and the freedom of exploration is unmatched. The combat system is challenging but fair, and the boss fights are some of the best in gaming history.'
    }
  },
  {
    id: '2',
    type: 'review_like',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    user: {
      id: '102',
      name: 'RPGFanatic',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    targetUser: {
      id: '103',
      name: 'GameCritic',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '202',
      title: 'The Witcher 3: Wild Hunt',
      coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    review: {
      id: '302',
      rating: 10.0,
      content: 'The Witcher 3 is without a doubt one of the greatest RPGs ever created, and quite possibly one of the best games of all time. CD Projekt Red has crafted an incredibly immersive world filled with meaningful quests, complex characters, and stunning environments.'
    }
  },
  {
    id: '3',
    type: 'comment',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    user: {
      id: '104',
      name: 'CasualGamer',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '203',
      title: 'Cyberpunk 2077',
      coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    comment: {
      id: '401',
      content: 'I agree with most of your points, but I think the game still has some performance issues on last-gen consoles. The story and characters are amazing though!'
    }
  },
  {
    id: '4',
    type: 'comment_like',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    user: {
      id: '105',
      name: 'GameDev',
      avatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '204',
      title: 'God of War Ragnarök',
      coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    comment: {
      id: '402',
      content: 'The combat system in this game is so satisfying. Every hit feels impactful, and the progression system is perfectly balanced.'
    }
  },
  {
    id: '5',
    type: 'comment_reply',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    user: {
      id: '106',
      name: 'IndieEnthusiast',
      avatar: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '205',
      title: 'Hollow Knight',
      coverImage: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    comment: {
      id: '403',
      content: 'I completely agree! The art style is also incredible. Team Cherry did an amazing job with the atmosphere and world-building.',
      parentId: '404'
    }
  },
  {
    id: '6',
    type: 'review',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    user: {
      id: '107',
      name: 'StrategyMaster',
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '206',
      title: 'Civilization VI',
      coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    review: {
      id: '303',
      rating: 8.5,
      content: 'Civilization VI builds upon the strong foundation of its predecessors while introducing new mechanics that add depth to the gameplay. The district system and civics tree are particularly well-implemented.'
    }
  },
  {
    id: '7',
    type: 'review_like',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    user: {
      id: '108',
      name: 'RetroCollector',
      avatar: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '207',
      title: 'Final Fantasy VII Remake',
      coverImage: 'https://images.pexels.com/photos/3945656/pexels-photo-3945656.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    review: {
      id: '304',
      rating: 9.0,
      content: 'Square Enix has done an incredible job reimagining this classic. The combat system perfectly blends real-time action with strategic elements, and the expanded story gives more depth to Midgar and its inhabitants.'
    }
  },
  {
    id: '8',
    type: 'comment',
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    user: {
      id: '109',
      name: 'SpeedRunner',
      avatar: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '208',
      title: 'Hades',
      coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    comment: {
      id: '405',
      content: 'The roguelike elements are perfectly balanced. Each run feels different, and the permanent upgrades give a great sense of progression.'
    }
  },
  {
    id: '9',
    type: 'comment_like',
    timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks ago
    user: {
      id: '110',
      name: 'StoryLover',
      avatar: 'https://images.pexels.com/photos/1486064/pexels-photo-1486064.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '209',
      title: 'The Last of Us Part II',
      coverImage: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    comment: {
      id: '406',
      content: 'The narrative structure is bold and challenging. It forces players to confront uncomfortable emotions and perspectives in a way few games dare to attempt.'
    }
  },
  {
    id: '10',
    type: 'comment_reply',
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month ago
    user: {
      id: '111',
      name: 'AchievementHunter',
      avatar: 'https://images.pexels.com/photos/775358/pexels-photo-775358.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '210',
      title: 'Red Dead Redemption 2',
      coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400'
    },
    comment: {
      id: '407',
      content: 'The attention to detail in this game is unmatched. Every interaction feels natural and grounded in the world.',
      parentId: '408'
    }
  }
];

export const ActivityFeedDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>(sampleActivities);
  const [viewMode, setViewMode] = useState<'all' | 'reviews' | 'comments'>('all');

  // Filter activities based on view mode
  const filteredActivities = activities.filter(activity => {
    if (viewMode === 'all') return true;
    if (viewMode === 'reviews') return activity.type === 'review' || activity.type === 'review_like';
    if (viewMode === 'comments') return activity.type === 'comment' || activity.type === 'comment_like' || activity.type === 'comment_reply';
    return true;
  });

  // Simulate loading more activities
  const loadMore = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Create new activities by modifying the timestamps of existing ones
      const newActivities = sampleActivities.map(activity => ({
        ...activity,
        id: `new-${Math.random().toString(36).substring(7)}`,
        timestamp: new Date(new Date(activity.timestamp).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() // 1 month older
      }));
      
      setActivities(prev => [...prev, ...newActivities]);
      setIsLoading(false);
    }, 1500);
  };

  // Simulate error
  const simulateError = () => {
    setError('Failed to load activities. Network error occurred.');
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#121212] py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Activity Feed</h1>
          <p className="text-[#B3B3B3]">
            A chronological timeline of user interactions with games, reviews, and comments.
          </p>
          
          {/* Demo controls */}
          <div className="mt-6 p-4 bg-[#1E1E1E] rounded-lg">
            <h2 className="text-white font-medium mb-3">Demo Controls</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-[#7289DA] text-white rounded-lg hover:bg-[#5a6ebd] transition-colors"
              >
                Simulate Load More
              </button>
              <button
                onClick={simulateError}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Simulate Error
              </button>
              {error && (
                <button
                  onClick={clearError}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Clear Error
                </button>
              )}
            </div>
            
            <div className="mt-4">
              <h3 className="text-white text-sm mb-2">Filter Activities:</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    viewMode === 'all' 
                      ? 'bg-[#7289DA] text-white' 
                      : 'bg-[#2A2A2A] text-[#B3B3B3] hover:bg-[#3A3A3A]'
                  } transition-colors`}
                >
                  All
                </button>
                <button
                  onClick={() => setViewMode('reviews')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    viewMode === 'reviews' 
                      ? 'bg-[#7289DA] text-white' 
                      : 'bg-[#2A2A2A] text-[#B3B3B3] hover:bg-[#3A3A3A]'
                  } transition-colors`}
                >
                  Reviews
                </button>
                <button
                  onClick={() => setViewMode('comments')}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    viewMode === 'comments' 
                      ? 'bg-[#7289DA] text-white' 
                      : 'bg-[#2A2A2A] text-[#B3B3B3] hover:bg-[#3A3A3A]'
                  } transition-colors`}
                >
                  Comments
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Activity Feed */}
        <ActivityFeed
          initialActivities={filteredActivities}
          isLoading={isLoading}
          error={error}
          pageSize={10}
          className="mb-8"
        />
        
        {/* Component Usage Example */}
        <div className="mt-12 p-6 bg-[#1E1E1E] rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Component Usage</h2>
          <pre className="bg-[#121212] p-4 rounded-lg overflow-x-auto text-sm text-[#B3B3B3]">
{`import { ActivityFeed } from '../components/ActivityFeed';

// Basic usage with user ID
<ActivityFeed userId="123" />

// With initial data and custom page size
<ActivityFeed 
  userId="123"
  initialActivities={activities}
  pageSize={20}
/>

// With custom styling
<ActivityFeed 
  userId="123"
  className="max-w-lg mx-auto"
/>`}
          </pre>
        </div>
        
        {/* Activity Data Structure */}
        <div className="mt-8 p-6 bg-[#1E1E1E] rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Activity Data Structure</h2>
          <pre className="bg-[#121212] p-4 rounded-lg overflow-x-auto text-sm text-[#B3B3B3]">
{`interface Activity {
  id: string;
  type: 'review' | 'review_like' | 'comment' | 'comment_like' | 'comment_reply';
  timestamp: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  targetUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  game?: {
    id: string;
    title: string;
    coverImage?: string;
  };
  review?: {
    id: string;
    rating: number;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
    parentId?: string;
  };
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};