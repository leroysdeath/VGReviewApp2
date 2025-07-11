import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';
import { NotificationSettings } from '../components/NotificationSettings';

export const NotificationSettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Notification Settings | GameVault</title>
        <meta name="description" content="Manage your notification preferences" />
      </Helmet>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            to="/settings"
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          
          <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
          <p className="text-gray-400">
            Customize how and when you receive notifications
          </p>
        </div>
        
        <NotificationSettings />
      </div>
    </div>
  );
};