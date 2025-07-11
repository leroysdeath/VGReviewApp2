import React, { useState, useRef, useEffect } from 'react';
import { PrivateMessage } from '../types/social';
import { Send, ArrowLeft, MoreVertical, User } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface MessageThreadProps {
  messages: PrivateMessage[];
  partner: {
    id: number;
    name: string;
    picurl?: string;
  };
  onSendMessage: (content: string) => Promise<PrivateMessage | null>;
  onBack?: () => void;
  className?: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  partner,
  onSendMessage,
  onBack,
  className = ''
}) => {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      await onSendMessage(newMessage);
      setNewMessage('');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: PrivateMessage[] }[] = [];
  let currentDate = '';
  
  messages.forEach(message => {
    const messageDate = format(new Date(message.created_at), 'MMMM d, yyyy');
    
    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({
        date: messageDate,
        messages: [message]
      });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  });

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-white transition-colors md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          {partner.picurl ? (
            <LazyImage
              src={partner.picurl}
              alt={partner.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-400" />
            </div>
          )}
          
          <div>
            <h3 className="font-medium text-white">{partner.name}</h3>
            <p className="text-xs text-gray-400">Online now</p>
          </div>
        </div>
        
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-3">
            <div className="flex justify-center">
              <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                {group.date}
              </div>
            </div>
            
            {group.messages.map((message) => {
              const isCurrentUser = user && message.sender_id === parseInt(user.id);
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-end gap-2 max-w-[80%]">
                    {!isCurrentUser && message.sender?.picurl && (
                      <LazyImage
                        src={message.sender.picurl}
                        alt={message.sender.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    
                    <div
                      className={`p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-purple-600 text-white rounded-br-none'
                          : 'bg-gray-700 text-white rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <div className={`text-xs mt-1 ${isCurrentUser ? 'text-purple-200' : 'text-gray-400'}`}>
                        {format(new Date(message.created_at), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none min-h-[44px] max-h-32"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};