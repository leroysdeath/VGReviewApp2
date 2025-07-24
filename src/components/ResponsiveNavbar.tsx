// src/components/ResponsiveNavbar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, User, LogOut } from 'lucide-react';
import { AuthModal } from './auth/AuthModal';
import { useAuth } from '../hooks/useAuth';

export const ResponsiveNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // Check if we need to show auth modal based on navigation state
  useEffect(() => {
    if (location.state?.showAuth || location.state?.requireAuth) {
      setShowAuthModal(true);
      setAuthMode('login');
      // Clear the state to prevent modal from reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white">VGReviewApp</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/search" className="text-gray-300 hover:text-white">
                <Search className="h-5 w-5" />
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-gray-300 hover:text-white">
                    Profile
                  </Link>
                  <Link to="/review" className="text-gray-300 hover:text-white">
                    Write Review
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">{user?.username}</span>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="text-gray-300 hover:text-white"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-white"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/search"
                className="block px-3 py-2 text-gray-300 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                Search Games
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 text-gray-300 hover:text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/review"
                    className="block px-3 py-2 text-gray-300 hover:text-white"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Write Review
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleAuthClick('login')}
                    className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleAuthClick('register')}
                    className="block w-full text-left px-3 py-2 text-purple-400 hover:text-purple-300"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </>
  );
};
