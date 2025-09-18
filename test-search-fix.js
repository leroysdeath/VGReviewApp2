/**
 * Test script to validate search fixes
 */

// Test database search functionality
async function testDatabaseSearch() {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
        'https://cqufmmnguumyhbkhgwdc.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s'
    );
    
    console.log('🔍 Testing database search...');
    
    const testQueries = ['pokemon', 'mario', 'zelda', 'final fantasy'];
    
    for (const query of testQueries) {
        try {
            console.log(`\n--- Testing "${query}" ---`);
            
            const start = Date.now();
            const { data, error } = await supabase
                .from('game')
                .select('*')
                .or(`name.ilike.%${query}%,summary.ilike.%${query}%`)
                .order('igdb_rating', { ascending: false })
                .limit(10);
            
            const duration = Date.now() - start;
            
            if (error) {
                console.error(`❌ Database error for "${query}":`, error);
            } else {
                console.log(`✅ Database search for "${query}": ${data?.length || 0} results in ${duration}ms`);
            }
            
        } catch (err) {
            console.error(`❌ Exception for "${query}":`, err);
        }
    }
}

// Test IGDB API functionality
async function testIGDBAPI() {
    console.log('\n🚀 Testing IGDB API...');
    
    const testQueries = ['pokemon', 'mario'];
    
    for (const query of testQueries) {
        try {
            console.log(`\n--- Testing IGDB "${query}" ---`);
            
            const start = Date.now();
            const response = await fetch('http://localhost:55965/.netlify/functions/igdb-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchTerm: query,
                    limit: 5
                })
            });
            
            const duration = Date.now() - start;
            const data = await response.json();
            
            if (!response.ok) {
                console.error(`❌ IGDB API error for "${query}":`, data);
            } else if (data.success) {
                console.log(`✅ IGDB API for "${query}": ${data.games?.length || 0} results in ${duration}ms`);
            } else {
                console.error(`❌ IGDB API failed for "${query}":`, data.error);
            }
            
        } catch (err) {
            console.error(`❌ Exception for IGDB "${query}":`, err);
        }
    }
}

// Run tests
console.log('🧪 Starting Search Fix Tests...\n');

(async () => {
    await testDatabaseSearch();
    await testIGDBAPI();
    console.log('\n🏁 Tests completed!');
})().catch(err => {
    console.error('Test failed:', err);
});