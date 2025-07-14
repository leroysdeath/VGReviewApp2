import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, ArrowRight, Gamepad2, Star, Zap } from 'lucide-react';

export const GameHeroSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [apiData, setApiData] = useState(null);
  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

 


  return (

    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-game-dark">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-game-dark via-purple-900/20 to-blue-900/20" />

        {/* Floating Elements */}
        <div className="absolute inset-0">
          {/* Large floating orbs */}
          <div className="floating-orb absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-game-purple/30 to-game-blue/30 rounded-full blur-xl animate-float-slow" />
          <div className="floating-orb absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-game-blue/40 to-purple-500/40 rounded-full blur-lg animate-float-medium" />
          <div className="floating-orb absolute bottom-32 left-1/4 w-20 h-20 bg-gradient-to-r from-purple-400/30 to-game-purple/30 rounded-full blur-lg animate-float-fast" />
          <div className="floating-orb absolute bottom-20 right-1/3 w-28 h-28 bg-gradient-to-r from-game-blue/25 to-blue-400/25 rounded-full blur-xl animate-float-slow" />
   
          {/* Gaming icons floating */}
          <div className="absolute top-1/4 left-1/6 animate-float-icon">
            <Gamepad2 className="w-8 h-8 text-game-purple/40" />
          </div>
          <div className="absolute top-1/3 right-1/5 animate-float-icon-delayed">
            <Star className="w-6 h-6 text-game-blue/40" />
          </div>
          <div className="absolute bottom-1/3 left-1/5 animate-float-icon-slow">
            <Zap className="w-7 h-7 text-purple-400/40" />
          </div>
        </div>

        {/* Mesh gradient background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-game-purple/10 to-transparent animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-game-blue/10 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Heading */}
        <div className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          <h1 className="font-space-grotesk text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="block text-white animate-fade-in">Discover Your</span>
            <span className="block bg-gradient-to-r from-white via-game-purple to-game-blue bg-clip-text text-transparent animate-gradient-text">
              Next Gaming
            </span>
            <span className="block bg-gradient-to-r from-game-blue via-purple-400 to-game-purple bg-clip-text text-transparent animate-gradient-text-delayed">
              Adventure
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className={`transition-all duration-1000 ease-out delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          <p className="font-space-grotesk text-lg sm:text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-12">
            Join the ultimate gaming community where passionate players discover, rate, and review games.
            Your next favorite gaming experience is just one click away. 
          </p>
        </div>

        {/* Call-to-Action Buttons */}
        <div className={`transition-all duration-1000 ease-out delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {/* Primary Button */}
            <Link
              to="/search"
              className="group relative px-8 py-4 bg-gradient-to-r from-game-purple to-game-blue rounded-xl font-space-grotesk font-semibold text-white text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-game-purple/50 glow-button"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Gamepad2 className="w-6 h-6" />
                Start Exploring
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>

              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-game-purple to-game-blue rounded-xl blur-lg opacity-0 group-hover:opacity-75 transition-opacity duration-300 -z-10" />
            </Link>

            {/* Secondary Button */}
            <button className="group px-8 py-4 border-2 border-gray-600 rounded-xl font-space-grotesk font-semibold text-gray-300 text-lg transition-all duration-300 hover:scale-105 hover:border-game-purple hover:text-white hover:bg-game-purple/10 backdrop-blur-sm">
              <span className="flex items-center gap-3">
                <Play className="w-5 h-5 transition-transform group-hover:scale-110" />
                Watch Demo
              </span>
            </button>
          </div>
        </div>

        {/* Stats or Features */}
        <div className={`transition-all duration-1000 ease-out delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center group">
              <div className="text-3xl font-bold text-white mb-2 font-space-grotesk group-hover:text-game-purple transition-colors">
                50K+
              </div>
              <div className="text-gray-400 font-space-grotesk">Games Reviewed</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-white mb-2 font-space-grotesk group-hover:text-game-blue transition-colors">
                25K+
              </div>
              <div className="text-gray-400 font-space-grotesk">Active Gamers</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-white mb-2 font-space-grotesk group-hover:text-purple-400 transition-colors">
                1M+
              </div>
              <div className="text-gray-400 font-space-grotesk">Reviews Written</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gradient-to-b from-game-purple to-game-blue rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
};