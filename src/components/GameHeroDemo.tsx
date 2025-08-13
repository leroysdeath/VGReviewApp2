import React from 'react';
import { GameHeroSection } from './GameHeroSection';

export const GameHeroDemo: React.FC = () => {
  return (
    <div className="min-h-screen">
      <GameHeroSection />
      
      {/* Demo content below hero */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-800 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-white mb-6 font-space-grotesk">Hero Section Features</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-game-purple mb-4 font-space-grotesk">Visual Effects</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>✨ Animated gradient text</li>
                  <li>🌟 Floating background orbs</li>
                  <li>💫 Glow effects on hover</li>
                  <li>🎮 Gaming-themed floating icons</li>
                  <li>🌈 Mesh gradient overlays</li>
                  <li>📱 Fully responsive design</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-game-blue mb-4 font-space-grotesk">Animations</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>⚡ Fade-in sequence</li>
                  <li>🔄 Continuous floating motion</li>
                  <li>📈 Scale transforms on hover</li>
                  <li>💨 Smooth transitions</li>
                  <li>🎯 Staggered animation delays</li>
                  <li>🎪 Interactive button effects</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-3 font-space-grotesk">Color Scheme</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-game-dark rounded border border-gray-600"></div>
                  <span className="text-gray-300 text-sm">game-dark (#0f0f23)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-game-purple rounded"></div>
                  <span className="text-gray-300 text-sm">game-purple (#6366f1)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-game-blue rounded"></div>
                  <span className="text-gray-300 text-sm">game-blue (#3b82f6)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};