import { HeaderSearchBar } from './HeaderSearchBar';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, Gamepad2, Smartphone } from 'lucide-react';
import { LoginModal } from './LoginModal';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

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
              <Link
                to="/dummy-game"
                className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                title="Dummy Test Game"
              >
                <Gamepad2 className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/dummy-user"
                className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                title="Dummy Test User Page"
              >
                <User className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/dummy-review"
                className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                title="Dummy Test Review Page"
              >
                <MessageSquare className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/dummy-game"
                className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                title="Dummy Test Game"
              >
                <Gamepad2 className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/dummy-user"
                className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                title="Dummy Test User"
              >
                <User className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/mobile-preview"
                className="p-2 bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                title="iPhone 16 Mobile Preview"
              >
                <Smartphone className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/mobile-website"
                className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                title="Complete Mobile Website"
              >
                <Smartphone className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/mobile-dummy-game"
                className="p-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                title="Mobile Dummy Game Page"
              >
                <Smartphone className="h-5 w-5 text-white" />
              </Link>
              <Link
                to="/mobile-user"
                className="p-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
                title="Mobile User Page"
              >
                <Smartphone className="h-5 w-5 text-white" />
              </Link>
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
            <div className="ml-4 flex items-center md:ml-6">
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <User className="h-6 w-6" />
              </button>
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
            <Link
              to="/user/1"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            <button
              onClick={() => {
                setIsLoginModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      )}

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </nav>
  );
};
