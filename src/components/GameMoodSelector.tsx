import React, { useState } from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface GameMood {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  keywords: string[];
}

interface GameMoodSelectorProps {
  onMoodSelect: (moods: string[]) => void;
  className?: string;
  multiSelect?: boolean;
}

export const GameMoodSelector: React.FC<GameMoodSelectorProps> = ({
  onMoodSelect,
  className = '',
  multiSelect = true,
}) => {
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const { isMobile } = useResponsive();

  // Game moods with icons, colors, and keywords
  const moods: GameMood[] = [
    {
      id: 'relaxing',
      name: 'Relaxing',
      description: 'Chill games with low pressure and soothing experiences',
      icon: <RelaxingIcon />,
      color: 'bg-blue-500',
      keywords: ['peaceful', 'casual', 'zen', 'cozy', 'meditation']
    },
    {
      id: 'intense',
      name: 'Intense',
      description: 'High-octane experiences that get your heart racing',
      icon: <IntenseIcon />,
      color: 'bg-red-500',
      keywords: ['action', 'fast-paced', 'challenging', 'competitive', 'adrenaline']
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Express yourself through building, designing, and creating',
      icon: <CreativeIcon />,
      color: 'bg-purple-500',
      keywords: ['building', 'design', 'sandbox', 'artistic', 'crafting']
    },
    {
      id: 'strategic',
      name: 'Strategic',
      description: 'Plan, think, and outsmart your opponents',
      icon: <StrategicIcon />,
      color: 'bg-green-500',
      keywords: ['planning', 'tactics', 'management', 'turn-based', 'thinking']
    },
    {
      id: 'social',
      name: 'Social',
      description: 'Connect and play with friends or make new ones',
      icon: <SocialIcon />,
      color: 'bg-yellow-500',
      keywords: ['multiplayer', 'cooperative', 'party', 'team-based', 'community']
    },
    {
      id: 'immersive',
      name: 'Immersive',
      description: 'Get lost in rich, detailed worlds and stories',
      icon: <ImmersiveIcon />,
      color: 'bg-indigo-500',
      keywords: ['story-rich', 'atmospheric', 'open-world', 'exploration', 'narrative']
    },
    {
      id: 'scary',
      name: 'Scary',
      description: 'Experience fear, tension, and horror',
      icon: <ScaryIcon />,
      color: 'bg-gray-800',
      keywords: ['horror', 'survival', 'tense', 'dark', 'psychological']
    },
    {
      id: 'funny',
      name: 'Funny',
      description: 'Laugh and enjoy humorous gameplay and stories',
      icon: <FunnyIcon />,
      color: 'bg-orange-500',
      keywords: ['comedy', 'humor', 'silly', 'parody', 'lighthearted']
    },
    {
      id: 'retro',
      name: 'Retro',
      description: 'Classic gaming experiences with nostalgic vibes',
      icon: <RetroIcon />,
      color: 'bg-pink-500',
      keywords: ['classic', 'pixel', '8-bit', '16-bit', 'nostalgia']
    },
    {
      id: 'educational',
      name: 'Educational',
      description: 'Learn while you play with informative content',
      icon: <EducationalIcon />,
      color: 'bg-teal-500',
      keywords: ['learning', 'educational', 'informative', 'skill-building', 'knowledge']
    },
    {
      id: 'competitive',
      name: 'Competitive',
      description: 'Test your skills against others and climb the ranks',
      icon: <CompetitiveIcon />,
      color: 'bg-red-600',
      keywords: ['esports', 'pvp', 'ranked', 'leaderboards', 'tournaments']
    },
    {
      id: 'casual',
      name: 'Casual',
      description: 'Pick-up-and-play games with simple mechanics',
      icon: <CasualIcon />,
      color: 'bg-blue-400',
      keywords: ['simple', 'easy', 'quick', 'mobile', 'accessible']
    }
  ];

  // Toggle mood selection
  const toggleMood = (moodId: string) => {
    if (multiSelect) {
      setSelectedMoods(prev => 
        prev.includes(moodId)
          ? prev.filter(id => id !== moodId)
          : [...prev, moodId]
      );
    } else {
      setSelectedMoods([moodId]);
    }
  };

  // Effect to notify parent component when selection changes
  React.useEffect(() => {
    onMoodSelect(selectedMoods);
  }, [selectedMoods, onMoodSelect]);

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white mb-2">What's your gaming mood today?</h2>
        <p className="text-gray-400">
          {multiSelect 
            ? 'Select one or more moods to find your perfect game match'
            : 'Select a mood to find your perfect game match'}
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {moods.map((mood) => (
          <button
            key={mood.id}
            onClick={() => toggleMood(mood.id)}
            className={`relative flex flex-col items-center p-4 rounded-lg transition-all duration-300 ${
              selectedMoods.includes(mood.id)
                ? `${mood.color} text-white ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-105`
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            <div className="h-12 w-12 mb-3 flex items-center justify-center">
              {mood.icon}
            </div>
            
            <h3 className="font-medium text-center mb-1">{mood.name}</h3>
            
            {!isMobile && (
              <p className="text-xs text-center opacity-80 line-clamp-2">
                {mood.description}
              </p>
            )}
            
            {selectedMoods.includes(mood.id) && (
              <div className="absolute top-2 right-2">
                <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* Selected moods summary */}
      {selectedMoods.length > 0 && (
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedMoods.map(moodId => {
              const mood = moods.find(m => m.id === moodId);
              return mood ? (
                <div 
                  key={mood.id}
                  className={`px-3 py-1 rounded-full text-white text-sm ${mood.color}`}
                >
                  {mood.name}
                </div>
              ) : null;
            })}
          </div>
          
          <div className="flex flex-wrap gap-1 text-sm text-gray-400">
            <span>Keywords:</span>
            {selectedMoods.flatMap(moodId => {
              const mood = moods.find(m => m.id === moodId);
              return mood ? mood.keywords.slice(0, 3) : [];
            }).slice(0, 10).map((keyword, index) => (
              <span key={index} className="text-gray-300">
                {keyword}{index < Math.min(selectedMoods.length * 3, 9) ? ',' : ''}
              </span>
            ))}
            {selectedMoods.flatMap(moodId => {
              const mood = moods.find(m => m.id === moodId);
              return mood ? mood.keywords : [];
            }).length > 10 && '...'}
          </div>
        </div>
      )}
    </div>
  );
};

// Mood Icons (simplified SVG components)
const RelaxingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const IntenseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
  </svg>
);

const CreativeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="4"></circle>
    <line x1="21.17" y1="8" x2="12" y2="8"></line>
    <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
    <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
  </svg>
);

const StrategicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
  </svg>
);

const SocialIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ImmersiveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const ScaryIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.21 13.89L7 23l2.5-1.5L12 23l2.5-1.5L17 23l-1.21-9.11"></path>
    <path d="M11 10h2"></path>
    <path d="M17.8 11.5c.7-1 1.2-2 1.2-3.5 0-2.8-2.2-5-5-5-.7 0-1.3.1-1.9.3C10.8 1.7 9.5 1 8 1 5.2 1 3 3.2 3 6c0 1.5.5 2.5 1.2 3.5"></path>
    <path d="M5 10h14"></path>
  </svg>
);

const FunnyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
);

const RetroIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const EducationalIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const CompetitiveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CasualIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"></path>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2Z"></path>
  </svg>
);