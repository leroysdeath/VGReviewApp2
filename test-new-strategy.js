/**
 * Test the new search strategy (name first, then summary)
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://cqufmmnguumyhbkhgwdc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdWZtbW5ndXVteWhia2hnd2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MzU3MDUsImV4cCI6MjA2ODIxMTcwNX0.iP9jJM26Xa3-YeeB2YdYnqMK5JZyYcFY5_KXuLAZw-s'
);

async function testNewStrategy(query) {
    console.log(`\n🔍 Testing new strategy for "${query}"...`);
    
    try {
        // Step 1: Name search
        const nameStart = Date.now();
        const { data: nameData, error: nameError } = await supabase
            .from('game')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(30);
        
        const nameDuration = Date.now() - nameStart;
        
        if (nameError) {
            console.error(`❌ Name search for "${query}" failed:`, nameError);
            return;
        }
        
        console.log(`📛 Name search: ${nameData?.length || 0} results in ${nameDuration}ms`);
        
        // Step 2: Summary search (if needed)
        let summaryData = [];
        if ((nameData?.length || 0) < 20) {
            console.log('📝 Running supplementary summary search...');
            
            const summaryStart = Date.now();
            const { data: summaryResponse, error: summaryError } = await supabase
                .from('game')
                .select('*')
                .ilike('summary', `%${query}%`)
                .limit(20);
            
            const summaryDuration = Date.now() - summaryStart;
            
            if (summaryError) {
                console.error(`❌ Summary search for "${query}" failed:`, summaryError);
            } else {
                summaryData = summaryResponse || [];
                console.log(`📝 Summary search: ${summaryData.length} results in ${summaryDuration}ms`);
            }
        }
        
        // Step 3: Merge and dedupe
        const nameIds = new Set(nameData?.map(g => g.id) || []);
        const newSummaryResults = summaryData.filter(g => !nameIds.has(g.id));
        const totalResults = [...(nameData || []), ...newSummaryResults];
        
        console.log(`✅ Total results: ${totalResults.length}`);
        
        // Show sample games
        const sampleGames = totalResults.slice(0, 5).map(g => g.name);
        if (sampleGames.length > 0) {
            console.log(`   Sample games: ${sampleGames.join(', ')}`);
        }
        
    } catch (error) {
        console.error(`❌ Exception for "${query}":`, error);
    }
}

console.log('🧪 Testing new search strategy...');

// Test all the problematic queries
const testQueries = ['pokemon', 'mario', 'zelda', 'final fantasy'];

for (const query of testQueries) {
    await testNewStrategy(query);
}

console.log('\n🏁 New strategy tests completed!');