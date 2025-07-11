import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CommunityPollWithResults } from '../types/social';
import { BarChart2, Clock, User, Check } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { format } from 'date-fns';

interface CommunityPollCardProps {
  poll: CommunityPollWithResults;
  onVote?: (pollId: number, optionId: number) => Promise<boolean>;
  compact?: boolean;
  className?: string;
}

export const CommunityPollCard: React.FC<CommunityPollCardProps> = ({
  poll,
  onVote,
  compact = false,
  className = ''
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Format date
  const formatPollDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  // Handle vote submission
  const handleVote = async () => {
    if (!selectedOption || !onVote || isVoting) return;
    
    setIsVoting(true);
    try {
      await onVote(poll.id, selectedOption);
    } finally {
      setIsVoting(false);
    }
  };

  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart2 className="h-5 w-5 text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white line-clamp-1">{poll.title}</h3>
              
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <span>{poll.total_votes} votes</span>
                {poll.time_remaining && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{poll.time_remaining} left</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Show top 2 options */}
              <div className="mt-3 space-y-2">
                {poll.options.slice(0, 2).map((option) => (
                  <div key={option.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white">{option.option_text}</span>
                      <span className="text-gray-400">{option.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${option.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                {poll.options.length > 2 && (
                  <div className="text-xs text-gray-400 text-center mt-1">
                    +{poll.options.length - 2} more options
                  </div>
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
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{poll.title}</h3>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            {poll.is_closed ? (
              <span>Closed</span>
            ) : poll.time_remaining ? (
              <span>{poll.time_remaining} left</span>
            ) : (
              <span>No end date</span>
            )}
          </div>
        </div>
        
        {poll.description && (
          <p className="text-gray-300 mb-4">{poll.description}</p>
        )}
        
        {/* Poll creator */}
        <div className="flex items-center gap-2 mb-6">
          {poll.user?.picurl ? (
            <LazyImage
              src={poll.user.picurl}
              alt={poll.user.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-gray-400" />
            </div>
          )}
          
          <div className="text-sm">
            <Link
              to={`/user/${poll.user?.id}`}
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              {poll.user?.name}
            </Link>
            <span className="text-gray-400"> • {formatPollDate(poll.created_at)}</span>
          </div>
        </div>
        
        {/* Poll options */}
        <div className="space-y-3 mb-6">
          {poll.options.map((option) => {
            const isSelected = selectedOption === option.id;
            const hasVoted = poll.user_has_voted;
            
            return (
              <div
                key={option.id}
                className={`relative overflow-hidden rounded-lg transition-colors ${
                  !poll.is_closed && !hasVoted
                    ? 'cursor-pointer hover:bg-gray-750'
                    : ''
                } ${
                  isSelected ? 'bg-purple-900 bg-opacity-20 border border-purple-800' : 'bg-gray-750'
                }`}
                onClick={() => {
                  if (!poll.is_closed && !hasVoted && !isVoting) {
                    setSelectedOption(option.id);
                  }
                }}
              >
                <div className="p-3 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    {!poll.is_closed && !hasVoted ? (
                      <div
                        className={`w-5 h-5 rounded-full border ${
                          isSelected
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-600'
                        } flex items-center justify-center`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    ) : (
                      <div className="w-8 text-right font-medium text-white">
                        {option.percentage}%
                      </div>
                    )}
                    
                    <span className="text-white">{option.option_text}</span>
                  </div>
                  
                  {(poll.is_closed || hasVoted) && (
                    <span className="text-sm text-gray-400">{option.vote_count} votes</span>
                  )}
                </div>
                
                {/* Progress bar for results */}
                {(poll.is_closed || hasVoted) && (
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-purple-600 bg-opacity-20 transition-all duration-500 ease-out"
                    style={{ width: `${option.percentage}%` }}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Vote button or results summary */}
        <div className="flex items-center justify-between">
          {!poll.is_closed && !poll.user_has_voted ? (
            <button
              onClick={handleVote}
              disabled={selectedOption === null || isVoting}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVoting ? 'Voting...' : 'Vote'}
            </button>
          ) : (
            <div className="text-sm text-gray-400">
              {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'} total
            </div>
          )}
          
          {poll.is_multiple_choice && !poll.is_closed && !poll.user_has_voted && (
            <div className="text-sm text-gray-400">
              Multiple choice allowed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};