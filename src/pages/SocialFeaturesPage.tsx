import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FriendsList } from '../components/FriendsList';
import { MessageThread } from '../components/MessageThread';
import { ForumCategoryList } from '../components/ForumCategoryList';
import { ForumThreadList } from '../components/ForumThreadList';
import { ForumPostList } from '../components/ForumPostList';
import { UserContentGrid } from '../components/UserContentGrid';
import { CommunityEventCard } from '../components/CommunityEventCard';
import { CommunityPollCard } from '../components/CommunityPollCard';
import { ContentCreatorCard } from '../components/ContentCreatorCard';
import { useFriends } from '../hooks/useFriends';
import { useMessaging } from '../hooks/useMessaging';
import { useForums } from '../hooks/useForums';
import { useUserContent } from '../hooks/useUserContent';
import { useEvents } from '../hooks/useEvents';
import { usePolls } from '../hooks/usePolls';
import { Users, MessageSquare, MessageCircle, Image, Calendar, BarChart2, Award } from 'lucide-react';

export const SocialFeaturesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('friends');
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  
  // Friends hooks
  const {
    friends,
    friendRequests,
    loading: friendsLoading,
    acceptFriendRequest,
    rejectFriendRequest
  } = useFriends();
  
  // Messaging hooks
  const {
    conversations,
    currentMessages,
    loadMessages,
    sendMessage,
    loading: messagesLoading
  } = useMessaging();
  
  // Forum hooks
  const {
    categories,
    threads,
    posts,
    currentCategoryId,
    currentThreadId,
    loading: forumsLoading,
    loadThreads,
    loadPosts,
    createPost
  } = useForums();
  
  // User content hooks
  const {
    content,
    loading: contentLoading,
    likeContent,
    unlikeContent,
    shareContent
  } = useUserContent();
  
  // Events hooks
  const {
    events,
    loading: eventsLoading,
    joinEvent
  } = useEvents();
  
  // Polls hooks
  const {
    polls,
    loading: pollsLoading,
    voteOnPoll
  } = usePolls();
  
  // Handle message friend
  const handleMessageFriend = (friendId: number) => {
    setSelectedConversation(friendId);
    loadMessages(friendId);
    setActiveTab('messages');
  };
  
  // Handle send message
  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return null;
    return await sendMessage(selectedConversation, content);
  };
  
  // Handle back from conversation
  const handleBackFromConversation = () => {
    setSelectedConversation(null);
  };
  
  // Get selected conversation partner
  const getConversationPartner = () => {
    if (!selectedConversation) return null;
    
    const conversation = conversations.find(
      conv => conv.user.id === selectedConversation
    );
    
    return conversation?.user || null;
  };
  
  // Get selected category
  const getSelectedCategory = () => {
    if (!currentCategoryId) return null;
    return categories.find(cat => cat.id === currentCategoryId);
  };
  
  // Get selected thread
  const getSelectedThread = () => {
    if (!currentThreadId) return null;
    return threads.find(thread => thread.id === currentThreadId);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Community | GameVault</title>
        <meta name="description" content="Connect with other gamers, join discussions, and share content" />
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Gaming Community</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800 p-1 rounded-lg">
            <TabsTrigger value="friends" className="data-[state=active]:bg-purple-600">
              <Users className="h-5 w-5 mr-2" />
              <span>Friends</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-purple-600">
              <MessageSquare className="h-5 w-5 mr-2" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="forums" className="data-[state=active]:bg-purple-600">
              <MessageCircle className="h-5 w-5 mr-2" />
              <span>Forums</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-purple-600">
              <Image className="h-5 w-5 mr-2" />
              <span>Content</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-purple-600">
              <Calendar className="h-5 w-5 mr-2" />
              <span>Events</span>
            </TabsTrigger>
            <TabsTrigger value="polls" className="data-[state=active]:bg-purple-600">
              <BarChart2 className="h-5 w-5 mr-2" />
              <span>Polls</span>
            </TabsTrigger>
            <TabsTrigger value="creators" className="data-[state=active]:bg-purple-600">
              <Award className="h-5 w-5 mr-2" />
              <span>Creators</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Friends & Following</h2>
              
              <FriendsList
                friends={friends}
                pendingRequests={friendRequests}
                onAcceptRequest={acceptFriendRequest}
                onRejectRequest={rejectFriendRequest}
                onMessageFriend={handleMessageFriend}
                loading={friendsLoading}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="messages" className="mt-6">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <h2 className="text-xl font-semibold text-white p-6 border-b border-gray-800">Messages</h2>
              
              <div className="grid md:grid-cols-3 h-[600px]">
                {/* Conversations list */}
                <div className={`border-r border-gray-800 ${selectedConversation ? 'hidden md:block' : ''}`}>
                  {conversations.length > 0 ? (
                    <div className="h-full overflow-y-auto">
                      {conversations.map((conversation) => (
                        <button
                          key={conversation.user.id}
                          onClick={() => {
                            setSelectedConversation(conversation.user.id);
                            loadMessages(conversation.user.id);
                          }}
                          className={`w-full flex items-start gap-3 p-4 text-left hover:bg-gray-800 transition-colors ${
                            selectedConversation === conversation.user.id ? 'bg-gray-800' : ''
                          }`}
                        >
                          {conversation.user.picurl ? (
                            <LazyImage
                              src={conversation.user.picurl}
                              alt={conversation.user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-white truncate">{conversation.user.name}</h3>
                              <span className="text-xs text-gray-400">
                                {new Date(conversation.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-400 truncate">
                              {conversation.lastMessage.content}
                            </p>
                            
                            {conversation.unreadCount > 0 && (
                              <div className="mt-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full inline-block">
                                {conversation.unreadCount}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
                        <p className="text-gray-400">
                          Start a conversation with a friend to see messages here
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Message thread */}
                <div className={`md:col-span-2 ${selectedConversation ? '' : 'hidden md:block'}`}>
                  {selectedConversation && getConversationPartner() ? (
                    <MessageThread
                      messages={currentMessages}
                      partner={getConversationPartner()!}
                      onSendMessage={handleSendMessage}
                      onBack={handleBackFromConversation}
                      className="h-full"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center p-6">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
                        <p className="text-gray-400">
                          Choose a conversation from the list to start messaging
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="forums" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6">
              {!currentCategoryId && !currentThreadId ? (
                <>
                  <h2 className="text-xl font-semibold text-white mb-6">Forum Categories</h2>
                  <ForumCategoryList
                    categories={categories}
                    loading={forumsLoading}
                  />
                </>
              ) : currentCategoryId && !currentThreadId ? (
                <ForumThreadList
                  threads={threads}
                  categoryName={getSelectedCategory()?.name || 'Forum'}
                  categoryId={currentCategoryId}
                  loading={forumsLoading}
                />
              ) : currentThreadId && getSelectedThread() ? (
                <ForumPostList
                  thread={getSelectedThread()!}
                  posts={posts}
                  onCreatePost={content => createPost(currentThreadId, content)}
                  loading={forumsLoading}
                />
              ) : null}
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Community Content</h2>
              
              <UserContentGrid
                content={content}
                onLike={likeContent}
                onUnlike={unlikeContent}
                onShare={shareContent}
                loading={contentLoading}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="events" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Upcoming Events</h2>
              
              <div className="space-y-6">
                {eventsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
                      <div className="aspect-[3/1] bg-gray-700 rounded-lg mb-4"></div>
                      <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2 mb-6"></div>
                      <div className="flex gap-4">
                        <div className="h-10 bg-gray-700 rounded flex-1"></div>
                        <div className="h-10 bg-gray-700 rounded flex-1"></div>
                      </div>
                    </div>
                  ))
                ) : events.length > 0 ? (
                  events.map(event => (
                    <CommunityEventCard
                      key={event.id}
                      event={event}
                      onJoin={joinEvent}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-800 rounded-lg">
                    <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white mb-2">No upcoming events</h3>
                    <p className="text-gray-400 mb-4">
                      There are no community events scheduled at this time
                    </p>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      <Calendar className="h-4 w-4" />
                      <span>Create Event</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="polls" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Community Polls</h2>
              
              <div className="space-y-6">
                {pollsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
                      <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2 mb-6"></div>
                      <div className="space-y-3 mb-6">
                        <div className="h-10 bg-gray-700 rounded"></div>
                        <div className="h-10 bg-gray-700 rounded"></div>
                        <div className="h-10 bg-gray-700 rounded"></div>
                      </div>
                      <div className="h-8 bg-gray-700 rounded w-1/4"></div>
                    </div>
                  ))
                ) : polls.length > 0 ? (
                  polls.map(poll => (
                    <CommunityPollCard
                      key={poll.id}
                      poll={poll}
                      onVote={voteOnPoll}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-800 rounded-lg">
                    <BarChart2 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white mb-2">No active polls</h3>
                    <p className="text-gray-400 mb-4">
                      There are no community polls available at this time
                    </p>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      <BarChart2 className="h-4 w-4" />
                      <span>Create Poll</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="creators" className="mt-6">
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Content Creators</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Example content creators */}
                <ContentCreatorCard
                  creator={{
                    id: 1,
                    user_id: 1,
                    is_verified: true,
                    creator_type: 'streamer',
                    platform_links: {
                      twitch: 'https://twitch.tv/example',
                      youtube: 'https://youtube.com/example',
                      twitter: 'https://twitter.com/example'
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user: {
                      id: 1,
                      name: 'GameStreamer',
                      picurl: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
                    },
                    follower_count: 1245,
                    content_count: 87,
                    average_rating: 4.8
                  }}
                  isFollowing={true}
                />
                
                <ContentCreatorCard
                  creator={{
                    id: 2,
                    user_id: 2,
                    is_verified: true,
                    creator_type: 'youtuber',
                    platform_links: {
                      youtube: 'https://youtube.com/example2',
                      twitter: 'https://twitter.com/example2'
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user: {
                      id: 2,
                      name: 'GameReviewer',
                      picurl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
                    },
                    follower_count: 2356,
                    content_count: 124,
                    average_rating: 4.5
                  }}
                  isFollowing={false}
                />
                
                <ContentCreatorCard
                  creator={{
                    id: 3,
                    user_id: 3,
                    is_verified: true,
                    creator_type: 'journalist',
                    platform_links: {
                      twitter: 'https://twitter.com/example3',
                      website: 'https://example.com'
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user: {
                      id: 3,
                      name: 'GameJournalist',
                      picurl: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150'
                    },
                    follower_count: 987,
                    content_count: 56,
                    average_rating: 4.2
                  }}
                  isFollowing={false}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};