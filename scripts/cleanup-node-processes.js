#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');

/**
 * Cleanup script to kill orphaned Node.js processes from development servers
 * This prevents accumulation of Node processes that slow down the machine
 */

const PROTECTED_PROCESSES = [
  'node.exe', // Keep generic node processes that might be system-related
];

const DEV_SERVER_PATTERNS = [
  'netlify',
  'vite',
  'webpack',
  'dev-server',
  'nodemon',
  'ts-node',
  'jest',
  'test',
];

function killNodeProcesses() {
  return new Promise((resolve, reject) => {
    console.log('🧹 Cleaning up orphaned Node.js development processes...');
    
    // Get all Node processes with command line info
    exec('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error getting process list:', error);
        reject(error);
        return;
      }

      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node,'));
      const processesToKill = [];

      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const commandLine = parts[1] || '';
          const pid = parts[2] ? parts[2].trim() : '';
          
          if (pid && commandLine) {
            // Check if this is a development server process
            const isDev = DEV_SERVER_PATTERNS.some(pattern => 
              commandLine.toLowerCase().includes(pattern)
            );
            
            if (isDev) {
              processesToKill.push({ pid, command: commandLine });
            }
          }
        }
      });

      if (processesToKill.length === 0) {
        console.log('✅ No orphaned development Node processes found');
        resolve();
        return;
      }

      console.log(`🎯 Found ${processesToKill.length} development processes to clean up:`);
      processesToKill.forEach(proc => {
        console.log(`  - PID ${proc.pid}: ${proc.command.substring(0, 80)}...`);
      });

      let killed = 0;
      let errors = 0;

      processesToKill.forEach(proc => {
        exec(`taskkill /PID ${proc.pid} /F`, (killError) => {
          if (killError) {
            console.error(`❌ Failed to kill PID ${proc.pid}:`, killError.message);
            errors++;
          } else {
            console.log(`✅ Killed development process PID ${proc.pid}`);
            killed++;
          }

          if (killed + errors === processesToKill.length) {
            console.log(`\n🏁 Cleanup complete: ${killed} killed, ${errors} errors`);
            resolve();
          }
        });
      });
    });
  });
}

function killPortProcesses() {
  return new Promise((resolve) => {
    console.log('🔌 Cleaning up processes on common development ports...');
    
    const ports = [3000, 5173, 8888, 4000, 8000, 9000];
    let completed = 0;
    
    ports.forEach(port => {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
              exec(`taskkill /PID ${pid} /F`, (killError) => {
                if (!killError) {
                  console.log(`✅ Freed port ${port} (killed PID ${pid})`);
                }
              });
            }
          });
        }
        
        completed++;
        if (completed === ports.length) {
          resolve();
        }
      });
    });
    
    // Resolve after timeout if no ports are busy
    setTimeout(() => {
      if (completed < ports.length) {
        console.log('⏱️  Port cleanup timeout - continuing');
        resolve();
      }
    }, 3000);
  });
}

async function main() {
  try {
    console.log('🚀 Starting Node.js process cleanup...\n');
    
    await killPortProcesses();
    console.log('');
    await killNodeProcesses();
    
    console.log('\n✨ All cleanup tasks completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  main();
}

module.exports = { killNodeProcesses, killPortProcesses };