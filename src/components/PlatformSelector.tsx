import React, { useState, useEffect } from 'react';
import { Platform } from '../types/database';
import { databaseService } from '../services/databaseService';

interface PlatformSelectorProps {
  selectedPlatforms: number[];
  onPlatformChange: (platformIds: number[]) => void;
  multiple?: boolean;
  className?: string;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatforms,
  onPlatformChange,
  multiple = true,
  className = ''
}) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlatforms = async () => {
      setLoading(true);
      setError(null);
      try {
        const platformData = await databaseService.getPlatforms();
        setPlatforms(platformData);
      } catch (err) {
        setError('Failed to load platforms');
        console.error('Load platforms error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlatforms();
  }, []);

  const handlePlatformToggle = (platformId: number) => {
    if (multiple) {
      if (selectedPlatforms.includes(platformId)) {
        onPlatformChange(selectedPlatforms.filter(id => id !== platformId));
      } else {
        onPlatformChange([...selectedPlatforms, platformId]);
      }
    } else {
      onPlatformChange([platformId]);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-400 text-sm ${className}`}>
        Error loading platforms: {error}
      </div>
    );
  }

  if (multiple) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {platforms.map((platform) => (
            <label
              key={platform.id}
              className="flex items-center gap-2 p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform.id)}
                onChange={() => handlePlatformToggle(platform.id)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
              />
              <span className="text-white text-sm">{platform.name}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <select
      value={selectedPlatforms[0] || ''}
      onChange={(e) => onPlatformChange(e.target.value ? [parseInt(e.target.value)] : [])}
      className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 ${className}`}
    >
      <option value="">Select Platform</option>
      {platforms.map((platform) => (
        <option key={platform.id} value={platform.id}>
          {platform.name}
        </option>
      ))}
    </select>
  );
};