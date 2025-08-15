import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, updateUserProfile, getCurrentAuthUser, ProfileUpdateData } from '../services/profileService';

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
      const authResponse = await getCurrentAuthUser();
      if (!authResponse.success || !authResponse.data) {
        navigate('/login');
        return;
      }

      const profileResponse = await getUserProfile(authResponse.data.id);
      if (profileResponse.success && profileResponse.data) {
        const data = profileResponse.data;
        setDisplayName(data.username || data.name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.picurl || '');
        setLocation(data.location || '');
        setWebsite(data.website || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      const authResponse = await getCurrentAuthUser();
      if (!authResponse.success || !authResponse.data) {
        throw new Error('User not authenticated');
      }

      const updates: ProfileUpdateData = {
        username: displayName,
        bio,
        location,
        website,
      };

      const result = await updateUserProfile(authResponse.data.id, updates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      console.log('Profile updated successfully');
      navigate('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(event) {
    try {
      setLoading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const authResponse = await getCurrentAuthUser();
      if (!authResponse.success || !authResponse.data) {
        throw new Error('User not authenticated');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${authResponse.data.id}-${Math.random()}.${fileExt}`;
      
      // Note: Avatar upload would typically be handled through profileService
      // This is a placeholder for direct storage upload if needed
      console.log('Avatar upload functionality needs to be implemented in profileService');
      setAvatarUrl(URL.createObjectURL(file)); // Temporary preview
    } catch (error) {
      console.error('Error uploading avatar:', error.message);
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

export { SettingsPage }; // or export const SettingsPage = ...
