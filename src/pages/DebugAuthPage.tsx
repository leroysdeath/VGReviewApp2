import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useState, useEffect } from 'react';

export const DebugAuthPage: React.FC = () => {
  const { user, session, dbUserId, isAuthenticated, loading, dbUserIdLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [dbUserInfo, setDbUserInfo] = useState<any>(null);
  const [functionTest, setFunctionTest] = useState<any>(null);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      if (!session?.user) return;

      // Get auth user info
      const authUser = session.user;
      
      // Try to find database user
      const { data: dbUser, error: dbError } = await supabase
        .from('user')
        .select('*')
        .eq('provider_id', authUser.id)
        .single();

      setDebugInfo({
        authUserId: authUser.id,
        authEmail: authUser.email,
        authMetadata: authUser.user_metadata,
        dbUserId: dbUserId,
        dbUserIdLoading: dbUserIdLoading,
        dbUserFound: !!dbUser,
        dbUserError: dbError?.message
      });

      setDbUserInfo(dbUser);
      
      // Test the database function directly
      try {
        const { data: funcResult, error: funcError } = await supabase
          .rpc('get_or_create_user', {
            auth_id: authUser.id,
            user_email: authUser.email || '',
            user_name: authUser.user_metadata?.name || 'User',
            user_provider: 'supabase'
          });
        
        setFunctionTest({
          success: !funcError,
          result: funcResult,
          error: funcError
        });
      } catch (e) {
        setFunctionTest({
          success: false,
          error: e
        });
      }
    };

    fetchDebugInfo();
  }, [session, dbUserId]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Authentication Debug Information</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">Auth State</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify({
              isAuthenticated,
              hasUser: !!user,
              hasSession: !!session,
              dbUserId,
              dbUserIdLoading,
              loading
            }, null, 2)}
          </pre>
        </div>
        
        {functionTest && (
          <div className={`p-4 rounded ${functionTest.success ? 'bg-green-900' : 'bg-red-900'}`}>
            <h2 className="text-xl font-bold mb-2">Database Function Test</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(functionTest, null, 2)}
            </pre>
          </div>
        )}

        {user && (
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Auth User (from useAuth)</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        {debugInfo.authUserId && (
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Debug Info</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {dbUserInfo && (
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Database User</h2>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(dbUserInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">Navigation Links</h2>
          <div className="space-y-2">
            {dbUserId ? (
              <>
                <p>Your profile link: <a href={`/user/${dbUserId}`} className="text-blue-400 hover:underline">/user/{dbUserId}</a></p>
                <p className="text-green-400">✓ Database user ID is set</p>
              </>
            ) : (
              <p className="text-red-400">✗ Database user ID is NOT set - this is why user pages won't load!</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">Test User Navigation</h2>
          <div className="space-y-2">
            <a href="/user/5" className="text-blue-400 hover:underline block">Test: /user/5 (DotHog69)</a>
            <a href="/user/7" className="text-blue-400 hover:underline block">Test: /user/7 (Spoodle)</a>
            <a href="/user/9" className="text-blue-400 hover:underline block">Test: /user/9 (KOTORLORE)</a>
            <a href="/user/11" className="text-blue-400 hover:underline block">Test: /user/11 (averagegamer)</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugAuthPage;