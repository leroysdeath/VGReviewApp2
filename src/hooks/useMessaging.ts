import { useState, useEffect, useCallback } from 'react';
import { socialService } from '../services/socialService';
import { PrivateMessage, MessageThread } from '../types/social';
import { useAuth } from './useAuth';

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<MessageThread[]>([]);
  const [currentMessages, setCurrentMessages] = useState<PrivateMessage[]>([]);
  const [currentPartnerId, setCurrentPartnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [subscription, setSubscription] = useState<{ unsubscribe: () => void } | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const userId = parseInt(user.id);
      const conversationsData = await socialService.getConversations(userId);
      
      setConversations(conversationsData);
      
      // Calculate total unread count
      const totalUnread = conversationsData.reduce((sum, conv) => sum + conv.unreadCount, 0);
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (partnerId: number) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setCurrentPartnerId(partnerId);
    
    try {
      const userId = parseInt(user.id);
      const messagesData = await socialService.getMessages(userId, partnerId);
      
      setCurrentMessages(messagesData);
      
      // Update unread count in conversations
      setConversations(prev => 
        prev.map(conv => 
          conv.user.id === partnerId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      // Recalculate total unread count
      const totalUnread = conversations
        .filter(conv => conv.user.id !== partnerId)
        .reduce((sum, conv) => sum + conv.unreadCount, 0);
      
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user, conversations]);

  // Send a message
  const sendMessage = useCallback(async (recipientId: number, content: string) => {
    if (!user) return null;
    
    try {
      const userId = parseInt(user.id);
      const message = await socialService.sendMessage(userId, recipientId, content);
      
      if (message) {
        // Add message to current messages if in the same conversation
        if (currentPartnerId === recipientId) {
          setCurrentMessages(prev => [...prev, message]);
        }
        
        // Update conversations list
        await loadConversations();
      }
      
      return message;
    } catch (err) {
      console.error('Error sending message:', err);
      return null;
    }
  }, [user, currentPartnerId, loadConversations]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;
    
    const userId = parseInt(user.id);
    
    // Subscribe to new messages
    const sub = socialService.subscribeToMessages(userId, (newMessage) => {
      // Update current messages if in the same conversation
      if (currentPartnerId === newMessage.sender_id) {
        setCurrentMessages(prev => [...prev, newMessage]);
        
        // Mark as read
        socialService.getMessages(userId, newMessage.sender_id);
      } else {
        // Increment unread count for the conversation
        setConversations(prev => 
          prev.map(conv => 
            conv.user.id === newMessage.sender_id
              ? { ...conv, unreadCount: conv.unreadCount + 1, lastMessage: newMessage }
              : conv
          )
        );
        
        // Increment total unread count
        setUnreadCount(prev => prev + 1);
      }
      
      // Refresh conversations to ensure it's in the list
      loadConversations();
    });
    
    setSubscription(sub);
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user, currentPartnerId, loadConversations, subscription]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  return {
    conversations,
    currentMessages,
    currentPartnerId,
    loading,
    error,
    unreadCount,
    loadConversations,
    loadMessages,
    sendMessage,
    setCurrentPartnerId
  };
};