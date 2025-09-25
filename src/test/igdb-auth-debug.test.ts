import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('IGDB Authentication Debug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have valid IGDB credentials in environment', () => {
    console.log('Environment check:');
    console.log('TWITCH_CLIENT_ID:', process.env.TWITCH_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('TWITCH_APP_ACCESS_TOKEN:', process.env.TWITCH_APP_ACCESS_TOKEN ? 'SET' : 'MISSING');
    console.log('VITE_IGDB_CLIENT_ID:', process.env.VITE_IGDB_CLIENT_ID ? 'SET' : 'MISSING');
    console.log('VITE_IGDB_ACCESS_TOKEN:', process.env.VITE_IGDB_ACCESS_TOKEN ? 'SET' : 'MISSING');

    // Check that credentials exist
    expect(process.env.TWITCH_CLIENT_ID || process.env.VITE_IGDB_CLIENT_ID).toBeDefined();
    expect(process.env.TWITCH_APP_ACCESS_TOKEN || process.env.VITE_IGDB_ACCESS_TOKEN).toBeDefined();
  });

  test('should validate token format', () => {
    const clientId = process.env.TWITCH_CLIENT_ID || process.env.VITE_IGDB_CLIENT_ID;
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN || process.env.VITE_IGDB_ACCESS_TOKEN;

    if (clientId) {
      console.log('Client ID format:', clientId.length, 'characters');
      expect(clientId.length).toBeGreaterThan(10);
    }

    if (accessToken) {
      console.log('Access Token format:', accessToken.length, 'characters');
      expect(accessToken.length).toBeGreaterThan(10);
    }
  });

  test('should test IGDB API authentication with mock', async () => {
    // Mock successful authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([
        {
          id: 2050,
          name: 'Xenogears',
          slug: 'xenogears',
          first_release_date: 888454800
        }
      ])
    } as any);

    const clientId = process.env.TWITCH_CLIENT_ID || process.env.VITE_IGDB_CLIENT_ID;
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN || process.env.VITE_IGDB_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
      console.warn('Skipping API test - credentials not available');
      return;
    }

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: 'fields id,name; where name = "Xenogears";'
    });

    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.igdb.com/v4/games',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Client-ID': clientId,
          'Authorization': `Bearer ${accessToken}`
        })
      })
    );
  });

  test('should test sync script credentials loading', async () => {
    // Check environment variables that the sync script needs
    const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
    const TWITCH_ACCESS_TOKEN = process.env.TWITCH_APP_ACCESS_TOKEN;

    console.log('Sync script credential check:');
    console.log('TWITCH_CLIENT_ID loaded:', TWITCH_CLIENT_ID ? 'YES' : 'NO');
    console.log('TWITCH_ACCESS_TOKEN loaded:', TWITCH_ACCESS_TOKEN ? 'YES' : 'NO');

    if (!TWITCH_CLIENT_ID || !TWITCH_ACCESS_TOKEN) {
      console.log('❌ This explains why the sync script is failing!');
      console.log('The script cannot find the required environment variables.');
    } else {
      console.log('✅ Credentials are available to the sync script');
    }

    // This should match the sync script's validation
    const hasValidCredentials = !!(TWITCH_CLIENT_ID && TWITCH_ACCESS_TOKEN);
    console.log('Script validation result:', hasValidCredentials);
  });

  test('should identify the specific authentication issue', async () => {
    // Mock 401 authentication error like we saw in the real run
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ 
        message: 'Authorization Failure',
        type: 'UnauthorizedError' 
      })
    } as any);

    const clientId = process.env.TWITCH_CLIENT_ID || process.env.VITE_IGDB_CLIENT_ID || 'test-client-id';
    const accessToken = process.env.TWITCH_APP_ACCESS_TOKEN || process.env.VITE_IGDB_ACCESS_TOKEN || 'test-token';

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: 'fields id,name; where name = "Xenogears";'
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);

    if (response.status === 401) {
      console.log('🔍 401 Authentication Error Analysis:');
      console.log('This indicates one of the following issues:');
      console.log('1. Access token has expired');
      console.log('2. Client ID is invalid');
      console.log('3. Token was revoked');
      console.log('4. API endpoint authentication failure');
      
      // Check token age and format
      if (accessToken && accessToken !== 'test-token') {
        console.log(`Token format: ${accessToken.length} characters`);
        if (accessToken.length < 20) {
          console.log('❌ Token appears too short - likely invalid');
        }
      }
    }
  });

  test('should validate token renewal process', () => {
    console.log('\n🔧 Token Renewal Process:');
    console.log('1. Go to Twitch Developer Console: https://dev.twitch.tv/console');
    console.log('2. Navigate to your application');
    console.log('3. Generate new Client Credentials OAuth token');
    console.log('4. Update .env with new TWITCH_CLIENT_ID and TWITCH_APP_ACCESS_TOKEN');
    console.log('5. Restart the sync script');

    console.log('\nCurrent .env file should contain:');
    console.log('TWITCH_CLIENT_ID=your_new_client_id');
    console.log('TWITCH_APP_ACCESS_TOKEN=your_new_access_token');
    
    // This test always passes - it's for documentation
    expect(true).toBe(true);
  });
});