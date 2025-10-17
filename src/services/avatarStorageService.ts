/**
 * Avatar Storage Service
 * Handles avatar uploads to Supabase Storage instead of Base64 in database
 */

import { supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max

/**
 * Initialize the avatars storage bucket if it doesn't exist
 * Note: This requires Storage Admin permissions - typically done via Supabase Dashboard
 */
export async function initAvatarBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return { error: listError };
    }

    const bucketExists = buckets?.some(bucket => bucket.name === AVATAR_BUCKET);

    if (!bucketExists) {
      // Create bucket with public access for avatars
      const { data, error } = await supabase.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      });

      if (error) {
        console.error('Error creating avatar bucket:', error);
        return { error };
      }

      console.log('Avatar bucket created successfully');
      return { data };
    }

    return { data: 'Bucket already exists' };
  } catch (error) {
    console.error('Error in initAvatarBucket:', error);
    return { error };
  }
}

/**
 * Upload an avatar image to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user's ID for unique filename
 * @returns The public URL of the uploaded avatar or error
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<{ url?: string; error?: string }> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { error: 'File must be an image' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { error: 'Image must be smaller than 2MB' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Delete old avatars for this user first (cleanup)
    await deleteUserAvatars(userId);

    // Upload new avatar
    const { data, error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return { error: uploadError.message || 'Failed to upload avatar' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);

    return { url: publicUrl };
  } catch (error) {
    console.error('Upload avatar error:', error);
    return { error: 'Failed to upload avatar' };
  }
}

/**
 * Delete all avatars for a specific user (cleanup old ones)
 * @param userId - The user's ID
 */
async function deleteUserAvatars(userId: string) {
  try {
    // List all files in user's folder
    const { data: files, error: listError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId);

    if (listError) {
      console.error('Error listing user avatars:', listError);
      return;
    }

    // Delete each file
    if (files && files.length > 0) {
      const filePaths = files.map(file => `${userId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting old avatars:', deleteError);
      }
    }
  } catch (error) {
    console.error('Delete user avatars error:', error);
  }
}

/**
 * Convert a Base64 data URL to a File object for upload
 * @param dataUrl - The Base64 data URL
 * @param filename - The desired filename
 * @returns A File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * Migrate a Base64 avatar to Supabase Storage
 * @param base64Avatar - The Base64 data URL
 * @param userId - The user's ID
 * @returns The new public URL or error
 */
export async function migrateBase64Avatar(
  base64Avatar: string,
  userId: string
): Promise<{ url?: string; error?: string }> {
  try {
    // Convert Base64 to File
    const file = dataUrlToFile(base64Avatar, `avatar-${userId}.jpg`);

    // Upload to storage
    return await uploadAvatar(file, userId);
  } catch (error) {
    console.error('Migrate avatar error:', error);
    return { error: 'Failed to migrate avatar' };
  }
}

/**
 * Check if an avatar URL is a Base64 data URL that needs migration
 * @param avatarUrl - The avatar URL to check
 * @returns true if it's a Base64 data URL
 */
export function needsMigration(avatarUrl: string | null | undefined): boolean {
  if (!avatarUrl) return false;
  return avatarUrl.startsWith('data:image');
}