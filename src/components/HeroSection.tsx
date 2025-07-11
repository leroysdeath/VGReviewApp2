import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Play } from 'lucide-react';

interface HeroSectionProps {
  className?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section 
      className={`relative min-h-[90vh] flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-game-dark via-game-purple/20 to-game-blue/20 z-0"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-game-purple/10 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-game-blue/10 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-game-purple/5 rounded-full blur-3xl animate-float-fast"></div>
      </div>
      
      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        {/* Heading with animation */}
        <h1 
          className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-6 font-space-grotesk transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <span className="text-white">Discover Your Next</span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-game-purple to-game-blue">
            Gaming Adventure
          </span>
        </h1>
        
        {/* Subtitle with animation */}
        <p 
          className={`text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          Join the ultimate gaming community. Rate, review, and discover games 
          through the power of social gaming. Your next favorite game is just a click away.
        </p>
        
        {/* CTA buttons with animations */}
        <div 
          className={`flex flex-col sm:flex-row gap-6 justify-center items-center transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <Link
            to="/discover"
            className="px-8 py-4 bg-gradient-to-r from-game-purple to-game-blue text-white rounded-lg font-medium text-lg shadow-glow hover:shadow-glow-intense transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Start Exploring
            </div>
          </Link>
          
          <Link
            to="/demo"
            className="px-8 py-4 bg-transparent border-2 border-game-purple/50 text-white rounded-lg font-medium text-lg hover:bg-game-purple/10 transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Watch Demo
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
};