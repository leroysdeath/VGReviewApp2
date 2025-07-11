import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, Menu, X, Gamepad2 } from 'lucide-react';

interface ModernHeaderProps {
  onSearchSubmit?: (query: string) => void;
  onAuthClick?: () => void;
  isAuthenticated?: boolean;
  userName?: string;
  userAvatar?: string;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  onSearchSubmit,
  onAuthClick,
  isAuthenticated = false,
  userName,
  userAvatar
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  // Handle scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearchSubmit) {
      onSearchSubmit(searchQuery.trim());
      setSearchQuery('');
    }
  };

  // Check if a nav link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-gray-900/80 backdrop-blur-lg border-b border-gray-800' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Gamepad2 className="h-8 w-8 text-purple-400" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              GameVault
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/discover"
              className={`text-sm font-medium transition-colors ${
                isActive('/discover') ? 'text-game-purple' : 'text-gray-300 hover:text-game-purple'
              }`}
            >
              Discover
            </Link>
            <Link
              to="/reviews"
              className={`text-sm font-medium transition-colors ${
                isActive('/reviews') ? 'text-game-purple' : 'text-gray-300 hover:text-game-purple'
              }`}
            >
              Reviews
            </Link>
            <Link
              to="/community"
              className={`text-sm font-medium transition-colors ${
                isActive('/community') ? 'text-game-purple' : 'text-gray-300 hover:text-game-purple'
              }`}
            >
              Community
            </Link>
            <Link
              to="/lists"
              className={`text-sm font-medium transition-colors ${
                isActive('/lists') ? 'text-game-purple' : 'text-gray-300 hover:text-game-purple'
              }`}
            >
              Lists
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games or reviews..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple focus:ring-1 focus:ring-game-purple transition-all"
              />
            </form>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center">
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2">
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt={userName || 'User'} 
                      className="h-8 w-8 rounded-full object-cover border border-gray-700"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                    {userName || 'Account'}
                  </span>
                </button>
                
                {/* Dropdown menu would go here */}
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="px-4 py-2 bg-game-purple text-white rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 border-t border-gray-700">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games or reviews..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple focus:ring-1 focus:ring-game-purple"
              />
            </form>
            
            <Link
              to="/discover"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/discover') 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              } transition-colors`}
              onClick={() => setIsMenuOpen(false)}
            >
              Discover
            </Link>
            <Link
              to="/reviews"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/reviews') 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              } transition-colors`}
              onClick={() => setIsMenuOpen(false)}
            >
              Reviews
            </Link>
            <Link
              to="/community"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/community') 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              } transition-colors`}
              onClick={() => setIsMenuOpen(false)}
            >
              Community
            </Link>
            <Link
              to="/lists"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/lists') 
                  ? 'bg-gray-700 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              } transition-colors`}
              onClick={() => setIsMenuOpen(false)}
            >
              Lists
            </Link>
            
            {isAuthenticated ? (
              <div className="pt-4 pb-3 border-t border-gray-700">
                <div className="flex items-center px-3">
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt={userName || 'User'} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="ml-3">
                    <div className="text-base font-medium text-white">{userName || 'User'}</div>
                    <div className="text-sm font-medium text-gray-400">View Profile</div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onAuthClick) onAuthClick();
                  setIsMenuOpen(false);
                }}
                className="w-full mt-4 px-3 py-2 bg-game-purple text-white rounded-md hover:bg-opacity-90 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};