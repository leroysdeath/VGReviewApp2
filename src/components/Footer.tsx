import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Links */}
        <nav className="flex justify-center items-center space-x-4 sm:space-x-8 mb-4">
          <Link 
            to="/contact" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base"
          >
            Contact
          </Link>
          <span className="text-gray-600">|</span>
          <Link 
            to="/faq" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base"
          >
            FAQ
          </Link>
          <span className="text-gray-600">|</span>
          <Link 
            to="/terms" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base"
          >
            Terms
          </Link>
          <span className="text-gray-600">|</span>
          <Link 
            to="/privacy" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base"
          >
            Privacy
          </Link>
        </nav>
        
        {/* Copyright and Attribution */}
        <div className="text-center text-gray-500 text-xs sm:text-sm">
          <span>© Gamevault LLC</span>
          <span className="mx-2">•</span>
          <span>
            Games metadata provided by{' '}
            <a 
              href="https://www.igdb.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              IGDB
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};