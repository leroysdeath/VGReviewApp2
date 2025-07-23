import React, { useState } from 'react';
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
  };
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
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'privacy'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar || null);

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

  // Handle avatar change - FIXED
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setSaveError('Image size must be less than 2MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSaveError('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatarPreview(event.target.result as string);
        }
      };
      reader.onerror = () => {
        setSaveError('Error reading file. Please try again.');
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
                    {initialData?.username?.charAt(0)?.toUpperCase() || 'U'}
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
                  placeholder="Enter your username"
                />
              </div>
              {errors.username && (
                <p className="text-red-400 text-sm mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="displayName"
                  type="text"
                  {...register('displayName')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Enter your display name"
                />
              </div>
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
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                {...register('bio')}
                rows={3}
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none ${
                  errors.bio ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Tell us about yourself..."
              />
              {errors.bio && (
                <p className="text-red-400 text-sm mt-1">{errors.bio.message}</p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                {watch('bio')?.length || 0}/160 characters
              </p>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="location"
                  type="text"
                  {...register('location')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.location ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your location"
                />
              </div>
              {errors.location && (
                <p className="text-red-400 text-sm mt-1">{errors.location.message}</p>
              )}
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-1">
                Website
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="website"
                  type="url"
                  {...register('website')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.website ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              {errors.website && (
                <p className="text-red-400 text-sm mt-1">{errors.website.message}</p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isLoading || !isDirty}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Password Change */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">Change Password</h3>
                  <p className="text-sm text-gray-400">Update your password to keep your account secure</p>
                </div>
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              
              <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...passwordForm.register('currentPassword')}
                      className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    {...passwordForm.register('newPassword')}
                    className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Enter new password"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                    className="w-full px-4 py-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Confirm new password"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            {onDeleteAccount && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-red-400">Danger Zone</h3>
                    <p className="text-sm text-gray-400">Permanently delete your account and all data</p>
                  </div>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                
                <button
                  onClick={onDeleteAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors inline-flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="text-lg font-medium text-white">Notification Preferences</h3>
                <p className="text-sm text-gray-400">Choose what notifications you want to receive</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-white">Email Notifications</label>
                    <p className="text-xs text-gray-400">Receive notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register('notifications.email')}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-white">Push Notifications</label>
                    <p className="text-xs text-gray-400">Receive push notifications in your browser</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register('notifications.push')}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-white">Review Notifications</label>
                    <p className="text-xs text-gray-400">Get notified when someone reviews your content</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register('notifications.reviews')}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-white">Mention Notifications</label>
                    <p className="text-xs text-gray-400">Get notified when someone mentions you</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register('notifications.mentions')}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-white">Follower Notifications</label>
                    <p className="text-xs text-gray-400">Get notified when someone follows you</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register('notifications.followers')}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-white">Achievement Notifications</label>
                    <p className="text-xs text-gray-400">Get notified when you unlock achievements</p>
                  </div>
                  <input
                    type="checkbox"
                    {...register('notifications.achievements')}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Privacy & Security Settings */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="text-lg font-medium text-white">Privacy & Security</h3>
                <p className="text-sm text-gray-400">Control your privacy and security settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Public Profile</label>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>
                <p className="text-xs text-gray-400">Allow others to view your profile and activity</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Show Online Status</label>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                  />
                </div>
                <p className="text-xs text-gray-400">Let others see when you're online</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Activity Visibility</label>
                  <select className="bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 px-3 py-1">
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400">Control who can see your gaming activity</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Friend Requests</label>
                  <select className="bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 px-3 py-1">
                    <option value="everyone">Everyone</option>
                    <option value="friends-of-friends">Friends of Friends</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400">Choose who can send you friend requests</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Direct Messages</label>
                  <select className="bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 px-3 py-1">
                    <option value="everyone">Everyone</option>
                    <option value="friends">Friends Only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>
                <p className="text-xs text-gray-400">Control who can send you direct messages</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Two-Factor Authentication</label>
                  <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                    Enable
                  </button>
                </div>
                <p className="text-xs text-gray-400">Add an extra layer of security to your account</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Data Export</label>
                  <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                    Request
                  </button>
                </div>
                <p className="text-xs text-gray-400">Download a copy of your data</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettingsPanel;
