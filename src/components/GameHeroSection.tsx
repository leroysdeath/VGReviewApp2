import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, Gamepad2, Star, Zap } from 'lucide-react';

export const GameHeroSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20" />
        
        {/* Floating Elements */}
        <div className="absolute inset-0">
          {/* Large floating orbs */}
          <div className="floating-orb absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-full blur-xl animate-pulse"></div>
          <div className="floating-orb absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-blue-600/40 to-purple-500/40 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="floating-orb absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-r from-purple-400/30 to-purple-600/30 rounded-full blur-lg animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="floating-orb absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-r from-blue-600/25 to-blue-400/25 rounded-full blur-xl animate-pulse" style={{ animationDelay: '3s' }}></div>
          
          {/* Gaming icons floating */}
          <div className="absolute top-1/4 left-1/6 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3s' }}>
            <Gamepad2 className="w-8 h-8 text-purple-600/40" />
          </div>
          <div className="absolute top-1/3 right-1/5 animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '3s' }}>
            <Star className="w-6 h-6 text-blue-600/40" />
          </div>
          <div className="absolute bottom-1/3 left-1/5 animate-bounce" style={{ animationDelay: '2.5s', animationDuration: '3s' }}>
            <Zap className="w-7 h-7 text-purple-400/40" />
          </div>
        </div>

        {/* Mesh gradient background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-purple-600/10 to-transparent animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-blue-600/10 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Heading */}
        <div className={`transition-all duration-1000 ease-out ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}>
          <div className="mb-8">
            <Gamepad2 className="h-20 w-20 text-purple-400 mx-auto mb-6 animate-pulse" />
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6">
            <span className="text-white">Level Up Your</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-600 animate-pulse">
              Gaming Experience
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Discover, rate, and review the best games. Connect with fellow gamers and 
            find your next gaming obsession in our vibrant community.
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-6 justify-center transition-all duration-1000 ease-out ${
            isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`} style={{ transitionDelay: '0.3s' }}>
            <Link
              to="/search"
              className="group inline-flex items-center px-10 py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
            >
              <Play className="mr-3 h-6 w-6 group-hover:animate-pulse" />
              Start Gaming
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/reviews"
              className="group inline-flex items-center px-10 py-5 bg-gray-800/80 backdrop-blur-sm text-gray-200 text-lg font-bold rounded-xl border-2 border-gray-700 hover:border-purple-500 hover:bg-gray-700/80 transition-all duration-300 transform hover:scale-105"
            >
              <Star className="mr-3 h-6 w-6 group-hover:text-yellow-400 transition-colors" />
              Browse Reviews
            </Link>
          </div>
        </div>

        {/* Feature highlights */}
        <div className={`mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000 ease-out ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`} style={{ transitionDelay: '0.6s' }}>
          <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Discover Games</h3>
            <p className="text-gray-400">Explore thousands of games across all genres and platforms</p>
          </div>
          
          <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Rate & Review</h3>
            <p className="text-gray-400">Share your thoughts and help others find their next favorite game</p>
          </div>
          
          <div className="text-center p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Connect</h3>
            <p className="text-gray-400">Join a community of passionate gamers from around the world</p>
          </div>
        </div>
      </div>
    </section>
  );
};
