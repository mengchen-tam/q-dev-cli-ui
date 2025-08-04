import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

let activeQProcesses = new Map(); // Track active processes by session ID

async function spawnQ(command, options = {}, ws) {
  return new Promise(async (resolve, reject) => {
    const { sessionId, projectPath, cwd, resume, toolsSettings, permissionMode, images } = options;
    let capturedSessionId = sessionId; // Track session ID throughout the process
    let sessionCreatedSent = false; // Track if we've already sent session-created event
    
    // Use tools settings passed from frontend, or defaults
    const settings = toolsSettings || {
      allowedTools: [],
      disallowedTools: [],
      skipPermissions: false
    };
    
    // Build Q CLI command
    const args = [];
    
    // Q Developer CLI uses 'chat' command for interactive sessions
    args.push('chat');
    
    // Add the message if provided (Q CLI expects the message as a positional argument, not --message flag)
    if (command && command.trim()) {
      args.push(command);
    }
    
    // Use cwd (actual project directory)
    const workingDir = cwd || process.cwd();
    
    // Handle images by saving them to temporary files and passing paths to Q
    const tempImagePaths = [];
    let tempDir = null;
    if (images && images.length > 0) {
      try {
        // Create temp directory in the project directory so Q can access it
        tempDir = path.join(workingDir, '.tmp', 'images', Date.now().toString());
        await fs.mkdir(tempDir, { recursive: true });
        
        // Save each image to a temp file
        for (const [index, image] of images.entries()) {
          // Extract base64 data and mime type
          const matches = image.data.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) {
            console.error('Invalid image data format');
            continue;
          }
          
          const [, mimeType, base64Data] = matches;
          const extension = mimeType.split('/')[1] || 'png';
          const filename = `image_${index}.${extension}`;
          const filepath = path.join(tempDir, filename);
          
          // Write base64 data to file
          await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
          tempImagePaths.push(filepath);
        }
        
        // Include the full image paths in the prompt for Q to reference
        if (tempImagePaths.length > 0 && command && command.trim()) {
          const imageNote = `\n\n[Images provided at the following paths:]\n${tempImagePaths.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
          const modifiedCommand = command + imageNote;
          
          // Update the command in args
          const messageIndex = args.indexOf('--message');
          if (messageIndex !== -1 && args[messageIndex + 1]) {
            args[messageIndex + 1] = modifiedCommand;
          }
        }
        
      } catch (error) {
        console.error('Error processing images for Q:', error);
      }
    }
    
    // Add verbose output for better debugging
    args.push('--verbose');
    
    console.log(`🚀 Spawning Q CLI with args:`, args);
    console.log(`📁 Working directory: ${workingDir}`);
    
    // Spawn the Q CLI process
    const qProcess = spawn('q', args, {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '0', // Disable colors for cleaner output
        NO_COLOR: '1'
      }
    });
    
    // Store the process for potential abortion
    if (capturedSessionId) {
      activeQProcesses.set(capturedSessionId, qProcess);
    }
    
    let outputBuffer = '';
    let errorBuffer = '';
    
    // Handle stdout data
    qProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      outputBuffer += chunk;
      
      console.log('Q stdout:', chunk);
      
      // Send real-time output to WebSocket
      if (ws && ws.readyState === 1) {
        try {
          // For Q CLI, we'll send the output as streaming text
          ws.send(JSON.stringify({
            type: 'q-output',
            data: chunk,
            sessionId: capturedSessionId,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      }
    });
    
    // Handle stderr data
    qProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorBuffer += chunk;
      
      console.log('Q stderr:', chunk);
      
      // Send error output to WebSocket
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({
            type: 'q-error',
            data: chunk,
            sessionId: capturedSessionId,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Error sending WebSocket error message:', error);
        }
      }
    });
    
    // Handle process completion
    qProcess.on('close', (code) => {
      console.log(`Q process exited with code ${code}`);
      
      // Clean up temp images
      if (tempDir) {
        fs.rmdir(tempDir, { recursive: true }).catch(err => {
          console.error('Error cleaning up temp images:', err);
        });
      }
      
      // Remove from active processes
      if (capturedSessionId) {
        activeQProcesses.delete(capturedSessionId);
      }
      
      // Send completion message to WebSocket
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({
            type: 'q-complete',
            sessionId: capturedSessionId,
            exitCode: code,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Error sending completion message:', error);
        }
      }
      
      if (code === 0) {
        resolve({
          success: true,
          output: outputBuffer,
          sessionId: capturedSessionId
        });
      } else {
        reject(new Error(`Q CLI exited with code ${code}: ${errorBuffer}`));
      }
    });
    
    // Handle process errors
    qProcess.on('error', (error) => {
      console.error('Q process error:', error);
      
      // Clean up temp images
      if (tempDir) {
        fs.rmdir(tempDir, { recursive: true }).catch(err => {
          console.error('Error cleaning up temp images:', err);
        });
      }
      
      // Remove from active processes
      if (capturedSessionId) {
        activeQProcesses.delete(capturedSessionId);
      }
      
      // Send error message to WebSocket
      if (ws && ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({
            type: 'q-error',
            error: error.message,
            sessionId: capturedSessionId,
            timestamp: new Date().toISOString()
          }));
        } catch (wsError) {
          console.error('Error sending WebSocket error message:', wsError);
        }
      }
      
      reject(error);
    });
    
    // Send initial session created message
    if (ws && ws.readyState === 1 && !sessionCreatedSent) {
      try {
        ws.send(JSON.stringify({
          type: 'session-created',
          sessionId: capturedSessionId || `q-session-${Date.now()}`,
          timestamp: new Date().toISOString()
        }));
        sessionCreatedSent = true;
      } catch (error) {
        console.error('Error sending session-created message:', error);
      }
    }
  });
}

async function abortQSession(sessionId) {
  console.log(`🛑 Attempting to abort Q session: ${sessionId}`);
  
  const qProcess = activeQProcesses.get(sessionId);
  if (qProcess && !qProcess.killed) {
    try {
      // Try graceful termination first
      qProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!qProcess.killed) {
          console.log(`🔪 Force killing Q session: ${sessionId}`);
          qProcess.kill('SIGKILL');
        }
      }, 5000);
      
      activeQProcesses.delete(sessionId);
      console.log(`✅ Q session aborted: ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error aborting Q session ${sessionId}:`, error);
      return false;
    }
  } else {
    console.log(`⚠️ No active Q process found for session: ${sessionId}`);
    return false;
  }
}

// Clean up all active processes on server shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Q CLI processes...');
  for (const [sessionId, qProcess] of activeQProcesses) {
    if (!qProcess.killed) {
      qProcess.kill('SIGTERM');
    }
  }
  activeQProcesses.clear();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Q CLI processes...');
  for (const [sessionId, qProcess] of activeQProcesses) {
    if (!qProcess.killed) {
      qProcess.kill('SIGTERM');
    }
  }
  activeQProcesses.clear();
  process.exit(0);
});

export { spawnQ, abortQSession };