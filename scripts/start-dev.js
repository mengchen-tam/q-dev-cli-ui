#!/usr/bin/env node

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import cleanup from './cleanup-ports.js';

const execAsync = promisify(exec);

async function startDev() {
  console.log('🚀 Starting Q Developer WebUI...\n');
  
  // Run cleanup first
  await cleanup();
  
  console.log('🔧 Starting development servers...\n');
  
  // Start the development servers
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...');
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down development servers...');
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  devProcess.on('exit', (code) => {
    console.log(`\n📋 Development servers exited with code ${code}`);
    process.exit(code);
  });
}

startDev().catch(console.error);
