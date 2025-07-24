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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData.avatar || null);

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
      displayName: initialData.displayName || '',
      email: initialData.email,
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

  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await onSave(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (data: any) => {
    if (onPasswordChange) {
      onPasswordChange();
    }
  };

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'account', label: 'Account', icon: Key },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'privacy', label: 'Privacy', icon: Shield }
  ];

  return (
    <div className={`bg-gray-800 rounded-lg ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8 px-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === key
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-green-400" />
            <span className="text-green-300">Settings saved successfully!</span>
          </div>
        )}

        {saveError && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-300">{saveError}</span>
          </div>
        )}

        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={avatarPreview || '/default-avatar.png'}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-4 border-gray-600"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Image className="h-6 w-6 text-white" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-sm text-gray-400">
                  <p>Upload a new profile picture</p>
                  <p>JPG, PNG or GIF. Max size 5MB.</p>
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
                  placeholder="Your username"
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
                placeholder="Your display name"
                disabled={isLoading}
              />
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
                  placeholder="your@email.com"
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
                rows={4}
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
          <div className="space-y-8">
            <div className="bg-gray-750 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Password & Security</h3>
              <p className="text-gray-400 mb-4">
                Manage your password and account security settings.
              </p>
              <button
                onClick={onPasswordChange}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Change Password
              </button>
            </div>

            {onDeleteAccount && (
              <div className="bg-red-900/20 rounded-lg p-6 border border-red-700">
                <h3 className="text-lg font-medium text-red-400 mb-2">Danger Zone</h3>
                <p className="text-gray-400 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={onDeleteAccount}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Notification Preferences</h3>
              <p className="text-gray-400 mb-6">
                Choose what notifications you'd like to receive.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email notifications', description: 'Receive notifications via email' },
                { key: 'push', label: 'Push notifications', description: 'Receive push notifications in your browser' },
                { key: 'reviews', label: 'New reviews', description: 'When someone reviews a game you\'re interested in' },
                { key: 'mentions', label: 'Mentions', description: 'When someone mentions you in a comment or review' },
                { key: 'followers', label: 'New followers', description: 'When someone starts following you' },
                { key: 'achievements', label: 'Achievements', description: 'When you earn new achievements' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="text-white font-medium">{label}</h4>
                    <p className="text-gray-400 text-sm">{description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register(`notifications.${key}` as any)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={isLoading || !isDirty}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
              >
                <Save className="h-5 w-5" />
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* Privacy */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Privacy Settings</h3>
              <p className="text-gray-400 mb-6">
                Control who can see your information and activities.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 border border-gray-700 rounded-lg">
                <h4 className="text-white font-medium mb-2">Profile Visibility</h4>
                <p className="text-gray-400 text-sm mb-3">
                  Choose who can see your profile and gaming activity.
                </p>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="public">Public - Anyone can see</option>
                  <option value="friends">Friends only</option>
                  <option value="private">Private - Only me</option>
                </select>
              </div>

              <div className="p-4 border border-gray-700 rounded-lg">
                <h4 className="text-white font-medium mb-2">Game Activity</h4>
                <p className="text-gray-400 text-sm mb-3">
                  Show your game reviews and ratings to others.
                </p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
