import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, Users, Search, ArrowRight, Gamepad2 } from 'lucide-react';
import { GameCard } from './GameCard';
import { ReviewCard } from './ReviewCard';
import { AuthModal } from './auth/AuthModal';
import { mockReviews } from '../data/mockData';
import { igdbService, Game } from '../services/igdbApi';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';

export const ResponsiveLandingPage: React.FC = () => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const { isMobile } = useResponsive();
  const { isAuthenticated } = useAuth();
  const recentReviews = mockReviews.slice(0, isMobile ? 3 : 4);

  useEffect(() => {
    const loadFeaturedGames = async () => {
      try {
        const games = await igdbService.getPopularGames(isMobile ? 4 : 6);
        setFeaturedGames(games);
      } catch (error) {
        console.error('Failed to load featured games:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedGames();
  }, [isMobile]);

  // Handle auth-required actions
  const handleAuthRequiredAction = (action: string) => {
    if (!isAuthenticated) {
      setPendingAction(action);
      setShowAuthModal(true);
      return;
    }
    executeAction(action);
  };

  const executeAction = (action: string) => {
    switch (action) {
      case 'join_community':
        // Redirect to community features or profile setup
        console.log('Redirecting to community features');
        break;
      case 'start_rating':
        // Redirect to games to start rating
        window.location.href = '/search';
        break;
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingAction) {
      executeAction(pendingAction);
      setPendingAction(null);
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Mobile Hero Section */}
        <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 px-4 py-12 min-h-screen flex items-center">
          <div className="text-center w-full">
            <div className="flex items-center justify-center mb-6">
              <Gamepad2 className="h-12 w-12 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Discover the
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 block">
                Gaming Community
              </span>
            </h1>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Join the ultimate gaming community. Rate, review, and discuss games through social gaming.
            </p>
            <div className="space-y-3">
              <Link
                to="/search"
                className="block w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <div className="flex items-center justify-center gap-2">
                  <Search className="h-5 w-5" />
                  Explore Games
                </div>
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/users"
                  className="block w-full px-6 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    Browse Community
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </Link>
              ) : (
                <button
                  onClick={() => handleAuthRequiredAction('join_community')}
                  className="block w-full px-6 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    Join Community
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingAction(null);
          }}
          onLoginSuccess={handleAuthSuccess}
          onSignupSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // Desktop version
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Discover the
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {' '}Gaming Community
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join the ultimate gaming community. Rate, review, and discover games
              through the power of social gaming. Your next favorite game is just a click away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/search"
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-lg font-medium"
              >
                <Search className="h-5 w-5" />
                Explore Games
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/users"
                  className="px-8 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors flex items-center gap-2 text-lg font-medium"
                >
                  Browse Community
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  onClick={() => handleAuthRequiredAction('join_community')}
                  className="px-8 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors flex items-center gap-2 text-lg font-medium"
                >
                  Join Community
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingAction(null);
        }}
        onLoginSuccess={handleAuthSuccess}
        onSignupSuccess={handleAuthSuccess}
      />
    </div>
  );
};
