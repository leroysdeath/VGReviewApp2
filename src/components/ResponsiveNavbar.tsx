// src/components/ResponsiveNavbar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, Gamepad2, Bell, User } from 'lucide-react';
import { HeaderSearchBar } from './HeaderSearchBar';
import { LoginModal } from './LoginModal';
import { AuthModal } from './auth/AuthModal';
import { NotificationCenter } from './notifications/NotificationCenter';
import { useAuthModal } from '../context/AuthModalContext'; // Import the hook

export const ResponsiveNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const location = useLocation();
  
  // Use the AuthModal context instead of local state
  const { 
    isLoginModalOpen, 
    openLoginModal, 
    closeModal,
    switchToLogin,
    switchToSignup 
  } = useAuthModal();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <Gamepad2 className="h-8 w-8 text-purple-400" />
              <span className="text-xl font-bold text-white hidden sm:block">GameVault</span>
            </Link>
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <HeaderSearchBar />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/search"
              className={`text-sm font-medium transition-colors ${
                isActive('/search')
                  ? 'text-purple-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Browse Games
            </Link>
            <Link
              to="/users"
              className={`text-sm font-medium transition-colors ${
                isActive('/users')
                  ? 'text-purple-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Community
            </Link>
            <Link
              to="/user/1"
              className={`text-sm font-medium transition-colors ${
                isActive('/user/1')
                  ? 'text-purple-400'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Profile
            </Link>
            
            {/* Notification Bell */}
            <button
              onClick={() => setIsNotificationCenterOpen(true)}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            
            <button
              onClick={openLoginModal} // Use the context function
              className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden py-3 border-t border-gray-700">
          <HeaderSearchBar />
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-700">
            <Link
              to="/search"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Browse Games
            </Link>
            <Link
              to="/users"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Community
            </Link>
            <Link
              to="/dummy-review"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Dummy Review
            </Link>
            <Link
              to="/user/1"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            <button
              onClick={() => {
                openLoginModal(); // Use the context function
                setIsMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      )}

      {/* Use AuthModal instead of LoginModal */}
      <AuthModal 
        isOpen={isLoginModalOpen} 
        onClose={closeModal}
        onLoginSuccess={() => {
          console.log('Login successful');
          closeModal();
        }}
        onSignupSuccess={() => {
          console.log('Signup successful');
          closeModal();
        }}
      />
      
      {/* Notification Center */}
      <NotificationCenter
        userId="user123" // This would come from auth context in a real app
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </nav>
  );
};
