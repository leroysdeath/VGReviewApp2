/**
 * Simple database test to understand timeout issues
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cqufmmnguumyhbkhgwdc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s'
);

console.log('🔍 Testing basic database operations...\n');

// Test 1: Simple count
console.log('Test 1: Count all games');
try {
    const { count, error } = await supabase
        .from('game')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('❌ Count failed:', error);
    } else {
        console.log(`✅ Total games in database: ${count}`);
    }
} catch (err) {
    console.error('❌ Count exception:', err);
}

// Test 2: Get first 5 games
console.log('\nTest 2: Get first 5 games');
try {
    const { data, error } = await supabase
        .from('game')
        .select('id, name, igdb_rating')
        .limit(5);
    
    if (error) {
        console.error('❌ Simple select failed:', error);
    } else {
        console.log(`✅ First 5 games retrieved:`, data?.map(g => g.name));
    }
} catch (err) {
    console.error('❌ Simple select exception:', err);
}

// Test 3: Exact name search (no ILIKE)
console.log('\nTest 3: Exact name search');
try {
    const { data, error } = await supabase
        .from('game')
        .select('id, name, igdb_rating')
        .eq('name', 'Super Mario Bros.')
        .limit(1);
    
    if (error) {
        console.error('❌ Exact search failed:', error);
    } else {
        console.log(`✅ Exact search result:`, data?.[0]?.name || 'No match');
    }
} catch (err) {
    console.error('❌ Exact search exception:', err);
}

// Test 4: Simple ILIKE without OR
console.log('\nTest 4: Simple ILIKE search');
try {
    const start = Date.now();
    const { data, error } = await supabase
        .from('game')
        .select('id, name')
        .ilike('name', '%mario%')
        .limit(5);
    
    const duration = Date.now() - start;
    
    if (error) {
        console.error('❌ Simple ILIKE failed:', error);
    } else {
        console.log(`✅ Simple ILIKE search: ${data?.length || 0} results in ${duration}ms`);
        console.log('Results:', data?.map(g => g.name));
    }
} catch (err) {
    console.error('❌ Simple ILIKE exception:', err);
}

// Test 5: OR query (problematic one)
console.log('\nTest 5: OR query (the problematic one)');
try {
    const start = Date.now();
    const { data, error } = await supabase
        .from('game')
        .select('id, name')
        .or('name.ilike.%mario%,summary.ilike.%mario%')
        .limit(5);
    
    const duration = Date.now() - start;
    
    if (error) {
        console.error('❌ OR query failed:', error);
    } else {
        console.log(`✅ OR query: ${data?.length || 0} results in ${duration}ms`);
    }
} catch (err) {
    console.error('❌ OR query exception:', err);
}

console.log('\n🏁 Database tests completed!');