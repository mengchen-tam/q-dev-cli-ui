import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';

// Cache for extracted project directories
const projectDirectoryCache = new Map();
let cacheTimestamp = Date.now();

// Clear cache when needed (called when project files change)
function clearProjectDirectoryCache() {
  projectDirectoryCache.clear();
  cacheTimestamp = Date.now();
}

// Load project configuration file for Q Developer
async function loadProjectConfig() {
  const configPath = path.join(process.env.HOME, '.q-developer', 'project-config.json');
  try {
    const configData = await fs.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    // Return empty config if file doesn't exist
    return {};
  }
}

// Save project configuration file for Q Developer
async function saveProjectConfig(config) {
  const configDir = path.join(process.env.HOME, '.q-developer');
  const configPath = path.join(configDir, 'project-config.json');
  
  // Ensure directory exists
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// Generate better display name from path
async function generateDisplayName(projectName, actualProjectDir = null) {
  // Use actual project directory if provided, otherwise use project name directly
  let projectPath = actualProjectDir || projectName;
  
  // Try to read package.json from the project path
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageData = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageData);
    
    // Return the name from package.json if it exists
    if (packageJson.name) {
      return packageJson.name;
    }
  } catch (error) {
    // Fall back to path-based naming if package.json doesn't exist or can't be read
  }
  
  // Try to read README.md for project title
  try {
    const readmePath = path.join(projectPath, 'README.md');
    const readmeData = await fs.readFile(readmePath, 'utf8');
    const lines = readmeData.split('\n');
    
    // Look for the first heading
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }
  } catch (error) {
    // Fall back if README doesn't exist
  }
  
  // Fall back to directory name
  return path.basename(projectPath);
}

// Get Q Developer projects by scanning common project directories
async function getProjects() {
  try {
    const projects = [];
    const config = await loadProjectConfig();
    
    // Define common project directories to scan
    const projectDirs = [
      path.join(os.homedir(), 'projects'),
      path.join(os.homedir(), 'workspace'),
      path.join(os.homedir(), 'dev'),
      path.join(os.homedir(), 'code'),
      path.join(os.homedir(), 'Documents', 'projects'),
      os.homedir() // Also scan home directory for immediate subdirectories
    ];
    
    // Add manually configured project directories
    if (config.additionalProjectDirs) {
      projectDirs.push(...config.additionalProjectDirs);
    }
    
    const foundProjects = new Set();
    
    for (const baseDir of projectDirs) {
      try {
        const exists = await fs.access(baseDir).then(() => true).catch(() => false);
        if (!exists) continue;
        
        const entries = await fs.readdir(baseDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const projectPath = path.join(baseDir, entry.name);
            
            // Skip hidden directories and common non-project directories
            if (entry.name.startsWith('.') || 
                ['node_modules', 'dist', 'build', 'target', '.git'].includes(entry.name)) {
              continue;
            }
            
            // Check if this looks like a project directory
            const isProject = await isProjectDirectory(projectPath);
            if (isProject && !foundProjects.has(projectPath)) {
              foundProjects.add(projectPath);
              
              const displayName = await generateDisplayName(entry.name, projectPath);
              const sessions = await getSessionsForProject(projectPath);
              
              projects.push({
                name: entry.name,
                displayName: displayName,
                fullPath: projectPath,
                sessionMeta: {
                  total: sessions.length,
                  lastActivity: sessions.length > 0 ? 
                    Math.max(...sessions.map(s => new Date(s.updated_at || s.created_at).getTime())) : 
                    null
                },
                sessions: sessions
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${baseDir}:`, error);
      }
    }
    
    // Sort projects by last activity
    projects.sort((a, b) => {
      const aTime = a.sessionMeta.lastActivity || 0;
      const bTime = b.sessionMeta.lastActivity || 0;
      return bTime - aTime;
    });
    
    return projects;
  } catch (error) {
    console.error('Error getting Q Developer projects:', error);
    return [];
  }
}

// Check if a directory looks like a project directory
async function isProjectDirectory(dirPath) {
  try {
    const entries = await fs.readdir(dirPath);
    
    // Check for common project indicators
    const projectIndicators = [
      'package.json',
      'pom.xml',
      'Cargo.toml',
      'requirements.txt',
      'setup.py',
      'pyproject.toml',
      'go.mod',
      'Makefile',
      'CMakeLists.txt',
      '.git',
      'src',
      'lib',
      'README.md',
      'README.txt'
    ];
    
    return projectIndicators.some(indicator => entries.includes(indicator));
  } catch (error) {
    return false;
  }
}

// Get sessions for a specific project (Q Developer doesn't have built-in session management like Claude)
// We'll create a simple session tracking system
async function getSessionsForProject(projectPath) {
  try {
    const sessionsDir = path.join(os.homedir(), '.q-developer', 'sessions', path.basename(projectPath));
    
    const exists = await fs.access(sessionsDir).then(() => true).catch(() => false);
    if (!exists) {
      return [];
    }
    
    const sessionFiles = await fs.readdir(sessionsDir);
    const sessions = [];
    
    for (const file of sessionFiles) {
      if (file.endsWith('.json')) {
        try {
          const sessionPath = path.join(sessionsDir, file);
          const sessionData = await fs.readFile(sessionPath, 'utf8');
          const session = JSON.parse(sessionData);
          sessions.push(session);
        } catch (error) {
          console.error(`Error reading session file ${file}:`, error);
        }
      }
    }
    
    // Sort by creation date, newest first
    sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return sessions;
  } catch (error) {
    console.error(`Error getting sessions for project ${projectPath}:`, error);
    return [];
  }
}

// Get all sessions across all projects
async function getSessions() {
  try {
    const projects = await getProjects();
    const allSessions = [];
    
    for (const project of projects) {
      if (project.sessions) {
        allSessions.push(...project.sessions.map(session => ({
          ...session,
          projectName: project.name,
          projectPath: project.fullPath
        })));
      }
    }
    
    return allSessions;
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return [];
  }
}

// Get messages for a specific session
async function getSessionMessages(sessionId) {
  try {
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return [];
    }
    
    const messagesPath = path.join(os.homedir(), '.q-developer', 'sessions', 
                                   path.basename(session.projectPath), `${sessionId}_messages.jsonl`);
    
    const exists = await fs.access(messagesPath).then(() => true).catch(() => false);
    if (!exists) {
      return [];
    }
    
    const messagesData = await fs.readFile(messagesPath, 'utf8');
    const messages = messagesData.trim().split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
    
    return messages;
  } catch (error) {
    console.error(`Error getting messages for session ${sessionId}:`, error);
    return [];
  }
}

// Create a new session for a project
async function createSession(projectPath, title = null) {
  try {
    const sessionId = `q-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sessionsDir = path.join(os.homedir(), '.q-developer', 'sessions', path.basename(projectPath));
    
    // Ensure sessions directory exists
    await fs.mkdir(sessionsDir, { recursive: true });
    
    const session = {
      id: sessionId,
      title: title || `Session ${new Date().toLocaleString()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      projectPath: projectPath,
      messageCount: 0
    };
    
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf8');
    
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

// Add a message to a session
async function addMessageToSession(sessionId, message) {
  try {
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const messagesPath = path.join(os.homedir(), '.q-developer', 'sessions', 
                                   path.basename(session.projectPath), `${sessionId}_messages.jsonl`);
    
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString(),
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Append message to JSONL file
    await fs.appendFile(messagesPath, JSON.stringify(messageWithTimestamp) + '\n', 'utf8');
    
    // Update session metadata
    const sessionsDir = path.join(os.homedir(), '.q-developer', 'sessions', path.basename(session.projectPath));
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
    
    session.updated_at = new Date().toISOString();
    session.messageCount = (session.messageCount || 0) + 1;
    
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2), 'utf8');
    
    return messageWithTimestamp;
  } catch (error) {
    console.error('Error adding message to session:', error);
    throw error;
  }
}

// Rename a project
async function renameProject(oldName, newName) {
  // For Q Developer, we'll update the display name in config
  const config = await loadProjectConfig();
  
  if (!config.projectDisplayNames) {
    config.projectDisplayNames = {};
  }
  
  config.projectDisplayNames[oldName] = newName;
  await saveProjectConfig(config);
  
  return true;
}

// Delete a session
async function deleteSession(sessionId) {
  try {
    const sessions = await getSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      return false;
    }
    
    const sessionsDir = path.join(os.homedir(), '.q-developer', 'sessions', path.basename(session.projectPath));
    const sessionPath = path.join(sessionsDir, `${sessionId}.json`);
    const messagesPath = path.join(sessionsDir, `${sessionId}_messages.jsonl`);
    
    // Delete session file
    try {
      await fs.unlink(sessionPath);
    } catch (error) {
      console.error('Error deleting session file:', error);
    }
    
    // Delete messages file
    try {
      await fs.unlink(messagesPath);
    } catch (error) {
      console.error('Error deleting messages file:', error);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

// Delete a project (remove from tracking, don't delete actual files)
async function deleteProject(projectName) {
  try {
    // Remove project from config
    const config = await loadProjectConfig();
    
    if (config.projectDisplayNames) {
      delete config.projectDisplayNames[projectName];
    }
    
    if (config.additionalProjectDirs) {
      config.additionalProjectDirs = config.additionalProjectDirs.filter(dir => 
        path.basename(dir) !== projectName
      );
    }
    
    await saveProjectConfig(config);
    
    // Optionally clean up sessions for this project
    const sessionsDir = path.join(os.homedir(), '.q-developer', 'sessions', projectName);
    try {
      await fs.rmdir(sessionsDir, { recursive: true });
    } catch (error) {
      // Sessions directory might not exist
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

// Add a project manually
async function addProjectManually(projectPath) {
  try {
    const config = await loadProjectConfig();
    
    if (!config.additionalProjectDirs) {
      config.additionalProjectDirs = [];
    }
    
    if (!config.additionalProjectDirs.includes(projectPath)) {
      config.additionalProjectDirs.push(projectPath);
      await saveProjectConfig(config);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding project manually:', error);
    return false;
  }
}

// Extract project directory (for compatibility with existing code)
async function extractProjectDirectory(projectName) {
  // For Q Developer, project name is typically the directory name
  const projects = await getProjects();
  const project = projects.find(p => p.name === projectName);
  return project ? project.fullPath : null;
}

export {
  getProjects,
  getSessions,
  getSessionMessages,
  createSession,
  addMessageToSession,
  renameProject,
  deleteSession,
  deleteProject,
  addProjectManually,
  extractProjectDirectory,
  clearProjectDirectoryCache
};