import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Calendar, User, Share2, Flag, Heart } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { mockGames } from '../data/mockData';

export const DummyReviewPage: React.FC = () => {
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [isLiked, setIsLiked] = useState(false);

  // Mock review data
  const dummyReview = {
    id: 'dummy-review-1',
    gameId: '1', // The Witcher 3
    title: 'A Masterpiece of Modern Gaming',
    rating: 9.5,
    text: `The Witcher 3: Wild Hunt is without a doubt one of the greatest RPGs ever created, and quite possibly one of the best games of all time. CD Projekt Red has crafted an incredibly immersive world filled with meaningful quests, complex characters, and stunning environments.

The main story follows Geralt of Rivia as he searches for his adopted daughter, Ciri, who's being pursued by the otherworldly Wild Hunt. But what makes this game truly special is how even the smallest side quests are written with care and attention to detail. Each quest tells its own compelling story, often with moral ambiguity that forces you to make difficult choices with consequences that ripple throughout the game world.

The combat system strikes a perfect balance between accessibility and depth. It's easy to pick up but offers enough complexity to remain engaging throughout the 100+ hours of gameplay. The signs (magic), potions, oils, and various combat techniques allow for different playstyles and strategies against the diverse bestiary of monsters.

Visually, the game remains stunning even years after release. From the war-torn fields of Velen to the majestic city of Novigrad and the breathtaking islands of Skellige, each region feels distinct and alive. The attention to detail in the environment design, character models, and lighting creates a world that feels authentic and lived-in.

The writing and voice acting are exceptional, bringing to life unforgettable characters like the Bloody Baron, Yennefer, and Triss. The dialogue is sharp, often humorous, and always engaging. The game also tackles mature themes with nuance and respect, never shying away from the harsh realities of its medieval fantasy setting.

The two expansions, Hearts of Stone and Blood and Wine, are masterclasses in DLC design, offering substantial new content that could stand as games in their own right.

If I had to find faults, the combat can occasionally feel a bit clunky, especially in tight spaces, and Roach (Geralt's horse) sometimes behaves erratically. But these minor issues pale in comparison to the game's overwhelming strengths.

In conclusion, The Witcher 3 sets a high bar for open-world RPGs with its incredible storytelling, complex characters, and beautiful world. It's a game that stays with you long after you've finished it, and one that I find myself returning to again and again.`,
    author: {
      id: 'user-1',
      username: 'RPGMaster',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    },
    date: '2024-01-15',
    helpfulCount: 342,
    unhelpfulCount: 12,
    commentCount: 47,
    platform: 'PC',
    playTime: '120+ hours',
    completionStatus: 'Completed'
  };

  // Get game data
  const game = mockGames.find(g => g.id === dummyReview.gameId);

  // Handle helpful/unhelpful votes
  const handleHelpfulVote = (helpful: boolean) => {
    setIsHelpful(helpful);
  };

  // Toggle like
  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">
              Game not found
            </h1>
            <Link
              to="/"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dummy Test Banner */}
        <div className="bg-purple-600 text-white p-4 rounded-lg mb-6 text-center">
          <h2 className="text-lg font-semibold">📝 Dummy Review Page</h2>
          <p className="text-sm opacity-90">This is a comprehensive test page showcasing what a detailed game review would look like</p>
        </div>

        {/* Game Info Header */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:flex-shrink-0">
              <img
                src={game.coverImage}
                alt={game.title}
                className="h-48 w-full object-cover md:h-full md:w-48"
              />
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <Link 
                    to={`/game/${game.id}`}
                    className="text-2xl font-bold text-white hover:text-purple-400 transition-colors"
                  >
                    {game.title}
                  </Link>
                  <div className="text-gray-400 text-sm mt-1">{game.developer} • {game.publisher}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-purple-400">{dummyReview.rating.toFixed(1)}</div>
                  <StarRating rating={dummyReview.rating} size="lg" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{game.releaseDate}</span>
                </div>
                <div><strong>Genre:</strong> {game.genre}</div>
                <div><strong>Platform:</strong> {dummyReview.platform}</div>
                <div><strong>Play Time:</strong> {dummyReview.playTime}</div>
                <div><strong>Status:</strong> <span className="text-green-400">{dummyReview.completionStatus}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Review Content */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          {/* Review Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img
                src={dummyReview.author.avatar}
                alt={dummyReview.author.username}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <Link 
                  to={`/user/${dummyReview.author.id}`}
                  className="font-semibold text-white hover:text-purple-400 transition-colors"
                >
                  {dummyReview.author.username}
                </Link>
                <div className="text-gray-400 text-sm flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>{dummyReview.date}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLike}
                className={`p-2 rounded-full transition-colors ${
                  isLiked 
                    ? 'bg-red-600/20 text-red-400' 
                    : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
                }`}
                aria-label="Like review"
              >
                <Heart className="h-5 w-5" fill={isLiked ? 'currentColor' : 'none'} />
              </button>
              <button
                className="p-2 rounded-full bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
                aria-label="Share review"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                className="p-2 rounded-full bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
                aria-label="Report review"
              >
                <Flag className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Review Title */}
          <h1 className="text-2xl font-bold text-white mb-4">{dummyReview.title}</h1>

          {/* Review Text */}
          <div className="text-gray-300 leading-relaxed mb-8 space-y-4">
            {dummyReview.text.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Review Actions */}
          <div className="border-t border-gray-700 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-400">Was this review helpful?</div>
                <button
                  onClick={() => handleHelpfulVote(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isHelpful === true
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Yes ({isHelpful === true ? dummyReview.helpfulCount + 1 : dummyReview.helpfulCount})</span>
                </button>
                <button
                  onClick={() => handleHelpfulVote(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isHelpful === false
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>No ({isHelpful === false ? dummyReview.unhelpfulCount + 1 : dummyReview.unhelpfulCount})</span>
                </button>
              </div>
              <Link
                to="#comments"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Comments ({dummyReview.commentCount})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div id="comments" className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">Comments ({dummyReview.commentCount})</h2>
          
          {/* Comment Form */}
          <div className="mb-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Add a comment..."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  rows={3}
                ></textarea>
                <div className="flex justify-end mt-2">
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Post Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sample Comments */}
          <div className="space-y-6">
            {/* Comment 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <img
                  src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150"
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">PixelPundit</span>
                  <span className="text-gray-400 text-sm">2 days ago</span>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  I completely agree with your assessment of the side quests. The Bloody Baron questline is some of the best storytelling I've ever experienced in a game. The moral ambiguity and complex characters really set a new standard for RPGs.
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button className="flex items-center gap-1 hover:text-white transition-colors">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>24</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-white transition-colors">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>2</span>
                  </button>
                  <button className="hover:text-white transition-colors">Reply</button>
                </div>
              </div>
            </div>
            
            {/* Comment 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <img
                  src="https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150"
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">GameExplorer</span>
                  <span className="text-gray-400 text-sm">5 days ago</span>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  Have you played the DLCs? Blood and Wine is practically a whole new game with one of the most beautiful game worlds ever created. Hearts of Stone has an incredible story too.
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button className="flex items-center gap-1 hover:text-white transition-colors">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>18</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-white transition-colors">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>0</span>
                  </button>
                  <button className="hover:text-white transition-colors">Reply</button>
                </div>
                
                {/* Nested Reply */}
                <div className="mt-4 ml-6 flex gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={dummyReview.author.avatar}
                      alt={dummyReview.author.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{dummyReview.author.username}</span>
                      <span className="text-gray-400 text-sm">4 days ago</span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      Absolutely! Blood and Wine is incredible - Toussaint is such a refreshing change from the war-torn landscapes of the main game. And the story in Hearts of Stone is probably the best in the entire game. Gaunter O'Dimm is such a fascinating villain.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <button className="flex items-center gap-1 hover:text-white transition-colors">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>12</span>
                      </button>
                      <button className="flex items-center gap-1 hover:text-white transition-colors">
                        <ThumbsDown className="h-3.5 w-3.5" />
                        <span>1</span>
                      </button>
                      <button className="hover:text-white transition-colors">Reply</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Comment 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <img
                  src="https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150"
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">OpenWorldLover</span>
                  <span className="text-gray-400 text-sm">1 week ago</span>
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  I think you're being a bit too generous with the combat. It's definitely the weakest part of the game. Compared to something like Dark Souls or even the newer God of War, it feels clunky and repetitive. Still a 9/10 game overall though!
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button className="flex items-center gap-1 hover:text-white transition-colors">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>7</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-white transition-colors">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>5</span>
                  </button>
                  <button className="hover:text-white transition-colors">Reply</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Load More Comments */}
          <div className="mt-8 text-center">
            <button className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
              Load More Comments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};