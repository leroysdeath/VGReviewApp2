// src/services/avatarService.ts
import { supabase } from './supabase';

// Default avatar as base64 data URL (the gaming controller icon you provided)
export const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iNTAiIGZpbGw9IiM3QzNBRUQiLz4KPHN2ZyB4PSIyMCIgeT0iMjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEuNSI+CjxwYXRoIGQ9Im02IDE0IDMgNiAzLTZtLTItM2EzIDMgMCAxIDEgNiAwbS02IDBhMyAzIDAgMSAwIDYgMG0tNiAwaDZtMTIgMGwtMyA2LTMtNm0yLTNhMyAzIDAgMSAwLTYgMG02IDBhMyAzIDAgMSAxLTYgMG02IDBoLTZtLTIgM2gxMGEyIDIgMCAwIDEgMiAydjZhMiAyIDAgMCAxLTIgMkgyYTIgMiAwIDAgMS0yLTJWOWEyIDIgMCAwIDEgMi0yeiIvPgo8L3N2Zz4KPC9zdmc+';

export class AvatarService {
  private readonly BUCKET_NAME = 'avatars';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * Upload a profile picture to Supabase Storage
   */
  async uploadAvatar(file: File, userId: string): Promise<{ url: string | null; error: string | null }> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (validation.error) {
        return { url: null, error: validation.error };
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        return { url: null, error: error.message };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return { url: publicUrl, error: null };
    } catch (error) {
      console.error('Avatar upload error:', error);
      return { url: null, error: 'Failed to upload avatar' };
    }
  }

  /**
   * Delete an avatar from storage
   */
  async deleteAvatar(avatarUrl: string): Promise<{ error: string | null }> {
    try {
      // Extract filename from URL
      const fileName = this.extractFileNameFromUrl(avatarUrl);
      if (!fileName) {
        return { error: 'Invalid avatar URL' };
      }

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Avatar delete error:', error);
      return { error: 'Failed to delete avatar' };
    }
  }

  /**
   * Update user's avatar URL in the database
   */
  async updateUserAvatar(userId: string, avatarUrl: string): Promise<{ error: string | null }> {
    try {
      // Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });

      if (authError) {
        return { error: authError.message };
      }

      // Update user table
      const { error: dbError } = await supabase
        .from('user')
        .update({ picurl: avatarUrl })
        .eq('provider_id', userId);

      if (dbError) {
        return { error: dbError.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Update avatar error:', error);
      return { error: 'Failed to update avatar' };
    }
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: File): { error: string | null } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return { error: 'File size must be less than 5MB' };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }

    return { error: null };
  }

  /**
   * Extract filename from Supabase storage URL
   */
  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1];
    } catch {
      return null;
    }
  }

  /**
   * Resize image before upload (optional optimization)
   */
  async resizeImage(file: File, maxWidth: number = 300, maxHeight: number = 300): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Resize
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert back to file
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        }, file.type, 0.9);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create avatar initials fallback
   */
  generateInitialsAvatar(name: string): string {
    const initials = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');

    // Generate a simple SVG with initials
    const svg = `
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="50" fill="#7C3AED"/>
        <text x="50" y="50" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">
          ${initials}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Get user's current avatar or default
   */
  getUserAvatar(user: any): string {
    if (user?.avatar) return user.avatar;
    if (user?.picurl) return user.picurl;
    if (user?.name) return this.generateInitialsAvatar(user.name);
    return DEFAULT_AVATAR;
  }
}

export const avatarService = new AvatarService();
