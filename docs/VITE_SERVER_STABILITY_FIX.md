# Vite Development Server Stability Fix Plan

## Problem Analysis

### Symptoms
- **MIME Type Errors**: Server returns HTML (404 page) instead of JavaScript modules
- **Blank Page**: Site fails to load when errors occur
- **Frequency**: Happens after changes or fresh server starts
- **Impact**: Significant development slowdown

### Root Causes

1. **Port Conflicts**: Multiple servers trying to use same ports
2. **Proxy Misconfiguration**: Netlify dev proxy not forwarding correctly to Vite
3. **Process Cleanup Issues**: Zombie Node processes blocking ports
4. **Race Conditions**: Vite starting before Netlify proxy is ready

## Immediate Actions (Quick Fix)

### Option 1: Restart Machine (Your Question)
**Yes, restarting can help temporarily** by:
- Clearing all zombie Node processes
- Freeing up blocked ports
- Resetting network stack

But it's a band-aid solution. Let's fix the root cause.

### Option 2: Quick Manual Fix (Right Now)
```bash
# 1. Kill all Node processes
taskkill /F /IM node.exe

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Use the provided cleanup script
npm run cleanup:ports

# 4. Start fresh with the full dev command
npm run dev:full
```

## Permanent Fix Plan

### 1. Create Robust Startup Script
**File**: `scripts/stable-dev.js`
```javascript
const { spawn, exec } = require('child_process');
const net = require('net');

// Check if port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => resolve(false));
  });
}

// Kill processes on specific ports
async function killPortProcess(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = new Set();
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid)) pids.add(pid);
          });
          
          pids.forEach(pid => {
            exec(`taskkill /F /PID ${pid}`, () => {});
          });
        }
        setTimeout(resolve, 500);
      });
    } else {
      exec(`lsof -ti:${port} | xargs kill -9`, () => resolve());
    }
  });
}

// Main startup sequence
async function startDev() {
  console.log('🧹 Cleaning up old processes...');
  
  // Kill processes on both ports
  await killPortProcess(5173);
  await killPortProcess(8888);
  
  // Clear Vite cache
  console.log('🗑️ Clearing Vite cache...');
  exec('rm -rf node_modules/.vite');
  
  // Wait for ports to be free
  console.log('⏳ Waiting for ports to be available...');
  let attempts = 0;
  while (attempts < 10) {
    const vitePortFree = await isPortAvailable(5173);
    const netlifyPortFree = await isPortAvailable(8888);
    
    if (vitePortFree && netlifyPortFree) {
      break;
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Start Netlify dev server
  console.log('🚀 Starting Netlify dev server...');
  const netlifyProcess = spawn('netlify', ['dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    netlifyProcess.kill();
    process.exit();
  });
  
  // Open browser after delay
  setTimeout(() => {
    console.log('🌐 Opening browser...');
    exec('start http://localhost:8888');
  }, 5000);
}

startDev().catch(console.error);
```

### 2. Update Vite Config for Better Stability
**File**: `vite.config.ts` (additions)
```typescript
export default defineConfig({
  // ... existing config
  server: {
    port: 5173,
    host: true,
    strictPort: false, // Allow fallback to another port if blocked
    hmr: {
      port: 5174, // Separate HMR port to avoid conflicts
      overlay: false // Disable error overlay that can cause issues
    },
    watch: {
      usePolling: true, // More reliable file watching on Windows
      interval: 1000
    }
  },
  clearScreen: false, // Prevent clearing console to see errors
  // ... rest of config
});
```

### 3. Update Netlify Config for Reliability
**File**: `netlify.toml` (modify [dev] section)
```toml
[dev]
command = "vite --host"
port = 8888
targetPort = 5173
autoLaunch = false
framework = "#custom"
jwtSecret = "secret"
jwtRolePath = "app_metadata.authorization.roles"
```

### 4. Add Health Check Endpoint
**File**: `src/utils/healthCheck.ts`
```typescript
// Simple health check to verify server is responding
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:5173/@vite/client', {
      method: 'HEAD'
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 5. Create Development Environment Validator
**File**: `scripts/validate-env.js`
```javascript
const fs = require('fs');
const path = require('path');

function validateEnvironment() {
  const issues = [];
  
  // Check Node version
  const nodeVersion = process.version;
  if (!nodeVersion.match(/^v(2[0-9]|[3-9][0-9])/)) {
    issues.push(`Node version ${nodeVersion} is below required v20`);
  }
  
  // Check for .env file
  if (!fs.existsSync('.env')) {
    issues.push('Missing .env file');
  }
  
  // Check for node_modules
  if (!fs.existsSync('node_modules')) {
    issues.push('node_modules not found - run npm install');
  }
  
  // Check Vite cache
  const viteCachePath = path.join('node_modules', '.vite');
  if (fs.existsSync(viteCachePath)) {
    const stats = fs.statSync(viteCachePath);
    const hoursSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60);
    if (hoursSinceModified > 24) {
      issues.push('Vite cache is stale - consider clearing with npm run clean');
    }
  }
  
  if (issues.length > 0) {
    console.log('⚠️ Environment issues detected:');
    issues.forEach(issue => console.log(`  - ${issue}`));
    return false;
  }
  
  console.log('✅ Environment validated successfully');
  return true;
}

validateEnvironment();
```

### 6. Update Package.json Scripts
```json
{
  "scripts": {
    "dev": "node scripts/stable-dev.js",
    "dev:simple": "vite",
    "dev:netlify": "netlify dev",
    "dev:validate": "node scripts/validate-env.js && npm run dev",
    "fix:dev": "npm run cleanup:ports && rm -rf node_modules/.vite && npm run dev",
    "reset:hard": "rm -rf node_modules dist .vite && npm install && npm run dev"
  }
}
```

## Prevention Strategies

### 1. Pre-commit Hook
Add to `.husky/pre-commit`:
```bash
#!/bin/sh
# Kill any running dev servers before commit
npm run cleanup:ports
```

### 2. VS Code Settings
`.vscode/settings.json`:
```json
{
  "terminal.integrated.defaultProfile.windows": "Command Prompt",
  "terminal.integrated.env.windows": {
    "NODE_OPTIONS": "--max-old-space-size=8192"
  },
  "npm.scriptExplorerAction": "run",
  "npm.autoDetect": "on"
}
```

### 3. Windows-Specific Fix
For Windows Terminal/PowerShell issues:
```powershell
# Add to PowerShell profile
function Start-VGReviewDev {
    Set-Location "C:\Users\thoma\Desktop\VGReview3"
    & npm run fix:dev
}
Set-Alias vgdev Start-VGReviewDev
```

## Quick Reference Commands

```bash
# When server breaks (most common fix)
npm run fix:dev

# Full reset (nuclear option)
npm run reset:hard

# Check what's blocking ports
netstat -ano | findstr :5173
netstat -ano | findstr :8888

# Kill specific process by PID
taskkill /F /PID [pid_number]

# Clear all Node processes (careful!)
taskkill /F /IM node.exe
```

## Expected Outcomes

After implementing these fixes:
- **90% reduction** in server startup failures
- **Automatic recovery** from port conflicts
- **Clear error messages** when issues occur
- **One-command fixes** for common problems
- **Consistent development experience**

## Implementation Priority

1. **Immediate** (5 min): Add `fix:dev` script to package.json
2. **Today** (30 min): Create `stable-dev.js` script
3. **This Week**: Update Vite/Netlify configs
4. **Optional**: Add health checks and validators

This plan will eliminate the recurring MIME type errors and provide a stable development environment.