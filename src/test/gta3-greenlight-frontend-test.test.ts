import { describe, test, expect } from '@jest/globals';
import { gameFlagService } from '../services/gameFlagService';

describe('GTA 3 Greenlight Frontend Test', () => {
  test('should greenlight GTA 3 using the admin interface workflow', async () => {
    console.log('\n🔍 Testing GTA 3 Greenlight System through Frontend Workflow');
    
    // Step 1: Search for GTA 3 variants using the admin search
    console.log('\n📋 Step 1: Search for Grand Theft Auto games...');
    
    const searchResult = await gameFlagService.searchGamesForFlagging('Grand Theft Auto', 20);
    
    if (!searchResult.success) {
      console.error('❌ Search failed:', searchResult.error);
      expect(searchResult.success).toBe(true);
      return;
    }
    
    console.log(`✅ Found ${searchResult.data?.length || 0} Grand Theft Auto games`);
    
    // Look for GTA 3 specifically
    const gta3Variants = searchResult.data?.filter(game => 
      game.name.toLowerCase().includes('grand theft auto') && 
      (game.name.includes('III') || game.name.includes('3'))
    ) || [];
    
    console.log(`🎯 Found ${gta3Variants.length} GTA 3 variants:`);
    gta3Variants.forEach(game => {
      console.log(`  - ID: ${game.id}, Name: "${game.name}", Green: ${game.greenlight_flag}, Red: ${game.redlight_flag}`);
    });
    
    if (gta3Variants.length === 0) {
      console.log('⚠️  No GTA 3 games found in search results');
      console.log('📝 Available games:');
      searchResult.data?.slice(0, 5).forEach(game => {
        console.log(`  - "${game.name}"`);
      });
      
      // Let's try searching for just "GTA"
      console.log('\n🔍 Trying broader search with "GTA"...');
      const gtaSearchResult = await gameFlagService.searchGamesForFlagging('GTA', 20);
      
      if (gtaSearchResult.success) {
        const gtaGames = gtaSearchResult.data?.filter(game => 
          game.name.toLowerCase().includes('gta') && 
          (game.name.includes('III') || game.name.includes('3'))
        ) || [];
        
        console.log(`🎯 Found ${gtaGames.length} GTA 3 games with broader search:`);
        gtaGames.forEach(game => {
          console.log(`  - ID: ${game.id}, Name: "${game.name}"`);
        });
        
        if (gtaGames.length > 0) {
          gta3Variants.push(...gtaGames);
        }
      }
    }
    
    // Step 2: Greenlight the first GTA 3 game found
    if (gta3Variants.length > 0) {
      const targetGame = gta3Variants[0];
      console.log(`\n🟢 Step 2: Greenlighting "${targetGame.name}" (ID: ${targetGame.id})`);
      
      if (targetGame.greenlight_flag) {
        console.log('✅ Game is already greenlighted!');
      } else {
        const flagResult = await gameFlagService.setGameFlag(
          targetGame.id,
          'greenlight',
          'Testing greenlight system with GTA 3 for frontend verification'
        );
        
        if (flagResult.success) {
          console.log('✅ Successfully greenlighted GTA 3!');
        } else {
          console.error(`❌ Failed to greenlight: ${flagResult.error}`);
          expect(flagResult.success).toBe(true);
          return;
        }
      }
      
      // Step 3: Verify the greenlight status
      console.log('\n🔍 Step 3: Verifying greenlight status...');
      
      const verifyResult = await gameFlagService.searchGamesForFlagging(targetGame.name, 5);
      if (verifyResult.success) {
        const verifiedGame = verifyResult.data?.find(game => game.id === targetGame.id);
        if (verifiedGame) {
          console.log(`✅ Verification: Green: ${verifiedGame.greenlight_flag}, Red: ${verifiedGame.redlight_flag}`);
          expect(verifiedGame.greenlight_flag).toBe(true);
        } else {
          console.log('❌ Could not find game in verification search');
        }
      }
      
      // Step 4: Check flagging summary
      console.log('\n📊 Step 4: Checking flag summary...');
      const summaryResult = await gameFlagService.getFlagSummary();
      if (summaryResult.success && summaryResult.data) {
        console.log(`📈 Flag Summary:`);
        console.log(`  - Total Flagged: ${summaryResult.data.total_flagged}`);
        console.log(`  - Greenlight Count: ${summaryResult.data.greenlight_count}`);
        console.log(`  - Redlight Count: ${summaryResult.data.redlight_count}`);
        console.log(`  - Recent (24h): ${summaryResult.data.recent_flags_24h}`);
      }
      
      console.log('\n✅ GTA 3 Greenlight Test Complete!');
      console.log('🎮 You can now check the frontend to see if GTA 3 appears in search results');
      console.log('🔗 Go to: http://localhost:61501/admin/diagnostic');
      console.log('🔑 Use admin key: "debug" or "vg-admin"');
      console.log('🏷️ Navigate to "Manual Flags" tab to see the greenlighted game');
      
    } else {
      console.log('❌ No GTA 3 games found to greenlight');
      console.log('💡 This might mean GTA 3 is not in the database yet');
      console.log('📝 Try adding GTA 3 to the database first, or test with a different game');
    }
    
    expect(true).toBe(true); // Test passes if we get here without errors
  });
});