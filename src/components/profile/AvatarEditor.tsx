// src/components/profile/AvatarEditor.tsx
import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, User, Loader2, AlertCircle, Check } from 'lucide-react';
import { avatarService } from '../../services/avatarService';
import { useAuth } from '../../hooks/useAuth';

interface AvatarEditorProps {
  currentAvatar?: string;
  onAvatarUpdate?: (newAvatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarEditor: React.FC<AvatarEditorProps> = ({
  currentAvatar,
  onAvatarUpdate,
  size = 'md',
  className = ''
}) => {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Size configurations
  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-xs', icon: 'h-4 w-4' },
    md: { container: 'w-24 h-24', text: 'text-sm', icon: 'h-5 w-5' },
    lg: { container: 'w-32 h-32', text: 'text-base', icon: 'h-6 w-6' }
  };

  const sizes = sizeClasses[size];

  // Get current avatar URL
  const avatarUrl = previewUrl || currentAvatar || avatarService.getUserAvatar(user);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  // Handle avatar upload
  const handleUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Resize image for optimization
      const resizedFile = await avatarService.resizeImage(file, 300, 300);

      // Upload to storage
      const uploadResult = await avatarService.uploadAvatar(resizedFile, user.id);
      
      if (uploadResult.error) {
        setUploadError(uploadResult.error);
        setPreviewUrl(null);
        return;
      }

      if (!uploadResult.url) {
        setUploadError('Failed to get upload URL');
        setPreviewUrl(null);
        return;
      }

      // Update user profile
      const updateResult = await avatarService.updateUserAvatar(user.id, uploadResult.url);
      
      if (updateResult.error) {
        setUploadError(updateResult.error);
        return;
      }

      // Update local user state
      await updateProfile({ avatar: uploadResult.url });

      // Notify parent component
      onAvatarUpdate?.(uploadResult.url);

      setUploadSuccess(true);
      setPreviewUrl(null);

      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);

    } catch (error) {
      console.error('Avatar upload error:', error);
      setUploadError('An unexpected error occurred');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle remove avatar
  const handleRemoveAvatar = async () => {
    if (!user || !currentAvatar) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Delete from storage (only if it's not the default)
      if (!currentAvatar.startsWith('data:')) {
        await avatarService.deleteAvatar(currentAvatar);
      }

      // Reset to default avatar
      const defaultAvatar = avatarService.generateInitialsAvatar(user.name);
      const updateResult = await avatarService.updateUserAvatar(user.id, defaultAvatar);
      
      if (updateResult.error) {
        setUploadError(updateResult.error);
        return;
      }

      // Update local state
      await updateProfile({ avatar: defaultAvatar });
      onAvatarUpdate?.(defaultAvatar);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);

    } catch (error) {
      console.error('Remove avatar error:', error);
      setUploadError('Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Avatar Display */}
      <div className={`relative ${sizes.container} rounded-full overflow-hidden bg-gray-700 group cursor-pointer`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.name || 'Profile picture'}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initials avatar on error
              const target = e.target as HTMLImageElement;
              target.src = avatarService.generateInitialsAvatar(user?.name || 'User');
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-purple-600">
            <User className={`${sizes.icon} text-white`} />
          </div>
        )}

        {/* Upload Overlay */}
        {!isUploading && (
          <div 
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            onClick={triggerFileInput}
          >
            <Camera className={`${sizes.icon} text-white`} />
          </div>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Loader2 className={`${sizes.icon} text-white animate-spin`} />
          </div>
        )}

        {/* Upload Progress Ring (optional enhancement) */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2 justify-center">
        <button
          onClick={triggerFileInput}
          disabled={isUploading}
          className={`flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-800 transition-colors ${sizes.text}`}
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>

        {currentAvatar && !currentAvatar.startsWith('data:') && (
          <button
            onClick={handleRemoveAvatar}
            disabled={isUploading}
            className={`flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-800 transition-colors ${sizes.text}`}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Status Messages */}
      {uploadError && (
        <div className="mt-2 p-2 bg-red-900/30 border border-red-800/50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className={`text-red-300 ${sizes.text}`}>{uploadError}</p>
        </div>
      )}

      {uploadSuccess && (
        <div className="mt-2 p-2 bg-green-900/30 border border-green-800/50 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
          <p className={`text-green-300 ${sizes.text}`}>Profile picture updated!</p>
        </div>
      )}

      {/* Upload Instructions */}
      <div className="mt-2 text-center">
        <p className={`text-gray-400 ${sizes.text}`}>
          Max 5MB • JPEG, PNG, WebP, GIF
        </p>
      </div>
    </div>
  );
};
