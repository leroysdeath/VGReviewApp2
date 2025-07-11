import { supabase } from './supabase';
import {
  UserFriend,
  PrivateMessage,
  ForumCategory,
  ForumThread,
  ForumPost,
  UserGroup,
  GroupMember,
  UserContent,
  CommunityEvent,
  EventParticipant,
  CommunityPoll,
  PollOption,
  PollVote,
  ContentCreator,
  UserMention,
  ContentLike,
  ContentShare,
  MessageThread,
  ForumCategoryWithStats,
  ForumThreadWithStats,
  CommunityPollWithResults
} from '../types/social';

class SocialService {
  // Friend/Follow System
  async getFriends(userId: number): Promise<UserFriend[]> {
    try {
      const { data, error } = await supabase
        .from('user_friend')
        .select(`
          *,
          friend:friend_id(id, name, picurl)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }

  async getFriendRequests(userId: number): Promise<UserFriend[]> {
    try {
      const { data, error } = await supabase
        .from('user_friend')
        .select(`
          *,
          friend:user_id(id, name, picurl)
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      return [];
    }
  }

  async sendFriendRequest(userId: number, friendId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_friend')
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: 'pending',
          is_following: true
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  async respondToFriendRequest(requestId: number, accept: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_friend')
        .update({
          status: accept ? 'accepted' : 'rejected'
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // If accepted, create a reciprocal relationship
      if (accept) {
        const { data: request } = await supabase
          .from('user_friend')
          .select('user_id, friend_id')
          .eq('id', requestId)
          .single();
        
        if (request) {
          // Check if reciprocal relationship already exists
          const { data: existing } = await supabase
            .from('user_friend')
            .select('id')
            .eq('user_id', request.friend_id)
            .eq('friend_id', request.user_id)
            .single();
          
          if (!existing) {
            await supabase
              .from('user_friend')
              .insert({
                user_id: request.friend_id,
                friend_id: request.user_id,
                status: 'accepted',
                is_following: true
              });
          } else {
            // Update existing relationship
            await supabase
              .from('user_friend')
              .update({
                status: 'accepted'
              })
              .eq('id', existing.id);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error responding to friend request:', error);
      return false;
    }
  }

  async followUser(userId: number, followId: number): Promise<boolean> {
    try {
      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('user_friend')
        .select('id, is_following')
        .eq('user_id', userId)
        .eq('friend_id', followId)
        .single();
      
      if (existing) {
        // Update existing relationship
        const { error } = await supabase
          .from('user_friend')
          .update({
            is_following: true
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new relationship
        const { error } = await supabase
          .from('user_friend')
          .insert({
            user_id: userId,
            friend_id: followId,
            status: 'pending',
            is_following: true
          });
        
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  async unfollowUser(userId: number, followId: number): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('user_friend')
        .select('id, status')
        .eq('user_id', userId)
        .eq('friend_id', followId)
        .single();
      
      if (existing) {
        if (existing.status === 'accepted') {
          // If they're friends, just turn off following
          const { error } = await supabase
            .from('user_friend')
            .update({
              is_following: false
            })
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          // If not friends, remove the relationship
          const { error } = await supabase
            .from('user_friend')
            .delete()
            .eq('id', existing.id);
          
          if (error) throw error;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  async isFollowing(userId: number, followId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_friend')
        .select('is_following')
        .eq('user_id', userId)
        .eq('friend_id', followId)
        .single();
      
      if (error) return false;
      return data?.is_following || false;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // Private Messaging
  async getConversations(userId: number): Promise<MessageThread[]> {
    try {
      // Get the latest message from each conversation
      const { data: sentMessages, error: sentError } = await supabase
        .from('private_message')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          is_read,
          created_at,
          recipient:recipient_id(id, name, picurl)
        `)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });
      
      if (sentError) throw sentError;
      
      const { data: receivedMessages, error: receivedError } = await supabase
        .from('private_message')
        .select(`
          id,
          sender_id,
          recipient_id,
          content,
          is_read,
          created_at,
          sender:sender_id(id, name, picurl)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });
      
      if (receivedError) throw receivedError;
      
      // Combine and group by conversation partner
      const conversations = new Map<number, MessageThread>();
      
      // Process sent messages
      sentMessages?.forEach(message => {
        const partnerId = message.recipient_id;
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            user: message.recipient,
            lastMessage: message,
            unreadCount: 0
          });
        }
      });
      
      // Process received messages
      receivedMessages?.forEach(message => {
        const partnerId = message.sender_id;
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            user: message.sender,
            lastMessage: message,
            unreadCount: message.is_read ? 0 : 1
          });
        } else {
          // Update last message if this one is more recent
          const existing = conversations.get(partnerId)!;
          if (new Date(message.created_at) > new Date(existing.lastMessage.created_at)) {
            existing.lastMessage = message;
          }
          
          // Update unread count
          if (!message.is_read) {
            existing.unreadCount += 1;
          }
        }
      });
      
      // Convert to array and sort by most recent message
      return Array.from(conversations.values())
        .sort((a, b) => 
          new Date(b.lastMessage.created_at).getTime() - 
          new Date(a.lastMessage.created_at).getTime()
        );
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getMessages(userId: number, partnerId: number): Promise<PrivateMessage[]> {
    try {
      const { data, error } = await supabase
        .from('private_message')
        .select(`
          *,
          sender:sender_id(id, name, picurl),
          recipient:recipient_id(id, name, picurl)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .or(`sender_id.eq.${partnerId},recipient_id.eq.${partnerId}`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Filter to only include messages between these two users
      const filteredMessages = data?.filter(message => 
        (message.sender_id === userId && message.recipient_id === partnerId) ||
        (message.sender_id === partnerId && message.recipient_id === userId)
      ) || [];
      
      // Mark messages as read
      const unreadMessageIds = filteredMessages
        .filter(m => m.recipient_id === userId && !m.is_read)
        .map(m => m.id);
      
      if (unreadMessageIds.length > 0) {
        await supabase
          .from('private_message')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .in('id', unreadMessageIds);
      }
      
      return filteredMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async sendMessage(senderId: number, recipientId: number, content: string): Promise<PrivateMessage | null> {
    try {
      const { data, error } = await supabase
        .from('private_message')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  // Forum System
  async getForumCategories(): Promise<ForumCategoryWithStats[]> {
    try {
      const { data, error } = await supabase
        .from('forum_category')
        .select(`
          *,
          threads:forum_thread(id),
          posts:forum_post(id, thread_id, user_id, created_at, user:user_id(name))
        `)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(category => {
        // Get thread count
        const threadCount = category.threads?.length || 0;
        
        // Get post count
        const postCount = category.posts?.length || 0;
        
        // Get last post
        let lastPost = null;
        if (category.posts && category.posts.length > 0) {
          const sortedPosts = [...category.posts].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          if (sortedPosts.length > 0) {
            const post = sortedPosts[0];
            lastPost = {
              id: post.id,
              thread_id: post.thread_id,
              user_name: post.user?.name || 'Unknown',
              created_at: post.created_at
            };
          }
        }
        
        // Remove the raw data to avoid duplication
        const { threads, posts, ...rest } = category;
        
        return {
          ...rest,
          thread_count: threadCount,
          post_count: postCount,
          last_post: lastPost
        };
      });
    } catch (error) {
      console.error('Error fetching forum categories:', error);
      return [];
    }
  }

  async getForumThreads(categoryId: number, page = 1, limit = 20): Promise<ForumThreadWithStats[]> {
    try {
      const { data, error } = await supabase
        .from('forum_thread')
        .select(`
          *,
          user:user_id(id, name, picurl),
          category:category_id(id, name, slug),
          posts:forum_post(id, user_id, created_at, user:user_id(name))
        `)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('last_post_at', { ascending: false })
        .range((page - 1) * limit, page * limit);
      
      if (error) throw error;
      
      return (data || []).map(thread => {
        // Get post count
        const postCount = thread.posts?.length || 0;
        
        // Get last post
        let lastPost = null;
        if (thread.posts && thread.posts.length > 0) {
          const sortedPosts = [...thread.posts].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          if (sortedPosts.length > 0) {
            const post = sortedPosts[0];
            lastPost = {
              id: post.id,
              user_name: post.user?.name || 'Unknown',
              created_at: post.created_at
            };
          }
        }
        
        // Remove the raw data to avoid duplication
        const { posts, ...rest } = thread;
        
        return {
          ...rest,
          post_count: postCount,
          last_post: lastPost
        };
      });
    } catch (error) {
      console.error('Error fetching forum threads:', error);
      return [];
    }
  }

  async getForumPosts(threadId: number, page = 1, limit = 20): Promise<ForumPost[]> {
    try {
      const { data, error } = await supabase
        .from('forum_post')
        .select(`
          *,
          user:user_id(id, name, picurl),
          likes:content_like(id)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .range((page - 1) * limit, page * limit);
      
      if (error) throw error;
      
      return (data || []).map(post => {
        const likes = post.likes?.length || 0;
        const { likes: likesRaw, ...rest } = post;
        
        return {
          ...rest,
          likes
        };
      });
    } catch (error) {
      console.error('Error fetching forum posts:', error);
      return [];
    }
  }

  async createForumThread(categoryId: number, userId: number, title: string, content: string): Promise<ForumThread | null> {
    try {
      // Create slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-')
        .substring(0, 190);
      
      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('forum_thread')
        .insert({
          title,
          slug,
          category_id: categoryId,
          user_id: userId
        })
        .select()
        .single();
      
      if (threadError) throw threadError;
      
      // Create initial post
      const { error: postError } = await supabase
        .from('forum_post')
        .insert({
          thread_id: thread.id,
          user_id: userId,
          content
        });
      
      if (postError) throw postError;
      
      return thread;
    } catch (error) {
      console.error('Error creating forum thread:', error);
      return null;
    }
  }

  async createForumPost(threadId: number, userId: number, content: string): Promise<ForumPost | null> {
    try {
      // Create post
      const { data, error } = await supabase
        .from('forum_post')
        .insert({
          thread_id: threadId,
          user_id: userId,
          content
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update thread's last_post_at
      await supabase
        .from('forum_thread')
        .update({
          last_post_at: new Date().toISOString()
        })
        .eq('id', threadId);
      
      return data;
    } catch (error) {
      console.error('Error creating forum post:', error);
      return null;
    }
  }

  // User Group System
  async getUserGroups(userId: number): Promise<UserGroup[]> {
    try {
      const { data, error } = await supabase
        .from('group_member')
        .select(`
          group:group_id(
            *,
            owner:owner_id(id, name, picurl),
            members:group_member(id)
          )
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return (data || []).map(item => {
        const group = item.group;
        return {
          ...group,
          member_count: group.members?.length || 0
        };
      });
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }

  async getPublicGroups(page = 1, limit = 20): Promise<UserGroup[]> {
    try {
      const { data, error } = await supabase
        .from('user_group')
        .select(`
          *,
          owner:owner_id(id, name, picurl),
          members:group_member(id)
        `)
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit);
      
      if (error) throw error;
      
      return (data || []).map(group => ({
        ...group,
        member_count: group.members?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching public groups:', error);
      return [];
    }
  }

  async createUserGroup(userId: number, name: string, description: string, isPrivate: boolean): Promise<UserGroup | null> {
    try {
      // Create slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, '-')
        .substring(0, 90);
      
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('user_group')
        .insert({
          name,
          description,
          slug,
          is_private: isPrivate,
          owner_id: userId
        })
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add owner as member with owner role
      const { error: memberError } = await supabase
        .from('group_member')
        .insert({
          group_id: group.id,
          user_id: userId,
          role: 'owner'
        });
      
      if (memberError) throw memberError;
      
      return group;
    } catch (error) {
      console.error('Error creating user group:', error);
      return null;
    }
  }

  async joinGroup(userId: number, groupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_member')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member'
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      return false;
    }
  }

  async leaveGroup(userId: number, groupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_member')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .not('role', 'eq', 'owner'); // Can't leave if you're the owner
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      return false;
    }
  }

  // User Content System
  async getUserContent(userId: number, contentType?: string): Promise<UserContent[]> {
    try {
      let query = supabase
        .from('user_content')
        .select(`
          *,
          user:user_id(id, name, picurl),
          game:game_id(id, name, pic_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (contentType) {
        query = query.eq('content_type', contentType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user content:', error);
      return [];
    }
  }

  async createUserContent(
    userId: number, 
    contentType: string, 
    contentUrl: string, 
    gameId?: number, 
    title?: string, 
    description?: string, 
    thumbnailUrl?: string
  ): Promise<UserContent | null> {
    try {
      const { data, error } = await supabase
        .from('user_content')
        .insert({
          user_id: userId,
          game_id: gameId,
          content_type: contentType,
          title,
          description,
          content_url: contentUrl,
          thumbnail_url: thumbnailUrl,
          is_public: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user content:', error);
      return null;
    }
  }

  // Community Events
  async getCommunityEvents(page = 1, limit = 20): Promise<CommunityEvent[]> {
    try {
      const { data, error } = await supabase
        .from('community_event')
        .select(`
          *,
          organizer:organizer_id(id, name, picurl),
          game:game_id(id, name, pic_url),
          group:group_id(*),
          participants:event_participant(id)
        `)
        .eq('is_public', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .range((page - 1) * limit, page * limit);
      
      if (error) throw error;
      
      return (data || []).map(event => ({
        ...event,
        participant_count: event.participants?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching community events:', error);
      return [];
    }
  }

  async createCommunityEvent(
    userId: number,
    title: string,
    startTime: string,
    gameId?: number,
    description?: string,
    endTime?: string,
    maxParticipants?: number,
    location?: string,
    groupId?: number,
    isPublic = true
  ): Promise<CommunityEvent | null> {
    try {
      const { data, error } = await supabase
        .from('community_event')
        .insert({
          title,
          description,
          game_id: gameId,
          start_time: startTime,
          end_time: endTime,
          max_participants: maxParticipants,
          location,
          organizer_id: userId,
          group_id: groupId,
          is_public: isPublic
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add organizer as participant
      await supabase
        .from('event_participant')
        .insert({
          event_id: data.id,
          user_id: userId,
          status: 'going'
        });
      
      return data;
    } catch (error) {
      console.error('Error creating community event:', error);
      return null;
    }
  }

  async joinEvent(userId: number, eventId: number, status: 'going' | 'maybe' = 'going'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('event_participant')
        .insert({
          event_id: eventId,
          user_id: userId,
          status
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error joining event:', error);
      return false;
    }
  }

  // Community Polls
  async getPolls(page = 1, limit = 20, userId?: number): Promise<CommunityPollWithResults[]> {
    try {
      const { data: polls, error: pollsError } = await supabase
        .from('community_poll')
        .select(`
          *,
          user:user_id(id, name, picurl),
          options:poll_option(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit);
      
      if (pollsError) throw pollsError;
      
      // Get vote counts for each option
      const pollIds = polls?.map(poll => poll.id) || [];
      const { data: votes, error: votesError } = await supabase
        .from('poll_vote')
        .select('poll_id, option_id')
        .in('poll_id', pollIds);
      
      if (votesError) throw votesError;
      
      // Get user's votes if userId provided
      let userVotes: Record<number, number[]> = {};
      if (userId) {
        const { data: userVotesData, error: userVotesError } = await supabase
          .from('poll_vote')
          .select('poll_id, option_id')
          .eq('user_id', userId)
          .in('poll_id', pollIds);
        
        if (userVotesError) throw userVotesError;
        
        userVotes = (userVotesData || []).reduce((acc, vote) => {
          if (!acc[vote.poll_id]) {
            acc[vote.poll_id] = [];
          }
          acc[vote.poll_id].push(vote.option_id);
          return acc;
        }, {} as Record<number, number[]>);
      }
      
      // Process polls with vote data
      return (polls || []).map(poll => {
        // Count votes for each option
        const optionVotes = votes?.filter(vote => vote.poll_id === poll.id) || [];
        const totalVotes = optionVotes.length;
        
        // Calculate percentages for each option
        const optionsWithStats = poll.options?.map(option => {
          const optionVoteCount = optionVotes.filter(vote => vote.option_id === option.id).length;
          const percentage = totalVotes > 0 ? Math.round((optionVoteCount / totalVotes) * 100) : 0;
          
          return {
            ...option,
            vote_count: optionVoteCount,
            percentage
          };
        }) || [];
        
        // Check if poll is closed
        const isClosed = poll.closes_at ? new Date(poll.closes_at) < new Date() : false;
        
        // Check if user has voted
        const userHasVoted = userId ? !!userVotes[poll.id] : false;
        
        // Calculate time remaining if not closed
        let timeRemaining;
        if (poll.closes_at && !isClosed) {
          const now = new Date();
          const closesAt = new Date(poll.closes_at);
          const diffMs = closesAt.getTime() - now.getTime();
          
          if (diffMs < 3600000) { // Less than 1 hour
            timeRemaining = `${Math.ceil(diffMs / 60000)} minutes`;
          } else if (diffMs < 86400000) { // Less than 1 day
            timeRemaining = `${Math.ceil(diffMs / 3600000)} hours`;
          } else {
            timeRemaining = `${Math.ceil(diffMs / 86400000)} days`;
          }
        }
        
        return {
          ...poll,
          options: optionsWithStats,
          total_votes: totalVotes,
          user_has_voted: userHasVoted,
          is_closed: isClosed,
          time_remaining: timeRemaining
        };
      });
    } catch (error) {
      console.error('Error fetching polls:', error);
      return [];
    }
  }

  async createPoll(
    userId: number,
    title: string,
    options: string[],
    isMultipleChoice = false,
    description?: string,
    groupId?: number,
    threadId?: number,
    closesAt?: string
  ): Promise<CommunityPoll | null> {
    try {
      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('community_poll')
        .insert({
          title,
          description,
          user_id: userId,
          group_id: groupId,
          thread_id: threadId,
          is_multiple_choice: isMultipleChoice,
          is_public: true,
          closes_at: closesAt
        })
        .select()
        .single();
      
      if (pollError) throw pollError;
      
      // Create options
      const optionsData = options.map((text, index) => ({
        poll_id: poll.id,
        option_text: text,
        sort_order: index
      }));
      
      const { error: optionsError } = await supabase
        .from('poll_option')
        .insert(optionsData);
      
      if (optionsError) throw optionsError;
      
      return poll;
    } catch (error) {
      console.error('Error creating poll:', error);
      return null;
    }
  }

  async voteOnPoll(userId: number, pollId: number, optionId: number): Promise<boolean> {
    try {
      // Check if poll allows multiple choice
      const { data: poll, error: pollError } = await supabase
        .from('community_poll')
        .select('is_multiple_choice, closes_at')
        .eq('id', pollId)
        .single();
      
      if (pollError) throw pollError;
      
      // Check if poll is closed
      if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
        throw new Error('Poll is closed');
      }
      
      // If not multiple choice, delete any existing votes
      if (!poll.is_multiple_choice) {
        await supabase
          .from('poll_vote')
          .delete()
          .eq('poll_id', pollId)
          .eq('user_id', userId);
      }
      
      // Add new vote
      const { error } = await supabase
        .from('poll_vote')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: userId
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error voting on poll:', error);
      return false;
    }
  }

  // Content Interaction
  async likeContent(userId: number, contentType: string, contentId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('content_like')
        .insert({
          user_id: userId,
          content_type: contentType,
          content_id: contentId
        });
      
      if (error) throw error;
      
      // Increment like count if content type is user_content
      if (contentType === 'user_content') {
        await supabase
          .from('user_content')
          .update({
            like_count: supabase.rpc('increment', { row_id: contentId, table_name: 'user_content', column_name: 'like_count' })
          })
          .eq('id', contentId);
      }
      
      return true;
    } catch (error) {
      console.error('Error liking content:', error);
      return false;
    }
  }

  async unlikeContent(userId: number, contentType: string, contentId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('content_like')
        .delete()
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .eq('content_id', contentId);
      
      if (error) throw error;
      
      // Decrement like count if content type is user_content
      if (contentType === 'user_content') {
        await supabase
          .from('user_content')
          .update({
            like_count: supabase.rpc('decrement', { row_id: contentId, table_name: 'user_content', column_name: 'like_count' })
          })
          .eq('id', contentId);
      }
      
      return true;
    } catch (error) {
      console.error('Error unliking content:', error);
      return false;
    }
  }

  async shareContent(userId: number, contentType: string, contentId: number, platform?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('content_share')
        .insert({
          user_id: userId,
          content_type: contentType,
          content_id: contentId,
          share_platform: platform
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sharing content:', error);
      return false;
    }
  }

  // Content Creator System
  async getContentCreators(page = 1, limit = 20): Promise<ContentCreator[]> {
    try {
      const { data, error } = await supabase
        .from('content_creator')
        .select(`
          *,
          user:user_id(id, name, picurl)
        `)
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching content creators:', error);
      return [];
    }
  }

  async getContentCreator(userId: number): Promise<ContentCreator | null> {
    try {
      const { data, error } = await supabase
        .from('content_creator')
        .select(`
          *,
          user:user_id(id, name, picurl)
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) return null;
      return data;
    } catch (error) {
      console.error('Error fetching content creator:', error);
      return null;
    }
  }

  async applyForContentCreator(
    userId: number,
    creatorType: string,
    platformLinks: Record<string, string>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('content_creator')
        .insert({
          user_id: userId,
          is_verified: false,
          creator_type: creatorType,
          platform_links: platformLinks
        });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error applying for content creator:', error);
      return false;
    }
  }

  // User Mentions
  async getUserMentions(userId: number, page = 1, limit = 20): Promise<UserMention[]> {
    try {
      const { data, error } = await supabase
        .from('user_mention')
        .select(`
          *,
          mentioned_by:mentioned_by_id(id, name, picurl)
        `)
        .eq('mentioned_user_id', userId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user mentions:', error);
      return [];
    }
  }

  async markMentionAsRead(mentionId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_mention')
        .update({
          is_read: true
        })
        .eq('id', mentionId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking mention as read:', error);
      return false;
    }
  }

  // Subscription to real-time updates
  subscribeToMessages(userId: number, callback: (message: PrivateMessage) => void) {
    return supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_message',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as PrivateMessage);
        }
      )
      .subscribe();
  }

  subscribeToForumPosts(threadId: number, callback: (post: ForumPost) => void) {
    return supabase
      .channel(`forum_posts:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_post',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          callback(payload.new as ForumPost);
        }
      )
      .subscribe();
  }

  subscribeToUserMentions(userId: number, callback: (mention: UserMention) => void) {
    return supabase
      .channel(`mentions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_mention',
          filter: `mentioned_user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as UserMention);
        }
      )
      .subscribe();
  }
}

export const socialService = new SocialService();