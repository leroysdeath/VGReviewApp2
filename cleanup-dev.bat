@echo off
echo Cleaning up Node.js development processes...
cd /d "%~dp0"
node scripts/cleanup-node-processes.js
pause