import React, { useState, useEffect, useRef } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { Gamepad2, Users, MessageSquare, BarChart2 } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  delay: number;
  duration?: number;
}

interface AnimatedStatsSectionProps {
  className?: string;
  stats?: {
    gamesReviewed: number;
    activeUsers: number;
    reviewsWritten: number;
    satisfactionRate: number;
  };
}

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  value, 
  label, 
  color, 
  delay,
  duration = 2000
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.2,
    triggerOnce: true
  });
  
  // Start animation when card becomes visible
  useEffect(() => {
    if (isIntersecting && !isVisible) {
      setIsVisible(true);
      
      // Delay the counter animation based on the delay prop
      const timer = setTimeout(() => {
        const startTime = Date.now();
        const endTime = startTime + duration;
        
        const updateCounter = () => {
          const now = Date.now();
          const progress = Math.min(1, (now - startTime) / duration);
          
          // Easing function for smoother animation
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          
          setDisplayValue(Math.floor(easedProgress * value));
          
          if (now < endTime) {
            requestAnimationFrame(updateCounter);
          } else {
            setDisplayValue(value);
          }
        };
        
        requestAnimationFrame(updateCounter);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [isIntersecting, isVisible, value, delay, duration]);
  
  // Format number with commas
  const formattedValue = displayValue.toLocaleString();
  
  // Format percentage for satisfaction rate
  const isPercentage = label.toLowerCase().includes('rate') || label.toLowerCase().includes('satisfaction');
  const displayText = isPercentage ? `${formattedValue}%` : formattedValue;
  
  return (
    <div 
      ref={elementRef}
      className={`bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 transform transition-all duration-500 hover:scale-105 hover:shadow-lg ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ 
        transitionDelay: `${delay}ms`,
        animation: isVisible ? `float-animation 3s ease-in-out infinite ${delay}ms` : 'none'
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div 
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4`}
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
        
        <h3 
          className={`text-4xl md:text-5xl font-bold mb-2 font-space-grotesk`}
          style={{ color }}
        >
          {displayText}
        </h3>
        
        <p className="text-gray-400 text-lg">{label}</p>
      </div>
    </div>
  );
};

export const AnimatedStatsSection: React.FC<AnimatedStatsSectionProps> = ({ 
  className = '',
  stats = {
    gamesReviewed: 12500,
    activeUsers: 8750,
    reviewsWritten: 42300,
    satisfactionRate: 97
  }
}) => {
  const { elementRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true
  });
  
  return (
    <section 
      ref={elementRef}
      className={`py-16 bg-gray-900/80 backdrop-blur-sm ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-space-grotesk">
            Our Gaming Community
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Join thousands of gamers sharing their experiences and discovering new games together.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<Gamepad2 className="h-8 w-8 text-game-purple" />}
            value={stats.gamesReviewed}
            label="Games Reviewed"
            color="#6366f1" // game-purple
            delay={0}
          />
          
          <StatCard
            icon={<Users className="h-8 w-8 text-game-green" />}
            value={stats.activeUsers}
            label="Active Users"
            color="#10b981" // game-green
            delay={500}
          />
          
          <StatCard
            icon={<MessageSquare className="h-8 w-8 text-game-orange" />}
            value={stats.reviewsWritten}
            label="Reviews Written"
            color="#f59e0b" // game-orange
            delay={1000}
          />
          
          <StatCard
            icon={<BarChart2 className="h-8 w-8 text-game-blue" />}
            value={stats.satisfactionRate}
            label="Satisfaction Rate"
            color="#3b82f6" // game-blue
            delay={1500}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes float-animation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </section>
  );
};