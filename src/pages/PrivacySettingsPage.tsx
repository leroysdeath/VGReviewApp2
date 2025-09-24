/**
 * Privacy Settings Page
 * Dedicated page for user privacy controls and data management
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EnhancedPrivacySettings } from '../components/privacy/EnhancedPrivacySettings';
import { useAuth } from '../hooks/useAuth';

export const PrivacySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  // Parse userId or use current user
  const targetUserId = userId ? parseInt(userId, 10) : user?.databaseId;
  
  // Check if user can access these settings
  const canAccessSettings = user && (
    !userId || // No specific user in URL (current user settings)
    parseInt(userId, 10) === user.databaseId // Accessing own settings
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to access privacy settings.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!canAccessSettings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You can only access your own privacy settings.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go to Your Profile
          </button>
        </div>
      </div>
    );
  }

  if (!targetUserId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invalid User</h2>
          <p className="text-gray-600 mb-6">
            Unable to load privacy settings for this user.
          </p>
          <button
            onClick={() => navigate('/profile')}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go to Your Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {user.email}
              </span>
              <button
                onClick={() => navigate('/profile')}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EnhancedPrivacySettings 
          userId={targetUserId}
          className="mb-8"
        />
        
        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900">Privacy Questions</h4>
              <p>
                For questions about how we handle your data, see our{' '}
                <button
                  onClick={() => navigate('/privacy')}
                  className="text-purple-600 hover:text-purple-700 underline"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Data Export Issues</h4>
              <p>
                If you're having trouble exporting your data, try using a different browser 
                or contact support for assistance.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900">Account Deletion</h4>
              <p>
                To delete your entire account, please contact support. Note that this is 
                different from the data deletion options above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};