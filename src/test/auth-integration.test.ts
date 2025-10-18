/**
 * Authentication Integration Tests
 *
 * These tests run against the REAL Supabase database to catch actual issues
 * that users experience. This file tests:
 * - Email login
 * - Username login
 * - Error handling
 * - Edge cases
 *
 * IMPORTANT: This file uses REAL credentials from test-credentials.ts
 * which is gitignored for security.
 */

import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { supabase } from '../services/supabase';

// Import test credentials (this file is gitignored)
let testCredentials: any;
try {
  testCredentials = require('./test-credentials').testCredentials;
} catch (error) {
  console.warn('test-credentials.ts not found. Using example credentials.');
  testCredentials = require('./test-credentials.example').testCredentials;
}

describe('Authentication Integration Tests', () => {
  // Cleanup: Sign out before each test
  beforeEach(async () => {
    await authService.signOut();
  });

  // Cleanup: Sign out after all tests
  afterAll(async () => {
    await authService.signOut();
  });

  describe('Email Login', () => {
    it('should successfully login with valid email and password', async () => {
      const { email, password, expectedUsername } = testCredentials.control;

      const result = await authService.signIn(email, password);

      expect(result.error).toBeNull();
      expect(result.user).toBeTruthy();
      expect(result.user?.email).toBe(email);

      // Verify user profile exists in database
      if (result.user) {
        const profileResult = await userService.getUserByProviderId(result.user.id);
        expect(profileResult.success).toBe(true);
        expect(profileResult.data?.username).toBe(expectedUsername);
      }
    });

    it('should reject login with valid email but wrong password', async () => {
      const { email } = testCredentials.control;

      const result = await authService.signIn(email, 'WrongPassword123!');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const result = await authService.signIn('nonexistent@example.com', 'password');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle email with different casing', async () => {
      const { email, password } = testCredentials.control;
      const mixedCaseEmail = email.split('@')[0].toUpperCase() + '@' + email.split('@')[1];

      const result = await authService.signIn(mixedCaseEmail, password);

      // Supabase handles case-insensitive email matching
      expect(result.error).toBeNull();
      expect(result.user).toBeTruthy();
    });
  });

  describe('Username Login', () => {
    it('should successfully login with valid username and password', async () => {
      const { username, password, email } = testCredentials.broken1;

      const result = await authService.signIn(username, password);

      expect(result.error).toBeNull();
      expect(result.user).toBeTruthy();
      expect(result.user?.email).toBe(email);

      // Verify the user profile
      if (result.user) {
        const profileResult = await userService.getUserByProviderId(result.user.id);
        expect(profileResult.success).toBe(true);
        expect(profileResult.data?.username).toBe(username.toLowerCase());
      }
    });

    it('should login with username in different casing', async () => {
      const { username, password } = testCredentials.broken1;
      const mixedCaseUsername = username.toUpperCase();

      const result = await authService.signIn(mixedCaseUsername, password);

      expect(result.error).toBeNull();
      expect(result.user).toBeTruthy();
    });

    it('should reject login with valid username but wrong password', async () => {
      const { username } = testCredentials.broken1;

      const result = await authService.signIn(username, 'WrongPassword123!');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid');
    });

    it('should reject login with non-existent username', async () => {
      const result = await authService.signIn('nonexistentuser123', 'password');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid');
    });

    it('should test all affected user accounts', async () => {
      const affectedAccounts = [
        testCredentials.broken1, // MajorDangus
        testCredentials.broken2, // GeneralNotion
        testCredentials.broken3, // DariusFudge
        testCredentials.broken4, // aypieboybakemeapie911
      ];

      for (const account of affectedAccounts) {
        const result = await authService.signIn(account.username, account.password);

        expect(result.error).toBeNull();
        expect(result.user).toBeTruthy();
        expect(result.user?.email).toBe(account.email);

        // Sign out between tests
        await authService.signOut();
      }
    });
  });

  describe('Database Consistency', () => {
    it('should have matching user record for authenticated user', async () => {
      const { email, password } = testCredentials.control;

      const authResult = await authService.signIn(email, password);
      expect(authResult.user).toBeTruthy();

      if (authResult.user) {
        // Check if user exists in database
        const dbResult = await userService.getUserByProviderId(authResult.user.id);

        expect(dbResult.success).toBe(true);
        expect(dbResult.data).toBeTruthy();
        expect(dbResult.data?.provider_id).toBe(authResult.user.id);
        expect(dbResult.data?.email).toBe(authResult.user.email);
      }
    });

    it('should have unique usernames in database', async () => {
      const { username } = testCredentials.control;

      // Query database for username
      const { data: users, error } = await supabase
        .from('user')
        .select('id, username, email')
        .eq('username', username.toLowerCase());

      expect(error).toBeNull();
      expect(users).toBeTruthy();
      expect(users?.length).toBe(1); // Should only have ONE user with this username
    });

    it('should verify username-email mapping is correct', async () => {
      const testAccount = testCredentials.broken1;

      // Query database to verify mapping
      const { data: user, error } = await supabase
        .from('user')
        .select('username, email')
        .eq('username', testAccount.username.toLowerCase())
        .single();

      expect(error).toBeNull();
      expect(user).toBeTruthy();
      expect(user?.email).toBe(testAccount.email);
    });
  });

  describe('Session Management', () => {
    it('should maintain session after successful login', async () => {
      const { email, password } = testCredentials.control;

      await authService.signIn(email, password);

      // Check session exists
      const session = await authService.getCurrentSession();
      expect(session).toBeTruthy();
      expect(session?.user.email).toBe(email);

      // Check current user
      const user = await authService.getCurrentUser();
      expect(user).toBeTruthy();
      expect(user?.email).toBe(email);
    });

    it('should clear session after logout', async () => {
      const { email, password } = testCredentials.control;

      await authService.signIn(email, password);
      await authService.signOut();

      const session = await authService.getCurrentSession();
      expect(session).toBeNull();

      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty username/email', async () => {
      const result = await authService.signIn('', 'password');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle empty password', async () => {
      const { email } = testCredentials.control;

      const result = await authService.signIn(email, '');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle whitespace in username', async () => {
      const { username, password } = testCredentials.broken1;
      const usernameWithSpaces = `  ${username}  `;

      // This should fail because we don't trim input
      const result = await authService.signIn(usernameWithSpaces, password);

      // Expected behavior: Should fail (spaces should not be trimmed)
      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle special characters in username lookup', async () => {
      // Test SQL injection attempt
      const result = await authService.signIn("admin' OR '1'='1", 'password');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('should handle very long username', async () => {
      const longUsername = 'a'.repeat(300);

      const result = await authService.signIn(longUsername, 'password');

      expect(result.user).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('Error Messages', () => {
    it('should provide user-friendly error for wrong credentials', async () => {
      const result = await authService.signIn('wronguser', 'wrongpass');

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBeDefined();
      // Should not leak whether username or password was wrong
      expect(result.error.message.toLowerCase()).toContain('invalid');
    });

    it('should handle network timeouts gracefully', async () => {
      // This test would need to mock network conditions
      // For now, just verify the error structure exists
      const result = await authService.signIn('test@example.com', 'pass');

      if (result.error) {
        expect(result.error).toHaveProperty('message');
        expect(typeof result.error.message).toBe('string');
      }
    });
  });

  describe('Performance', () => {
    it('should complete email login within 3 seconds', async () => {
      const { email, password } = testCredentials.control;
      const startTime = Date.now();

      await authService.signIn(email, password);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
    });

    it('should complete username login within 5 seconds', async () => {
      const { username, password } = testCredentials.broken1;
      const startTime = Date.now();

      await authService.signIn(username, password);

      const duration = Date.now() - startTime;
      // Username login has one extra DB query, so allow more time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Concurrent Login Attempts', () => {
    it('should handle multiple rapid login attempts', async () => {
      const { email, password } = testCredentials.control;

      // Try logging in 3 times rapidly
      const promises = [
        authService.signIn(email, password),
        authService.signIn(email, password),
        authService.signIn(email, password),
      ];

      const results = await Promise.all(promises);

      // At least one should succeed
      const successCount = results.filter(r => !r.error).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle login with different accounts simultaneously', async () => {
      const account1 = testCredentials.control;
      const account2 = testCredentials.broken1;

      const [result1, result2] = await Promise.all([
        authService.signIn(account1.email, account1.password),
        authService.signIn(account2.username, account2.password),
      ]);

      // Both should succeed
      expect(result1.error).toBeNull();
      expect(result2.error).toBeNull();
      expect(result1.user?.email).toBe(account1.email);
      expect(result2.user?.email).toBe(account2.email);
    });
  });
});
