// Game State Types
// Defines types for game state management across collection, wishlist, and progress

export type GameState = 'wishlist' | 'collection' | 'started' | 'completed' | 'none';

export interface GameStateStatus {
  inWishlist: boolean;
  inCollection: boolean;
  isStarted: boolean;
  isCompleted: boolean;
  currentState: GameState;
  canTransitionTo: GameState[];
}

export interface GameStateTransition {
  from: GameState;
  to: GameState;
  timestamp: Date;
  userId: number;
  igdbId: number;
}

export interface GameStateError {
  code: 'ALREADY_STARTED' | 'ALREADY_COMPLETED' | 'INVALID_TRANSITION' | 'NOT_AUTHENTICATED';
  message: string;
  currentState?: GameState;
  attemptedState?: GameState;
}

export const STATE_TRANSITIONS: Record<GameState, GameState[]> = {
  none: ['wishlist', 'collection'],
  wishlist: ['collection', 'none'],
  collection: ['started', 'wishlist', 'none'],
  started: ['completed'],
  completed: [] // Terminal state
};

export const STATE_LABELS: Record<GameState, string> = {
  none: 'Not in Library',
  wishlist: 'Wishlist',
  collection: 'Collection',
  started: 'Playing',
  completed: 'Completed'
};

export const STATE_ICONS: Record<GameState, string> = {
  none: '',
  wishlist: 'Gift',
  collection: 'BookOpen',
  started: 'Play',
  completed: 'CheckCircle'
};