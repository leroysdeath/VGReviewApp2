/**
 * Loading component for lazy-loaded routes
 * Provides visual feedback while route chunks are loading
 */

import React from 'react';

export const RouteLoader: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="w-12 h-12 bg-blue-500 rounded-full animate-ping"></div>
          <div className="w-12 h-12 bg-blue-500 rounded-full absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
};

// Smaller inline loader for modals and components
export const ComponentLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-400 text-xs">Loading...</p>
      </div>
    </div>
  );
};