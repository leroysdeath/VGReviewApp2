import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Mail, 
  MapPin, 
  Link as LinkIcon, 
  Save, 
  Loader2, 
  AlertCircle,
  Check,
  Image,
  Key,
  Eye,
  EyeOff,
  Bell,
  Shield,
  Trash2
} from 'lucide-react';

// Form validation schema
const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  displayName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  location: z.string().max(50, 'Location must be 50 characters or less').optional(),
  website: z.string().url('Please enter a valid URL').or(z.string().length(0)).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    reviews: z.boolean().optional(),
    mentions: z.boolean().optional(),
    followers: z.boolean().optional(),
    achievements: z.boolean().optional()
  }).optional()
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface UserSettingsPanelProps {
  initialData: {
    username: string;
    displayName?: string;
    email: string;
    bio?: string;
    location?: string;
    website?: string;
    avatar?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      reviews: boolean;
      mentions: boolean;
      followers: boolean;
      achievements: boolean;
    };
  } | null;
  onSave: (data: ProfileFormValues) => Promise<void>;
  onPasswordChange?: () => void;
  onDeleteAccount?: () => void;
  className?: string;
}

export const UserSettingsPanel: React.FC<UserSettingsPanelProps> = ({
  initialData,
  onSave,
  onPasswordChange,
  onDeleteAccount,
  className = ''
}) => {
  // Early return with loading state if initialData is null
  if (!initialData) {
    return (
      <div className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading user settings...</p>
          </div>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar || null);

  // Form setup with null checks
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initialData?.username || '',
      displayName: initialData?.displayName || '',
      email: initialData?.email || '',
      bio: initialData?.bio || '',
      location: initialData?.location || '',
      website: initialData?.website || '',
      notifications: initialData?.notifications || {
        email: true,
        push: true,
        reviews: true,
        mentions: true,
        followers: true,
        achievements: true
      }
    }
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        username: initialData.username || '',
        displayName: initialData.displayName || '',
        email: initialData.email || '',
        bio: initialData.bio || '',
        location: initialData.location || '',
        website: initialData.website || '',
        notifications: initialData.notifications || {
          email: true,
          push: true,
          reviews: true,
          mentions: true,
          followers: true,
          achievements: true
        }
      });
      setAvatarPreview(initialData.avatar || null);
    }
  }, [initialData, reset]);

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
      await onSave(data);
      setSaveSuccess(true);
      reset(data); // Reset form with new values
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
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

  // Safe username extraction for avatar fallback
  const getUsernameInitial = () => {
    if (!initialData?.username) return '?';
    return initialData.username.charAt(0).toUpperCase();
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
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Privacy & Security
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
                    {getUsernameInitial()}
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

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
                Bio (optional)
              </label>
              <textarea
                id="bio"
                rows={3}
                {...register('bio')}
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none ${
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

        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white mb-4">Account Settings</h3>
            
            {/* Password Change */}
            <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
              <h4 className="font-medium text-white">Change Password</h4>
              
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
                    className={`w-full pl-10 pr-12 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      passwordForm.formState.errors.currentPassword ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="Enter current password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>

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
                    className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      passwordForm.formState.errors.newPassword ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

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
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !passwordForm.formState.isDirty}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="h-5 w-5" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="mt-8 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <h4 className="font-medium text-red-400 mb-2">Danger Zone</h4>
              <p className="text-sm text-gray-400 mb-4">
                These actions are permanent and cannot be undone.
              </p>
              <button
                onClick={onDeleteAccount}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white mb-4">Notification Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Review Notifications</h4>
                  <p className="text-sm text-gray-400">Get notified when someone reviews your games</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.reviews')}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

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
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

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
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Achievements</h4>
                  <p className="text-sm text-gray-400">Get notified about new achievements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.achievements')}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Save notifications button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
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
                    <Bell className="h-5 w-5" />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Privacy & Security Settings */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-white mb-4">Privacy & Security</h3>
            
            {/* Privacy Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Profile Visibility</h4>
                  <p className="text-sm text-gray-400">Control who can see your profile</p>
                </div>
                <select
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  defaultValue="public"
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Activity Visibility</h4>
                  <p className="text-sm text-gray-400">Control who can see your gaming activity</p>
                </div>
                <select
                  className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  defaultValue="public"
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                </div>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Enable
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Login Sessions</h4>
                  <p className="text-sm text-gray-400">Manage your active login sessions</p>
                </div>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                  Manage
                </button>
              </div>
            </div>

            {/* Data & Privacy */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-white mb-4">Data & Privacy</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Data Collection</h4>
                    <p className="text-sm text-gray-400">Allow us to collect usage data to improve your experience</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      defaultChecked={true}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Personalized Recommendations</h4>
                    <p className="text-sm text-gray-400">Allow us to suggest games based on your activity</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      defaultChecked={true}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Data Export</h4>
                    <p className="text-sm text-gray-400">Download a copy of your data</p>
                  </div>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors">
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
                <div>
                  <h4 className="font-medium text-white">Email Notifications</h4>
                  <p className="text-sm text-gray-400">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.email')}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Push Notifications</h4>
                  <p className="text-sm text-gray-400">Get instant updates on your device</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('notifications.push')}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
