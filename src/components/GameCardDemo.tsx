import React from 'react';
import { GameCardGrid, GameData } from './GameCardGrid';

// Sample game data for demonstration
const sampleGames: GameData[] = [
  {
    id: '1',
    title: 'The Legend of Zelda: Breath of the Wild',
    description: 'Step into a world of discovery, exploration, and adventure in this stunning open-air adventure. Travel across vast fields, through forests, and to mountain peaks.',
    genre: 'Action-Adventure',
    rating: 9.7,
    reviewCount: 2847,
    releaseDate: '2017-03-03',
    imageUrl: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=800',
    developer: 'Nintendo EPD',
    platforms: ['Nintendo Switch', 'Wii U']
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    description: 'An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
    genre: 'RPG',
    rating: 7.8,
    reviewCount: 1923,
    releaseDate: '2020-12-10',
    imageUrl: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=800',
    developer: 'CD Projekt Red',
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X/S']
  },
  {
    id: '3',
    title: 'Red Dead Redemption 2',
    description: 'America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run. An epic tale of life in America\'s unforgiving heartland.',
    genre: 'Action',
    rating: 9.5,
    reviewCount: 3156,
    releaseDate: '2018-10-26',
    imageUrl: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800',
    developer: 'Rockstar Games',
    platforms: ['PC', 'PlayStation 4', 'Xbox One']
  },
  {
    id: '4',
    title: 'Elden Ring',
    description: 'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.',
    genre: 'RPG',
    rating: 9.6,
    reviewCount: 2734,
    releaseDate: '2022-02-25',
    imageUrl: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=800',
    developer: 'FromSoftware',
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X/S']
  },
  {
    id: '5',
    title: 'God of War',
    description: 'His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters.',
    genre: 'Action',
    rating: 9.4,
    reviewCount: 2891,
    releaseDate: '2018-04-20',
    imageUrl: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=800',
    developer: 'Santa Monica Studio',
    platforms: ['PlayStation 4', 'PC']
  },
  {
    id: '6',
    title: 'Horizon Zero Dawn',
    description: 'Experience Aloy\'s entire legendary quest to unravel the mysteries of a world ruled by deadly Machines.',
    genre: 'Action-Adventure',
    rating: 8.7,
    reviewCount: 1847,
    releaseDate: '2017-02-28',
    imageUrl: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800',
    developer: 'Guerrilla Games',
    platforms: ['PlayStation 4', 'PC']
  },
  {
    id: '7',
    title: 'The Witcher 3: Wild Hunt',
    description: 'You are Geralt of Rivia, mercenary monster slayer. Before you lies a war-torn, monster-infested continent.',
    genre: 'RPG',
    rating: 9.3,
    reviewCount: 4521,
    releaseDate: '2015-05-19',
    developer: 'CD Projekt Red',
    platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch']
  },
  {
    id: '8',
    title: 'Ghost of Tsushima',
    description: 'In the late 13th century, the Mongol empire has laid waste to entire nations. Tsushima Island stands between mainland Japan and invasion.',
    genre: 'Action-Adventure',
    rating: 8.8,
    reviewCount: 1634,
    releaseDate: '2020-07-17',
    developer: 'Sucker Punch Productions',
    platforms: ['PlayStation 4', 'PlayStation 5']
  }
];

export const GameCardDemo: React.FC = () => {
  const handleReviewClick = (gameId: string) => {
    console.log(`Writing review for game: ${gameId}`);
    // In a real app, this would navigate to the review form
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-dark via-gray-900 to-game-dark">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-game-purple to-game-blue bg-clip-text text-transparent mb-4">
              Interactive Game Cards Demo
            </h1>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              Explore our collection of interactive game cards with hover effects, rating systems, and responsive design.
              Each card features unique color themes and smooth animations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <GameCardGrid 
          games={sampleGames} 
          onReviewClick={handleReviewClick}
        />
      </div>

      {/* Features Section */}
      <div className="bg-gray-900/50 backdrop-blur-lg border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Card Features</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Dynamic Themes</h3>
              <p className="text-gray-400">Each card automatically gets a unique color theme (purple, green, orange, blue, red) for visual variety.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Rating System</h3>
              <p className="text-gray-400">Visual star ratings with numerical scores and review counts for comprehensive game evaluation.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Responsive Design</h3>
              <p className="text-gray-400">Adaptive grid layout that works perfectly on mobile, tablet, and desktop devices.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Hover Effects</h3>
              <p className="text-gray-400">Smooth scale transforms, border color changes, and shadow enhancements on interaction.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Search & Filter</h3>
              <p className="text-gray-400">Advanced filtering by genre, sorting options, and real-time search functionality.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎮</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Gaming Focus</h3>
              <p className="text-gray-400">Purpose-built for gaming content with platform badges, developer info, and genre categorization.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};