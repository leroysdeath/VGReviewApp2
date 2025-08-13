import { Activity, ActivityResponse, FetchActivitiesParams } from '../types/activity';

// Simulated API endpoint for activities
const API_ENDPOINT = '/api/activities';

/**
 * Fetches paginated activities for a user
 */
export const fetchActivities = async ({
  userId,
  cursor,
  limit = 20
}: FetchActivitiesParams): Promise<ActivityResponse> => {
  try {
    // In a real implementation, this would be a fetch call to your API
    // For now, we'll simulate the API response with a delay
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate API call
    const url = new URL(API_ENDPOINT, window.location.origin);
    url.searchParams.append('userId', userId);
    if (cursor) url.searchParams.append('cursor', cursor);
    url.searchParams.append('limit', limit.toString());
    
    console.log(`Fetching activities: ${url.toString()}`);
    
    // For demo purposes, generate mock data
    // In a real app, this would be: const response = await fetch(url.toString());
    const mockActivities: Activity[] = Array.from({ length: limit }, (_, i) => ({
      id: `${cursor || 'page1'}-${i}`,
      type: ['comment', 'like', 'share'][Math.floor(Math.random() * 3)] as 'comment' | 'like' | 'share',
      userId,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      metadata: {
        // Random metadata based on type
        ...(Math.random() > 0.5 ? { gameId: `game-${Math.floor(Math.random() * 100)}` } : {}),
        ...(Math.random() > 0.5 ? { reviewId: `review-${Math.floor(Math.random() * 100)}` } : {}),
        ...(Math.random() > 0.5 ? { commentId: `comment-${Math.floor(Math.random() * 100)}` } : {})
      }
    }));
    
    // Simulate pagination
    const hasMore = mockActivities.length === limit;
    const nextCursor = hasMore ? `cursor-${Date.now()}` : undefined;
    
    return {
      activities: mockActivities,
      nextCursor,
      totalCount: 100 // Mock total count
    };
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch activities');
  }
};

/**
 * Retries a failed activity fetch
 */
export const retryFetch = async (params: FetchActivitiesParams): Promise<ActivityResponse> => {
  console.log('Retrying activity fetch:', params);
  return fetchActivities(params);
};

/**
 * Transforms raw activity data into UI-friendly format
 */
export const transformActivityData = (activity: Activity): Activity => {
  // In a real app, you might transform the data here
  // For example, converting timestamps, enriching with additional data, etc.
  return {
    ...activity,
    // Example transformation: ensure timestamp is in ISO format
    timestamp: new Date(activity.timestamp).toISOString()
  };
};