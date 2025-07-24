import React from 'react';
import { ExploreGamesButton } from '../components/ExploreGamesButton';

export const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-white mb-6">
          Discover Your Next <span className="text-purple-400">Gaming Adventure</span>
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Join the ultimate gaming community. Rate, review, and discover games through the
          power of social gaming. Your next favorite game is just a click away.
        </p>

        <div className="text-center mb-8">
          <p className="text-lg text-gray-400 mb-4">Game of the day: The Legend of Zelda</p>
        </div>

        <div className="flex justify-center gap-4">
          {/* Keep only the Explore Games button */}
          <ExploreGamesButton 
            variant="primary" 
            showFilters={true}
            className="transform hover:scale-105"
          />
        </div>
      </div>
    </div>
  );
};
