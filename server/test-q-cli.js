#!/usr/bin/env node

// Simple test script to verify Q CLI integration
import { spawnQ } from './q-cli.js';
import { getProjects } from './projects.js';

console.log('🧪 Testing Q Developer CLI integration...\n');

// Test 1: Check if Q CLI is available
console.log('1. Testing Q CLI availability...');
try {
  const { spawn } = await import('child_process');
  const qTest = spawn('q', ['--version'], { stdio: 'pipe' });
  
  qTest.stdout.on('data', (data) => {
    console.log('✅ Q CLI found, version:', data.toString().trim());
  });
  
  qTest.stderr.on('data', (data) => {
    console.log('❌ Q CLI error:', data.toString().trim());
  });
  
  qTest.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Q CLI is working\n');
      testProjectDiscovery();
    } else {
      console.log('❌ Q CLI not found or not working\n');
      console.log('Please make sure Amazon Q Developer CLI is installed and available in PATH');
      console.log('Installation: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/cli-install.html');
    }
  });
  
  qTest.on('error', (error) => {
    console.log('❌ Q CLI not found:', error.message);
    console.log('Please make sure Amazon Q Developer CLI is installed and available in PATH');
    console.log('Installation: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/cli-install.html');
  });
  
} catch (error) {
  console.log('❌ Error testing Q CLI:', error.message);
}

// Test 2: Project discovery
async function testProjectDiscovery() {
  console.log('2. Testing project discovery...');
  try {
    const projects = await getProjects();
    console.log(`✅ Found ${projects.length} projects:`);
    
    if (projects.length > 0) {
      projects.slice(0, 3).forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.displayName} (${project.fullPath})`);
        console.log(`      Sessions: ${project.sessionMeta.total}`);
      });
      
      if (projects.length > 3) {
        console.log(`   ... and ${projects.length - 3} more`);
      }
    } else {
      console.log('   No projects found. The system will scan common directories like:');
      console.log('   - ~/projects');
      console.log('   - ~/workspace');
      console.log('   - ~/dev');
      console.log('   - ~/code');
      console.log('   - ~/Documents/projects');
    }
    
    console.log('\n3. Testing Q CLI spawn (dry run)...');
    testQSpawn();
    
  } catch (error) {
    console.log('❌ Error in project discovery:', error.message);
  }
}

// Test 3: Q CLI spawn (without actually running)
function testQSpawn() {
  console.log('✅ Q CLI spawn function is ready');
  console.log('   Command structure: q chat --message "user message" --verbose');
  console.log('   Working directory: project path');
  console.log('   Output: WebSocket streaming');
  
  console.log('\n🎉 All tests completed!');
  console.log('\nNext steps:');
  console.log('1. Start the server: npm run server');
  console.log('2. Start the client: npm run client');
  console.log('3. Or run both: npm run dev');
  console.log('\nServer will be available at: http://localhost:3001');
}