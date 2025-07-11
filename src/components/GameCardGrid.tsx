import React from 'react';
import { GameCardInteractive, GameData } from './GameCardInteractive';

interface GameCardGridProps {
  games: GameData[];
  className?: string;
}

export const GameCardGrid: React.FC<GameCardGridProps> = ({ 
  games, 
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {games.map((game) => (
        <GameCardInteractive key={game.id} game={game} />
      ))}
    </div>
  );
};