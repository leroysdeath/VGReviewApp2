import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  Search, 
  User, 
  Heart, 
  Settings,
  Gamepad2,
  Bell,
  Bookmark
} from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'search', label: 'Search', icon: Search, path: '/search' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  { id: 'wishlist', label: 'Wishlist', icon: Heart, path: '/wishlist', badge: 3 },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', badge: 2 },
];

export const ResponsiveNavigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isMobile, isTablet } = useResponsive();
  const location = useLocation();

  // Handle scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Swipe gesture for mobile menu
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: () => setIsMenuOpen(false),
    onSwipeRight: () => setIsMenuOpen(true),
    threshold: 50,
  });

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen, isMobile]);

  const isActive = (path: string) => location.pathname === path;

  if (isMobile) {
    return (
      <>
        {/* Mobile Top Navigation */}
        <nav 
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-top ${
            isScrolled 
              ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-800' 
              : 'bg-transparent'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center space-x-2">
              <Gamepad2 className="h-8 w-8 text-game-purple" />
              <span className="text-xl font-bold text-white">GameVault</span>
            </Link>

            <div className="flex items-center space-x-2">
              <button className="touch-target flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <Search className="h-6 w-6" />
              </button>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="touch-target flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Slide-out Menu */}
        <div 
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div 
            {...swipeHandlers}
            className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-gray-900 border-l border-gray-800 transform transition-transform duration-300 ease-out-back ${
              isMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full safe-area">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white">Menu</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="touch-target flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 py-6">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`flex items-center justify-between px-6 py-4 text-lg transition-colors ${
                        isActive(item.path)
                          ? 'text-game-purple bg-game-purple/10 border-r-2 border-game-purple'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <Icon className="h-6 w-6" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="bg-game-red text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Menu Footer */}
              <div className="p-6 border-t border-gray-800">
                <Link
                  to="/settings"
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 safe-bottom">
          <div className="flex items-center justify-around py-2">
            {navigationItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-colors ${
                    isActive(item.path) ? 'text-game-purple' : 'text-gray-400'
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-6 w-6" />
                    {item.badge && (
                      <span className="absolute -top-2 -right-2 bg-game-red text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                  {isActive(item.path) && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-game-purple rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // Desktop Navigation
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-800' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Gamepad2 className="h-8 w-8 text-game-purple" />
            <span className="text-xl font-bold text-white">GameVault</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'text-game-purple bg-game-purple/10'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 bg-game-red text-white text-xs px-1.5 py-0.5 rounded-full">
                2
              </span>
            </button>
            <Link
              to="/profile"
              className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <User className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};