import React from 'react';
import { ReviewGrid } from './ReviewGrid';
import { ReviewData } from './ReviewCard';

// Sample review data for demonstration
const sampleReviews: ReviewData[] = [
  {
    id: '1',
    userId: '1',
    gameId: '1',
    gameTitle: 'The Legend of Zelda: Breath of the Wild',
    rating: 9.5,
    text: 'Absolutely phenomenal! The open world is breathtaking and the freedom of exploration is unmatched. The physics engine creates endless possibilities for creative problem-solving. This is easily one of the best adventure games ever made.',
    date: '2024-01-20',
    hasText: true,
    author: 'ZeldaFan92',
    authorAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '2',
    userId: '2',
    gameId: '2',
    gameTitle: 'Cyberpunk 2077',
    rating: 7.8,
    text: 'Great game with stunning visuals and innovative gameplay mechanics. The cooking and weapon systems add depth to the survival elements. Some weapon durability issues, but nothing game-breaking.',
    date: '2024-01-18',
    hasText: true,
    author: 'CyberGamer',
    authorAvatar: ''
  },
  {
    id: '3',
    userId: '3',
    gameId: '3',
    gameTitle: 'Red Dead Redemption 2',
    rating: 9.7,
    text: 'The attention to detail is remarkable. Every corner of the world tells a story, and the environmental storytelling is masterful. The soundtrack is also absolutely beautiful.',
    date: '2024-01-15',
    hasText: true,
    author: 'WildWestExplorer',
    authorAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '4',
    userId: '4',
    gameId: '4',
    gameTitle: 'Elden Ring',
    rating: 8.9,
    text: 'Solid adventure game with great production values. The combat system takes some getting used to, but once you master it, it\'s very satisfying. Lots of content to keep you busy.',
    date: '2024-01-12',
    hasText: true,
    author: 'SoulsVeteran',
    authorAvatar: ''
  },
  {
    id: '5',
    userId: '5',
    gameId: '5',
    gameTitle: 'God of War',
    rating: 9.2,
    text: 'This game exceeded all my expectations. The world is vast and beautiful, and the sense of discovery is unmatched. A true masterpiece that sets a new standard for action games.',
    date: '2024-01-10',
    hasText: true,
    author: 'KratosLover',
    authorAvatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '6',
    userId: '6',
    gameId: '6',
    gameTitle: 'Horizon Zero Dawn',
    rating: 8.4,
    text: 'Beautiful game with an engaging world, but the weapon durability system can be frustrating at times. The graphics are stunning and the exploration is addictive.',
    date: '2024-01-08',
    hasText: true,
    author: 'HorizonHunter',
    authorAvatar: ''
  },
  {
    id: '7',
    userId: '7',
    gameId: '7',
    gameTitle: 'The Witcher 3: Wild Hunt',
    rating: 9.8,
    text: 'An absolute masterpiece of storytelling and world-building. Every quest feels meaningful, and the characters are incredibly well-developed. The DLCs are also fantastic.',
    date: '2024-01-05',
    hasText: true,
    author: 'WitcherFan',
    authorAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
  },
  {
    id: '8',
    userId: '8',
    gameId: '8',
    gameTitle: 'Ghost of Tsushima',
    rating: 8.7,
    text: 'Visually stunning with satisfying combat. The open world activities can feel repetitive, but the main story and atmosphere make up for it. Great samurai experience.',
    date: '2024-01-03',
    hasText: true,
    author: 'SamuraiSpirit',
    authorAvatar: ''
  }
];

export const ReviewDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-dark via-gray-900 to-game-dark">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4 font-space-grotesk">
              Review Card Components Demo
            </h1>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              Explore our collection of review cards with hover effects, themed colors, and responsive design.
              Each card features user avatars, star ratings, and smooth animations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ReviewGrid reviews={sampleReviews} />
      </div>

      {/* Features Section */}
      <div className="bg-gray-900/50 backdrop-blur-lg border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-white text-center mb-8 font-space-grotesk">Review Card Features</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 font-space-grotesk">User Avatars</h3>
              <p className="text-gray-400">Circular avatars with gradient backgrounds and user initials when no image is available.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 font-space-grotesk">Star Ratings</h3>
              <p className="text-gray-400">Visual star displays with numerical scores and proper typography hierarchy.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 font-space-grotesk">Themed Colors</h3>
              <p className="text-gray-400">Dynamic color themes (purple, green, orange, blue, red) with matching borders and accents.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 font-space-grotesk">Hover Effects</h3>
              <p className="text-gray-400">Smooth scale transforms, border color changes, and glow effects on interaction.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 font-space-grotesk">Responsive Layout</h3>
              <p className="text-gray-400">Adaptive grid and list views that work perfectly on mobile, tablet, and desktop.</p>
            </div>

            <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 font-space-grotesk">Search & Filter</h3>
              <p className="text-gray-400">Advanced filtering by rating, sorting options, and real-time search functionality.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};