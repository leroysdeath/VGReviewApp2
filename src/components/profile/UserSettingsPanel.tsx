import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usernameService } from '../../services/usernameService';
import { emailService } from '../../services/emailService';
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
  Trash2,
  Shield,
  ShieldCheck
} from 'lucide-react';

// Form validation schema
const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
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

// Email change validation schema
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;

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
  const [usernameValidation, setUsernameValidation] = useState<{
    isValid: boolean;
    error?: string;
    isChecking: boolean;
    changesRemaining: number;
  }>({
    isValid: true,
    isChecking: false,
    changesRemaining: 3
  });

  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    error?: string;
    isChecking: boolean;
    needsVerification?: boolean;
  }>({
    isValid: true,
    isChecking: false
  });

  const [emailVerificationStatus, setEmailVerificationStatus] = useState<{
    isVerified: boolean;
    isChecking: boolean;
    email: string;
  }>({
    isVerified: true,
    isChecking: false,
    email: initialData.email
  });

  // Form setup
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initialData.username,
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
    }
  });

  // Email form setup
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: initialData.email
    }
  });

  // Notify parent of form dirty state changes
  useEffect(() => {
    onFormChange?.(isDirty);
  }, [isDirty, onFormChange]);

  // Load initial username changes remaining
  useEffect(() => {
    if (userId) {
      loadUsernameChangesRemaining();
      loadEmailVerificationStatus();
    }
  }, [userId]);

  const loadUsernameChangesRemaining = async () => {
    if (!userId) return;
    try {
      const remaining = await usernameService.getRemainingChanges(parseInt(userId));
      setUsernameValidation(prev => ({ ...prev, changesRemaining: remaining }));
    } catch (error) {
      console.error('Error loading username changes remaining:', error);
    }
  };

  const loadEmailVerificationStatus = async () => {
    if (!userId) return;
    try {
      setEmailVerificationStatus(prev => ({ ...prev, isChecking: true }));
      const status = await emailService.getEmailVerificationStatus(parseInt(userId));
      setEmailVerificationStatus({
        isVerified: status.isVerified,
        isChecking: false,
        email: status.email
      });
    } catch (error) {
      console.error('Error loading email verification status:', error);
      setEmailVerificationStatus(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Debounced username validation
  useEffect(() => {
    const currentUsername = watch('username');
    if (!currentUsername || currentUsername === initialData.username || !userId) {
      setUsernameValidation(prev => ({ ...prev, isValid: true, error: undefined }));
      return;
    }

    const timeoutId = setTimeout(async () => {
      setUsernameValidation(prev => ({ ...prev, isChecking: true }));
      try {
        const validation = await usernameService.validateUsername(currentUsername, parseInt(userId));
        setUsernameValidation({
          isValid: validation.isValid,
          error: validation.error,
          isChecking: false,
          changesRemaining: validation.changesRemaining
        });
      } catch (error) {
        setUsernameValidation({
          isValid: false,
          error: 'Error validating username',
          isChecking: false,
          changesRemaining: 0
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [watch('username'), initialData.username, userId]);

  // Debounced email validation
  useEffect(() => {
    const currentEmail = emailForm.watch('email');
    if (!currentEmail || currentEmail === initialData.email || !userId) {
      setEmailValidation(prev => ({ ...prev, isValid: true, error: undefined }));
      return;
    }

    const timeoutId = setTimeout(async () => {
      setEmailValidation(prev => ({ ...prev, isChecking: true }));
      try {
        const validation = await emailService.validateEmail(currentEmail, parseInt(userId));
        setEmailValidation({
          isValid: validation.isValid,
          error: validation.error,
          isChecking: false,
          needsVerification: validation.needsVerification
        });
      } catch (error) {
        setEmailValidation({
          isValid: false,
          error: 'Error validating email',
          isChecking: false
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [emailForm.watch('email'), initialData.email, userId]);

  // Password change form
  const passwordForm = useForm({
    resolver: zodResolver(
      z.object({
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
      })
    ),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Check if username is changing
      const isUsernameChanging = data.username !== initialData.username;
      
      if (isUsernameChanging && userId) {
        // Validate username change
        if (!usernameValidation.isValid) {
          setSaveError(usernameValidation.error || 'Username is not valid');
          return;
        }

        // Handle username change through the service
        const result = await usernameService.changeUsername(
          parseInt(userId),
          initialData.username,
          data.username
        );

        if (!result.success) {
          setSaveError(result.error || 'Failed to change username');
          return;
        }

        // Refresh changes remaining count
        await loadUsernameChangesRemaining();
      }

      if (onSave) {
        await onSave(data);
      }
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onSuccess?.(); // Close modal on successful save
      }, 1500);

      // Reset form with new values
      reset(data);
    } catch (error) {
      console.error('Save error:', error);
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
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <span className="text-xs text-gray-400">
                  {usernameValidation.changesRemaining} changes remaining today
                </span>
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="username"
                  type="text"
                  {...register('username')}
                  className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.username || (!usernameValidation.isValid && !usernameValidation.isChecking) 
                      ? 'border-red-500' 
                      : usernameValidation.isValid && watch('username') !== initialData.username
                      ? 'border-green-500'
                      : 'border-gray-600'
                  }`}
                  placeholder="GamerTag"
                  disabled={isLoading}
                />
                {/* Validation status indicator */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {usernameValidation.isChecking ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : watch('username') && watch('username') !== initialData.username ? (
                    usernameValidation.isValid ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    )
                  ) : null}
                </div>
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
              {!errors.username && usernameValidation.error && (
                <p className="mt-1 text-sm text-red-400">{usernameValidation.error}</p>
              )}
              {!errors.username && !usernameValidation.error && watch('username') && watch('username') !== initialData.username && usernameValidation.isValid && (
                <p className="mt-1 text-sm text-green-400">Username is available!</p>
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
                disabled={
                  isLoading || 
                  !isDirty || 
                  usernameValidation.isChecking ||
                  (watch('username') !== initialData.username && !usernameValidation.isValid)
                }
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

        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="space-y-8">
            {/* Email Change */}
            <div className="bg-gray-750 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Email Address</h3>
              <form onSubmit={emailForm.handleSubmit(async (data) => {
                setIsLoading(true);
                setSaveError(null);
                try {
                  if (!userId) {
                    setSaveError('User ID not found');
                    return;
                  }

                  // Check validation before submitting
                  if (!emailValidation.isValid && !emailValidation.isChecking) {
                    setSaveError(emailValidation.error || 'Email validation failed');
                    return;
                  }

                  const result = await emailService.changeEmail(parseInt(userId), data.email);
                  
                  if (!result.success) {
                    setSaveError(result.error || 'Failed to update email address');
                    return;
                  }

                  if (result.needsVerification) {
                    setSaveError(null);
                    // Update email form with the new email
                    emailForm.reset({ email: data.email });
                    // Refresh verification status
                    await loadEmailVerificationStatus();
                    setSaveSuccess(true);
                    // Show verification message for longer
                    setTimeout(() => {
                      setSaveSuccess(false);
                    }, 5000);
                  } else {
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 3000);
                  }
                } catch (error) {
                  console.error('Email change error:', error);
                  setSaveError('Failed to update email address');
                } finally {
                  setIsLoading(false);
                }
              })} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="account-email" className="block text-sm font-medium text-gray-300">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2">
                      {emailVerificationStatus.isChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : emailVerificationStatus.isVerified ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <ShieldCheck className="h-4 w-4" />
                          <span className="text-xs">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Shield className="h-4 w-4" />
                          <span className="text-xs">Unverified</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      id="account-email"
                      type="email"
                      {...emailForm.register('email')}
                      className={`w-full pl-10 pr-10 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                        emailForm.formState.errors.email || (!emailValidation.isValid && !emailValidation.isChecking) 
                          ? 'border-red-500' 
                          : emailValidation.isValid && emailForm.watch('email') !== initialData.email
                          ? 'border-green-500'
                          : 'border-gray-600'
                      }`}
                      placeholder="your.email@example.com"
                      disabled={isLoading}
                    />
                    {/* Validation status indicator */}
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailValidation.isChecking ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : emailForm.watch('email') && emailForm.watch('email') !== initialData.email ? (
                        emailValidation.isValid ? (
                          <Check className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        )
                      ) : null}
                    </div>
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-400">{emailForm.formState.errors.email.message}</p>
                  )}
                  {!emailForm.formState.errors.email && emailValidation.error && (
                    <p className="mt-1 text-sm text-red-400">{emailValidation.error}</p>
                  )}
                  {!emailForm.formState.errors.email && !emailValidation.error && emailForm.watch('email') && emailForm.watch('email') !== initialData.email && emailValidation.isValid && (
                    <p className="mt-1 text-sm text-green-400">Email address is available!</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    We'll send a verification email to any new address before making the change.
                  </p>
                  
                  {/* Resend verification button for unverified emails */}
                  {!emailVerificationStatus.isVerified && emailForm.watch('email') === initialData.email && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setIsLoading(true);
                          const result = await emailService.resendEmailVerification();
                          if (result.success) {
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 3000);
                          } else {
                            setSaveError(result.error || 'Failed to resend verification email');
                          }
                        } catch (error) {
                          setSaveError('Failed to resend verification email');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline disabled:opacity-50"
                    >
                      Resend verification email
                    </button>
                  )}
                </div>
                
                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      isLoading || 
                      !emailForm.formState.isDirty || 
                      emailValidation.isChecking ||
                      (emailForm.watch('email') !== initialData.email && !emailValidation.isValid)
                    }
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

            {/* Connected Accounts */}
            <div className="bg-gray-750 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Connected Accounts</h3>
              
              <div className="space-y-4">
                {/* Google */}
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-gray-900" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-white">Google</div>
                      <div className="text-sm text-gray-400">Not connected</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                    Connect
                  </button>
                </div>

                {/* Discord */}
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-white">Discord</div>
                      <div className="text-sm text-gray-400">Not connected</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                    Connect
                  </button>
                </div>

                {/* Steam */}
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#171a21] rounded-full flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-white">Steam</div>
                      <div className="text-sm text-green-400">Connected</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Disconnect
                  </button>
                </div>
              </div>
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
