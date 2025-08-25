import React, { useEffect, useState, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { UserSettingsPanel } from './UserSettingsPanel';
import { getUserProfile, ProfileUpdateData } from '../../services/profileService';
import { mapDatabaseUserToForm } from '../../utils/userFieldMapping';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userData?: {
    username: string;
    displayName?: string;
    email: string;
    bio?: string;
    location?: string;
    website?: string;
    platform?: string; 
    avatar?: string;
  };
  onSave?: (data: ProfileUpdateData) => Promise<void>;
}

const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ 
  isOpen, 
  onClose,
  userId,
  userData: propUserData,
  onSave 
}) => {
  // Debug props at component start
  console.log('🚨 UserSettingsModal props received:', { 
    isOpen, 
    hasOnClose: !!onClose, 
    userId, 
    hasOnSave: !!onSave, 
    onSaveType: typeof onSave,
    onSaveFunction: onSave 
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Use fetched user data or provided user data as fallback
  const currentUserData = userData || propUserData || {
    username: '',
    displayName: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    platform: '',
    avatar: ''
  };

  console.log('🔄 Using user data for modal:', currentUserData);
  // Fetch user data when modal opens - force refresh every time
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isOpen) {
        // Reset loading state when modal is closed
        setIsLoading(true);
        return;
      }
      
      if (isOpen && userId) {
        // Validate userId is present and valid
        if (!userId || userId === '') {
          console.error('❌ No user ID available for settings modal');
          console.error('⚠️ Modal will close due to missing user ID');
          onClose();
          return;
        }
        
        // Force fresh data fetch every time modal opens
        console.log('🔄 Modal opened - forcing fresh data fetch');
        setIsLoading(true);
        try {
          console.log('🟢 UserSettingsModal - fetchUserData called');
          console.log('👤 Fetching user data for userId:', userId);
          
          const response = await getUserProfile(userId);
          const data = response.success ? response.data : null;
          const error = response.success ? null : new Error(response.error || 'Failed to load profile');

          console.log('💾 Profile service response:', { data, error });
          console.log('🔍 Error details:', error ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          } : 'No error');

          if (error) {
            console.error('🔴 Error fetching user data:', error);
            console.log('⚠️ Setting default user data due to error');
            // Set default data if user not found using utility
            const defaultData = mapDatabaseUserToForm(null);
            console.log('📋 Default user data set:', defaultData);
            setUserData(defaultData);
          } else {
            console.log('✅ Successfully fetched user data from database');
            console.log('📥 Raw user data received:', data);
            console.log('🔍 Field analysis:');
            console.log('  📝 username field:', data.username);
            console.log('  📝 name field:', data.name);
            console.log('  📝 display_name field:', data.display_name);
            console.log('  📝 bio field:', data.bio);
            console.log('  📝 location field:', data.location);
            console.log('  📝 website field:', data.website);
            console.log('  📝 platform field:', data.platform);
            console.log('  📝 avatar_url field:', data.avatar_url);
            console.log('  📝 avatar_url field (standard):', data.avatar_url);
            console.log('  📧 email field:', data.email);
            
            console.log('🔄 Using standardized field mapping utility...');
            const processedUserData = mapDatabaseUserToForm(data);
            
            console.log('📤 Processed user data (for UserSettingsPanel):', processedUserData);
            
            setUserData(processedUserData);
            console.log('🎯 UserData state updated with processed data');
          }
        } catch (error) {
          console.error('💥 Unexpected error in fetchUserData:', error);
          console.error('🔴 Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
          });
          
          console.log('⚠️ Setting default user data due to catch block');
          // Set default data on error using utility
          const errorDefaultData = mapDatabaseUserToForm(null);
          console.log('📋 Error default data set:', errorDefaultData);
          setUserData(errorDefaultData);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();
  }, [isOpen, userId, refreshCounter]); // Re-fetch every time modal opens or refresh is triggered
  
  // Force refresh when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 Modal opened - incrementing refresh counter to force data fetch');
      setRefreshCounter(prev => prev + 1);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  // Handle close button click
  const handleCloseClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        } else if (hasUnsavedChanges) {
          setShowConfirmDialog(true);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, hasUnsavedChanges, showConfirmDialog]);

  // Handle form changes
  const handleFormChange = (isDirty: boolean) => {
    setHasUnsavedChanges(isDirty);
  };

  // Handle successful save
  const handleSuccess = () => {
    setHasUnsavedChanges(false);
    onClose();
  };

  // Handle confirm close without saving
  const handleConfirmClose = () => {
    setHasUnsavedChanges(false);
    setShowConfirmDialog(false);
    onClose();
  };

  // Handle cancel close
  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  // Validate that we have required props before rendering
  if (!isOpen) return null;
  
  if (!userId || userId === '') {
    console.error('❌ UserSettingsModal cannot render without a valid userId');
    return null;
  }

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          ref={modalContentRef}
          className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
            <button
              onClick={handleCloseClick}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                {console.log('UserSettingsModal props check:', {
                  hasOnSave: !!onSave,
                  onSaveType: typeof onSave,
                  userId: userId
                })}
                <UserSettingsPanel 
                key={`${userId}-loaded-${currentUserData?.username || 'empty'}`}
                userId={userId}
                initialData={currentUserData}
                onSave={onSave}
                onSuccess={handleSuccess}
                onFormChange={handleFormChange}
              />
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-[60] transition-opacity"
            onClick={handleCancelClose}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <div 
              className="bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-2xl pointer-events-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-2">Unsaved Changes</h3>
                  <p className="text-gray-300 mb-6">
                    You have unsaved changes. Are you sure you want to close without saving?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={handleCancelClose}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      No, keep editing
                    </button>
                    <button
                      onClick={handleConfirmClose}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Yes, discard changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default UserSettingsModal;
