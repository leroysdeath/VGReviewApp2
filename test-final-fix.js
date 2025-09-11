/**
 * Test the final database fix (no ORDER BY)
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cqufmmnguumyhbkhgwdc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s'
);

console.log('🔍 Testing final database fix (no ORDER BY)...\n');

const searchTerms = ['pokemon', 'mario', 'zelda', 'final fantasy'];

for (const term of searchTerms) {
    console.log(`Testing "${term}"...`);
    try {
        const start = Date.now();
        const { data, error } = await supabase
            .from('game')
            .select('*')
            .or(`name.ilike.%${term}%,summary.ilike.%${term}%`)
            .limit(50);
        
        const duration = Date.now() - start;
        
        if (error) {
            console.error(`❌ "${term}" failed:`, error);
        } else {
            console.log(`✅ "${term}": ${data?.length || 0} results in ${duration}ms`);
            
            // Show first few game names
            const gameNames = data?.slice(0, 3).map(g => g.name) || [];
            if (gameNames.length > 0) {
                console.log(`   Sample games: ${gameNames.join(', ')}`);
            }
        }
    } catch (err) {
        console.error(`❌ "${term}" exception:`, err);
    }
    
    console.log(''); // Empty line for readability
}

console.log('🏁 Final fix tests completed!');