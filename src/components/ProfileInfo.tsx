import React, { useState, useRef } from 'react';
import { Settings, ExternalLink, Camera, Edit2, Save, X, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ProfileInfoProps {
  user: {
    id: string;
    username: string;
    avatar: string;
    bio: string;
    joinDate?: string;
    location?: string;
    website?: string;
  };
  isCurrentUser?: boolean;
  onProfileUpdate?: (updates: { username?: string; bio?: string; avatar?: string }) => void;
  isDummy?: boolean;
}

export const ProfileInfo: React.FC<ProfileInfoProps> = ({ 
  user, 
  isCurrentUser = false, 
  onProfileUpdate,
  isDummy = false 
}) => {
  const { updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Editable states
  const [editUsername, setEditUsername] = useState(user.username);
  const [editBio, setEditBio] = useState(user.bio);
  const [previewAvatar, setPreviewAvatar] = useState(user.avatar);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewAvatar(previewUrl);

      // In a real implementation, you would upload to Supabase Storage
      // For now, we'll use a placeholder URL
      const uploadedUrl = await uploadImageToSupabase(file);
      
      if (onProfileUpdate) {
        await onProfileUpdate({ avatar: uploadedUrl });
      }

      setPreviewAvatar(uploadedUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setPreviewAvatar(user.avatar);
    } finally {
      setIsUploading(false);
    }
  };

  // Placeholder function - implement with actual Supabase Storage
  const uploadImageToSupabase = async (file: File): Promise<string> => {
    // This would be your actual Supabase upload logic
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=300&t=${Date.now()}`);
      }, 2000);
    });
  };

  const handleSaveChanges = async () => {
    if (!onProfileUpdate) return;

    try {
      const updates: { username?: string; bio?: string; avatar?: string } = {};
      
      if (editUsername !== user.username) {
        updates.username = editUsername;
      }
      
      if (editBio !== user.bio) {
        updates.bio = editBio;
      }

      if (previewAvatar !== user.avatar) {
        updates.avatar = previewAvatar;
      }

      if (Object.keys(updates).length > 0) {
        await onProfileUpdate(updates);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setEditUsername(user.username);
    setEditBio(user.bio);
    setPreviewAvatar(user.avatar);
    setIsEditing(false);
  };

  return (
    <div className="flex items-start gap-6">
      {/* Profile Image */}
      <div className="relative flex-shrink-0 group">
        <img
          src={previewAvatar}
          alt={user.username}
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
        />
        
        {/* Image Upload Overlay - Only show for current user */}
        {isCurrentUser && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-white hover:text-gray-300 transition-colors"
              title="Change profile picture"
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              ) : (
                <Camera className="h-6 w-6" />
              )}
            </button>
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
      
      {/* Profile Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          {/* Username - Editable for current user */}
          {isEditing ? (
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="text-2xl font-bold text-white bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={30}
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">{user.username}</h1>
          )}
          
          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
            PATRON
          </span>
          
          {/* Edit/Save buttons - Only show for current user */}
          {isCurrentUser && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveChanges}
                    className="text-green-400 hover:text-green-300 transition-colors"
                    title="Save changes"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Edit profile"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          
          {/* Settings button - Only show for current user */}
          {isCurrentUser && (
            <button className="text-gray-400 hover:text-white">
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Bio - Editable for current user */}
        {isEditing ? (
          <textarea
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            placeholder="Write a bio about yourself..."
            className="w-full text-blue-400 text-sm bg-gray-700 border border-gray-600 rounded px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            maxLength={200}
          />
        ) : (
          <p className="text-blue-400 text-sm mb-3">
            {user.bio || (isCurrentUser ? "Click edit to add a bio about yourself!" : "No bio available")}
          </p>
        )}
        
        <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
          <span>🎮 platform 9¾</span>
          <span className="mx-2">🔗</span>
          {user.website ? (
            <a 
              href={user.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              {isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span>{isDummy ? 'dummytestuser.card.co' : 'gamevault.card.co'}</span>
          )}
        </div>
        
        {user.location && (
          <div className="text-gray-400 text-sm">
            📍 {user.location}
          </div>
        )}
        
        {user.joinDate && (
          <div className="text-gray-400 text-sm mt-1">
            📅 Joined {user.joinDate}
          </div>
        )}
      </div>
    </div>
  );
};
