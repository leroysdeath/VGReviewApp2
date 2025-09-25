#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

/**
 * Starts both Vite dev server and Netlify functions
 * Vite runs on port 5173 for the app
 * Netlify functions run on port 8888 for API
 */

function cleanupPorts() {
  return new Promise((resolve) => {
    console.log('🧹 Cleaning up ports 5173 and 8888...');
    
    const ports = [5173, 8888];
    let completed = 0;
    
    ports.forEach(port => {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.split('\n').filter(line => line.includes('LISTENING'));
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
              exec(`taskkill /PID ${pid} /F`, () => {
                console.log(`✅ Freed port ${port}`);
              });
            }
          });
        }
        
        completed++;
        if (completed === ports.length) {
          setTimeout(resolve, 500); // Brief delay to ensure ports are free
        }
      });
    });
  });
}

async function startDev() {
  // First cleanup ports
  await cleanupPorts();
  
  console.log('\n🚀 Starting development servers...\n');
  
  // Start Vite
  console.log('📦 Starting Vite on http://localhost:5173');
  const vite = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'inherit'
  });
  
  // Give Vite a moment to start
  setTimeout(() => {
    console.log('\n⚡ Starting Netlify functions on http://localhost:8888');
    
    // Start Netlify functions only (not the full dev server)
    const netlify = spawn('netlify', ['functions:serve'], {
      shell: true,
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down development servers...');
      vite.kill();
      netlify.kill();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      vite.kill();
      netlify.kill();
      process.exit(0);
    });
    
  }, 3000);
  
  console.log('\n✨ Development environment starting...');
  console.log('   App: http://localhost:5173');
  console.log('   API: http://localhost:8888/.netlify/functions/');
  console.log('\n📝 Press Ctrl+C to stop\n');
}

// Run
startDev().catch(console.error);