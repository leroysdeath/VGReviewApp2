// Activity data types
export interface Activity {
  id: string;
  type: 'comment' | 'like' | 'share';
  userId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ActivityResponse {
  activities: Activity[];
  nextCursor?: string;
  totalCount: number;
}

export interface ActivityFeedState {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  nextCursor?: string;
  totalCount: number;
  hasMore: boolean;
}

export interface ActivityFeedOptions {
  userId: string;
  isActive: boolean;
  initialPageSize?: number;
}

export interface FetchActivitiesParams {
  userId: string;
  cursor?: string;
  limit?: number;
}

export interface ActivityService {
  fetchActivities: (params: FetchActivitiesParams) => Promise<ActivityResponse>;
  retryFetch: (params: FetchActivitiesParams) => Promise<ActivityResponse>;
}