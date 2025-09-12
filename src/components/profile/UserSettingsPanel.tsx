import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  User, 
  Mail, 
  MapPin, 
  Link as LinkIcon, 
  Save, 
  Loader2, 
  AlertCircle,
  Gamepad2,
  Check,
  Image,
  Key,
  Eye,
  EyeOff,
  Bell,
  Shield,
  Trash2
} from 'lucide-react';
import { ProfileUpdateData, checkUsernameAvailability } from '../../services/profileService';
import { AccountDeletionSection } from './AccountDeletionSection';

// Create schemas as functions to avoid initialization issues
const getProfileSchema = () => z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(21, 'Username must be 21 characters or less')
    .transform(val => val.toLowerCase())
    .or(z.literal('')),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional().or(z.literal('')),
  location: z.string().max(50, 'Location must be 50 characters or less').optional().or(z.literal('')),
  website: z.string()
    .optional()
    .transform((val) => {
      // Handle empty or whitespace-only strings
      if (!val || val.trim() === '') {
        return '';
      }
      
      // Trim whitespace
      const trimmed = val.trim();
      
      // If it already has protocol, return as is
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      
      // Auto-prepend https:// for URLs without protocol
      return `https://${trimmed}`;
    })
    .refine((val) => {
      // Allow empty strings
      if (!val || val === '') {
        return true;
      }
      
      // Validate URL format
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, {
      message: 'Please enter a valid URL (e.g., example.com or https://example.com)'
    }),
  platform: z.string().optional().or(z.literal(''))
});

// Dynamic validation schema based on changed fields - only validates fields that have been modified
const getDynamicProfileSchema = (changedFields: Set<string>) => {
  const schema: any = {};
  
  // Always include all fields in schema, but only apply validation to changed fields
  
  if (changedFields.has('username')) {
    schema.username = z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(21, 'Username must be 21 characters or less')
      .transform(val => val.toLowerCase());
  } else {
    schema.username = z.string().optional().or(z.literal(''));
  }
  
  
  if (changedFields.has('bio')) {
    schema.bio = z.string().max(160, 'Bio must be 160 characters or less').optional().or(z.literal(''));
  } else {
    schema.bio = z.string().optional().or(z.literal(''));
  }
  
  if (changedFields.has('location')) {
    schema.location = z.string().max(50, 'Location must be 50 characters or less').optional().or(z.literal(''));
  } else {
    schema.location = z.string().optional().or(z.literal(''));
  }
  
  if (changedFields.has('website')) {
    // Apply full website validation with transformation only if website field is being changed
    schema.website = z.string()
      .optional()
      .transform((val) => {
        // Handle empty or whitespace-only strings
        if (!val || val.trim() === '') {
          return '';
        }
        
        // Trim whitespace
        const trimmed = val.trim();
        
        // If it already has protocol, return as is
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          return trimmed;
        }
        
        // Auto-prepend https:// for URLs without protocol
        return `https://${trimmed}`;
      })
      .refine((val) => {
        // Allow empty strings
        if (!val || val === '') {
          return true;
        }
        
        // Validate URL format
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      }, {
        message: 'Please enter a valid URL (e.g., example.com or https://example.com)'
      });
  } else {
    // If website field is not changed, accept any value without validation
    schema.website = z.string().optional().or(z.literal(''));
  }
  
  if (changedFields.has('platform')) {
    schema.platform = z.string().optional().or(z.literal(''));
  } else {
    schema.platform = z.string().optional().or(z.literal(''));
  }
  
  return z.object(schema);
};

const getPasswordSchema = () => z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

const getEmailSchema = () => z.object({
  newEmail: z.string().email('Please enter a valid email address'),
  confirmEmail: z.string().min(1, 'Please confirm your email')
}).refine(data => data.newEmail === data.confirmEmail, {
  message: "Email addresses don't match",
  path: ["confirmEmail"]
});

type ProfileFormValues = z.infer<ReturnType<typeof getProfileSchema>>;

// Move platform options outside component to prevent re-creation on every render
const PLATFORM_OPTIONS = ['Nintendo', 'PlayStation', 'Xbox', 'PC', 'Retro'];

interface UserSettingsPanelProps {
  userId?: string;  // Add this for compatibility
  initialData?: {   // Make this optional
    username: string;
    email: string;
    bio?: string;
    location?: string;
    website?: string;
    platform?: string; 
    avatar?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      reviews: boolean;
      mentions: boolean;
      followers: boolean;
      achievements: boolean;
    };
  };
  onSave?: (data: ProfileUpdateData) => Promise<void>;
  onPasswordChange?: () => void;
  onDeleteAccount?: () => void;
  className?: string;
  onSuccess?: () => void;  // Add this line
  onFormChange?: (isDirty: boolean) => void; // Add this line
}

export const UserSettingsPanel: React.FC<UserSettingsPanelProps> = ({
  userId,
  initialData = {    // Provide default values
    username: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    platform: '',
    avatar: ''
  },
  onSave,
  onPasswordChange,
  onDeleteAccount,
  className = '',
  onSuccess,
  onFormChange
}) => {
  // Debug props at component level
  console.log('🟦 UserSettingsPanel component rendered with onSave:', {
    hasOnSave: !!onSave,
    onSaveType: typeof onSave,
    onSaveFunction: onSave
  });
  
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.avatar || null);
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });
  const [originalValues, setOriginalValues] = useState<ProfileFormValues & { avatar?: string }>({
    username: initialData.username,
    bio: initialData.bio || '',
    location: initialData.location || '',
    website: initialData.website || '',
    platform: initialData.platform || '',
    avatar: initialData.avatar || ''
  });
  
  // Parse initial platform string into selected platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(() => {
    const platforms = new Set<string>();
    if (initialData.platform) {
      initialData.platform.split(',').forEach(p => {
        const trimmed = p.trim();
        if (PLATFORM_OPTIONS.includes(trimmed)) {
          platforms.add(trimmed);
        }
      });
    }
    return platforms;
  });


  // Form setup with standard validation (validate all fields)
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isDirty, isValid, dirtyFields },
    reset,
    watch,
    clearErrors,
    trigger,
    setValue,
    getValues
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(getProfileSchema()),
    defaultValues: originalValues,
    mode: 'onBlur'
  });

  // Debug form initialization
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Validation errors:', errors);
    }
  }, [errors]);

  // Reset form when initialData changes - use a ref to track if we should reset
  const initialDataRef = useRef(initialData);
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    const newValues = {
      username: initialData.username,
        bio: initialData.bio || '',
      location: initialData.location || '',
      website: initialData.website || '',
      platform: initialData.platform || '',
      avatar: initialData.avatar || ''
    };
    
    // Only reset on initial load or if data actually changed from outside
    const shouldReset = !hasInitialized.current || 
      (initialDataRef.current.username !== initialData.username ||
       initialDataRef.current.email !== initialData.email);
    
    if (shouldReset) {
      setOriginalValues(newValues);
      setAvatarPreview(initialData.avatar || null);
      
      // Reset selected platforms
      const platforms = new Set<string>();
      if (initialData.platform) {
        initialData.platform.split(',').forEach(p => {
          const trimmed = p.trim();
          if (PLATFORM_OPTIONS.includes(trimmed)) {
            platforms.add(trimmed);
          }
        });
      }
      setSelectedPlatforms(platforms);
      
      // Reset form with only the form fields (exclude avatar)
      const { avatar, ...formValues } = newValues;
      reset(formValues);
      hasInitialized.current = true;
      initialDataRef.current = initialData;
    }
  }, [initialData, reset]);

  // Watch all form values to track changes
  const watchedValues = watch();
  const watchedUsername = watch('username');

  // Username validation with debouncing
  useEffect(() => {
    const checkUsername = async () => {
      if (!watchedUsername || watchedUsername === originalValues.username) {
        setUsernameStatus({ checking: false, available: null, message: '' });
        return;
      }

      if (watchedUsername.length < 3) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Username must be at least 3 characters'
        });
        return;
      }

      setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' });

      try {
        const result = await checkUsernameAvailability(watchedUsername, userId);
        if (result.success && result.data) {
          setUsernameStatus({
            checking: false,
            available: result.data.available,
            message: result.data.message
          });
        }
      } catch (error) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Error checking username'
        });
      }
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [watchedUsername, originalValues.username, userId]);

  // Simple tracking for debugging
  useEffect(() => {
    console.log('Form state:', { isDirty, dirtyFields, errors });
  }, [isDirty, dirtyFields, errors]);


  // Notify parent of form dirty state changes (including avatar changes)
  useEffect(() => {
    const originalAvatar = originalValues.avatar || '';
    const currentAvatar = avatarPreview || '';
    const avatarHasChanged = currentAvatar !== originalAvatar;
    const hasAnyChanges = isDirty || avatarHasChanged;
    
    console.log('🔄 Form change notification check:', {
      isDirty,
      avatarHasChanged,
      hasAnyChanges,
      originalAvatar,
      currentAvatarPreview: avatarPreview
    });
    
    onFormChange?.(hasAnyChanges);
  }, [isDirty, avatarPreview, originalValues.avatar, onFormChange]);

  // Password change form
  const passwordForm = useForm({
    resolver: zodResolver(getPasswordSchema()),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Email change form
  const emailForm = useForm({
    resolver: zodResolver(getEmailSchema()),
    defaultValues: {
      newEmail: '',
      confirmEmail: ''
    }
  });

  // Handle platform checkbox change
  const handlePlatformToggle = (platform: string) => {
    const newPlatforms = new Set(selectedPlatforms);
    if (newPlatforms.has(platform)) {
      newPlatforms.delete(platform);
    } else {
      newPlatforms.add(platform);
    }
    setSelectedPlatforms(newPlatforms);
    
    // Convert to comma-separated string and update form value
    const platformString = Array.from(newPlatforms).sort().join(',');
    setValue('platform', platformString, { shouldDirty: true, shouldValidate: true });
  };

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newAvatarData = e.target?.result as string;
        const originalAvatar = initialData.avatar || null;
        
        console.log('🖼️ Avatar change detected:', {
          hasNewData: !!newAvatarData,
          originalAvatar: originalAvatar,
          isChanged: newAvatarData !== originalAvatar,
          newDataLength: newAvatarData?.length || 0
        });
        
        setAvatarPreview(newAvatarData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    console.log('🔵 UserSettingsPanel - onSubmit called');
    console.log('📋 Form data:', data);
    console.log('📊 Dirty fields:', dirtyFields);
    
    setIsSubmitting(true);
    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Build the data to submit (only changed fields)
      const submitData: any = {};
      
      // Add dirty fields
      Object.keys(dirtyFields).forEach(fieldName => {
        if (fieldName in data) {
          submitData[fieldName] = (data as any)[fieldName];
        }
      });

      // Include avatar if it has changed
      if (avatarPreview && avatarPreview !== (originalValues.avatar || initialData.avatar)) {
        submitData.avatar = avatarPreview;
      }

      console.log('📤 Submitting data:', submitData);
      
      if (!onSave) {
        throw new Error('onSave function is not provided');
      }
      
      setIsUpdating(true);
      setSaveSuccess(false);
      
      await onSave(submitData as ProfileUpdateData);
      
      // Show updating message briefly
      setTimeout(() => {
        setIsUpdating(false);
        setShowSuccessMessage(true);
        
        // Show success message then close modal
        setTimeout(() => {
          setShowSuccessMessage(false);
          onSuccess?.();
        }, 2000);
      }, 500);

      // Update original values
      setOriginalValues(data);
      reset(data);
    } catch (error) {
      console.error('Save error:', error);
      setSaveError('Failed to save changes. Please try again.');
      setIsUpdating(false);
      setShowSuccessMessage(false);
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (data: any) => {
    setIsSubmitting(true);
    setIsLoading(true);
    setSaveError(null);
    
    try {
      console.log('🔐 Starting password change process...');
      
      // Import supabase here to avoid initialization issues
      const { supabase } = await import('../../services/supabase');
      
      // Verify current password by attempting to sign in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) {
        throw new Error('Current user not found');
      }
      
      // Verify current password by attempting to sign in with it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: data.currentPassword
      });
      
      if (signInError) {
        throw new Error('Current password is incorrect');
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });
      
      if (updateError) {
        console.error('🔴 Password update error:', updateError);
        throw new Error(updateError.message);
      }
      
      console.log('✅ Password updated successfully');
      
      // Reset form
      passwordForm.reset();
      setShowPassword(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('🔴 Password change error:', error);
      setSaveError(error.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  // Handle email change
  const handleEmailChange = async (data: any) => {
    setIsSubmitting(true);
    setIsLoading(true);
    setSaveError(null);
    
    try {
      console.log('📧 Starting email change process...');
      
      // Import supabase here to avoid initialization issues
      const { supabase } = await import('../../services/supabase');
      
      // Update email - this will send a verification email to the new address
      const { error: updateError } = await supabase.auth.updateUser({
        email: data.newEmail
      });
      
      if (updateError) {
        console.error('🔴 Email update error:', updateError);
        throw new Error(updateError.message);
      }
      
      console.log('✅ Email change initiated - verification email sent');
      
      // Reset form
      emailForm.reset();
      setSaveSuccess(true);
      setSaveError('Email change initiated! Please check your new email for a verification link.');
      
      // Clear messages after 5 seconds
      setTimeout(() => {
        setSaveSuccess(false);
        setSaveError(null);
      }, 5000);
    } catch (error: any) {
      console.error('🔴 Email change error:', error);
      setSaveError(error.message || 'Failed to change email. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Tabs - temporarily hidden */}
      {false && (
        <div className="border-b border-gray-700">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Profile
            </button>
            {/* Account tab temporarily hidden - will be restored later */}
            {false && (
              <button
                onClick={() => setActiveTab('account')}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'account'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Account
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Updating message */}
        {false && (
          <div className="mb-6 p-3 bg-blue-900/50 border border-blue-700 rounded-lg flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
            <p className="text-blue-300 text-sm">Updating your profile...</p>
          </div>
        )}

        {/* Success message */}
        {false && (
          <div className="mb-6 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-start gap-3">
            <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">Profile updated successfully!</p>
          </div>
        )}

        {/* Legacy success message (fallback) */}
        {false && !false && !false && (
          <div className="mb-6 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-start gap-3">
            <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">Changes saved successfully!</p>
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{submitError}</p>
          </div>
        )}

        {/* Save error message */}
        {saveError && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{saveError}</p>
          </div>
        )}

        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <div className="relative">
            {/* Loading overlay */}
            {isSubmitting && (
              <div className="absolute inset-0 bg-gray-900/75 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <p className="text-white font-medium">Saving changes...</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {(initialData.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <label className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer inline-flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    <span>Change Picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={isSubmitting}
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Automatically converted to lowercase • 3-21 characters
              </p>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="username"
                  type="text"
                  {...register('username', {
                    onChange: (e) => {
                      e.target.value = e.target.value.toLowerCase();
                    }
                  })}
                  className={`w-full pl-10 pr-16 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.username || (usernameStatus.available === false && watchedUsername !== originalValues.username) 
                      ? 'border-red-500' 
                      : usernameStatus.available === true 
                        ? 'border-green-500' 
                        : 'border-gray-600'
                  }`}
                  placeholder="GamerTag"
                  autoComplete="off"
                  disabled={isSubmitting}
                  maxLength={21}
                />
                {/* Character counter */}
                <span className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                  {watch('username')?.length || 0}/21
                </span>
                {/* Username status indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {usernameStatus.checking && (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  )}
                  {!usernameStatus.checking && usernameStatus.available === true && watchedUsername !== originalValues.username && (
                    <Check className="h-5 w-5 text-green-400" />
                  )}
                  {!usernameStatus.checking && usernameStatus.available === false && watchedUsername !== originalValues.username && (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
              {!errors.username && usernameStatus.message && watchedUsername !== originalValues.username && (
                <p className={`mt-1 text-sm ${
                  usernameStatus.available === true 
                    ? 'text-green-400' 
                    : usernameStatus.available === false 
                      ? 'text-red-400' 
                      : 'text-gray-400'
                }`}>
                  {usernameStatus.message}
                </p>
              )}
            </div>



            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300">
                  Bio (optional)
                </label>
                <span className="text-xs text-gray-400">
                  {watch('bio')?.length || 0}/160
                </span>
              </div>
              <textarea
                id="bio"
                {...register('bio')}
                rows={3}
                className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                  errors.bio ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Tell us about yourself"
                disabled={isSubmitting}
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-400">{errors.bio.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
                Location (optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="location"
                  type="text"
                  {...register('location')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="City, Country"
                  disabled={isSubmitting}
                />
              </div>
              {errors.location && (
                <p className="mt-1 text-sm text-red-400">{errors.location.message}</p>
              )}
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-1">
                Website (optional)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="website"
                  type="text"
                  {...register('website')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.website ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="example.com or https://example.com"
                  disabled={isSubmitting}
                />
              </div>
              {errors.website && (
                <p className="mt-1 text-sm text-red-400">{errors.website.message}</p>
              )}
            </div>

            {/* Submit button and messages */}
            <div className="flex items-center justify-end gap-4">
              {/* Validation messages - now on the left */}
              <div className="flex-1 text-right">
                {Object.keys(errors).length > 0 && (
                  <p className="text-sm text-red-400">
                    Please fix the validation errors above before saving.
                  </p>
                )}
                
                {usernameStatus.available === false && watchedUsername !== originalValues.username && (
                  <p className="text-sm text-red-400">
                    Username is not available. Please choose a different one.
                  </p>
                )}
                
                {usernameStatus.checking && (
                  <p className="text-sm text-gray-400">
                    Checking username availability...
                  </p>
                )}
              </div>

              {/* Submit button - now on the right */}
              <button
                type="submit"
                disabled={
                  isSubmitting || 
                  (!isDirty && avatarPreview === (originalValues.avatar || initialData.avatar)) || 
                  Object.keys(errors).length > 0 ||
                  (usernameStatus.available === false && watchedUsername !== originalValues.username) ||
                  usernameStatus.checking
                }
                onClick={() => {
                  console.log('🔴 BUTTON CLICKED!');
                  console.log('🔴 Button state:', {
                    isSubmitting,
                    isDirty,
                    dirtyFields,
                    avatarChanged: avatarPreview !== (originalValues.avatar || initialData.avatar),
                    errors,
                    isValid,
                    hasErrors: Object.keys(errors).length > 0,
                    usernameStatus,
                    disabled: isSubmitting || (!isDirty && avatarPreview === (originalValues.avatar || initialData.avatar)) || Object.keys(errors).length > 0 || (usernameStatus.available === false && watchedUsername !== originalValues.username) || usernameStatus.checking
                  });
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 ${
                  isSubmitting 
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        )}

        {/* Account Settings - temporarily hidden */}
        {false && activeTab === 'account' && (
          <div className="space-y-8">
            {/* Password Change */}
            <div className="bg-gray-750 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      {...passwordForm.register('currentPassword')}
                      className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                        passwordForm.formState.errors.currentPassword ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      {...passwordForm.register('newPassword')}
                      className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                        passwordForm.formState.errors.newPassword ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      {...passwordForm.register('confirmPassword')}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                        passwordForm.formState.errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Email Change */}
            <div className="bg-gray-750 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Change Email</h3>

              <form onSubmit={emailForm.handleSubmit(handleEmailChange)} className="space-y-4">
                {/* New Email */}
                <div>
                  <label htmlFor="newEmail" className="block text-sm font-medium text-gray-300 mb-1">
                    New Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="newEmail"
                      type="email"
                      {...emailForm.register('newEmail')}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                        emailForm.formState.errors.newEmail ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="your.new@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {emailForm.formState.errors.newEmail && (
                    <p className="mt-1 text-sm text-red-400">{emailForm.formState.errors.newEmail.message}</p>
                  )}
                </div>

                {/* Confirm New Email */}
                <div>
                  <label htmlFor="confirmEmail" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="confirmEmail"
                      type="email"
                      {...emailForm.register('confirmEmail')}
                      className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                        emailForm.formState.errors.confirmEmail ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="your.new@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {emailForm.formState.errors.confirmEmail && (
                    <p className="mt-1 text-sm text-red-400">{emailForm.formState.errors.confirmEmail.message}</p>
                  )}
                </div>

                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Email'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-900/20 rounded-lg p-6 border border-red-800/50">
              <h3 className="text-lg font-medium text-white mb-4">Danger Zone</h3>
              <p className="text-gray-300 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <AccountDeletionSection 
                userId={userId}
                onDeleteAccount={onDeleteAccount}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
