#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORTS_TO_CLEAN = [3000, 3001, 3002, 3003];
const PROCESSES_TO_KILL = [
  'node server/index.js',
  'vite --host'
];

async function killProcessesByName(processName) {
  try {
    const { stdout } = await execAsync(`pgrep -f "${processName}"`);
    const pids = stdout.trim().split('\n').filter(pid => pid && pid !== process.pid.toString());
    
    if (pids.length > 0) {
      console.log(`🔄 Killing processes matching "${processName}": ${pids.join(', ')}`);
      await execAsync(`kill -9 ${pids.join(' ')}`);
    }
  } catch (error) {
    // Process not found or already killed, which is fine
  }
}

async function killProcessesByPort(port) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(pid => pid && pid !== process.pid.toString());
    
    if (pids.length > 0) {
      console.log(`🔄 Killing processes on port ${port}: ${pids.join(', ')}`);
      await execAsync(`kill -9 ${pids.join(' ')}`);
    }
  } catch (error) {
    // Port not in use, which is fine
  }
}

async function cleanup() {
  console.log('🧹 Cleaning up conflicting processes and ports...');
  
  // Kill processes by name (avoid npm processes to prevent killing ourselves)
  for (const processName of PROCESSES_TO_KILL) {
    await killProcessesByName(processName);
  }
  
  // Kill processes by port
  for (const port of PORTS_TO_CLEAN) {
    await killProcessesByPort(port);
  }
  
  // Wait a moment for processes to fully terminate
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('✅ Cleanup completed!');
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanup().catch(console.error);
}

export default cleanup;
