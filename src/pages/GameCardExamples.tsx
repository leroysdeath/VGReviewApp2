import React from 'react';
import { GameCardInteractive, GameData } from '../components/GameCardInteractive';
import { GameCardGrid } from '../components/GameCardGrid';
import { GameCardShowcase } from '../components/GameCardShowcase';
import { GameCardCompact } from '../components/GameCardCompact';
import { GameCardHorizontal } from '../components/GameCardHorizontal';

// Sample game data
const sampleGames: GameData[] = [
  {
    id: '1',
    title: 'The Witcher 3: Wild Hunt',
    coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800',
    genre: 'RPG',
    description: 'An epic role-playing game with a gripping narrative and stunning visuals. Embark on a journey as Geralt of Rivia, a monster hunter for hire.',
    rating: 9.3,
    reviewCount: 2340,
    theme: 'purple'
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=800',
    genre: 'Action RPG',
    description: 'A futuristic open-world adventure set in Night City, a megalopolis obsessed with power, glamour, and body modification.',
    rating: 7.8,
    reviewCount: 1850,
    theme: 'orange'
  },
  {
    id: '3',
    title: 'Elden Ring',
    coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800',
    genre: 'Action RPG',
    description: 'A collaborative effort between FromSoftware and George R. R. Martin, featuring a vast open world with challenging combat.',
    rating: 9.7,
    reviewCount: 3100,
    theme: 'green'
  },
  {
    id: '4',
    title: 'God of War Ragnarök',
    coverImage: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=800',
    genre: 'Action-Adventure',
    description: 'The sequel to 2018\'s God of War, continuing the journey of Kratos and his son Atreus through the nine realms of Norse mythology.',
    rating: 9.5,
    reviewCount: 1750,
    theme: 'blue'
  },
  {
    id: '5',
    title: 'Horizon Forbidden West',
    coverImage: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=800',
    genre: 'Action RPG',
    description: 'Continue Aloy\'s journey as she braves the Forbidden West, a dangerous frontier that conceals mysterious new threats.',
    rating: 8.8,
    reviewCount: 1420,
    theme: 'green'
  },
  {
    id: '6',
    title: 'Hades',
    coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=800',
    genre: 'Roguelike',
    description: 'A rogue-like dungeon crawler where you defy the god of the dead as you hack and slash your way out of the Underworld.',
    rating: 9.2,
    reviewCount: 980,
    theme: 'orange'
  }
];

export const GameCardExamples: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-12">Interactive Game Cards</h1>
        
        {/* Featured Game Showcase */}
        <section className="mb-16">
          <GameCardShowcase 
            games={sampleGames} 
            title="Featured Games"
            description="Discover the most popular games on our platform"
          />
        </section>
        
        {/* Standard Game Cards Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Game Collection</h2>
          <GameCardGrid games={sampleGames} />
        </section>
        
        {/* Horizontal Game Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Recommended Games</h2>
          <div className="space-y-6">
            {sampleGames.slice(0, 3).map(game => (
              <GameCardHorizontal key={game.id} game={game} />
            ))}
          </div>
        </section>
        
        {/* Compact Game Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Quick Picks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleGames.map(game => (
              <GameCardCompact key={game.id} game={game} />
            ))}
          </div>
        </section>
        
        {/* Individual Card Examples */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Card Themes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sampleGames.slice(0, 4).map(game => (
              <GameCardInteractive key={game.id} game={game} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};