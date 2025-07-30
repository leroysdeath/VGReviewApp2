import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, Gamepad2, Home, Users, TestTube, MessageSquare, Bell, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext'; // NEW IMPORT
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
  const { openModal } = useAuthModal(); // USE GLOBAL AUTH MODAL
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

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
    openModal(); // SIMPLIFIED - NO LOCAL STATE NEEDED
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

  if (isMobile) {
    return (
      <>
        {/* Mobile Navbar */}
        <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-2">
                <Gamepad2 className="h-6 w-6 text-purple-400" />
                <span className="text-lg font-bold text-white">GameVault</span>
              </Link>

              {/* User Avatar or Menu Button */}
              <div className="flex items-center space-x-2">
                {isAuthenticated && (
                  <NotificationBadge onClick={() => setIsNotificationCenterOpen(true)} />
                )}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
            <div className="bg-gray-800 w-full max-w-sm h-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gamepad2 className="h-6 w-6 text-purple-400" />
                    <span className="text-lg font-bold text-white">GameVault</span>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* User Info Section */}
                {isAuthenticated ? (
                  <div className="border-b border-gray-700 pb-4">
                    <div className="flex items-center space-x-3 mb-3">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{user?.name}</p>
                        <p className="text-gray-400 text-sm">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-gray-700 pb-4">
                    <button
                      onClick={handleAuthClick}
                      className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      Sign In / Sign Up
                    </button>
                  </div>
                )}

                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search games or users..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </form>

                {/* Navigation Links */}
                <div className="space-y-2">
                  <Link
                    to="/"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/search"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Gamepad2 className="h-5 w-5" />
                    <span>Games</span>
                  </Link>
                  <Link
                    to="/users"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" />
                    <span>Users</span>
                  </Link>

                  {/* Authenticated User Links */}
                  {isAuthenticated && (
                    <>
                      <Link
                        to={user?.name ? `/user/${user.name}` : "/profile"}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/review"
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <MessageSquare className="h-5 w-5" />
                        <span>Write Review</span>
                      </Link>
                    </>
                  )}

                  {/* Development Links */}
                  {import.meta.env.DEV && (
                    <>
                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide px-3 py-1">Development</p>
                      </div>
                      <Link
                        to="/game/dummy-game"
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Gamepad2 className="h-5 w-5 text-green-400" />
                        <span>Dummy Game</span>
                      </Link>
                      <Link
                        to="/user/1"
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5 text-blue-400" />
                        <span>Dummy User</span>
                      </Link>
                      {isAuthenticated && (
                        <Link
                          to="/igdb-test"
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <TestTube className="h-5 w-5 text-yellow-400" />
                          <span>IGDB Test</span>
                        </Link>
                      )}
                    </>
                  )}

                  {/* Sign Out Button */}
                  {isAuthenticated && (
                    <div className="border-t border-gray-700 pt-2 mt-2">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <NotificationCenter
          userId={user?.id || ""}
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
        />
      </>
    );
  }

  // Desktop Navbar
  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <Gamepad2 className="h-8 w-8 text-purple-400" />
                <span className="text-xl font-bold text-white">GameVault</span>
              </Link>
              
              {/* Development Quick Links */}
              {import.meta.env.DEV && (
                <>
                  <Link
                    to="/game/dummy-game"
                    className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    title="Dummy Test Game"
                  >
                    <Gamepad2 className="h-5 w-5 text-white" />
                  </Link>
                  <Link
                    to="/user/1"
                    className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    title="Dummy Test User"
                  >
                    <User className="h-5 w-5 text-white" />
                  </Link>
                  {isAuthenticated && (
                    <>
                      <Link
                        to="/review"
                        className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                        title="Write Review"
                      >
                        <MessageSquare className="h-5 w-5 text-white" />
                      </Link>
                      <Link
                        to="/igdb-test"
                        className="p-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors relative"
                        title="IGDB API Test & Debug"
                      >
                        <TestTube className="h-5 w-5 text-white" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games or users..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </form>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center gap-2 md:ml-6">
              {isAuthenticated && (
                <NotificationBadge onClick={() => setIsNotificationCenterOpen(true)} />
              )}
              
              {/* User Menu */}
              {isAuthenticated ? (
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
                          to={user?.name ? `/user/${user.name}` : "/profile"}
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
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Sign In'}
                </button>
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
            
            {isAuthenticated ? (
              <>
                <Link
                  to={user?.name ? `/user/${user.name}` : "/profile"}
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
