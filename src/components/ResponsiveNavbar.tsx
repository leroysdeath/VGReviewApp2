import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, Gamepad2, Home, Users, TestTube, MessageSquare, Bell, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';
import { useResponsive } from '../hooks/useResponsive';
import { NotificationBadge } from './NotificationBadge';
import { NotificationCenter } from './NotificationCenter';

export const ResponsiveNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const { openModal } = useAuthModal();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const [authTimeout, setAuthTimeout] = useState(false);

  // Add timeout for auth loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout in navbar');
        setAuthTimeout(true);
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Reset timeout when loading completes
  useEffect(() => {
    if (!loading) {
      setAuthTimeout(false);
    }
  }, [loading]);

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  const handleAuthClick = () => {
    openModal();
    setIsMenuOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isUserMenuOpen]);

  // Don't show "Loading..." forever - show sign in button after timeout
  const showAuthButton = !loading || authTimeout;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Gamepad2 className="h-8 w-8 text-purple-500" />
            <span className="text-xl font-bold text-white">GameVault</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games or users..."
                className="w-64 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </form>

            {/* Nav Links */}
            <Link
              to="/"
              className={`text-gray-300 hover:text-white transition-colors ${isActive('/') ? 'text-white' : ''}`}
            >
              Home
            </Link>
            <Link
              to="/search"
              className={`text-gray-300 hover:text-white transition-colors ${isActive('/search') ? 'text-white' : ''}`}
            >
              Games
            </Link>
            <Link
              to="/users"
              className={`text-gray-300 hover:text-white transition-colors ${isActive('/users') ? 'text-white' : ''}`}
            >
              Users
            </Link>
            {import.meta.env.DEV && (
              <Link
                to="/igdb-test"
                className={`text-gray-300 hover:text-white transition-colors ${isActive('/igdb-test') ? 'text-white' : ''}`}
              >
                IGDB Test
              </Link>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {isAuthenticated && (
                <button
                  onClick={() => setIsNotificationCenterOpen(true)}
                  className="p-2 text-gray-400 hover:text-white transition-colors relative"
                >
                  <Bell className="h-5 w-5" />
                  <NotificationBadge userId={user?.id || ""} />
                </button>
              )}

              {/* User Dropdown */}
              {showAuthButton ? (
                isAuthenticated && user ? (
                  <div className="relative">
                    <button
                      ref={userButtonRef}
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <span className="text-white font-medium">{user?.name}</span>
                    </button>

                    {/* Dropdown Menu */}
                    {isUserMenuOpen && (
                      <div 
                        ref={dropdownRef}
                        className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                          <Link
                            to="/review"
                            className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Write Review</span>
                          </Link>
                          <div className="border-t border-gray-700 my-1"></div>
                          <button
                            onClick={handleSignOut}
                            className="flex items-center space-x-2 w-full px-4 py-2 text-red-400 hover:bg-gray-700 hover:text-red-300"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleAuthClick}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    Sign In
                  </button>
                )
              ) : (
                <div className="text-gray-400 text-sm">Loading...</div>
              )}
            </div>
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
                placeholder="Search games or users..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </form>
            
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/search"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Games
            </Link>
            <Link
              to="/users"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Users
            </Link>
            
            {showAuthButton ? (
              isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/review"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Write Review
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={handleAuthClick}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  Sign In / Sign Up
                </button>
              )
            ) : (
              <div className="px-3 py-2 text-gray-400 text-sm">Loading...</div>
            )}
          </div>
        </div>
      )}
      
      {/* Notification Center */}
      <NotificationCenter
        userId={user?.id || ""}
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </nav>
  );
};
