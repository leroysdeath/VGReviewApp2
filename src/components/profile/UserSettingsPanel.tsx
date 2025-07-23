import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { createClient } from '@supabase/supabase-js'; // Direct import from the package
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, Save } from 'lucide-react';

// Initialize Supabase client using env variables (no external file needed)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SettingsForm {
  username: string;
  bio?: string;
  notifications: {
    email: boolean;
  };
}

export default function UserSettingsPanel() {
  const [user, setUser] = useState<any>(null); // Store current user
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsForm>({
    defaultValues: {
      username: '',
      bio: '',
      notifications: {
        email: false,
      },
    },
  });

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch profile data from 'profiles' table
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUser(profile || session.user);
        reset({
          username: profile?.username || session.user.user_metadata?.username || '',
          bio: profile?.bio || '',
          notifications: {
            email: profile?.notifications?.email || false,
          },
        });
      }
    };

    fetchUser();
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!user) {
      setErrorMessage('No user logged in.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          bio: data.bio,
          notifications: data.notifications,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMessage('Settings updated successfully!');
      reset(data);
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
