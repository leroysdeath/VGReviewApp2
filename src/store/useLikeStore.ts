import { create } from 'zustand';
import { contentLikeService } from '../services/contentLikeService';
import { toast } from 'react-hot-toast';

interface LikeStatus {
  liked: boolean;
  count: number;
}

interface LikeStore {
  // State
  likeStatuses: Map<number, LikeStatus>;
  loadingStates: Set<number>;
  
  // Actions
  loadBulkStatus: (userId: number | undefined, ratingIds: number[]) => Promise<void>;
  toggleLike: (userId: number, ratingId: number) => Promise<void>;
  optimisticToggle: (ratingId: number) => void;
  setLikeStatus: (ratingId: number, status: LikeStatus) => void;
  clearLoadingState: (ratingId: number) => void;
  reset: () => void;
}

export const useLikeStore = create<LikeStore>((set, get) => ({
  // Initial state
  likeStatuses: new Map(),
  loadingStates: new Set(),
  
  // Load bulk like statuses for multiple reviews
  loadBulkStatus: async (userId, ratingIds) => {
    if (!ratingIds || ratingIds.length === 0) {
      return;
    }
    
    try {
      const statuses = await contentLikeService.getBulkLikeStatus(userId, ratingIds);
      set({ likeStatuses: statuses });
      console.log(`✅ Loaded like statuses for ${ratingIds.length} reviews`);
    } catch (error) {
      console.error('Error loading bulk like statuses:', error);
      toast.error('Failed to load like statuses');
    }
  },
  
  // Toggle like for a review
  toggleLike: async (userId, ratingId) => {
    // Add to loading state
    set(state => {
      const newLoading = new Set(state.loadingStates);
      newLoading.add(ratingId);
      return { loadingStates: newLoading };
    });
    
    // Get current status
    const currentStatus = get().likeStatuses.get(ratingId) || { liked: false, count: 0 };
    
    // Optimistic update
    get().optimisticToggle(ratingId);
    
    try {
      // Call API
      const result = await contentLikeService.toggleReviewLike(userId, ratingId);
      
      if (!result.success) {
        // Rollback on failure
        get().optimisticToggle(ratingId);
        throw new Error(result.error || 'Failed to update like');
      }
      
      // Update with server response
      if (result.data) {
        set(state => {
          const newStatuses = new Map(state.likeStatuses);
          newStatuses.set(ratingId, {
            liked: result.data!.liked,
            count: result.data!.count
          });
          return { likeStatuses: newStatuses };
        });
      }
    } catch (error) {
      // Rollback optimistic update
      set(state => {
        const newStatuses = new Map(state.likeStatuses);
        newStatuses.set(ratingId, currentStatus);
        return { likeStatuses: newStatuses };
      });
      
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      // Remove from loading state
      get().clearLoadingState(ratingId);
    }
  },
  
  // Optimistic toggle (immediately update UI)
  optimisticToggle: (ratingId) => {
    set(state => {
      const newStatuses = new Map(state.likeStatuses);
      const current = newStatuses.get(ratingId) || { liked: false, count: 0 };
      
      newStatuses.set(ratingId, {
        liked: !current.liked,
        count: current.liked ? Math.max(0, current.count - 1) : current.count + 1
      });
      
      return { likeStatuses: newStatuses };
    });
  },
  
  // Set like status for a specific review
  setLikeStatus: (ratingId, status) => {
    set(state => {
      const newStatuses = new Map(state.likeStatuses);
      newStatuses.set(ratingId, status);
      return { likeStatuses: newStatuses };
    });
  },
  
  // Clear loading state for a review
  clearLoadingState: (ratingId) => {
    set(state => {
      const newLoading = new Set(state.loadingStates);
      newLoading.delete(ratingId);
      return { loadingStates: newLoading };
    });
  },
  
  // Reset store
  reset: () => {
    set({
      likeStatuses: new Map(),
      loadingStates: new Set()
    });
  }
}));