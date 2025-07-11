import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Star, Info } from 'lucide-react';
import { Game } from '../services/igdbApi';
import { useResponsive } from '../hooks/useResponsive';
import { LazyImage } from './LazyImage';

interface GameReleaseCalendarProps {
  games: Game[];
  loading?: boolean;
  onDateSelect?: (date: Date) => void;
  onGameSelect?: (game: Game) => void;
  className?: string;
}

export const GameReleaseCalendar: React.FC<GameReleaseCalendarProps> = ({
  games,
  loading = false,
  onDateSelect,
  onGameSelect,
  className = '',
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState<'month' | 'list'>('month');
  const { isMobile } = useResponsive();

  // Get days in current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Get games releasing on a specific date
  const getGamesForDate = (date: Date) => {
    return games.filter((game) => {
      const releaseDate = new Date(game.releaseDate);
      return isSameDay(releaseDate, date);
    });
  };

  // Get all games in current month
  const gamesInMonth = games.filter((game) => {
    const releaseDate = new Date(game.releaseDate);
    return isSameMonth(releaseDate, currentMonth);
  });

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  // Handle game selection
  const handleGameSelect = (game: Game) => {
    onGameSelect?.(game);
  };

  // Get day class based on games and selection
  const getDayClass = (date: Date) => {
    const gamesOnDate = getGamesForDate(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    
    let classes = "relative w-10 h-10 flex items-center justify-center rounded-full ";
    
    if (isSelected) {
      classes += "bg-game-purple text-white ";
    } else if (isCurrentDay) {
      classes += "bg-game-blue/20 text-game-blue ";
    } else {
      classes += "text-white hover:bg-gray-700 ";
    }
    
    if (gamesOnDate.length > 0) {
      classes += "font-bold ";
    }
    
    return classes;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-700 rounded w-32 animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 md:p-6 ${className}`}>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-game-purple" />
          Game Release Calendar
        </h2>
        
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="hidden md:flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setCalendarView('month')}
              className={`p-2 rounded transition-colors ${
                calendarView === 'month'
                  ? 'bg-game-purple text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              aria-label="Month view"
            >
              <Calendar className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setCalendarView('list')}
              className={`p-2 rounded transition-colors ${
                calendarView === 'list'
                  ? 'bg-game-purple text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              aria-label="List view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
          
          {/* Month navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className="text-white font-medium min-w-[100px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            
            <button
              onClick={goToNextMonth}
              className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Month view */}
      {calendarView === 'month' && (
        <>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-gray-400 text-sm font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before the start of the month */}
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-start-${i}`} className="aspect-square"></div>
            ))}
            
            {/* Days of the month */}
            {daysInMonth.map((date) => {
              const gamesOnDate = getGamesForDate(date);
              const hasGames = gamesOnDate.length > 0;
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDateSelect(date)}
                  className={`aspect-square rounded-lg relative ${
                    hasGames
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'hover:bg-gray-700'
                  } transition-colors`}
                >
                  <div className={getDayClass(date)}>
                    {date.getDate()}
                  </div>
                  
                  {/* Game indicators */}
                  {hasGames && (
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                      {gamesOnDate.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-game-purple"
                        ></div>
                      ))}
                      {gamesOnDate.length > 3 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-game-purple opacity-50"></div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Selected date games */}
          {selectedDate && (
            <div className="mt-6 border-t border-gray-700 pt-4">
              <h3 className="text-lg font-medium text-white mb-4">
                Releases on {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              
              {getGamesForDate(selectedDate).length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  No games releasing on this date
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {getGamesForDate(selectedDate).map((game) => (
                    <div
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className="flex gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      <div className="w-12 h-16 bg-gray-600 rounded overflow-hidden flex-shrink-0">
                        {game.coverImage && (
                          <LazyImage
                            src={game.coverImage}
                            alt={game.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-white line-clamp-1">{game.title}</h4>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span>{game.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{game.genre}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* List view */}
      {calendarView === 'list' && (
        <div className="space-y-6">
          {gamesInMonth.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No releases this month
              </h3>
              <p className="text-gray-400">
                Try checking another month or expanding your search
              </p>
            </div>
          ) : (
            <>
              {/* Group games by release date */}
              {Array.from(
                new Set(
                  gamesInMonth.map((game) => 
                    format(new Date(game.releaseDate), 'yyyy-MM-dd')
                  )
                )
              ).sort().map((dateStr) => {
                const date = new Date(dateStr);
                const gamesOnDate = gamesInMonth.filter(
                  (game) => format(new Date(game.releaseDate), 'yyyy-MM-dd') === dateStr
                );
                
                return (
                  <div key={dateStr} className="border-b border-gray-700 pb-4 last:border-0">
                    <h3 className={`text-lg font-medium mb-3 ${
                      isToday(date) ? 'text-game-blue' : 'text-white'
                    }`}>
                      {format(date, 'EEEE, MMMM d, yyyy')}
                      {isToday(date) && (
                        <span className="ml-2 text-sm bg-game-blue text-white px-2 py-0.5 rounded">
                          Today
                        </span>
                      )}
                    </h3>
                    
                    <div className="space-y-3">
                      {gamesOnDate.map((game) => (
                        <div
                          key={game.id}
                          onClick={() => handleGameSelect(game)}
                          className="flex gap-4 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          <div className="w-16 h-20 bg-gray-600 rounded overflow-hidden flex-shrink-0">
                            {game.coverImage && (
                              <LazyImage
                                src={game.coverImage}
                                alt={game.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white">{game.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span>{game.rating.toFixed(1)}</span>
                              </div>
                              <span>{game.genre}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                              {game.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      
      {/* Empty state */}
      {games.length === 0 && !loading && (
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No upcoming releases found
          </h3>
          <p className="text-gray-400">
            Check back later for new game releases
          </p>
        </div>
      )}
    </div>
  );
};