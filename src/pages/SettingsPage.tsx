// File: src/pages/SettingsPage.tsx
import React from 'react';
import { Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Settings className="h-24 w-24 text-gray-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Site in Progress</h1>
        <p className="text-gray-400 text-lg">Settings page is coming soon...</p>
      </div>
    </div>
  );
};

export default SettingsPage;

// File: src/App.tsx (Updated with Settings route)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ResponsiveNavbar } from './components/ResponsiveNavbar';
import { ResponsiveLandingPage } from './components/ResponsiveLandingPage';
import { ReviewProvider } from './context/ReviewContext';
import { GamePage } from './pages/GamePage';
import { GameSearchPage } from './pages/GameSearchPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { UserPage } from './pages/UserPage';
import { UserSearchPage } from './pages/UserSearchPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewFormPage } from './pages/ReviewFormPage';
import { ProfilePage } from './pages/ProfilePage';
import { IGDBTestPage } from './pages/IGDBTestPage';
import { SEOHead } from './components/SEOHead';
import SettingsPage from './pages/SettingsPage'; // NEW IMPORT

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ReviewProvider currentUserId={1}> {/* Using a dummy user ID for demo purposes */}
          <Router>
            <div className="min-h-screen bg-gray-900">
              <SEOHead />
              <ResponsiveNavbar />
              <Routes>
                <Route path="/" element={<ResponsiveLandingPage />} />
                <Route path="/game/:id" element={<GamePage />} />
                
                {/* UPDATED: Both search routes now point to SearchResultsPage */}
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/search-results" element={<SearchResultsPage />} />
                
                {/* Keep your other existing routes */}
                <Route path="/user/:id" element={<UserPage />} />
                <Route path="/users" element={<UserSearchPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/review/:gameId?" element={<ReviewFormPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} /> {/* NEW ROUTE */}
                {import.meta.env.DEV && <Route path="/igdb-test" element={<IGDBTestPage />} />}
              </Routes>
            </div>
          </Router>
        </ReviewProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;

// File: src/components/ResponsiveNavbar.tsx (Updated to hide email and fix settings route)
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, Gamepad2, Home, Users, TestTube, MessageSquare, Bell, Settings } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { useResponsive } from '../hooks/useResponsive';
import { NotificationBadge } from './NotificationBadge';
import { NotificationCenter } from './NotificationCenter';

// Mock user data - you would replace this with actual user data
const mockUser = {
  name: 'leroysdeath',
  email: 'joshuateusink@yahoo.com', // This will be hidden
  avatar: null
};

export const ResponsiveNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Add this state
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  // Mock authentication state - replace with actual auth logic
  const isAuthenticated = true;
  const user = mockUser;

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

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

              {/* User Section - Mobile */}
              <div className="flex items-center space-x-3">
                {isAuthenticated && (
                  <div className="flex items-center space-x-2">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full border-2 border-purple-500"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">{user?.name || 'User'}</span>
                  </div>
                )}

                {/* Menu Button */}
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
                    className="flex items-center space-x-3 px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/search"
                    className="flex items-center space-x-3 px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Search className="h-5 w-5" />
                    <span>Games</span>
                  </Link>
                  <Link
                    to="/users"
                    className="flex items-center space-x-3 px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" />
                    <span>Users</span>
                  </Link>
                </div>

                {/* User Section */}
                {isAuthenticated && (
                  <div className="border-t border-gray-700 pt-4 space-y-2">
                    <div className="flex items-center space-x-3 px-3 py-3">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full border-2 border-purple-500"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{user?.name || 'User'}</div>
                        {/* Email is intentionally hidden */}
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center space-x-3 px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center space-x-3 px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                    <button
                      className="flex items-center space-x-3 w-full px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      onClick={() => {
                        setIsMenuOpen(false);
                        // Handle logout
                      }}
                    >
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <NotificationCenter 
          isOpen={isNotificationCenterOpen} 
          onClose={() => setIsNotificationCenterOpen(false)} 
        />

        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      </>
    );
  }

  // Desktop version
  return (
    <>
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-4">
                <Link to="/" className="flex items-center space-x-2">
                  <Gamepad2 className="h-8 w-8 text-purple-400" />
                  <span className="text-xl font-bold text-white">GameVault</span>
                </Link>

                {/* Desktop Navigation Links */}
                <div className="hidden md:flex items-center space-x-4">
                  <Link
                    to="/"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/') ? 'text-purple-400 bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/search"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/search') ? 'text-purple-400 bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Games
                  </Link>
                  <Link
                    to="/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/users') ? 'text-purple-400 bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Users
                  </Link>
                </div>
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
                <NotificationBadge onClick={() => setIsNotificationCenterOpen(true)} />
                
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full border-2 border-purple-500"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <span className="text-white font-medium">{user?.name || 'User'}</span>
                    </button>

                    {/* User Dropdown */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50">
                        {/* User Info Header - Email is now hidden */}
                        <div className="px-4 py-3 border-b border-gray-700">
                          <div className="flex items-center space-x-3">
                            {user?.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-10 h-10 rounded-full border-2 border-purple-500"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
                              {/* Email is intentionally hidden as requested */}
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-1">
                          <Link
                            to="/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4 mr-3" />
                            My Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <Settings className="h-4 w-4 mr-3" />
                            Settings
                          </Link>
                          <hr className="my-1 border-gray-700" />
                          <button
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              // Handle logout
                            }}
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <User className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <NotificationCenter 
        isOpen={isNotificationCenterOpen} 
        onClose={() => setIsNotificationCenterOpen(false)} 
      />

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  );
};
