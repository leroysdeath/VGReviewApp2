import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LazyImage } from './LazyImage';
import { useResponsive } from '../hooks/useResponsive';

interface Genre {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  gameCount: number;
}

interface GenreBrowserProps {
  genres: Genre[];
  loading?: boolean;
  onGenreSelect?: (genreId: string) => void;
  className?: string;
}

export const GenreBrowser: React.FC<GenreBrowserProps> = ({
  genres,
  loading = false,
  onGenreSelect,
  className = '',
}) => {
  const [hoveredGenre, setHoveredGenre] = useState<string | null>(null);
  const { isMobile } = useResponsive();

  // Genre images with gradients for better text visibility
  const genreImages: Record<string, string> = {
    Action: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800',
    Adventure: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=800',
    RPG: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800',
    Strategy: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=800',
    Simulation: 'https://images.pexels.com/photos/2885014/pexels-photo-2885014.jpeg?auto=compress&cs=tinysrgb&w=800',
    Sports: 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=800',
    Racing: 'https://images.pexels.com/photos/12920/pexels-photo-12920.jpeg?auto=compress&cs=tinysrgb&w=800',
    Puzzle: 'https://images.pexels.com/photos/3491940/pexels-photo-3491940.jpeg?auto=compress&cs=tinysrgb&w=800',
    Fighting: 'https://images.pexels.com/photos/260024/pexels-photo-260024.jpeg?auto=compress&cs=tinysrgb&w=800',
    Shooter: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=800',
  };

  // Handle genre selection
  const handleGenreClick = (genreId: string) => {
    if (onGenreSelect) {
      onGenreSelect(genreId);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-gray-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-2 gap-3">
          {genres.map((genre) => (
            <Link
              key={genre.id}
              to={`/games/genre/${genre.id}`}
              onClick={() => handleGenreClick(genre.id)}
              className="relative aspect-square rounded-lg overflow-hidden"
            >
              <LazyImage
                src={genre.coverImage || genreImages[genre.name] || genreImages.Action}
                alt={genre.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white font-bold text-lg">{genre.name}</h3>
                <p className="text-gray-300 text-xs">{genre.gameCount} games</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout with hover effects
  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            to={`/games/genre/${genre.id}`}
            onClick={() => handleGenreClick(genre.id)}
            onMouseEnter={() => setHoveredGenre(genre.id)}
            onMouseLeave={() => setHoveredGenre(null)}
            className="relative aspect-[4/3] rounded-lg overflow-hidden group"
          >
            <LazyImage
              src={genre.coverImage || genreImages[genre.name] || genreImages.Action}
              alt={genre.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <h3 className="text-white font-bold text-xl mb-1 group-hover:text-game-purple transition-colors">
                {genre.name}
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">{genre.gameCount} games</span>
                <span className="text-xs px-2 py-1 bg-game-purple/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore
                </span>
              </div>
              
              {hoveredGenre === genre.id && (
                <p className="text-gray-300 text-sm mt-2 line-clamp-2 animate-fade-in">
                  {genre.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// Example usage with mock data
export const GenreBrowserExample: React.FC = () => {
  const mockGenres: Genre[] = [
    {
      id: 'action',
      name: 'Action',
      description: 'Fast-paced games focused on combat and movement, requiring quick reflexes and coordination.',
      coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 1245
    },
    {
      id: 'adventure',
      name: 'Adventure',
      description: 'Story-driven games with exploration, puzzle-solving, and interactive narratives.',
      coverImage: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 867
    },
    {
      id: 'rpg',
      name: 'RPG',
      description: 'Role-playing games with character development, rich storytelling, and immersive worlds.',
      coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 753
    },
    {
      id: 'strategy',
      name: 'Strategy',
      description: 'Games that emphasize tactical thinking, planning, and resource management.',
      coverImage: 'https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 542
    },
    {
      id: 'simulation',
      name: 'Simulation',
      description: 'Games that simulate real-world activities, processes, or systems.',
      coverImage: 'https://images.pexels.com/photos/2885014/pexels-photo-2885014.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 389
    },
    {
      id: 'sports',
      name: 'Sports',
      description: 'Games that simulate traditional sports or extreme sports competitions.',
      coverImage: 'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 421
    },
    {
      id: 'racing',
      name: 'Racing',
      description: 'Games focused on competitive driving and racing with various vehicles.',
      coverImage: 'https://images.pexels.com/photos/12920/pexels-photo-12920.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 287
    },
    {
      id: 'puzzle',
      name: 'Puzzle',
      description: 'Games that challenge the player\'s problem-solving skills and logical thinking.',
      coverImage: 'https://images.pexels.com/photos/3491940/pexels-photo-3491940.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 632
    },
    {
      id: 'fighting',
      name: 'Fighting',
      description: 'Combat-focused games featuring one-on-one battles between characters.',
      coverImage: 'https://images.pexels.com/photos/260024/pexels-photo-260024.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 178
    },
    {
      id: 'shooter',
      name: 'Shooter',
      description: 'Games centered around weapon-based combat from first or third-person perspectives.',
      coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=800',
      gameCount: 523
    }
  ];

  return (
    <GenreBrowser
      genres={mockGenres}
      onGenreSelect={(genreId) => console.log(`Selected genre: ${genreId}`)}
    />
  );
};