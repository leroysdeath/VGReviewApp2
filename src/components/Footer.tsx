import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Links */}
        <nav className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 mb-4">
          <Link 
            to="/contact" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base px-2 py-1"
          >
            Contact
          </Link>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <Link 
            to="/faq" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base px-2 py-1"
          >
            FAQ
          </Link>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <Link 
            to="/terms" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base px-2 py-1"
          >
            Terms
          </Link>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <Link 
            to="/privacy" 
            className="text-gray-400 hover:text-purple-400 transition-colors text-sm sm:text-base px-2 py-1"
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