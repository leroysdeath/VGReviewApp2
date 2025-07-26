import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Chip,
  Skeleton,
  Alert,
  Button,
  Tabs,
  Tab,
  Paper,
  LinearProgress,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Star as StarIcon,
  ChatBubbleOutline as CommentIcon,
  ThumbUp as LikeIcon,
  PersonAdd as FollowIcon,
  EmojiEvents as AchievementIcon,
  SportsEsports as GameIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ActivityItem, ActivityType, ActivityFeedProps, TabPanelProps } from './types';
import { useActivityFeed } from '../../../hooks/useActivityFeed';

// Tab panel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`activity-tabpanel-${index}`}
      aria-labelledby={`activity-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Get icon for activity type
const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'review':
    case 'rating':
      return <StarIcon />;
    case 'comment':
      return <CommentIcon />;
    case 'like':
      return <LikeIcon />;
    case 'follow':
      return <FollowIcon />;
    case 'achievement':
      return <AchievementIcon />;
    case 'game_completed':
    case 'game_started':
      return <GameIcon />;
    default:
      return <GameIcon />;
  }
};

// Get color for activity type
const getActivityColor = (type: ActivityType): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' => {
  switch (type) {
    case 'review':
    case 'rating':
      return 'warning';
    case 'comment':
      return 'primary';
    case 'like':
      return 'error';
    case 'follow':
      return 'success';
    case 'achievement':
      return 'warning';
    case 'game_completed':
      return 'success';
    case 'game_started':
      return 'info';
    default:
      return 'primary';
  }
};

// Activity card component
const ActivityCard: React.FC<{ activity: ActivityItem }> = ({ activity }) => {
  return (
    <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Avatar
            src={activity.user.avatar}
            alt={activity.user.name}
            sx={{ width: 48, height: 48 }}
          />
          
          <Box flex={1}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle2" component="span">
                  {activity.user.name}
                </Typography>
                <Chip
                  icon={getActivityIcon(activity.type)}
                  label={activity.type.replace('_', ' ')}
                  size="small"
                  color={getActivityColor(activity.type)}
                  variant="outlined"
                />
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </Typography>
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            
            {activity.content && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {activity.content}
              </Typography>
            )}
            
            {activity.rating && (
              <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    fontSize="small"
                    sx={{
                      color: i < activity.rating! ? 'warning.main' : 'action.disabled'
                    }}
                  />
                ))}
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  {activity.rating}/5
                </Typography>
              </Box>
            )}
            
            {activity.game && (
              <Paper variant="outlined" sx={{ mt: 1, p: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  {activity.game.coverImage && (
                    <img
                      src={activity.game.coverImage}
                      alt={activity.game.title}
                      style={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                  <Typography variant="body2" fontWeight="medium">
                    {activity.game.title}
                  </Typography>
                </Box>
              </Paper>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Loading skeleton
const ActivitySkeleton = () => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Box display="flex" alignItems="flex-start" gap={2}>
        <Skeleton variant="circular" width={48} height={48} />
        <Box flex={1}>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  userId,
  isActive
}) => {
  const [tabValue, setTabValue] = React.useState(0);
  const {
    activities,
    isLoading,
    error,
    hasMore,
    loadMore,
    mutate
  } = useActivityFeed(userId, {
    limit: 20,
    enabled: isActive
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    mutate();
  };

  // Filter activities based on tab
  const filteredActivities = React.useMemo(() => {
    if (tabValue === 0) return activities; // All
    
    const typeMap: Record<number, ActivityType[]> = {
      1: ['review', 'rating'],
      2: ['comment'],
      3: ['follow'],
      4: ['game_completed', 'game_started'],
      5: ['achievement']
    };
    
    const types = typeMap[tabValue];
    return types ? activities.filter(a => types.includes(a.type)) : activities;
  }, [activities, tabValue]);

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }
        sx={{ mb: 2 }}
      >
        Failed to load activities: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
          <Typography variant="h6">Activity Feed</Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Divider />
        
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="activity feed tabs"
        >
          <Tab label="All" />
          <Tab label="Reviews" />
          <Tab label="Comments" />
          <Tab label="Follows" />
          <Tab label="Games" />
          <Tab label="Achievements" />
        </Tabs>
        
        {isLoading && <LinearProgress />}
      </Paper>

      <TabPanel value={tabValue} index={tabValue}>
        {isLoading && filteredActivities.length === 0 ? (
          <Box className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <ActivitySkeleton key={i} />
            ))}
          </Box>
        ) : filteredActivities.length === 0 ? (
          <Alert severity="info">
            No activities to show yet. Follow users and interact with games to see activities here!
          </Alert>
        ) : (
          <Box className="space-y-4">
            {filteredActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
            
            {hasMore && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={isLoading}
                  startIcon={isLoading ? <LinearProgress /> : null}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </TabPanel>
    </Box>
  );
};
