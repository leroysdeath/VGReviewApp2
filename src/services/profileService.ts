import { supabase } from './supabase';

export interface ProfileUpdateData {
  username?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
}

/**
 * Update user profile information
 */
export const updateUserProfile = async (
  userId: string, 
  updates: ProfileUpdateData
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Prepare database updates
    const dbUpdates: any = {};
    if (updates.username) dbUpdates.name = updates.username;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.avatar) dbUpdates.picurl = updates.avatar;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.website !== undefined) dbUpdates.website = updates.website;

    // Update user profile in database
    const { error } = await supabase
      .from('user')
      .update(dbUpdates)
      .eq('id', parseInt(userId));

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
};

/**
 * Upload image to Supabase Storage
 */
export const uploadProfileImage = async (
  file: File, 
  userId: string
): Promise<{ url: string | null; error?: string }> => {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { url: null, error: 'File must be an image' };
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return { url: null, error: 'Image must be less than 5MB' };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(filePath);

    return { url: publicUrl };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { url: null, error: 'Failed to upload image' };
  }
};

/**
 * Delete old profile image from storage
 */
export const deleteProfileImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `avatars/${fileName}`;

    // Delete from storage
    await supabase.storage
      .from('user-uploads')
      .remove([filePath]);
  } catch (error) {
    console.error('Error deleting old image:', error);
    // Don't throw error as this is not critical
  }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<{ user: any | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('user')
      .select(`
        id,
        name,
        bio,
        picurl,
        location,
        website,
        created_at,
        provider_id
      `)
      .eq('id', parseInt(userId))
      .single();

    if (error) {
      return { user: null, error: error.message };
    }

    return { user: data };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { user: null, error: 'Failed to get user profile' };
  }
};

/**
 * Search users by username
 */
export const searchUsers = async (
  query: string, 
  limit = 20
): Promise<{ users: any[]; error?: string }> => {
  try {
    if (!query.trim()) {
      return { users: [] };
    }

    const { data, error } = await supabase
      .from('user')
      .select(`
        id,
        name,
        bio,
        picurl,
        created_at
      `)
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (error) {
      return { users: [], error: error.message };
    }

    return { users: data || [] };
  } catch (error) {
    console.error('Error searching users:', error);
    return { users: [], error: 'Failed to search users' };
  }
};

/**
 * Check if username is available
 */
export const checkUsernameAvailability = async (
  username: string, 
  currentUserId?: string
): Promise<{ available: boolean; error?: string }> => {
  try {
    let query = supabase
      .from('user')
      .select('id')
      .eq('name', username);

    // Exclude current user if checking for update
    if (currentUserId) {
      query = query.neq('id', parseInt(currentUserId));
    }

    const { data, error } = await query.single();

    if (error && error.code === 'PGRST116') {
      // No rows found - username is available
      return { available: true };
    } else if (error) {
      return { available: false, error: error.message };
    }

    // Username is taken
    return { available: false };
  } catch (error) {
    console.error('Error checking username availability:', error);
    return { available: false, error: 'Failed to check username availability' };
  }
};
