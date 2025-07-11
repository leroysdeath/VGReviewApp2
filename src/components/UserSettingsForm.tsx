import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Save, AlertCircle } from 'lucide-react';

// Form validation schema
const userSettingsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  currentPassword: z.string().min(1, 'Current password is required for security'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  confirmPassword: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
  showActivity: z.boolean().optional(),
  showCollection: z.boolean().optional(),
}).refine(data => !data.newPassword || data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

interface UserSettingsFormProps {
  user: {
    username: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
  };
  onSave: (data: UserSettingsFormValues) => Promise<void>;
  className?: string;
}

export const UserSettingsForm: React.FC<UserSettingsFormProps> = ({
  user,
  onSave,
  className = ''
}) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Initialize form with user data
  const { register, handleSubmit, formState: { errors }, watch } = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      username: user.username,
      email: user.email,
      bio: user.bio || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      emailNotifications: true,
      pushNotifications: true,
      publicProfile: true,
      showActivity: true,
      showCollection: true
    }
  });

  // Handle form submission
  const onSubmit = async (data: UserSettingsFormValues) => {
    setIsLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      await onSave(data);
      setSaveSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: 'None' };
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return { 
      strength, 
      label: labels[strength - 1] || 'None',
      color: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'][strength - 1] || 'bg-gray-500'
    };
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-8 ${className}`}>
      {/* Success message */}
      {saveSuccess && (
        <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-start gap-2">
          <svg className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <p className="text-green-300 text-sm">Settings saved successfully!</p>
        </div>
      )}
      
      {/* Error message */}
      {saveError && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{saveError}</p>
        </div>
      )}
      
      {/* Profile Information */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...register('username')}
              className={`w-full px-4 py-3 bg-gray-700 border ${
                errors.username ? 'border-red-500' : 'border-gray-600'
              } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500`}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className={`w-full px-4 py-3 bg-gray-700 border ${
                errors.email ? 'border-red-500' : 'border-gray-600'
              } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500`}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
              Bio <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              id="bio"
              rows={3}
              {...register('bio')}
              className={`w-full px-4 py-3 bg-gray-700 border ${
                errors.bio ? 'border-red-500' : 'border-gray-600'
              } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500`}
              placeholder="Tell us about yourself..."
              disabled={isLoading}
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-400">{errors.bio.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {watch('bio')?.length || 0}/160 characters
            </p>
          </div>
          
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-300 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              
              <button
                type="button"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                disabled={isLoading}
              >
                Change Avatar
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Password Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                {...register('currentPassword')}
                className={`w-full px-4 py-3 pr-10 bg-gray-700 border ${
                  errors.currentPassword ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500`}
                placeholder="Enter your current password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.currentPassword.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
              New Password <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                {...register('newPassword')}
                className={`w-full px-4 py-3 pr-10 bg-gray-700 border ${
                  errors.newPassword ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500`}
                placeholder="Enter new password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.newPassword.message}</p>
            )}
            
            {/* Password strength indicator */}
            {watch('newPassword') && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Password strength:</span>
                  <span className={`text-xs ${
                    getPasswordStrength(watch('newPassword')).strength >= 3 
                      ? 'text-green-400' 
                      : getPasswordStrength(watch('newPassword')).strength >= 2
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}>
                    {getPasswordStrength(watch('newPassword')).label}
                  </span>
                </div>
                <div className="h-1 w-full bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getPasswordStrength(watch('newPassword')).color}`}
                    style={{ width: `${getPasswordStrength(watch('newPassword')).strength * 25}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className={`w-full px-4 py-3 pr-10 bg-gray-700 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500`}
                placeholder="Confirm new password"
                disabled={isLoading || !watch('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Notification Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Email Notifications</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                {...register('emailNotifications')} 
                className="sr-only peer" 
                disabled={isLoading}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Push Notifications</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                {...register('pushNotifications')} 
                className="sr-only peer" 
                disabled={isLoading}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </label>
        </div>
      </div>
      
      {/* Privacy Settings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Public Profile</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                {...register('publicProfile')} 
                className="sr-only peer" 
                disabled={isLoading}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Show Activity Feed</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                {...register('showActivity')} 
                className="sr-only peer" 
                disabled={isLoading}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-gray-300">Show Game Collection</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                {...register('showCollection')} 
                className="sr-only peer" 
                disabled={isLoading}
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </div>
          </label>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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
  );
};