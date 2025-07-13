import { ReactNode } from 'react';

export type ActivityType = 
  | 'review'
  | 'rating'
  | 'comment'
  | 'like'
  | 'follow'
  | 'achievement'
  | 'game_completed'
  | 'game_started';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  game?: {
    id: string;
    title: string;
    coverImage?: string;
  };
  content?: string;
  rating?: number;
  targetUser?: {
    id: string;
    name: string;
  };
}

export interface ActivityFeedProps {
  userId: string;
  isActive: boolean;
  activities?: ActivityItem[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

export interface ActivityFeedState {
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
}