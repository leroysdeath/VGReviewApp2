import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/login');

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, location, website')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
        setLocation(data.location || '');
        setWebsite(data.website || '');
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
        location,
        website,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      alert('Profile updated!');
      navigate('/profile');
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

      const { data: { user } } = await supabase.auth.getUser();
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 text-white p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
      {loading && <p>Loading...</p>}
      <div className="mb-4">
        <label htmlFor="displayName" className="block mb-2">Display Name</label>
        <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-gray-800 p-2 rounded text-white" />
      </div>
      <div className="mb-4">
        <label htmlFor="bio" className="block mb-2">Bio</label>
        <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="w-full bg-gray-800 p-2 rounded text-white h-32" />
      </div>
      <div className="mb-4">
        <label htmlFor="location" className="block mb-2">Location</label>
        <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-gray-800 p-2 rounded text-white" />
      </div>
      <div className="mb-4">
        <label htmlFor="website" className="block mb-2">Website</label>
        <input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full bg-gray-800 p-2 rounded text-white" />
      </div>
      <div className="mb-4">
        <label htmlFor="avatar" className="block mb-2">Avatar</label>
        <input id="avatar" type="file" accept="image/*" onChange={uploadAvatar} />
        {avatarUrl && <img src={avatarUrl} alt="Preview" className="mt-2 w-20 h-20 rounded-full" />}
      </div>
      <button onClick={updateProfile} disabled={loading} className="bg-purple-600 px-4 py-2 rounded w-full">
        {loading ? 'Updating...' : 'Update Profile'}
      </button>
    </div>
  );
};

export default SettingsPage;
