import React from 'react';
import { AdvancedSearch } from '../components/AdvancedSearch';
import { Star, Calendar, Gamepad2 } from 'lucide-react';

export const AdvancedSearchDemo: React.FC = () => {
  // Sample game card renderer
  const renderGameCard = (game: any, index: number) => {
    return (
      <div key={game.id} className="flex gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
        <div className="flex-shrink-0">
          {/* Game image placeholder */}
          <div className="w-20 h-28 bg-gray-700 rounded flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">{game.title}</h3>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{game.rating.toFixed(1)}</span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{new Date(game.releaseDate).getFullYear()}</span>
            </div>
            
            <div className="text-gray-400 text-sm">
              {game.reviewCount} reviews
            </div>
          </div>
          
          <p className="text-gray-300 text-sm">
            This is a sample game description. In a real app, this would contain actual game information.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Advanced Game Search</h1>
          <p className="text-gray-400">
            Search and filter through our extensive game database with powerful filtering options.
          </p>
        </div>
        
        <AdvancedSearch renderGameCard={renderGameCard} />
      </div>
    </div>
  );
};