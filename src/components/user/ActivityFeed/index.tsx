import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Card, 
  CardContent, 
  Link, 
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Stack
} from '@mui/material';
import { 
  Star as StarIcon, 
  Comment as CommentIcon, 
  Favorite as FavoriteIcon, 
  Person as PersonIcon,
  EmojiEvents as AchievementIcon,
  SportsEsports as GameIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { ActivityFeedProps, ActivityItem, ActivityType } from './types';
import ActivityFeedSkeleton from './ActivityFeedSkeleton';
import { useActivityFeed } from '../../../hooks/useActivityFeed';
import { InfiniteScroll } from '../../InfiniteScroll';

// Helper function to format relative time
const formatRelativeTime = (date: Date): string => {
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

// Sample placeholder activities
const placeholderActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'review',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
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
    content: 'This game is absolutely incredible. The open world design is breathtaking.',
    rating: 4.5
  },
  {
    id: '2',
    type: 'like',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    user: {
      id: '102',
      name: 'RPGFanatic',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    targetUser: {
      id: '103',
      name: 'GameCritic'
    },
    game: {
      id: '202',
      title: 'The Witcher 3: Wild Hunt'
    }
  },
  {
    id: '3',
    type: 'comment',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    user: {
      id: '104',
      name: 'CasualGamer',
      avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '203',
      title: 'Cyberpunk 2077'
    },
    content: 'I agree with most of your points, but I think the game still has some performance issues.'
  },
  {
    id: '4',
    type: 'game_completed',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    user: {
      id: '105',
      name: 'HardcoreGamer',
      avatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    game: {
      id: '204',
      title: 'God of War Ragnarök',
      coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400'
    }
  },
  {
    id: '5',
    type: 'achievement',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    user: {
      id: '106',
      name: 'TrophyHunter',
      avatar: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    content: 'Earned the "Completionist" achievement'
  }
];

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  userId,
  isActive,
  activities: initialActivities,
  isLoading: initialLoading,
  error: initialError,
  onRetry: initialRetry
}) => {
  // Use the custom hook for data fetching
  const {
    activities = initialActivities || placeholderActivities,
    isLoading = initialLoading || false,
    error = initialError,
    hasMore,
    loadMore,
    retry = initialRetry,
    refresh
  } = useActivityFeed({
    userId,
    isActive,
    initialPageSize: 10
  });
  
  // Don't render anything if tab is not active
  if (!isActive) return null;
  
  // Get activity icon based on type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'review':
        return <StarIcon sx={{ color: '#FFD700' }} />;
      case 'comment':
        return <CommentIcon sx={{ color: '#7289DA' }} />;
      case 'like':
        return <FavoriteIcon sx={{ color: '#FF6B6B' }} />;
      case 'follow':
        return <PersonIcon sx={{ color: '#4CAF50' }} />;
      case 'achievement':
        return <AchievementIcon sx={{ color: '#FFA726' }} />;
      case 'game_completed':
      case 'game_started':
        return <GameIcon sx={{ color: '#29B6F6' }} />;
      default:
        return <StarIcon />;
    }
  };
  
  // Get activity description based on type
  const getActivityDescription = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'review':
        return (
          <Typography variant="body2" color="text.primary">
            reviewed{' '}
            <Link component={RouterLink} to={`/game/${activity.game?.id}`} color="primary">
              {activity.game?.title}
            </Link>
            {activity.rating && (
              <Box component="span" sx={{ ml: 1 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon 
                    key={i} 
                    sx={{ 
                      fontSize: 16, 
                      color: i < Math.floor(activity.rating) ? '#FFD700' : '#555',
                      verticalAlign: 'text-bottom'
                    }} 
                  />
                ))}
              </Box>
            )}
          </Typography>
        );
      case 'like':
        return (
          <Typography variant="body2" color="text.primary">
            liked{' '}
            {activity.targetUser && (
              <>
                <Link component={RouterLink} to={`/user/${activity.targetUser.id}`} color="primary">
                  {activity.targetUser.name}
                </Link>
                's review of{' '}
              </>
            )}
            <Link component={RouterLink} to={`/game/${activity.game?.id}`} color="primary">
              {activity.game?.title}
            </Link>
          </Typography>
        );
      case 'comment':
        return (
          <Typography variant="body2" color="text.primary">
            commented on a review of{' '}
            <Link component={RouterLink} to={`/game/${activity.game?.id}`} color="primary">
              {activity.game?.title}
            </Link>
          </Typography>
        );
      case 'follow':
        return (
          <Typography variant="body2" color="text.primary">
            followed{' '}
            <Link component={RouterLink} to={`/user/${activity.targetUser?.id}`} color="primary">
              {activity.targetUser?.name}
            </Link>
          </Typography>
        );
      case 'achievement':
        return (
          <Typography variant="body2" color="text.primary">
            {activity.content}
          </Typography>
        );
      case 'game_completed':
        return (
          <Typography variant="body2" color="text.primary">
            completed{' '}
            <Link component={RouterLink} to={`/game/${activity.game?.id}`} color="primary">
              {activity.game?.title}
            </Link>
          </Typography>
        );
      case 'game_started':
        return (
          <Typography variant="body2" color="text.primary">
            started playing{' '}
            <Link component={RouterLink} to={`/game/${activity.game?.id}`} color="primary">
              {activity.game?.title}
            </Link>
          </Typography>
        );
      default:
        return <Typography variant="body2" color="text.primary">performed an activity</Typography>;
    }
  };
  
  // Loading state
  if (isLoading && activities.length === 0) {
    return <ActivityFeedSkeleton />;
  }
  
  // Error state
  if (error && activities.length === 0) {
    return (
      <Alert 
        severity="error" 
        sx={{ mb: 2 }}
        action={
          retry && (
            <Button 
              color="inherit" 
              size="small" 
              onClick={retry}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          )
        }
      >
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }
  
  // Empty state
  if (!activities.length) {
    return (
      <Box 
        sx={{ 
          textAlign: 'center', 
          py: 4, 
          bgcolor: 'background.paper', 
          borderRadius: 1 
        }}
      >
        <GameIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.primary">No Activity Yet</Typography>
        <Typography variant="body2" color="text.secondary">
          Activity will appear here once you start interacting with games and other users.
        </Typography>
      </Box>
    );
  }
  
  return (
    <InfiniteScroll
      hasMore={hasMore}
      loading={isLoading}
      onLoadMore={loadMore}
      className="w-full"
    >
      <Stack spacing={2} sx={{ width: '100%' }}>
        {activities.map((activity) => (
          <Card 
            key={activity.id} 
            sx={{ 
              bgcolor: '#1E1E1E',
              '&:hover': {
                bgcolor: '#2A2A2A',
                transition: 'background-color 0.3s'
              }
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Activity icon */}
                <Box 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%', 
                    bgcolor: '#121212', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {getActivityIcon(activity.type)}
                </Box>
                
                {/* Activity content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Link 
                        component={RouterLink} 
                        to={`/user/${activity.user.id}`}
                        sx={{ 
                          fontWeight: 'bold', 
                          color: '#FFFFFF',
                          textDecoration: 'none',
                          '&:hover': { color: '#7289DA' }
                        }}
                      >
                        {activity.user.username || activity.user.name}
                      </Link>
                      <Typography variant="body2" color="#818384">
                        {formatRelativeTime(activity.timestamp)}
                      </Typography>
                    </Box>
                    
                    {activity.game?.coverImage && (
                      <Link component={RouterLink} to={`/game/${activity.game.id}`}>
                        <Box 
                          component="img" 
                          src={activity.game.coverImage}
                          alt={activity.game.title}
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: 1,
                            objectFit: 'cover'
                          }}
                        />
                      </Link>
                    )}
                  </Box>
                  
                  {/* Activity description */}
                  {getActivityDescription(activity)}
                  
                  {/* Activity content preview */}
                  {activity.content && (
                    <Box 
                      sx={{ 
                        mt: 1, 
                        p: 1.5, 
                        bgcolor: '#121212', 
                        borderRadius: 1,
                        maxHeight: '4.5em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      <Typography variant="body2" color="#B3B3B3">
                        {activity.content}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Game image for certain activities */}
                  {(activity.type === 'review' || activity.type === 'game_completed') && 
                   activity.game?.coverImage && (
                    <Box sx={{ mt: 1 }}>
                      <Link component={RouterLink} to={`/game/${activity.game.id}`}>
                        <Box 
                          component="img" 
                          src={activity.game.coverImage}
                          alt={activity.game.title}
                          sx={{ 
                            height: 60, 
                            borderRadius: 1,
                            objectFit: 'cover'
                          }}
                        />
                      </Link>
                    </Box>
                  )}
                  
                  {/* User avatar */}
                  {activity.user.avatar && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        src={activity.user.avatar} 
                        alt={activity.user.username || activity.user.name}
                        sx={{ width: 24, height: 24 }}
                      />
                      <Typography variant="caption" color="#818384">
                        {activity.user.username || activity.user.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
        
        {/* Error state within the feed */}
        {error && activities.length > 0 && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={retry}
                startIcon={<RefreshIcon />}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
      </Stack>
    </InfiniteScroll>
  );
};

export default ActivityFeed;