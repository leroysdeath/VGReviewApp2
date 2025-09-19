/**
 * Test complex queries to isolate the timeout issue
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cqufmmnguumyhbkhgwdc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s'
);

console.log('🔍 Testing complex queries to isolate timeout issue...\n');

// Test 1: OR query with ORDER BY
console.log('Test 1: OR query with ORDER BY igdb_rating');
try {
    const start = Date.now();
    const { data, error } = await supabase
        .from('game')
        .select('id, name, igdb_rating')
        .or('name.ilike.%mario%,summary.ilike.%mario%')
        .order('igdb_rating', { ascending: false })
        .limit(10);
    
    const duration = Date.now() - start;
    
    if (error) {
        console.error('❌ OR + ORDER BY failed:', error);
    } else {
        console.log(`✅ OR + ORDER BY: ${data?.length || 0} results in ${duration}ms`);
    }
} catch (err) {
    console.error('❌ OR + ORDER BY exception:', err);
}

// Test 2: OR query with all fields (like the real service)
console.log('\nTest 2: OR query with SELECT *');
try {
    const start = Date.now();
    const { data, error } = await supabase
        .from('game')
        .select('*')
        .or('name.ilike.%mario%,summary.ilike.%mario%')
        .order('igdb_rating', { ascending: false })
        .limit(10);
    
    const duration = Date.now() - start;
    
    if (error) {
        console.error('❌ OR + SELECT * failed:', error);
    } else {
        console.log(`✅ OR + SELECT *: ${data?.length || 0} results in ${duration}ms`);
    }
} catch (err) {
    console.error('❌ OR + SELECT * exception:', err);
}

// Test 3: Test different search terms
const searchTerms = ['pokemon', 'zelda', 'final fantasy'];

for (const term of searchTerms) {
    console.log(`\nTest: OR query for "${term}"`);
    try {
        const start = Date.now();
        const { data, error } = await supabase
            .from('game')
            .select('*')
            .or(`name.ilike.%${term}%,summary.ilike.%${term}%`)
            .order('igdb_rating', { ascending: false })
            .limit(10);
        
        const duration = Date.now() - start;
        
        if (error) {
            console.error(`❌ "${term}" failed:`, error);
        } else {
            console.log(`✅ "${term}": ${data?.length || 0} results in ${duration}ms`);
        }
    } catch (err) {
        console.error(`❌ "${term}" exception:`, err);
    }
}

console.log('\n🏁 Complex query tests completed!');