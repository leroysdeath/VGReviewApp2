import React, { useState } from 'react';
import { GameSearch } from '../components/GameSearch';
import { Game } from '../services/igdbService';
import { useResponsive } from '../hooks/useResponsive';
import { useNavigate } from 'react-router-dom';

export const GameSearchPage: React.FC = () => {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  const handleGameSelect = (game: Game) => {
    navigate(`/game/${game.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? '' : 'max-w-7xl'}`}>
        <div className="mb-8">
          <h1 className={`font-bold text-white mb-6 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>Discover Games</h1>
        </div>

        {/* Game Search Component */}
        <GameSearch
          onGameSelect={handleGameSelect}
          placeholder="Search for games..."
          showViewToggle={!isMobile}
          initialViewMode="grid"
          maxResults={20}
          showHealthCheck={import.meta.env.DEV}
        />
      </div>
    </div>
  );
};