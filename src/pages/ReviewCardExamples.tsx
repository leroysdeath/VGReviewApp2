import React from 'react';
import { ReviewCard, ReviewData } from '../components/ReviewCard';
import { ReviewCardGrid } from '../components/ReviewCardGrid';
import { ReviewCardFeatured } from '../components/ReviewCardFeatured';

// Sample review data
const sampleReviews: ReviewData[] = [
  {
    id: '1',
    userId: 'user1',
    gameId: 'game1',
    username: 'GameMaster92',
    userAvatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    gameTitle: 'The Witcher 3: Wild Hunt',
    rating: 9.5,
    reviewText: 'An absolute masterpiece. The world-building is phenomenal, characters are deep and complex, and the side quests are better than most games\' main stories. Geralt\'s journey is both personal and epic in scope.',
    date: '2 days ago',
    likes: 42,
    dislikes: 3,
    comments: 7,
    theme: 'purple'
  },
  {
    id: '2',
    userId: 'user2',
    gameId: 'game2',
    username: 'RPGLover',
    userAvatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
    gameTitle: 'Elden Ring',
    rating: 9.0,
    reviewText: 'FromSoftware has outdone themselves with this open-world masterpiece. The sense of discovery and wonder is unmatched, and the combat is as satisfying as ever. The lore, written in collaboration with George R.R. Martin, creates a rich and mysterious world that begs to be explored.',
    date: '1 week ago',
    likes: 38,
    dislikes: 2,
    comments: 5,
    theme: 'green'
  },
  {
    id: '3',
    userId: 'user3',
    gameId: 'game3',
    username: 'CasualGamer',
    gameTitle: 'Stardew Valley',
    rating: 8.5,
    reviewText: 'A delightful farming sim that offers so much more than just agriculture. The characters are charming, the seasonal events are fun, and there\'s always something new to discover. Perfect for relaxing gaming sessions.',
    date: '3 days ago',
    likes: 24,
    dislikes: 1,
    comments: 3,
    theme: 'blue'
  },
  {
    id: '4',
    userId: 'user4',
    gameId: 'game4',
    username: 'ActionFan',
    userAvatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150',
    gameTitle: 'God of War Ragnarök',
    rating: 9.2,
    reviewText: 'A worthy sequel that builds upon everything that made the 2018 reboot great. The combat is visceral, the story is emotional, and the graphics are stunning. The relationship between Kratos and Atreus continues to be the heart of the game.',
    date: '5 days ago',
    likes: 31,
    dislikes: 2,
    comments: 4,
    theme: 'orange'
  }
];

export const ReviewCardExamples: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-12">Review Card Components</h1>
        
        {/* Featured Review */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Featured Review</h2>
          <ReviewCardFeatured review={sampleReviews[0]} />
        </section>
        
        {/* Standard Review Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Standard Review Cards</h2>
          <div className="space-y-6">
            {sampleReviews.slice(0, 2).map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
        
        {/* Compact Review Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Compact Review Cards</h2>
          <div className="space-y-4">
            {sampleReviews.map(review => (
              <ReviewCard key={review.id} review={review} compact />
            ))}
          </div>
        </section>
        
        {/* Review Card Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Review Card Grid</h2>
          <ReviewCardGrid reviews={sampleReviews} />
        </section>
        
        {/* Compact Review Card Grid */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Compact Review Card Grid</h2>
          <ReviewCardGrid reviews={sampleReviews} compact />
        </section>
      </div>
    </div>
  );
};