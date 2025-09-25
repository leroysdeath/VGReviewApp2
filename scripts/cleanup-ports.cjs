#!/usr/bin/env node

const { exec } = require('child_process');

/**
 * Quick port cleanup for development - kills processes on ports 5173 and 8888
 */

function killSpecificPorts() {
  const ports = [5173, 8888];
  console.log(`🧹 Freeing ports ${ports.join(', ')} for development...`);
  
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
                console.log(`✅ Freed port ${port}`);
              }
            });
          }
        });
      }
    });
  });
  
  // Exit after a brief delay
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

// Run immediately
killSpecificPorts();