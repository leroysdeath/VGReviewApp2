import { supabase } from './supabase';
import { sanitizeStrict, sanitizeBasic, sanitizeURL } from '../utils/sanitize';

/**
 * Interface for standardized response
 */
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Interface for user profile data
 */
export interface UserProfile {
  id: number;
  provider_id: string;
  username: string;
  name: string;
  display_name?: string;
  email: string;
  bio?: string;
  location?: string;
  website?: string;
  platform?: string;
  picurl?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Interface for profile update data
 */
export interface ProfileUpdateData {
  username?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  platform?: string;
  avatar?: string; // Base64 data URL for new uploads
}

/**
 * Get database user ID from auth user
 * Maps auth.uid → user.provider_id → user.id for all database operations
 */
export const getCurrentAuthUser = async (): Promise<ServiceResponse<{ id: string; email?: string }>> => {
  try {
    console.log('🔍 Getting current auth user...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 Auth user result:', { user: user ? { id: user.id, email: user.email } : null, authError });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return { success: false, error: `Authentication error: ${authError.message}` };
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return { success: false, error: 'User not authenticated' };
    }

    return { 
      success: true, 
      data: { 
        id: user.id, 
        email: user.email || undefined 
      } 
    };
  } catch (error) {
    console.error('💥 Unexpected error in getCurrentAuthUser:', error);
    return { 
      success: false, 
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to get current user' 
    };
  }
};

/**
 * Get database user profile by provider_id (auth.uid)
 */
export const getUserProfile = async (providerId: string): Promise<ServiceResponse<UserProfile>> => {
  try {
    console.log('🔍 Getting user profile for provider_id:', providerId);
    
    // Validate that providerId is a UUID format
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!isValidUUID.test(providerId)) {
      console.error('❌ Invalid provider_id format - expected UUID, got:', providerId);
      console.error('⚠️ This likely means a database ID (integer) was passed instead of auth UUID');
      return { success: false, error: `Invalid provider ID format. Expected UUID but got: ${providerId}` };
    }

    const { data: dbUser, error } = await supabase
      .from('user')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    console.log('💾 Database user lookup result:', { dbUser, error });

    if (error) {
      console.error('❌ Error fetching database user profile:', error);
      
      if (error.code === 'PGRST116') {
        console.log('⚠️ User profile not found in database');
        return { success: false, error: 'User profile not found' };
      }
      
      return { success: false, error: `Database error: ${error.message}` };
    }

    if (!dbUser) {
      return { success: false, error: 'User profile not found' };
    }

    console.log('✅ Found user profile:', dbUser);
    return { success: true, data: dbUser as UserProfile };
  } catch (error) {
    console.error('💥 Unexpected error in getUserProfile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to get user profile' 
    };
  }
};

/**
 * Ensure user profile exists in database, create if missing (like ensureGameExists)
 */
export const ensureUserProfileExists = async (
  providerId: string,
  email?: string,
  defaultUsername?: string
): Promise<ServiceResponse<UserProfile>> => {
  try {
    console.log('🔍 Ensuring user profile exists for provider_id:', providerId);
    
    // Validate that providerId is a UUID format
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!isValidUUID.test(providerId)) {
      console.error('❌ Invalid provider_id format in ensureUserProfileExists - expected UUID, got:', providerId);
      return { success: false, error: `Invalid provider ID format. Expected UUID but got: ${providerId}` };
    }
    
    // Check if user profile already exists
    const existingProfileResult = await getUserProfile(providerId);
    
    if (existingProfileResult.success && existingProfileResult.data) {
      console.log('✅ User profile already exists:', existingProfileResult.data);
      return existingProfileResult;
    }

    console.log('📝 Profile not found - database trigger should have created it');
    console.log('⚠️ This might indicate the trigger failed or auth user doesn\'t exist');
    
    // Since we're using database-first approach, the trigger should have created the profile
    // If we're here, it means either:
    // 1. The user signed up before the trigger was added
    // 2. The trigger failed for some reason
    // 3. This is being called for a non-existent auth user
    
    // Let's try to create the profile manually as a fallback
    console.log('📝 Attempting manual profile creation as fallback...');

    // Generate unique username matching the database trigger logic
    // Use lowercase and split email at @ symbol
    let baseUsername = defaultUsername || email?.split('@')[0] || 'user';
    baseUsername = baseUsername.toLowerCase().replace(/\s+/g, '_'); // Replace spaces with underscores
    let generatedUsername = baseUsername;
    
    // Ensure username is unique by appending random numbers if necessary
    while (true) {
      const { data: existingUser } = await supabase
        .from('user')
        .select('id')
        .eq('username', generatedUsername)
        .maybeSingle();
      
      if (!existingUser) break;
      
      // Match the database trigger logic: append random number
      generatedUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
    }

    // Prepare user data for insertion with sanitization
    const userData = {
      provider_id: providerId,
      email: email || null,
      provider: 'supabase',
      username: sanitizeStrict(generatedUsername),
      name: sanitizeStrict(defaultUsername || email?.split('@')[0] || 'User'),
      display_name: '',
      bio: '',
      location: '',
      website: '',
      platform: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting new user profile with username:', generatedUsername);

    // Insert new user profile with conflict handling
    const { data: newUser, error: insertError } = await supabase
      .from('user')
      .insert(userData)
      .select('*')
      .single();

    console.log('💾 User profile insert result:', { newUser, insertError });

    if (insertError) {
      // Check if it's a duplicate key error
      if (insertError.code === '23505') {
        console.log('⚠️ Profile already exists (race condition), fetching it...');
        // Profile was created by another process, fetch it
        const retryResult = await getUserProfile(providerId);
        if (retryResult.success && retryResult.data) {
          return retryResult;
        }
      }
      console.error('❌ User profile insert error:', insertError);
      return { success: false, error: `Failed to create user profile: ${insertError.message} (Code: ${insertError.code})` };
    }

    console.log('✅ Successfully created user profile:', newUser);
    return { success: true, data: newUser as UserProfile };
  } catch (error) {
    console.error('💥 Unexpected error ensuring user profile exists:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', { name: error.name, message: error.message, stack: error.stack });
    }
    
    return {
      success: false,
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to ensure user profile exists'
    };
  }
};

/**
 * Handle avatar upload to Supabase Storage
 */
const handleAvatarUpload = async (providerId: string, avatarData: string): Promise<ServiceResponse<string>> => {
  try {
    console.log('🖼️ Handling avatar upload for provider_id:', providerId);
    console.log('🖼️ Avatar data length:', avatarData.length);
    
    // Convert data URL to blob
    const response = await fetch(avatarData);
    const blob = await response.blob();
    
    console.log('🖼️ Avatar blob created:', { type: blob.type, size: blob.size });
    
    // Validate image type and size
    if (!blob.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }
    
    if (blob.size > 2 * 1024 * 1024) { // 2MB limit
      return { success: false, error: 'Image must be smaller than 2MB' };
    }
    
    // Generate unique filename
    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `${providerId}-${Date.now()}.${fileExt}`;
    
    console.log('🖼️ Uploading avatar:', fileName, 'Size:', blob.size);
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('🔴 Avatar upload error:', uploadError);
      console.error('🔴 Upload error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error
      });
      return { success: false, error: `Avatar upload failed: ${uploadError.message}` };
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    console.log('🖼️ Avatar uploaded successfully:', publicUrl);
    return { success: true, data: publicUrl };
  } catch (error) {
    console.error('💥 Unexpected error in avatar upload:', error);
    return { 
      success: false, 
      error: error instanceof Error ? `Avatar upload error: ${error.message}` : 'Failed to upload avatar' 
    };
  }
};

/**
 * Update user profile with all profile updates including avatar uploads
 */
export const updateUserProfile = async (
  providerId: string,
  profileData: ProfileUpdateData
): Promise<ServiceResponse<UserProfile>> => {
  try {
    console.log('🔄 Updating user profile for provider_id:', providerId);
    console.log('📥 Profile data received:', {
      ...profileData,
      avatar: profileData.avatar ? `[${profileData.avatar.length} chars]` : undefined
    });
    
    // Validate that providerId is a UUID format
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!isValidUUID.test(providerId)) {
      console.error('❌ Invalid provider_id format in updateUserProfile - expected UUID, got:', providerId);
      return { success: false, error: `Invalid provider ID format. Expected UUID but got: ${providerId}` };
    }

    // Ensure user profile exists
    const userResult = await ensureUserProfileExists(providerId);
    if (!userResult.success) {
      return userResult;
    }

    console.log('✅ User profile exists, proceeding with update');

    // Prepare update data - only include changed fields
    const updateData: any = {};
    
    console.log('🔄 Starting field mapping (camelCase -> snake_case)...');
    
    // Map form fields to database columns with sanitization
    if ('username' in profileData) {
      // Sanitize username - strict mode (no HTML)
      const sanitizedUsername = sanitizeStrict(profileData.username);
      updateData.username = sanitizedUsername;
      updateData.name = sanitizedUsername; // Also update name field for backwards compatibility
      console.log('  ✅ username sanitized & mapped:', profileData.username, '-> username & name');
    }
    
    if ('displayName' in profileData) {
      // Sanitize display name - strict mode (no HTML)
      updateData.display_name = sanitizeStrict(profileData.displayName);
      console.log('  ✅ displayName sanitized & mapped:', profileData.displayName, '-> display_name');
    }
    
    if ('bio' in profileData) {
      // Sanitize bio - basic mode (allows basic formatting)
      updateData.bio = sanitizeBasic(profileData.bio);
      console.log('  ✅ bio sanitized & mapped:', profileData.bio, '-> bio');
    }
    
    if ('location' in profileData) {
      // Sanitize location - basic mode
      updateData.location = sanitizeBasic(profileData.location);
      console.log('  ✅ location sanitized & mapped:', profileData.location, '-> location');
    }
    
    if ('website' in profileData) {
      // Sanitize website - URL mode (validates and sanitizes URLs)
      updateData.website = sanitizeURL(profileData.website);
      console.log('  ✅ website sanitized & mapped:', profileData.website, '-> website');
    }
    
    if ('platform' in profileData) {
      // Sanitize platform - strict mode
      updateData.platform = sanitizeStrict(profileData.platform);
      console.log('  ✅ platform sanitized & mapped:', profileData.platform, '-> platform');
    }

    // Handle avatar upload if provided
    if (profileData.avatar && profileData.avatar.startsWith('data:')) {
      console.log('🖼️ Avatar upload detected');
      
      const avatarUploadResult = await handleAvatarUpload(providerId, profileData.avatar);
      
      if (!avatarUploadResult.success) {
        return { success: false, error: avatarUploadResult.error };
      }
      
      updateData.picurl = avatarUploadResult.data;
      updateData.avatar_url = avatarUploadResult.data;
      console.log('🖼️ Avatar URLs added to updateData');
    }

    console.log('📋 Update data after field mapping:', updateData);
    console.log('📋 Update data keys:', Object.keys(updateData));

    // Don't proceed if no data to update
    if (Object.keys(updateData).length === 0) {
      console.log('⚠️ No changes to save - returning current profile');
      return userResult;
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    console.log('📤 Sending UPDATE to database with data:', updateData);

    // Update the user profile with better error handling
    const { data: updatedUser, error: updateError } = await supabase
      .from('user')
      .update(updateData)
      .eq('provider_id', providerId)
      .select('*')
      .maybeSingle(); // Use maybeSingle to handle missing records gracefully

    console.log('✅ UPDATE result:', { updatedUser, updateError });

    if (updateError) {
      console.error('🔴 Database operation failed:', updateError);
      console.error('🔴 Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      
      // Check if it's a "no rows" error and try to create the profile
      if (updateError.code === 'PGRST116') {
        console.log('⚠️ User profile not found, attempting to create it...');
        const createResult = await ensureUserProfileExists(providerId);
        if (createResult.success) {
          // Retry the update after creating the profile
          console.log('🔄 Retrying update after profile creation...');
          const { data: retryUpdate, error: retryError } = await supabase
            .from('user')
            .update(updateData)
            .eq('provider_id', providerId)
            .select('*')
            .single();
          
          if (retryError) {
            return { success: false, error: `Profile update failed after creation: ${retryError.message}` };
          }
          return { success: true, data: retryUpdate as UserProfile };
        }
        return { success: false, error: 'Profile not found and could not be created' };
      }
      
      return { success: false, error: `Profile update failed: ${updateError.message}` };
    }

    if (!updatedUser) {
      // Profile might not exist yet, try to ensure it exists
      console.log('⚠️ No data returned from update, checking if profile exists...');
      const ensureResult = await ensureUserProfileExists(providerId);
      if (!ensureResult.success) {
        return { success: false, error: 'Profile update failed - profile does not exist' };
      }
      // Retry the update
      const { data: retryUpdate, error: retryError } = await supabase
        .from('user')
        .update(updateData)
        .eq('provider_id', providerId)
        .select('*')
        .single();
      
      if (retryError || !retryUpdate) {
        return { success: false, error: 'Profile update failed after ensuring profile exists' };
      }
      return { success: true, data: retryUpdate as UserProfile };
    }

    console.log('✅ Profile updated successfully:', updatedUser);
    return { success: true, data: updatedUser as UserProfile };
  } catch (error) {
    console.error('💥 Unexpected error updating user profile:', error);
    
    // Enhanced error logging
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      console.error('🔴 Error analysis:', {
        name: errorObj.name,
        message: errorObj.message,
        code: errorObj.code,
        details: errorObj.details,
        hint: errorObj.hint,
        statusCode: errorObj.statusCode,
        error: errorObj.error
      });
      
      // Log Supabase specific error information
      if (errorObj.code) {
        console.error('🔴 Supabase error code:', errorObj.code);
        if (errorObj.code === 'PGRST116') {
          console.error('🔴 PGRST116: No rows found - this might indicate user record doesn\'t exist');
        } else if (errorObj.code.startsWith('PGRST')) {
          console.error('🔴 PostgREST error detected');
        } else if (errorObj.code.startsWith('23')) {
          console.error('🔴 Database constraint violation');
        }
      }
      
      // Log request details if available
      if (errorObj.details) {
        console.error('🔴 Additional error details:', errorObj.details);
      }
      
      // Log stack trace if available
      if (errorObj.stack) {
        console.error('🔴 Stack trace:', errorObj.stack);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to update profile due to unexpected error'
    };
  }
};

/**
 * Get user profile with auth check and ensure profile exists
 */
export const getCurrentUserProfile = async (): Promise<ServiceResponse<UserProfile>> => {
  try {
    console.log('🔍 Getting current user profile...');
    
    // Get authenticated user
    const authResult = await getCurrentAuthUser();
    if (!authResult.success || !authResult.data) {
      return { success: false, error: authResult.error || 'Authentication failed' };
    }

    const { id: providerId, email } = authResult.data;
    
    // Ensure profile exists and get it
    const profileResult = await ensureUserProfileExists(providerId, email);
    
    return profileResult;
  } catch (error) {
    console.error('💥 Unexpected error getting current user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? `Unexpected error: ${error.message}` : 'Failed to get current user profile'
    };
  }
};