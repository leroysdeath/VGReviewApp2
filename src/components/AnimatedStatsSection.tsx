import React, { useState, useEffect, useRef } from 'react';
import { Gamepad2, Users, MessageSquare, ThumbsUp } from 'lucide-react';

interface StatData {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
}

interface AnimatedStatsProps {
  className?: string;
}

export const AnimatedStatsSection: React.FC<AnimatedStatsProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
  const sectionRef = useRef<HTMLDivElement>(null);

  const statsData: StatData[] = [
    {
      id: 'games',
      label: 'Games Reviewed',
      value: 50000,
      suffix: '+',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: Gamepad2,
      delay: 0
    },
    {
      id: 'users',
      label: 'Active Users',
      value: 25000,
      suffix: '+',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: Users,
      delay: 0.5
    },
    {
      id: 'reviews',
      label: 'Reviews Written',
      value: 1000000,
      suffix: '+',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      icon: MessageSquare,
      delay: 1
    },
    {
      id: 'satisfaction',
      label: 'Satisfaction Rate',
      value: 98,
      suffix: '%',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: ThumbsUp,
      delay: 1.5
    }
  ];

  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          startCounterAnimations();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  // Counter animation function
  const startCounterAnimations = () => {
    statsData.forEach((stat) => {
      setTimeout(() => {
        animateCounter(stat.id, stat.value);
      }, stat.delay * 1000);
    });
  };

  const animateCounter = (id: string, targetValue: number) => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = targetValue / steps;
    let currentValue = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      currentValue = Math.min(currentValue + increment, targetValue);
      
      setAnimatedValues(prev => ({
        ...prev,
        [id]: Math.floor(currentValue)
      }));

      if (step >= steps || currentValue >= targetValue) {
        setAnimatedValues(prev => ({
          ...prev,
          [id]: targetValue
        }));
        clearInterval(timer);
      }
    }, duration / steps);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toString();
  };

  return (
    <section 
      ref={sectionRef}
      className={`relative py-20 bg-gray-900/50 backdrop-blur-lg border-y border-gray-800 overflow-hidden ${className}`}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-float-slow" />
        <div className="absolute top-20 right-20 w-24 h-24 bg-green-500/10 rounded-full blur-lg animate-float-medium" />
        <div className="absolute bottom-20 left-1/4 w-28 h-28 bg-orange-500/10 rounded-full blur-lg animate-float-fast" />
        <div className="absolute bottom-10 right-1/3 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-float-slow" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <h2 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Powering the Gaming
            <span className="block bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
              Community
            </span>
          </h2>
          <p className="font-space-grotesk text-lg text-gray-300 max-w-2xl mx-auto">
            Join thousands of passionate gamers sharing their experiences and discovering their next favorite games
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {statsData.map((stat) => {
            const IconComponent = stat.icon;
            const animatedValue = animatedValues[stat.id] || 0;
            
            return (
              <div
                key={stat.id}
                className={`group relative transition-all duration-1000 ease-out ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ 
                  transitionDelay: isVisible ? `${stat.delay}s` : '0s',
                  animationDelay: `${stat.delay}s`
                }}
              >
                {/* Floating animation wrapper */}
                <div 
                  className="animate-float-slow"
                  style={{ animationDelay: `${stat.delay}s` }}
                >
                  {/* Card */}
                  <div className={`
                    relative p-8 rounded-2xl border border-gray-700/50 
                    bg-gray-800/30 backdrop-blur-sm
                    transition-all duration-500 ease-out
                    hover:scale-105 hover:border-gray-600 hover:bg-gray-800/50
                    hover:shadow-2xl hover:shadow-gray-900/50
                    ${stat.bgColor}
                    group-hover:${stat.bgColor.replace('/10', '/20')}
                  `}>
                    {/* Background glow effect */}
                    <div className={`
                      absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
                      transition-opacity duration-500 blur-xl -z-10
                      ${stat.bgColor.replace('/10', '/30')}
                    `} />

                    {/* Icon */}
                    <div className={`
                      w-16 h-16 rounded-xl ${stat.bgColor} 
                      flex items-center justify-center mb-6 mx-auto
                      transition-all duration-300 group-hover:scale-110
                    `}>
                      <IconComponent className={`w-8 h-8 ${stat.color}`} />
                    </div>

                    {/* Animated Number */}
                    <div className="text-center">
                      <div className={`
                        font-space-grotesk text-4xl sm:text-5xl font-bold mb-2
                        ${stat.color} transition-all duration-300
                        group-hover:scale-110
                      `}>
                        {formatNumber(animatedValue)}{stat.suffix}
                      </div>
                      
                      {/* Label */}
                      <div className="font-space-grotesk text-gray-400 text-lg font-medium group-hover:text-gray-300 transition-colors duration-300">
                        {stat.label}
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <div className={`
                      absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2
                      w-2 h-2 rounded-full ${stat.color.replace('text-', 'bg-')}
                      opacity-0 group-hover:opacity-100 transition-all duration-300
                      scale-0 group-hover:scale-100
                    `} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom decorative text */}
        <div className={`text-center mt-16 transition-all duration-1000 ease-out delay-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <p className="font-space-grotesk text-gray-500 text-sm">
            Growing every day • Real-time statistics • Join the community
          </p>
        </div>
      </div>
    </section>
  );
};