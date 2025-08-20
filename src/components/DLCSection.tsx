import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package } from 'lucide-react';
import { dlcService, type DLCGame } from '../services/dlcService';

interface DLCSectionProps {
  gameId: number;
  className?: string;
}

export const DLCSection: React.FC<DLCSectionProps> = ({ gameId, className = '' }) => {
  const [dlcItems, setDlcItems] = useState<DLCGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDLC = async () => {
      if (!gameId) return;

      setLoading(true);
      setError(null);

      try {
        const dlcData = await dlcService.getDLCForGame(gameId);
        setDlcItems(dlcData);
      } catch (err) {
        console.error('Error fetching DLC:', err);
        setError('Failed to load additional content');
      } finally {
        setLoading(false);
      }
    };

    fetchDLC();
  }, [gameId]);

  // Don't render anything if no DLC found
  if (!loading && dlcItems.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Additional Content</h3>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
              <div className="h-32 bg-gray-600"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-600 rounded mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dlcItems.map((dlc) => (
            <Link
              key={dlc.id}
              to={`/game/${dlc.id}`}
              className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors group"
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <img
                  src={dlc.cover?.url ? dlcService.transformImageUrl(dlc.cover.url) : '/placeholder-game.jpg'}
                  alt={dlc.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-game.jpg';
                  }}
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-75 px-2 py-1 rounded text-xs text-white">
                  {dlcService.getCategoryName(dlc.category)}
                </div>
              </div>
              
              <div className="p-3">
                <h4 className="text-white font-medium text-sm mb-1 line-clamp-2 group-hover:text-purple-400 transition-colors">
                  {dlc.name}
                </h4>
                
                {dlc.first_release_date && (
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(dlc.first_release_date * 1000).getFullYear()}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};