import React from 'react';
import { Link } from 'react-router-dom';
import { CommunityEventWithParticipants } from '../types/social';
import { Calendar, Clock, MapPin, Users, User, Check, X } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { format } from 'date-fns';

interface CommunityEventCardProps {
  event: CommunityEventWithParticipants;
  onJoin?: (eventId: number) => Promise<boolean>;
  compact?: boolean;
  className?: string;
}

export const CommunityEventCard: React.FC<CommunityEventCardProps> = ({
  event,
  onJoin,
  compact = false,
  className = ''
}) => {
  // Format date
  const formatEventDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
  };

  // Format time
  const formatEventTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-600 bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white line-clamp-1">{event.title}</h3>
              
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <Clock className="h-3 w-3" />
                <span>{formatEventDate(event.start_time)}</span>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex -space-x-2">
                  {event.participants.slice(0, 3).map((participant) => (
                    <div key={participant.id} className="w-6 h-6 rounded-full border border-gray-800 overflow-hidden">
                      {participant.user?.picurl ? (
                        <LazyImage
                          src={participant.user.picurl}
                          alt={participant.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <User className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  {event.participant_count > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white border border-gray-800">
                      +{event.participant_count - 3}
                    </div>
                  )}
                </div>
                
                {!event.isParticipating && !event.isFull && onJoin && (
                  <button
                    onClick={() => onJoin(event.id)}
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                  >
                    Join
                  </button>
                )}
                
                {event.isParticipating && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="h-3 w-3" />
                    <span>Joined</span>
                  </span>
                )}
                
                {event.isFull && !event.isParticipating && (
                  <span className="text-xs text-red-400">Full</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Event header */}
      <div className="relative">
        {event.game?.pic_url ? (
          <div className="aspect-[3/1] relative">
            <LazyImage
              src={event.game.pic_url}
              alt={event.game.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
          </div>
        ) : (
          <div className="aspect-[3/1] bg-gradient-to-r from-purple-900 to-blue-900"></div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
              {event.game?.name || 'Community Event'}
            </div>
            {event.is_public ? (
              <div className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                Public
              </div>
            ) : (
              <div className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                Private
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-white">{event.title}</h2>
        </div>
      </div>
      
      {/* Event details */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 bg-opacity-20 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-white font-medium">{formatEventDate(event.start_time)}</div>
              <div className="text-sm text-gray-400">
                {formatEventTime(event.start_time)}
                {event.end_time && ` - ${formatEventTime(event.end_time)}`}
              </div>
            </div>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-white font-medium">Location</div>
                <div className="text-sm text-gray-400">{event.location}</div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 bg-opacity-20 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <div className="text-white font-medium">
                {event.participant_count} {event.participant_count === 1 ? 'Participant' : 'Participants'}
              </div>
              <div className="text-sm text-gray-400">
                {event.max_participants
                  ? `${event.participant_count}/${event.max_participants} spots filled`
                  : 'Unlimited spots'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Event description */}
        {event.description && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-2">About this event</h3>
            <p className="text-gray-300">{event.description}</p>
          </div>
        )}
        
        {/* Organizer */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-sm text-gray-400">Organized by:</div>
          <Link
            to={`/user/${event.organizer?.id}`}
            className="flex items-center gap-2 hover:text-purple-400 transition-colors"
          >
            {event.organizer?.picurl ? (
              <LazyImage
                src={event.organizer.picurl}
                alt={event.organizer.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                <User className="h-3 w-3 text-gray-400" />
              </div>
            )}
            <span className="text-white">{event.organizer?.name}</span>
          </Link>
        </div>
        
        {/* Participants */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Participants</h3>
          
          <div className="flex flex-wrap gap-2">
            {event.participants.map((participant) => (
              <Link
                key={participant.id}
                to={`/user/${participant.user?.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {participant.user?.picurl ? (
                  <LazyImage
                    src={participant.user.picurl}
                    alt={participant.user.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="h-3 w-3 text-gray-400" />
                  </div>
                )}
                <span className="text-white text-sm">{participant.user?.name}</span>
                {participant.status === 'going' && (
                  <span className="text-xs text-green-400">Going</span>
                )}
                {participant.status === 'maybe' && (
                  <span className="text-xs text-yellow-400">Maybe</span>
                )}
              </Link>
            ))}
            
            {event.participant_count === 0 && (
              <div className="text-gray-400 text-sm">No participants yet. Be the first to join!</div>
            )}
          </div>
        </div>
        
        {/* Join button */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!event.isParticipating && !event.isFull && onJoin && (
            <>
              <button
                onClick={() => onJoin(event.id)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Check className="h-5 w-5" />
                <span>I'm Going</span>
              </button>
              
              <button
                onClick={() => onJoin(event.id, 'maybe')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Calendar className="h-5 w-5" />
                <span>Maybe</span>
              </button>
            </>
          )}
          
          {event.isParticipating && (
            <div className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg">
              <Check className="h-5 w-5" />
              <span>You're Going</span>
            </div>
          )}
          
          {event.isFull && !event.isParticipating && (
            <div className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg">
              <X className="h-5 w-5" />
              <span>Event is Full</span>
            </div>
          )}
          
          <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
            <Share2 className="h-5 w-5" />
            <span>Share Event</span>
          </button>
        </div>
      </div>
    </div>
  );
};