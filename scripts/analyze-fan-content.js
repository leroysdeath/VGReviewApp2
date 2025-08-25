#!/usr/bin/env node

// Analyze Fan Content in Database and IGDB
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

global.fetch = fetch;

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

class FanContentAnalyzer {
  
  async analyzeDatabaseFanContent() {
    console.log('🔍 Analyzing database for fan-made content patterns...\n');
    
    const fanIndicators = ['mod', 'hack', 'fan', 'homebrew', 'patch', 'remix', 'unofficial', 'rom hack', 'community'];
    const results = {};
    
    for (const indicator of fanIndicators) {
      const { data, error } = await supabase
        .from('game')
        .select('name, developer, publisher')
        .ilike('name', `%${indicator}%`)
        .limit(5);
      
      if (data && data.length > 0) {
        results[indicator] = data;
        console.log(`📊 Games containing '${indicator}' (${data.length} found):`);
        data.forEach(game => {
          console.log(`   - ${game.name}`);
          console.log(`     Dev: ${game.developer || 'Unknown'}, Pub: ${game.publisher || 'Unknown'}`);
        });
        console.log();
      }
    }
    
    return results;
  }
  
  async analyzeIGDBFanContent() {
    console.log('🌐 Analyzing IGDB for fan-made content patterns...\n');
    
    const testQueries = [
      'Final Fantasy mod',
      'Mario ROM hack', 
      'Zelda fan game',
      'Skyrim mod',
      'Sonic homebrew'
    ];
    
    const results = {};
    
    for (const query of testQueries) {
      try {
        const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchTerm: query, limit: 5 })
        });
        
        const data = await response.json();
        if (data.success && data.games) {
          results[query] = data.games;
          console.log(`🎮 IGDB results for "${query}" (${data.games.length} found):`);
          data.games.forEach(game => {
            const companies = game.involved_companies?.map(ic => ic.company?.name).join(', ') || 'Unknown';
            console.log(`   - ${game.name} (${companies})`);
          });
          console.log();
        }
      } catch (error) {
        console.log(`❌ Error searching IGDB for "${query}":`, error.message);
      }
    }
    
    return results;
  }
  
  async findProtectedFranchisePatterns() {
    console.log('⚖️ Analyzing protected franchise patterns...\n');
    
    // Check for games with protected franchises but unknown/indie developers
    const protectedFranchises = ['mario', 'zelda', 'pokemon', 'final fantasy', 'mega man'];
    const patterns = {};
    
    for (const franchise of protectedFranchises) {
      const { data, error } = await supabase
        .from('game')
        .select('name, developer, publisher')
        .ilike('name', `%${franchise}%`)
        .limit(10);
      
      if (data && data.length > 0) {
        // Categorize by developer type
        const official = [];
        const unofficial = [];
        
        data.forEach(game => {
          const dev = (game.developer || '').toLowerCase();
          const pub = (game.publisher || '').toLowerCase();
          
          // Check if it's from known official companies
          const isOfficial = 
            dev.includes('nintendo') || dev.includes('square') || dev.includes('capcom') ||
            pub.includes('nintendo') || pub.includes('square') || pub.includes('capcom');
          
          if (isOfficial) {
            official.push(game);
          } else {
            unofficial.push(game);
          }
        });
        
        patterns[franchise] = { official, unofficial };
        
        console.log(`🎯 ${franchise.toUpperCase()} analysis:`);
        console.log(`   Official games: ${official.length}`);
        console.log(`   Unofficial/Unknown: ${unofficial.length}`);
        
        if (unofficial.length > 0) {
          console.log(`   Potentially problematic:`);
          unofficial.slice(0, 3).forEach(game => {
            console.log(`     - ${game.name} (${game.developer || 'Unknown'})`);
          });
        }
        console.log();
      }
    }
    
    return patterns;
  }
  
  generateCopyrightAggressionReport() {
    console.log('⚖️ COPYRIGHT AGGRESSION ANALYSIS\n');
    
    const companies = {
      'HIGHLY AGGRESSIVE (C&D frequently)': [
        'Nintendo - Extremely protective, frequent takedowns',
        'Disney - Very aggressive about IP protection',
        'Take-Two/Rockstar - Known for C&D letters against mods',
        'Square Enix - Protective of Final Fantasy, Dragon Quest',
        'Capcom - Frequently strikes fan projects',
        'Konami - Aggressive about Metal Gear, Castlevania'
      ],
      'MODERATELY AGGRESSIVE (Selective enforcement)': [
        'Sony/PlayStation - Varies by franchise',
        'Microsoft/Xbox - Generally moderate',
        'Activision Blizzard - Depends on franchise',
        'EA - Varies by property',
        'Ubisoft - Generally moderate'
      ],
      'MOD-FRIENDLY (Encourage or ignore fan content)': [
        'Bethesda - Actively supports modding (Skyrim, Fallout)',
        'Sega - Generally tolerant of fan games (Sonic)',
        'Valve - Supports community content (Steam Workshop)',
        'id Software - Historically mod-friendly (Doom, Quake)',
        'CD Projekt RED - Supports modding (Witcher, Cyberpunk)',
        'Paradox - Heavy mod support (EU4, CK3)',
        'Mojang/Microsoft - Minecraft mod ecosystem',
        'Garry Newman - Garry\'s Mod ecosystem'
      ]
    };
    
    Object.entries(companies).forEach(([category, companyList]) => {
      console.log(`${category}:`);
      companyList.forEach(company => console.log(`  • ${company}`));
      console.log();
    });
    
    return companies;
  }
}

async function main() {
  const analyzer = new FanContentAnalyzer();
  
  console.log('🔍 FAN CONTENT & COPYRIGHT ANALYSIS');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Analyze database content
    await analyzer.analyzeDatabaseFanContent();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Analyze IGDB content
    await analyzer.analyzeIGDBFanContent();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Find protected franchise patterns
    await analyzer.findProtectedFranchisePatterns();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Generate copyright report
    analyzer.generateCopyrightAggressionReport();
    
    console.log('📋 RECOMMENDATIONS:');
    console.log('1. Filter fan content ONLY for highly aggressive companies');
    console.log('2. Allow mods/fan games for mod-friendly companies');
    console.log('3. Use explicit indicators (mod, hack, fan) as primary filter');
    console.log('4. Whitelist official company releases always');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

main();