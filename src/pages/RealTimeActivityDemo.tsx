import React, { useState, useEffect } from 'react';
import { RealTimeActivityFeed } from '../components/RealTimeActivityFeed';
import { Activity } from '../types/activity';
import { Wifi, WifiOff, Zap, Settings, RefreshCw, PlusCircle } from 'lucide-react';

// Sample activity data
const sampleActivities: Activity[] = [
  {
    id: '1',
    type: 'comment',
    userId: 'user123',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    metadata: {
      gameId: 'game1',
      gameName: 'Elden Ring',
      content: 'This game is absolutely incredible. The open world design is breathtaking.'
    }
  },
  {
    id: '2',
    type: 'like',
    userId: 'user456',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    metadata: {
      gameId: 'game2',
      gameName: 'The Witcher 3',
      reviewId: 'review1',
      reviewAuthor: 'GameCritic'
    }
  },
  {
    id: '3',
    type: 'share',
    userId: 'user789',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    metadata: {
      gameId: 'game3',
      gameName: 'Cyberpunk 2077',
      platform: 'twitter'
    }
  }
];

// Activity types for simulation
const activityTypes = ['comment', 'like', 'share'];
const gameIds = ['game1', 'game2', 'game3', 'game4', 'game5'];
const gameNames = ['Elden Ring', 'The Witcher 3', 'Cyberpunk 2077', 'God of War', 'Horizon Zero Dawn'];
const userIds = ['user123', 'user456', 'user789', 'user101', 'user202'];

// Generate a random activity
const generateRandomActivity = (): Activity => {
  const type = activityTypes[Math.floor(Math.random() * activityTypes.length)] as 'comment' | 'like' | 'share';
  const gameIndex = Math.floor(Math.random() * gameIds.length);
  const userId = userIds[Math.floor(Math.random() * userIds.length)];
  
  const baseActivity = {
    id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    type,
    userId,
    timestamp: new Date().toISOString(),
    metadata: {
      gameId: gameIds[gameIndex],
      gameName: gameNames[gameIndex]
    }
  };
  
  // Add type-specific metadata
  if (type === 'comment') {
    baseActivity.metadata.content = `This is a random comment about ${gameNames[gameIndex]} generated at ${new Date().toLocaleTimeString()}`;
  } else if (type === 'like') {
    baseActivity.metadata.reviewId = `review-${Math.floor(Math.random() * 100)}`;
    baseActivity.metadata.reviewAuthor = `User${Math.floor(Math.random() * 1000)}`;
  } else if (type === 'share') {
    baseActivity.metadata.platform = ['twitter', 'facebook', 'reddit'][Math.floor(Math.random() * 3)];
  }
  
  return baseActivity;
};

// Render an activity item
const renderActivityItem = (activity: Activity, isNew: boolean) => {
  // Get activity icon based on type
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'comment':
        return <div className="w-10 h-10 bg-blue-600/30 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>;
      case 'like':
        return <div className="w-10 h-10 bg-red-600/30 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>;
      case 'share':
        return <div className="w-10 h-10 bg-green-600/30 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </div>;
      default:
        return <div className="w-10 h-10 bg-gray-600/30 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>;
    }
  };
  
  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return 'just now';
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 4) return `${diffWeek}w ago`;
    
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo ago`;
    
    const diffYear = Math.floor(diffDay / 365);
    return `${diffYear}y ago`;
  };
  
  // Get activity description
  const getActivityDescription = () => {
    switch (activity.type) {
      case 'comment':
        return (
          <div>
            <p className="text-gray-300">
              <span className="font-medium text-white">User {activity.userId.replace('user', '')}</span>
              {' commented on '}
              <span className="text-blue-400">{activity.metadata.gameName}</span>
            </p>
            {activity.metadata.content && (
              <div className="mt-2 p-3 bg-gray-700 rounded-lg">
                <p className="text-gray-300 text-sm">{activity.metadata.content}</p>
              </div>
            )}
          </div>
        );
      case 'like':
        return (
          <div>
            <p className="text-gray-300">
              <span className="font-medium text-white">User {activity.userId.replace('user', '')}</span>
              {' liked '}
              <span className="text-blue-400">{activity.metadata.reviewAuthor}'s review</span>
              {' of '}
              <span className="text-blue-400">{activity.metadata.gameName}</span>
            </p>
          </div>
        );
      case 'share':
        return (
          <div>
            <p className="text-gray-300">
              <span className="font-medium text-white">User {activity.userId.replace('user', '')}</span>
              {' shared '}
              <span className="text-blue-400">{activity.metadata.gameName}</span>
              {' on '}
              <span className="capitalize text-blue-400">{activity.metadata.platform}</span>
            </p>
          </div>
        );
      default:
        return (
          <p className="text-gray-300">
            <span className="font-medium text-white">User {activity.userId.replace('user', '')}</span>
            {' performed an activity'}
          </p>
        );
    }
  };
  
  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${isNew ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex gap-3">
        {/* Activity Icon */}
        {getActivityIcon()}
        
        {/* Activity Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isNew && (
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              )}
              <span className="text-gray-400 text-sm">
                {formatRelativeTime(activity.timestamp)}
              </span>
            </div>
            
            {/* Activity ID (for demo purposes) */}
            <span className="text-gray-500 text-xs">ID: {activity.id.substring(0, 8)}</span>
          </div>
          
          {/* Activity Description */}
          {getActivityDescription()}
        </div>
      </div>
    </div>
  );
};

export const RealTimeActivityDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>(sampleActivities);
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(5000); // 5 seconds
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start activity simulation
  const startSimulation = () => {
    setSimulationActive(true);
    
    // Clear any existing interval
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
    }
    
    // Set new interval
    simulationRef.current = setInterval(() => {
      const newActivity = generateRandomActivity();
      setActivities(prev => [newActivity, ...prev]);
    }, simulationSpeed);
  };
  
  // Stop activity simulation
  const stopSimulation = () => {
    setSimulationActive(false);
    
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
  };
  
  // Add a single activity
  const addSingleActivity = () => {
    const newActivity = generateRandomActivity();
    setActivities(prev => [newActivity, ...prev]);
  };
  
  // Simulate error
  const simulateError = () => {
    setError('Simulated connection error. Please try again.');
  };
  
  // Clear error
  const clearError = () => {
    setError(null);
  };
  
  // Simulate loading
  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-6">Real-Time Activity Feed</h1>
        
        {/* Demo Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Demo Controls</h2>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" />
              <span className="text-gray-400">Simulation Settings</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Activity Simulation</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Simulation Status:</span>
                  <div className={`flex items-center gap-2 ${
                    simulationActive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {simulationActive ? (
                      <>
                        <Wifi className="h-4 w-4" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4" />
                        <span>Inactive</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Simulation Speed:</label>
                  <select
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="1000">Fast (1 second)</option>
                    <option value="5000">Medium (5 seconds)</option>
                    <option value="10000">Slow (10 seconds)</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  {simulationActive ? (
                    <button
                      onClick={stopSimulation}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Stop Simulation
                    </button>
                  ) : (
                    <button
                      onClick={startSimulation}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Start Simulation
                    </button>
                  )}
                  
                  <button
                    onClick={addSingleActivity}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add Single Activity
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-3">State Simulation</h3>
              <div className="space-y-4">
                <button
                  onClick={simulateLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Simulate Loading State
                </button>
                
                <button
                  onClick={simulateError}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <WifiOff className="h-4 w-4" />
                  Simulate Connection Error
                </button>
                
                {error && (
                  <button
                    onClick={clearError}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Clear Error
                  </button>
                )}
              </div>
              
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <h4 className="text-white font-medium mb-2">Activity Count</h4>
                <div className="text-2xl font-bold text-blue-400">{activities.length}</div>
                <p className="text-gray-400 text-sm mt-1">
                  New activities appear in real-time with a blue highlight
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Real-Time Activity Feed */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">Activity Feed</h2>
          
          <RealTimeActivityFeed
            initialActivities={activities}
            isLoading={isLoading}
            error={error}
            onRetry={clearError}
            renderItem={renderActivityItem}
          />
        </div>
        
        {/* Implementation Details */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Implementation Details</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">WebSocket Connection</h3>
              <p className="text-gray-400">
                The component establishes a WebSocket connection to the server endpoint and
                implements reconnection logic with exponential backoff. If the connection fails,
                it automatically falls back to polling.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Real-time Updates</h3>
              <p className="text-gray-400">
                New activities are received in real-time and added to the activity list with a
                highlight animation. Updates are batched to prevent excessive re-renders when
                multiple activities arrive in quick succession.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Performance Optimizations</h3>
              <ul className="list-disc pl-5 text-gray-400 space-y-1">
                <li>500ms debounce for batching rapid updates</li>
                <li>Memoized activity items to prevent unnecessary re-renders</li>
                <li>Optimized state updates to maintain smooth scrolling</li>
                <li>Connection state management with visual feedback</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeActivityDemo;