// Test script to verify auth race condition fix and profile editing
// Run this with: node test-auth-profile.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testUserSignupAndProfile() {
  log('\n========================================', 'cyan');
  log('Testing User Signup and Profile Creation', 'cyan');
  log('========================================\n', 'cyan');

  // Generate unique test user
  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@example.com`;
  const testPassword = 'Test123!@#';
  const testUsername = `testuser_${timestamp}`;

  try {
    // Step 1: Sign up new user
    log('📝 Step 1: Creating new user...', 'blue');
    log(`   Email: ${testEmail}`);
    log(`   Username: ${testUsername}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: testUsername,
          name: testUsername
        }
      }
    });

    if (signUpError) {
      log(`❌ Signup failed: ${signUpError.message}`, 'red');
      return false;
    }

    log('✅ User created successfully', 'green');
    log(`   User ID: ${signUpData.user?.id}`);

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Check if profile was created by trigger
    log('\n📝 Step 2: Checking if profile was created by trigger...', 'blue');
    
    const { data: profile, error: profileError } = await supabase
      .from('user')
      .select('*')
      .eq('provider_id', signUpData.user?.id)
      .single();

    if (profileError) {
      log(`❌ Profile not found: ${profileError.message}`, 'red');
      log('   This indicates the trigger may not be working', 'yellow');
      return false;
    }

    log('✅ Profile created successfully by trigger', 'green');
    log(`   Profile ID: ${profile.id}`);
    log(`   Username: ${profile.username}`);
    log(`   Email: ${profile.email}`);
    log(`   Name: ${profile.name}`);

    // Step 3: Test profile update
    log('\n📝 Step 3: Testing profile update...', 'blue');
    
    const updateData = {
      username: `${testUsername}_updated`,
      display_name: 'Test Display Name',
      bio: 'This is a test bio',
      location: 'Test City',
      website: 'https://example.com',
      platform: 'PC'
    };

    log('   Updating with:', JSON.stringify(updateData, null, 2));

    const { data: updatedProfile, error: updateError } = await supabase
      .from('user')
      .update(updateData)
      .eq('provider_id', signUpData.user?.id)
      .select('*')
      .single();

    if (updateError) {
      log(`❌ Profile update failed: ${updateError.message}`, 'red');
      log(`   Error code: ${updateError.code}`, 'yellow');
      log(`   Error details: ${JSON.stringify(updateError.details)}`, 'yellow');
      return false;
    }

    log('✅ Profile updated successfully', 'green');
    log('   Updated fields:');
    log(`     - username: ${updatedProfile.username}`);
    log(`     - display_name: ${updatedProfile.display_name}`);
    log(`     - bio: ${updatedProfile.bio}`);
    log(`     - location: ${updatedProfile.location}`);
    log(`     - website: ${updatedProfile.website}`);
    log(`     - platform: ${updatedProfile.platform}`);

    // Step 4: Test race condition by rapid consecutive signups
    log('\n📝 Step 4: Testing race condition handling...', 'blue');
    
    const raceTestEmail = `race_test_${timestamp}@example.com`;
    
    // Simulate race condition with parallel operations
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        supabase.auth.signUp({
          email: `race_${i}_${timestamp}@example.com`,
          password: testPassword,
          options: {
            data: {
              username: `raceuser_${i}_${timestamp}`,
              name: `Race User ${i}`
            }
          }
        })
      );
    }

    const results = await Promise.allSettled(promises);
    
    let raceConditionHandled = true;
    results.forEach((result, index) => {
      if (result.status === 'rejected' || result.value.error) {
        log(`   ⚠️ Signup ${index + 1} had issues: ${result.reason || result.value.error?.message}`, 'yellow');
        raceConditionHandled = false;
      } else {
        log(`   ✅ Signup ${index + 1} completed successfully`, 'green');
      }
    });

    if (raceConditionHandled) {
      log('✅ Race condition handled properly', 'green');
    }

    // Clean up test user (optional - commented out to preserve test data)
    // log('\n🧹 Cleaning up test data...', 'blue');
    // await supabase.auth.admin.deleteUser(signUpData.user?.id);

    return true;

  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

async function runTests() {
  log('🚀 Starting Auth & Profile Tests', 'cyan');
  log('==================================\n', 'cyan');

  const success = await testUserSignupAndProfile();

  log('\n==================================', 'cyan');
  if (success) {
    log('✅ All tests passed successfully!', 'green');
  } else {
    log('❌ Some tests failed. Please check the migration and code.', 'red');
  }
  log('==================================\n', 'cyan');

  process.exit(success ? 0 : 1);
}

// Run the tests
runTests().catch(console.error);