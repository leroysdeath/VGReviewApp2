#!/usr/bin/env node

// Database Migration Script - Apply specific migrations to Supabase
// Usage: node scripts/apply-migrations.js [migration-files...]

// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration - Load from environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  }
});

class MigrationRunner {
  async runMigration(migrationFile) {
    const migrationPath = resolve(__dirname, '../supabase/migrations', migrationFile);
    
    try {
      console.log(`\n📄 Reading migration: ${migrationFile}`);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      if (!migrationSQL.trim()) {
        console.log('   ⚠️  Migration file is empty, skipping');
        return { success: true, skipped: true };
      }
      
      console.log(`   📊 Migration size: ${migrationSQL.length} characters`);
      console.log(`   🚀 Executing migration...`);
      
      // Execute the migration
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      });
      
      if (error) {
        // Try alternative approach if exec_sql doesn't exist
        if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
          console.log('   ⚠️  exec_sql function not found, trying direct execution...');
          
          // Split SQL into individual statements and execute them
          const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--'));
          
          for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement) continue;
            
            console.log(`     Running statement ${i + 1}/${statements.length}...`);
            
            try {
              // Use a generic query for DDL statements
              const result = await supabase
                .from('_migrations_temp')
                .select('1')
                .limit(0);
              
              // This approach won't work for DDL, so we'll need to warn the user
              console.log('   ❌ Cannot execute DDL statements through Supabase client');
              console.log('   💡 Please apply this migration manually through Supabase Dashboard SQL Editor');
              return { success: false, needsManualApplication: true };
            } catch (stmtError) {
              console.log(`     ❌ Statement ${i + 1} failed:`, stmtError.message);
              return { success: false, error: stmtError };
            }
          }
        } else {
          throw error;
        }
      }
      
      console.log('   ✅ Migration executed successfully');
      return { success: true };
      
    } catch (error) {
      console.error(`   ❌ Migration failed:`, error.message);
      return { success: false, error };
    }
  }
  
  async testConnection() {
    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Try a simple query to test connection
      const { data, error } = await supabase
        .from('game')
        .select('id')
        .limit(1);
      
      if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        throw error;
      }
      
      console.log('✅ Supabase connection working');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
  }
}

// Predefined safe migrations (skip the problematic function security ones)
const SAFE_MIGRATIONS = [
  '20250821_optimize_indexes.sql',
  '20250821_optimize_performance.sql', 
  '20250821_fix_remaining_performance_issues.sql',
  '20250821_fix_security_issues.sql'  // This one should be safe as it's mainly view fixes
];

// CLI argument parsing
const args = process.argv.slice(2);

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📊 Database Migration Script

Usage: node scripts/apply-migrations.js [options] [migration-files...]

Options:
  --safe              Apply only the predefined safe migrations
  --all               Apply all available migrations (dangerous!)
  --list              List available migrations
  --help, -h          Show this help

Examples:
  node scripts/apply-migrations.js --safe
  node scripts/apply-migrations.js 20250821_optimize_indexes.sql
  node scripts/apply-migrations.js --list

⚠️  Note: This script cannot execute DDL statements directly.
   For complex migrations, you may need to apply them manually
   through the Supabase Dashboard SQL Editor.
`);
  process.exit(0);
}

// List migrations
if (args.includes('--list')) {
  console.log('\n📋 Safe migrations available:');
  SAFE_MIGRATIONS.forEach((migration, index) => {
    console.log(`  ${index + 1}. ${migration}`);
  });
  console.log('\n⚠️  Skipped migrations (potentially problematic):');
  console.log('  - 20250821_fix_function_security_warnings.sql');
  console.log('  - 20250821_fix_function_security_warnings_v2.sql');
  process.exit(0);
}

// Main execution
async function main() {
  console.log('📊 Database Migration Script Starting...\n');
  
  const runner = new MigrationRunner();
  
  // Test connection first
  const connected = await runner.testConnection();
  if (!connected) {
    console.error('\n❌ Cannot connect to database. Please check your configuration.');
    process.exit(1);
  }
  
  let migrationsToRun = [];
  
  if (args.includes('--safe')) {
    migrationsToRun = SAFE_MIGRATIONS;
    console.log('🛡️  Running safe migrations only\n');
  } else if (args.includes('--all')) {
    console.log('⚠️  --all flag detected. This is dangerous and not recommended.');
    console.log('     Use --safe instead or specify individual migration files.');
    process.exit(1);
  } else if (args.length > 0) {
    // Filter out flag arguments
    migrationsToRun = args.filter(arg => !arg.startsWith('--'));
    console.log(`🎯 Running specified migrations: ${migrationsToRun.join(', ')}\n`);
  } else {
    console.log('❓ No migrations specified. Use --safe for recommended migrations.');
    console.log('   Or use --help for more options.');
    process.exit(1);
  }
  
  if (migrationsToRun.length === 0) {
    console.log('✅ No migrations to run');
    process.exit(0);
  }
  
  // Run migrations
  let successCount = 0;
  let failureCount = 0;
  const manualMigrations = [];
  
  for (const migration of migrationsToRun) {
    const result = await runner.runMigration(migration);
    
    if (result.success) {
      successCount++;
      if (result.skipped) {
        console.log(`   ⏭️  Skipped (empty file)`);
      }
    } else {
      failureCount++;
      if (result.needsManualApplication) {
        manualMigrations.push(migration);
      }
    }
  }
  
  // Summary
  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  
  if (manualMigrations.length > 0) {
    console.log(`\n⚠️  The following migrations need manual application:`);
    manualMigrations.forEach(migration => {
      console.log(`   📋 ${migration}`);
    });
    console.log('\n💡 To apply manually:');
    console.log('   1. Open Supabase Dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy and paste the SQL from each migration file');
    console.log('   4. Execute each migration');
  }
  
  if (failureCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failureCount} migration(s) need attention`);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});