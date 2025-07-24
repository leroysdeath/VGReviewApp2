import React from 'react';
import { Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Settings className="h-24 w-24 text-gray-400 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Site in Progress</h1>
        <p className="text-gray-400 text-lg">Settings page is coming soon...</p>
      </div>
    </div>
  );
};

export default SettingsPage;
