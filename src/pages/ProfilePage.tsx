import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient'; // Assuming this is your Supabase client init file

const Profile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({ completed: 0, playing: 0, wishlist: 0, avgRating: 0 });
  const [recentReviews, setRecentReviews] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topGames, setTopGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Redirect if not logged in
        return;
      }

      // Fetch profile basics from 'profiles' table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, display_name, bio, avatar_url, joined_at')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError; // Ignore if no row exists
      setUserProfile(profileData || { username: user.user_metadata?.username || '', display_name: '', bio: '', joined_at: new Date() });

      // Fetch stats (adjust table names if different)
      const { count: completedCount } = await supabase.from('completed_games').select('id', { count: 'exact' }).eq('user_id', user.id);
      const { count: playingCount } = await supabase.from('playing_games').select('id', { count: 'exact' }).eq('user_id', user.id);
      const { count: wishlistCount } = await supabase.from('wishlists').select('id', { count: 'exact' }).eq('user_id', user.id);
      const { data: ratingsData } = await supabase.from('reviews').select('rating').eq('user_id', user.id);
      const avgRating = ratingsData.length ? (ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length).toFixed(1) : 0;

      setStats({ completed: completedCount || 0, playing: playingCount || 0, wishlist: wishlistCount || 0, avgRating });

      // Fetch recent reviews (last 5, adjust as needed)
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('game_name, rating, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentReviews(reviewsData || []);

      // Fetch recent activity (from a logs table, adjust schema)
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('action, game_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentActivity(activityData || []);

      // Fetch top 5 games (e.g., highest rated by user)
      const { data: topGamesData } = await supabase
        .from('reviews')
        .select('game_name, rating')
        .eq('user_id', user.id)
        .order('rating', { ascending: false })
        .limit(5);
      setTopGames(topGamesData || []);

    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      <div className="flex items-center">
        <img src={userProfile?.avatar_url || '/default-avatar.png'} alt="Avatar" className="w-20 h-20 rounded-full" />
        <div className="ml-4">
          <h1 className="text-2xl font-bold">{userProfile?.display_name || 'No Display Name Set'}</h1>
          <p>{userProfile?.bio || 'No bio yet.'}</p>
          <p>Joined {new Date(userProfile?.joined_at).toLocaleDateString()}</p>
          {/* Followers, games, reviews would require additional queries if stored separately */}
        </div>
        <button className="ml-auto bg-purple-600 px-4 py-2 rounded">Edit Profile</button> {/* Link to /settings */}
      </div>

      <div className="mt-8">
        <h2>My Top 5 Games</h2>
        <ul>
          {topGames.map((game, index) => (
            <li key={index}>{index + 1}. {game.game_name} ({game.rating}/10)</li>
          ))}
          {topGames.length === 0 && <p>No top games yet.</p>}
        </ul>
      </div>

      <div className="mt-8">
        <h2>Quick Stats</h2>
        <p>Games Completed: {stats.completed}</p>
        <p>Currently Playing: {stats.playing}</p>
        <p>Wishlist: {stats.wishlist}</p>
        <p>Avg. Rating: {stats.avgRating}/10</p>
      </div>

      <div className="mt-8">
        <h2>Recent Reviews</h2>
        <ul>
          {recentReviews.map((review, index) => (
            <li key={index}>{review.game_name} - {review.rating}/10</li>
          ))}
          {recentReviews.length === 0 && <p>No recent reviews.</p>}
        </ul>
      </div>

      <div className="mt-8">
        <h2>Recent Activity</h2>
        <ul>
          {recentActivity.map((activity, index) => (
            <li key={index}>{activity.action} {activity.game_name}</li>
          ))}
          {recentActivity.length === 0 && <p>No recent activity.</p>}
        </ul>
      </div>
    </div>
  );
};

export default Profile;
