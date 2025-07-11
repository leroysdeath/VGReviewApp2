import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { CommunityEvent, CommunityEventWithParticipants, EventParticipant } from '../types/social';
import { useAuth } from './useAuth';

export const useEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CommunityEventWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load community events
  const loadEvents = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    setPage(pageNum);
    
    try {
      const eventsData = await socialService.getCommunityEvents(pageNum);
      
      // Convert to CommunityEventWithParticipants
      const eventsWithParticipants = eventsData.map(event => {
        const isParticipating = user ? 
          event.participants?.some(p => p.user_id === parseInt(user.id)) || false : 
          false;
        
        const isFull = event.max_participants ? 
          (event.participant_count >= event.max_participants) : 
          false;
        
        // Calculate time until start
        const now = new Date();
        const startTime = new Date(event.start_time);
        const diffMs = startTime.getTime() - now.getTime();
        
        let timeUntilStart = '';
        if (diffMs < 0) {
          timeUntilStart = 'Started';
        } else if (diffMs < 3600000) { // Less than 1 hour
          timeUntilStart = `${Math.ceil(diffMs / 60000)} minutes`;
        } else if (diffMs < 86400000) { // Less than 1 day
          timeUntilStart = `${Math.ceil(diffMs / 3600000)} hours`;
        } else {
          timeUntilStart = `${Math.ceil(diffMs / 86400000)} days`;
        }
        
        return {
          ...event,
          participants: event.participants || [],
          isParticipating,
          isFull,
          timeUntilStart
        };
      });
      
      if (pageNum === 1) {
        setEvents(eventsWithParticipants);
      } else {
        setEvents(prev => [...prev, ...eventsWithParticipants]);
      }
      
      setHasMore(eventsData.length === 20); // Assuming 20 is the page size
    } catch (err) {
      console.error('Error loading community events:', err);
      setError('Failed to load community events');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load more events
  const loadMoreEvents = useCallback(() => {
    if (!loading && hasMore) {
      loadEvents(page + 1);
    }
  }, [loading, hasMore, page, loadEvents]);

  // Create a new event
  const createEvent = useCallback(async (
    title: string,
    startTime: string,
    gameId?: number,
    description?: string,
    endTime?: string,
    maxParticipants?: number,
    location?: string,
    groupId?: number,
    isPublic = true
  ) => {
    if (!user) return null;
    
    try {
      const userId = parseInt(user.id);
      const event = await socialService.createCommunityEvent(
        userId,
        title,
        startTime,
        gameId,
        description,
        endTime,
        maxParticipants,
        location,
        groupId,
        isPublic
      );
      
      if (event) {
        // Refresh events list
        await loadEvents();
      }
      
      return event;
    } catch (err) {
      console.error('Error creating event:', err);
      return null;
    }
  }, [user, loadEvents]);

  // Join an event
  const joinEvent = useCallback(async (eventId: number, status: 'going' | 'maybe' = 'going') => {
    if (!user) return false;
    
    try {
      const userId = parseInt(user.id);
      const success = await socialService.joinEvent(userId, eventId, status);
      
      if (success) {
        // Update local state
        setEvents(prev => 
          prev.map(event => 
            event.id === eventId
              ? {
                  ...event,
                  isParticipating: true,
                  participant_count: (event.participant_count || 0) + 1,
                  participants: [
                    ...event.participants,
                    {
                      id: 0, // Temporary ID
                      event_id: eventId,
                      user_id: userId,
                      status,
                      joined_at: new Date().toISOString(),
                      user: {
                        id: userId,
                        name: user.name,
                        picurl: user.avatar
                      }
                    }
                  ]
                }
              : event
          )
        );
      }
      
      return success;
    } catch (err) {
      console.error('Error joining event:', err);
      return false;
    }
  }, [user]);

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    loading,
    error,
    hasMore,
    loadEvents,
    loadMoreEvents,
    createEvent,
    joinEvent
  };
};