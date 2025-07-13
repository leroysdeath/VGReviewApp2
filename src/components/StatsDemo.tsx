import React from 'react';
import { AnimatedStatsSection } from './AnimatedStatsSection';

export const StatsDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-dark via-gray-900 to-game-dark">
      {/* Demo Header */}
      <div className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4 font-space-grotesk">
              Animated Statistics Section Demo
            </h1>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto font-space-grotesk">
              Scroll down to see the animated statistics section with counter animations, floating effects, and responsive design.
            </p>
          </div>
        </div>
      </div>

      {/* Spacer content to demonstrate scroll trigger */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 font-space-grotesk">Features Overview</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-purple-400 mb-4 font-space-grotesk">Animation Features</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Scroll-triggered entrance animations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Animated number counters</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>Staggered timing (0s, 0.5s, 1s, 1.5s)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Floating background elements</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Hover scale and glow effects</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-blue-400 mb-4 font-space-grotesk">Design Features</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Responsive grid layout</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Color-coded statistics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span>Semi-transparent backgrounds</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Space Grotesk typography</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Backdrop blur effects</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-700/50 rounded-xl border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3 font-space-grotesk">Color Scheme</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-400 rounded-lg mx-auto mb-2"></div>
                  <span className="text-purple-400 text-sm font-space-grotesk">Games</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-400 rounded-lg mx-auto mb-2"></div>
                  <span className="text-green-400 text-sm font-space-grotesk">Users</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-400 rounded-lg mx-auto mb-2"></div>
                  <span className="text-orange-400 text-sm font-space-grotesk">Reviews</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-400 rounded-lg mx-auto mb-2"></div>
                  <span className="text-blue-400 text-sm font-space-grotesk">Satisfaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The actual animated stats section */}
      <AnimatedStatsSection />

      {/* Bottom content */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4 font-space-grotesk">Implementation Notes</h2>
            <div className="text-gray-300 space-y-4 text-left">
              <p>
                <strong className="text-white">Scroll Detection:</strong> Uses Intersection Observer API to trigger animations when the section comes into view.
              </p>
              <p>
                <strong className="text-white">Counter Animation:</strong> Smooth number counting from 0 to target value over 2 seconds with easing.
              </p>
              <p>
                <strong className="text-white">Responsive Design:</strong> 1 column on mobile, 2 on tablet, 4 on desktop with proper spacing.
              </p>
              <p>
                <strong className="text-white">Performance:</strong> Optimized animations using CSS transforms and opacity for smooth 60fps performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};