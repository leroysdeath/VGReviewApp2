import React, { useState, useEffect } from 'react';
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

// Create schemas as functions to avoid initialization issues
const getProfileSchema = () => z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  displayName: z.string().optional(),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  location: z.string().max(50, 'Location must be 50 characters or less').optional(),
  website: z.string().url('Please enter a valid URL').or(z.string().length(0)).optional(),
  platform: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    reviews: z.boolean().optional(),
    mentions: z.boolean().optional(),
    followers: z.boolean().optional(),
    achievements: z.boolean().optional()
  }).optional()
});

// Dynamic validation schema based on changed fields
const getDynamicProfileSchema = (changedFields: Set<string>) => {
  const schema: any = {};
  
  if (changedFields.has('username')) {
    schema.username = z.string().min(3, 'Username must be at least 3 characters');
  } else {
    schema.username = z.string().optional();
  }
  
  if (changedFields.has('displayName')) {
    schema.displayName = z.string().optional();
  }
  
  if (changedFields.has('bio')) {
    schema.bio = z.string().max(160, 'Bio must be 160 characters or less').optional();
  }
  
  if (changedFields.has('location')) {
    schema.location = z.string().max(50, 'Location must be 50 characters or less').optional();
  }
  
  if (changedFields.has('website')) {
    schema.website = z.string().url('Please enter a valid URL').or(z.string().length(0)).optional();
  }
  
  if (changedFields.has('platform')) {
    schema.platform = z.string().optional();
  }
  
  if (changedFields.has('notifications')) {
    schema.notifications = z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      reviews: z.boolean().optional(),
      mentions: z.boolean().optional(),
      followers: z.boolean().optional(),
      achievements: z.boolean().optional()
    }).optional();
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

interface UserSettingsPanelProps {
  userId?: string;  // Add this for compatibility
  initialData?: {   // Make this optional
    username: string;
    displayName?: string;
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
  onSave?: (data: ProfileFormValues) => Promise<void>;
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
    displayName: '',
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
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.avatar || null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [originalValues, setOriginalValues] = useState<ProfileFormValues>({
    username: initialData.username,
    displayName: initialData.displayName || '',
    bio: initialData.bio || '',
    location: initialData.location || '',
    website: initialData.website || '',
    platform: initialData.platform || '', 
    notifications: initialData.notifications || {
      email: true,
      push: true,
      reviews: true,
      mentions: true,
      followers: true,
      achievements: true
    }
  });


  // Form setup with dynamic validation
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isDirty, isValid },
    reset,
    watch,
    clearErrors,
    trigger
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(getDynamicProfileSchema(changedFields)),
    defaultValues: originalValues,
    mode: 'onChange'
  });

  // Debug form initialization
  useEffect(() => {
    console.log('🟣 Form initialized with:');
    console.log('🟣 defaultValues (originalValues):', originalValues);
    console.log('🟣 errors object:', errors);
    console.log('🟣 isDirty:', isDirty);
    console.log('🟣 isValid:', isValid);
    console.log('🟣 errors is empty:', Object.keys(errors).length === 0);
  }, [originalValues, errors, isDirty, isValid]);

  // Reset form when initialData changes
  useEffect(() => {
    const newValues = {
      username: initialData.username,
      displayName: initialData.displayName || '',
      bio: initialData.bio || '',
      location: initialData.location || '',
      website: initialData.website || '',
      platform: initialData.platform || '', 
      notifications: initialData.notifications || {
        email: true,
        push: true,
        reviews: true,
        mentions: true,
        followers: true,
        achievements: true
      }
    };
    setOriginalValues(newValues);
    setChangedFields(new Set());
    reset(newValues);
  }, [initialData, reset]);

  // Watch all form values to track changes
  const watchedValues = watch();

  // Track field changes
  useEffect(() => {
    console.log('🟡 Checking for field changes...');
    console.log('🟡 Current watchedValues:', watchedValues);
    console.log('🟡 Original values:', originalValues);
    
    const newChangedFields = new Set<string>();
    
    // Compare current values with original values
    if (watchedValues.username !== originalValues.username) {
      newChangedFields.add('username');
      console.log('🟡 Username changed:', originalValues.username, '->', watchedValues.username);
    }
    if (watchedValues.displayName !== originalValues.displayName) {
      newChangedFields.add('displayName');
      console.log('🟡 DisplayName changed:', originalValues.displayName, '->', watchedValues.displayName);
    }
    if (watchedValues.bio !== originalValues.bio) {
      newChangedFields.add('bio');
      console.log('🟡 Bio changed:', originalValues.bio, '->', watchedValues.bio);
    }
    if (watchedValues.location !== originalValues.location) {
      newChangedFields.add('location');
      console.log('🟡 Location changed:', originalValues.location, '->', watchedValues.location);
    }
    if (watchedValues.website !== originalValues.website) {
      newChangedFields.add('website');
      console.log('🟡 Website changed:', originalValues.website, '->', watchedValues.website);
    }
    if (watchedValues.platform !== originalValues.platform) {
      newChangedFields.add('platform');
      console.log('🟡 Platform changed:', originalValues.platform, '->', watchedValues.platform);
    }
    
    // Check notifications changes
    const currentNotifications = watchedValues.notifications || {};
    const originalNotifications = originalValues.notifications || {};
    if (JSON.stringify(currentNotifications) !== JSON.stringify(originalNotifications)) {
      newChangedFields.add('notifications');
      console.log('🟡 Notifications changed:', originalNotifications, '->', currentNotifications);
    }

    console.log('🔥 Field change detection:', {
      username: { current: watchedValues.username, original: originalValues.username, changed: watchedValues.username !== originalValues.username },
      displayName: { current: watchedValues.displayName, original: originalValues.displayName, changed: watchedValues.displayName !== originalValues.displayName },
      bio: { current: watchedValues.bio, original: originalValues.bio, changed: watchedValues.bio !== originalValues.bio },
      totalChangedFields: newChangedFields.size
    });
    
    console.log('🟡 Changed fields result:', Array.from(newChangedFields));
    console.log('🟡 Previous changed fields:', Array.from(changedFields));

    // Update changed fields state if different
    if (newChangedFields.size !== changedFields.size || 
        ![...newChangedFields].every(field => changedFields.has(field))) {
      
      if (newChangedFields.size !== changedFields.size) {
        console.warn('🔴 FIELD COUNT CHANGING:', {
          oldSize: changedFields.size,
          newSize: newChangedFields.size,
          oldFields: Array.from(changedFields),
          newFields: Array.from(newChangedFields),
          allFormFields: ['username', 'displayName', 'bio', 'location', 'website', 'platform'],
          currentValues: {
            displayName: watchedValues.displayName,
            bio: watchedValues.bio,
            location: watchedValues.location,
            platform: watchedValues.platform
          }
        });
      }
      console.log('🟡 Updating changedFields state from', Array.from(changedFields), 'to', Array.from(newChangedFields));
      setChangedFields(newChangedFields);
    } else {
      console.log('🟡 No change in changedFields state needed');
    }
  }, [watchedValues, originalValues, changedFields]);

  // Re-trigger validation when changed fields change
  useEffect(() => {
    if (changedFields.size > 0) {
      trigger();
    }
  }, [changedFields, trigger]);

  // Notify parent of form dirty state changes
  useEffect(() => {
    onFormChange?.(isDirty);
  }, [isDirty, onFormChange]);

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

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newAvatarData = e.target?.result as string;
        setAvatarPreview(newAvatarData);
        
        // Mark avatar as changed if different from original
        const originalAvatar = originalValues.avatar || initialData.avatar;
        if (newAvatarData !== originalAvatar) {
          setChangedFields(prev => new Set([...prev, 'avatar']));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    alert(`Form submitted! Changed fields: ${Array.from(changedFields).join(', ')}\nData keys: ${Object.keys(data).join(', ')}`);
    console.log('🔵 UserSettingsPanel - onSubmit called');
    console.log('📋 Raw form data received:', data);
    console.log('🔄 Changed fields array:', Array.from(changedFields));
    console.log('📊 Original values:', originalValues);
    console.log('🖼️ Avatar preview:', avatarPreview);
    console.log('🖼️ Original avatar:', originalValues.avatar || initialData.avatar);
    
    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      console.log('🔍 onSave check:', { onSave, hasOnSave: !!onSave, onSaveType: typeof onSave });
      alert(`onSave check: hasOnSave=${!!onSave}, type=${typeof onSave}`);
      
      // Only submit changed fields
      const changedData: Partial<ProfileFormValues> = {};
      
      console.log('🔍 Processing changed fields...');
      changedFields.forEach(fieldName => {
        if (fieldName in data) {
          (changedData as any)[fieldName] = (data as any)[fieldName];
          console.log(`  ✅ Added ${fieldName}:`, (data as any)[fieldName]);
        } else {
          console.log(`  ❌ Field ${fieldName} not found in form data`);
        }
      });

      // Include avatar if it has changed
      if (avatarPreview && avatarPreview !== (originalValues.avatar || initialData.avatar)) {
        (changedData as any).avatar = avatarPreview;
        console.log('🖼️ Added changed avatar to submit data');
      }

      console.log('📤 Final data being passed to onSave:', changedData);
      console.log('📤 Data types:', Object.entries(changedData).map(([key, value]) => `${key}: ${typeof value}`));
      
      console.log('🚨 CRITICAL: About to call onSave with:', {
        changedData,
        changedDataKeys: Object.keys(changedData),
        changedDataJSON: JSON.stringify(changedData),
        changedFieldsBeforeSave: Array.from(changedFields)
      });
      
      try {
        alert('About to call onSave...');
        console.log('Data being sent to onSave:', changedData);
        alert(`Sending data to save: ${JSON.stringify(changedData)}`);
        
        if (onSave && typeof onSave === 'function') {
          const result = await onSave(changedData as ProfileFormValues);
          alert('onSave completed successfully');
          return result;
        } else {
          throw new Error('onSave function is not available');
        }
      } catch (error) {
        alert(`onSave ERROR: ${error?.message || error || 'Unknown error'}`);
        console.error('onSave error full details:', error);
        throw error;
      }
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onSuccess?.(); // Close modal on successful save
      }, 1500);

      // Update original values and reset changed fields tracking
      setOriginalValues(data);
      setChangedFields(new Set());
      
      // Reset form with new values as original values
      reset(data);
    } catch (error) {
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (data: any) => {
    setIsLoading(true);
    setSaveError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Password change data:', data);
      
      // Reset form
      passwordForm.reset();
      setShowPassword(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      setSaveError('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email change
  const handleEmailChange = async (data: any) => {
    setIsLoading(true);
    setSaveError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Email change data:', data);
      
      // Reset form
      emailForm.reset();
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      setSaveError('Failed to change email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
      {/* Tabs */}
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
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Notifications
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Success message */}
        {saveSuccess && (
          <div className="mb-6 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-start gap-3">
            <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">Changes saved successfully!</p>
          </div>
        )}

        {/* Error message */}
        {saveError && (
          <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{saveError}</p>
          </div>
        )}

        {/* Profile Settings */}
        {activeTab === 'profile' && (
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
                    {initialData.username.charAt(0).toUpperCase()}
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
                      disabled={isLoading}
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
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="username"
                  type="text"
                  {...register('username')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.username ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="GamerTag"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                Display Name (optional)
              </label>
              <input
                id="displayName"
                type="text"
                {...register('displayName')}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="Your public display name"
                disabled={isLoading}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-400">{errors.displayName.message}</p>
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
                disabled={isLoading}
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-400">{errors.bio.message}</p>
              )}
            </div>

            {/* Gaming Platform */}
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-300 mb-1">
                Gaming Platform (optional)
              </label>
              <div className="relative">
                <Gamepad2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="platform"
                  type="text"
                  {...register('platform')}
                  maxLength={50}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="PC, PlayStation, Xbox, etc."
                  disabled={isLoading}
                />
              </div>
              {errors.platform && (
                <p className="mt-1 text-sm text-red-400">{errors.platform.message}</p>
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
                  disabled={isLoading}
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
                  placeholder="https://yourwebsite.com"
                  disabled={isLoading}
                />
              </div>
              {errors.website && (
                <p className="mt-1 text-sm text-red-400">{errors.website.message}</p>
              )}
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || changedFields.size === 0}
                onClick={() => {
                  console.log('🔴 BUTTON CLICKED!');
                  console.log('🔴 Button state:', {
                    isLoading,
                    changedFieldsSize: changedFields.size,
                    changedFields: Array.from(changedFields),
                    errors,
                    isDirty,
                    isValid,
                    disabled: isLoading || changedFields.size === 0
                  });
                }}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {changedFields.size > 0 
                      ? `Save Changes (${changedFields.size} field${changedFields.size > 1 ? 's' : ''})`
                      : 'Save Changes'
                    }
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Account Settings */}
        {activeTab === 'account' && (
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
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
              <button
                type="button"
                onClick={onDeleteAccount}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h3 className="text-lg font-medium text-white mb-4">Notification Preferences</h3>
            
            <div className="space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Email Notifications</h4>
                  <p className="text-sm text-gray-400">Receive email updates about your account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.email')}
                    className="sr-only peer" 
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Push Notifications</h4>
                  <p className="text-sm text-gray-400">Receive notifications on your device</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.push')}
                    className="sr-only peer" 
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Review Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Review Notifications</h4>
                  <p className="text-sm text-gray-400">Get notified when someone comments on your reviews</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.reviews')}
                    className="sr-only peer" 
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Mentions */}
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Mentions</h4>
                  <p className="text-sm text-gray-400">Get notified when someone mentions you</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.mentions')}
                    className="sr-only peer" 
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* New Followers */}
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">New Followers</h4>
                  <p className="text-sm text-gray-400">Get notified when someone follows you</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.followers')}
                    className="sr-only peer" 
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Achievements */}
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Achievements</h4>
                  <p className="text-sm text-gray-400">Get notified when you earn achievements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.achievements')}
                    className="sr-only peer" 
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !isDirty}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
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
        )}
      </div>
    </div>
  );
};
