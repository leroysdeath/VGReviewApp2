import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Use navigate instead of useRouter for React Router
import { supabase } from '../utils/supabaseClient'; // Adjust path if needed (e.g., '../supabaseClient')

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/login'); // Redirect if not logged in

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore if no row
      if (data) {
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      alert('Error loading profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const updates = {
        id: user.id,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      alert('Profile updated successfully!');
      navigate('/profile'); // Redirect back to profile (adjust path if different)
    } catch (error) {
      alert('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(event) {
    try {
      setLoading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
      {loading && <p>Loading...</p>}
      <div className="mb-4">
        <label htmlFor="displayName" className="block mb-2">Display Name</label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full bg-gray-800 p-2 rounded"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="bio" className="block mb-2">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full bg-gray-800 p-2 rounded h-32"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="avatar" className="block mb-2">Avatar</label>
        <input id="avatar" type="file" accept="image/*" onChange={uploadAvatar} />
        {avatarUrl && <img src={avatarUrl} alt="Avatar Preview" className="mt-2 w-20 h-20 rounded-full" />}
      </div>
      <button
        onClick={updateProfile}
        disabled={loading}
        className="bg-purple-600 px-4 py-2 rounded w-full"
      >
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
    </div>
  );
};

export default Settings;
