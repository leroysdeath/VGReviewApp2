import React, { useState, useEffect } from 'react';
import { GameData } from './GameCardInteractive';
import { Link } from 'react-router-dom';
import { Star, Calendar, Users, MessageSquare, ArrowRight } from 'lucide-react';

interface GameCardShowcaseProps {
  games: GameData[];
  title?: string;
  description?: string;
  className?: string;
}

export const GameCardShowcase: React.FC<GameCardShowcaseProps> = ({
  games,
  title = "Featured Games",
  description,
  className = ''
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Auto-rotate featured games
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % games.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [games.length]);

  // Trigger entrance animation
  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (games.length === 0) return null;
  
  const activeGame = games[activeIndex];
  
  // Format rating to one decimal place
  const formattedRating = activeGame.rating.toFixed(1);
  
  // Format review count with k for thousands
  const formattedReviewCount = activeGame.reviewCount >= 1000 
    ? `${(activeGame.reviewCount / 1000).toFixed(1)}k` 
    : activeGame.reviewCount.toString();

  return (
    <div className={`${className}`}>
      {/* Section header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{title}</h2>
          {description && <p className="text-gray-400">{description}</p>}
        </div>
        
        <Link 
          to="/games" 
          className="flex items-center gap-1 text-game-purple hover:text-game-purple/80 transition-colors mt-2 md:mt-0"
        >
          View all games <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      {/* Featured game card */}
      <div 
        className={`relative overflow-hidden rounded-2xl transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Background image with gradient overlay */}
        <div className="relative aspect-[21/9] overflow-hidden">
          <img 
            src={activeGame.coverImage} 
            alt={activeGame.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
        </div>
        
        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="px-3 py-1 bg-game-purple/20 backdrop-blur-sm rounded-full text-sm text-game-purple font-medium">
                Featured
              </div>
              <div className="px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full text-sm text-white">
                {activeGame.genre}
              </div>
            </div>
            
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-3">
              {activeGame.title}
            </h3>
            
            <p className="text-gray-300 mb-6 max-w-2xl line-clamp-2 md:line-clamp-3">
              {activeGame.description}
            </p>
            
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2 text-white">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="font-bold">{formattedRating}</span>
                <span className="text-gray-400">({formattedReviewCount} reviews)</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span>2023</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-5 w-5 text-gray-400" />
                <span>Multiplayer</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <Link 
                to={`/game/${activeGame.id}`}
                className="px-6 py-3 bg-game-purple text-white rounded-lg hover:bg-game-purple/90 transition-all duration-300 hover:shadow-glow"
              >
                View Game
              </Link>
              
              <Link 
                to={`/review/${activeGame.id}`}
                className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                Write Review
              </Link>
            </div>
          </div>
        </div>
        
        {/* Game indicator dots */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {games.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'w-6 bg-white' 
                  : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`View game ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};