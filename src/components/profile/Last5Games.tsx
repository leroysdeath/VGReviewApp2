import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { getGameUrl } from '../../utils/gameUrls';

interface RecentGame {
  id: number;
  igdb_id?: number;
  slug?: string;
  name: string;
  cover_url: string;
  status_date: string; // When they marked it as started/finished
}

interface Last5GamesProps {
  userId: string;
  isOwnProfile?: boolean;
}

export const Last5Games: React.FC<Last5GamesProps> = ({ userId, isOwnProfile = false }) => {
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutType, setLayoutType] = useState<'desktop' | 'tablet' | 'phoneLandscape' | 'phonePortrait'>('desktop');

  // Device and orientation detection (same as TopGames)
  useEffect(() => {
    const checkLayout = () => {
      const width = window.innerWidth;
      let newLayout: 'desktop' | 'tablet' | 'phoneLandscape' | 'phonePortrait';

      if (width >= 1024) {
        newLayout = 'desktop'; // lg breakpoint and up
      } else if (width >= 768) {
        newLayout = 'tablet'; // md breakpoint
      } else if (width >= 430) {
        newLayout = 'phoneLandscape'; // landscape phone
      } else {
        newLayout = 'phonePortrait'; // portrait phone
      }

      setLayoutType(newLayout);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  // Fetch last 5 games marked as started or finished
  useEffect(() => {
    const fetchRecentGames = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query game_progress for games where started=true OR completed=true
        // Order by the most recent date (using GREATEST to get the latest of started_date or completed_date)
        const { data, error } = await supabase
          .from('game_progress')
          .select(`
            started,
            started_date,
            completed,
            completed_date,
            game:game_id (
              id,
              igdb_id,
              slug,
              name,
              cover_url
            )
          `)
          .eq('user_id', parseInt(userId))
          .or('started.eq.true,completed.eq.true')
          .order('started_date', { ascending: false })
          .limit(5);

        if (error) throw error;

        // Process the data to get the most recent status date for each game
        const processedGames = (data || [])
          .filter(item => item.game)
          .map(item => {
            // Determine the most recent status date
            let statusDate = item.started_date;

            // If both dates exist, use the more recent one
            if (item.started_date && item.completed_date) {
              statusDate = new Date(item.completed_date) > new Date(item.started_date)
                ? item.completed_date
                : item.started_date;
            } else if (item.completed_date) {
              statusDate = item.completed_date;
            }

            return {
              id: item.game.id,
              igdb_id: item.game.igdb_id,
              slug: item.game.slug,
              name: item.game.name || 'Unknown Game',
              cover_url: item.game.cover_url || '/default-cover.png',
              status_date: statusDate
            };
          })
          // Sort by status date to ensure we get the most recent across all games
          .sort((a, b) => {
            const dateA = new Date(a.status_date);
            const dateB = new Date(b.status_date);
            return dateB.getTime() - dateA.getTime();
          })
          // Take only the first 5
          .slice(0, 5);

        setRecentGames(processedGames);
      } catch (err) {
        console.error('Error fetching recent games:', err);
        setError('Failed to load recent games');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchRecentGames();
    }
  }, [userId]);

  // Determine grid layout classes based on device type (same as TopGames)
  const getGridClasses = () => {
    if (layoutType === 'phonePortrait') {
      return 'grid grid-cols-2 gap-3 max-w-sm mx-auto';
    } else if (layoutType === 'phoneLandscape') {
      return 'grid grid-cols-3 gap-3 max-w-lg mx-auto';
    } else if (layoutType === 'tablet') {
      return 'grid grid-cols-4 gap-4 max-w-2xl mx-auto';
    } else {
      // Desktop - use grid-cols-5 like TopGames
      return 'grid grid-cols-5 gap-4';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (recentGames.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No recent games</p>
      </div>
    );
  }

  return (
    <div className={getGridClasses()}>
      {recentGames.map((game) => {
        const gameUrl = getGameUrl({
          id: game.id,
          igdb_id: game.igdb_id,
          slug: game.slug
        });

        return (
          <Link
            key={game.id}
            to={gameUrl}
            className="group relative block"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-800">
              <img
                src={game.cover_url}
                alt={game.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/default-cover.png';
                }}
              />

              {/* Hover overlay with game title */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium line-clamp-2">
                    {game.name}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};