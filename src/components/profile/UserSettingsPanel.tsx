import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../lib/supabaseClient'; // Adjust path if needed, based on repo structure
import { Button } from '../ui/button'; // Assuming Shadcn/UI or similar; adjust if using custom components
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch'; // For visible toggle; fallback to custom if not present
import { Loader2, Save } from 'lucide-react'; // Lucide icons as per README
import { useUser } from '../../hooks/useUser'; // Assuming a custom hook for current user; implement if missing

// Define schema for validation (using Zod, common with React Hook Form)
const settingsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20),
  bio: z.string().max(160, 'Bio must be under 160 characters').optional(),
  notifications: z.object({
    email: z.boolean(),
  }),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function UserSettingsPanel() {
  const { user } = useUser(); // Fetch current user from context or Supabase session
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      username: user?.username || '',
      bio: user?.bio || '',
      notifications: {
        email: user?.notifications?.email || false,
      },
    },
  });

  const onSubmit = async (data: SettingsForm) => {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase
        .from('profiles') // Assuming a 'profiles' table; adjust based on your Supabase schema (from migrations in README)
        .update({
          username: data.username,
          bio: data.bio,
          notifications: data.notifications, // Stored as JSON in Supabase
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSuccessMessage('Settings updated successfully!');
      reset(data); // Update form with new values
    } catch (error) {
      console.error('Error updating settings:', error);
      setErrorMessage('Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center text-red-500">Please log in to access settings.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Save className="mr-2" /> User Settings
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            {...register('username')}
            disabled={isLoading}
            className={errors.username ? 'border-red-500' : ''}
          />
          {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            {...register('bio')}
            disabled={isLoading}
            className={errors.bio ? 'border-red-500' : ''}
          />
          {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="notifications.email"
              {...register('notifications.email')}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <Label htmlFor="notifications.email" className="font-medium">
              Receive Email Notifications
            </Label>
          </div>
          {errors.notifications?.email && <p className="text-red-500 text-sm">{errors.notifications.email.message}</p>}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      {successMessage && <p className="mt-4 text-green-500 text-center">{successMessage}</p>}
      {errorMessage && <p className="mt-4 text-red-500 text-center">{errorMessage}</p>}
    </div>
  );
}
