#!/usr/bin/env node

// Quick database check script
// Usage: node scripts/check-db.js

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

// Configuration - Load from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
  console.log('🔍 Checking your Supabase database...\n');
  
  // Test basic connection
  try {
    console.log('📡 Testing connection...');
    const { data, error } = await supabase.auth.getSession();
    if (error && !error.message.includes('session')) {
      throw error;
    }
    console.log('✅ Connected to Supabase\n');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }

  // Check for common table names that might contain games
  const tableNames = ['game', 'games', 'Game', 'Games', 'GAME', 'GAMES'];
  
  console.log('🔍 Checking for game-related tables...\n');
  
  for (const tableName of tableNames) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ Found table: "${tableName}"`);
        console.log(`   Row count: ${count || 0}`);
        
        // Check table structure
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!sampleError && sampleData && sampleData.length > 0) {
          console.log(`   Columns: ${Object.keys(sampleData[0]).join(', ')}`);
        }
        console.log('');
      }
    } catch (error) {
      // Table doesn't exist, that's fine
    }
  }

  // Check for any tables with 'igdb' in the name
  console.log('🔍 Checking for IGDB-related tables...\n');
  
  const igdbTableNames = ['igdb_games', 'igdb_sync_log', 'igdb_cache'];
  
  for (const tableName of igdbTableNames) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ Found IGDB table: "${tableName}"`);
        console.log(`   Row count: ${count || 0}\n`);
      }
    } catch (error) {
      // Table doesn't exist, that's fine
    }
  }

  console.log('💡 Summary:');
  console.log('If you don\'t see a "game" or "games" table above, you\'ll need to:');
  console.log('1. Create a game table in your Supabase database, OR');
  console.log('2. Modify the sync script to use your existing table name');
  console.log('');
  console.log('Example SQL to create a basic game table:');
  console.log(`
CREATE TABLE game (
  id SERIAL PRIMARY KEY,
  igdb_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  release_date TIMESTAMP,
  igdb_rating NUMERIC,
  cover_url TEXT,
  pic_url TEXT,
  genre TEXT,
  genres JSONB,
  developer TEXT,
  publisher TEXT,
  platforms JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
  `);
}

checkDatabase().catch(error => {
  console.error('💥 Database check failed:', error.message);
  process.exit(1);
});