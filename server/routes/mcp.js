import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Q Developer CLI MCP configuration file path
const getMcpConfigPath = () => {
  return path.join(os.homedir(), '.aws', 'amazonq', 'mcp.json');
};

// Ensure MCP config directory exists
const ensureMcpConfigDir = async () => {
  const configDir = path.dirname(getMcpConfigPath());
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

// Read MCP configuration
const readMcpConfig = async () => {
  try {
    const configPath = getMcpConfigPath();
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Return default config if file doesn't exist
      return {
        mcpServers: {}
      };
    }
    throw error;
  }
};

// Write MCP configuration
const writeMcpConfig = async (config) => {
  await ensureMcpConfigDir();
  const configPath = getMcpConfigPath();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
};

// GET /api/mcp/list - List MCP servers from Q Developer CLI config
router.get('/list', async (req, res) => {
  try {
    console.log('📋 Listing MCP servers from Q Developer CLI config');
    
    const config = await readMcpConfig();
    const servers = [];
    
    // Convert config format to our API format
    for (const [name, serverConfig] of Object.entries(config.mcpServers || {})) {
      servers.push({
        name,
        type: serverConfig.command ? 'stdio' : 'sse',
        command: serverConfig.command,
        args: serverConfig.args || [],
        url: serverConfig.url,
        headers: serverConfig.headers || {},
        env: serverConfig.env || {},
        enabled: serverConfig.enabled !== false // default to true
      });
    }
    
    console.log('🔍 Found MCP servers:', servers.length);
    res.json({ success: true, servers });
  } catch (error) {
    console.error('Error reading MCP config:', error);
    res.status(500).json({ error: 'Failed to read MCP configuration', details: error.message });
  }
});

// POST /api/mcp/add - Add MCP server to Q Developer CLI config
router.post('/add', async (req, res) => {
  try {
    const { name, type = 'stdio', command, args = [], url, headers = {}, env = {}, enabled = true } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }
    
    if (type === 'stdio' && !command) {
      return res.status(400).json({ error: 'Command is required for stdio servers' });
    }
    
    if (type === 'sse' && !url) {
      return res.status(400).json({ error: 'URL is required for SSE servers' });
    }
    
    console.log('➕ Adding MCP server to Q Developer CLI config:', name);
    
    const config = await readMcpConfig();
    
    // Check if server already exists
    if (config.mcpServers && config.mcpServers[name]) {
      return res.status(409).json({ error: `MCP server "${name}" already exists` });
    }
    
    // Initialize mcpServers if it doesn't exist
    if (!config.mcpServers) {
      config.mcpServers = {};
    }
    
    // Add new server configuration
    const serverConfig = {
      enabled
    };
    
    if (type === 'stdio') {
      serverConfig.command = command;
      if (args.length > 0) {
        serverConfig.args = args;
      }
      if (Object.keys(env).length > 0) {
        serverConfig.env = env;
      }
    } else if (type === 'sse') {
      serverConfig.url = url;
      if (Object.keys(headers).length > 0) {
        serverConfig.headers = headers;
      }
    }
    
    config.mcpServers[name] = serverConfig;
    
    await writeMcpConfig(config);
    
    console.log('✅ MCP server added successfully:', name);
    res.json({ 
      success: true, 
      message: `MCP server "${name}" added successfully`,
      server: { name, ...serverConfig }
    });
  } catch (error) {
    console.error('Error adding MCP server:', error);
    res.status(500).json({ error: 'Failed to add MCP server', details: error.message });
  }
});

// PUT /api/mcp/update/:name - Update MCP server in Q Developer CLI config
router.put('/update/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { type = 'stdio', command, args = [], url, headers = {}, env = {}, enabled = true } = req.body;
    
    console.log('🔄 Updating MCP server in Q Developer CLI config:', name);
    
    const config = await readMcpConfig();
    
    if (!config.mcpServers || !config.mcpServers[name]) {
      return res.status(404).json({ error: `MCP server "${name}" not found` });
    }
    
    // Update server configuration
    const serverConfig = {
      enabled
    };
    
    if (type === 'stdio') {
      serverConfig.command = command;
      if (args.length > 0) {
        serverConfig.args = args;
      }
      if (Object.keys(env).length > 0) {
        serverConfig.env = env;
      }
    } else if (type === 'sse') {
      serverConfig.url = url;
      if (Object.keys(headers).length > 0) {
        serverConfig.headers = headers;
      }
    }
    
    config.mcpServers[name] = serverConfig;
    
    await writeMcpConfig(config);
    
    console.log('✅ MCP server updated successfully:', name);
    res.json({ 
      success: true, 
      message: `MCP server "${name}" updated successfully`,
      server: { name, ...serverConfig }
    });
  } catch (error) {
    console.error('Error updating MCP server:', error);
    res.status(500).json({ error: 'Failed to update MCP server', details: error.message });
  }
});

// DELETE /api/mcp/remove/:name - Remove MCP server from Q Developer CLI config
router.delete('/remove/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log('🗑️ Removing MCP server from Q Developer CLI config:', name);
    
    const config = await readMcpConfig();
    
    if (!config.mcpServers || !config.mcpServers[name]) {
      return res.status(404).json({ error: `MCP server "${name}" not found` });
    }
    
    delete config.mcpServers[name];
    
    await writeMcpConfig(config);
    
    console.log('✅ MCP server removed successfully:', name);
    res.json({ 
      success: true, 
      message: `MCP server "${name}" removed successfully`
    });
  } catch (error) {
    console.error('Error removing MCP server:', error);
    res.status(500).json({ error: 'Failed to remove MCP server', details: error.message });
  }
});

// GET /api/mcp/get/:name - Get MCP server details from Q Developer CLI config
router.get('/get/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log('📄 Getting MCP server details from Q Developer CLI config:', name);
    
    const config = await readMcpConfig();
    
    if (!config.mcpServers || !config.mcpServers[name]) {
      return res.status(404).json({ error: `MCP server "${name}" not found` });
    }
    
    const serverConfig = config.mcpServers[name];
    const server = {
      name,
      type: serverConfig.command ? 'stdio' : 'sse',
      command: serverConfig.command,
      args: serverConfig.args || [],
      url: serverConfig.url,
      headers: serverConfig.headers || {},
      env: serverConfig.env || {},
      enabled: serverConfig.enabled !== false
    };
    
    console.log('✅ MCP server details retrieved:', name);
    res.json({ 
      success: true, 
      server
    });
  } catch (error) {
    console.error('Error getting MCP server details:', error);
    res.status(500).json({ error: 'Failed to get MCP server details', details: error.message });
  }
});

// POST /api/mcp/toggle/:name - Toggle MCP server enabled/disabled state
router.post('/toggle/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { enabled } = req.body;
    
    console.log('🔄 Toggling MCP server state:', name, 'enabled:', enabled);
    
    const config = await readMcpConfig();
    
    if (!config.mcpServers || !config.mcpServers[name]) {
      return res.status(404).json({ error: `MCP server "${name}" not found` });
    }
    
    config.mcpServers[name].enabled = enabled;
    
    await writeMcpConfig(config);
    
    console.log('✅ MCP server state toggled successfully:', name);
    res.json({ 
      success: true, 
      message: `MCP server "${name}" ${enabled ? 'enabled' : 'disabled'} successfully`,
      enabled
    });
  } catch (error) {
    console.error('Error toggling MCP server state:', error);
    res.status(500).json({ error: 'Failed to toggle MCP server state', details: error.message });
  }
});

// GET /api/mcp/config - Get raw MCP configuration file
router.get('/config', async (req, res) => {
  try {
    console.log('📄 Getting raw MCP configuration');
    
    const config = await readMcpConfig();
    
    res.json({ 
      success: true, 
      config,
      configPath: getMcpConfigPath()
    });
  } catch (error) {
    console.error('Error getting MCP config:', error);
    res.status(500).json({ error: 'Failed to get MCP configuration', details: error.message });
  }
});

// POST /api/mcp/config - Update raw MCP configuration file
router.post('/config', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Valid configuration object is required' });
    }
    
    console.log('💾 Updating raw MCP configuration');
    
    await writeMcpConfig(config);
    
    console.log('✅ MCP configuration updated successfully');
    res.json({ 
      success: true, 
      message: 'MCP configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Error updating MCP config:', error);
    res.status(500).json({ error: 'Failed to update MCP configuration', details: error.message });
  }
});

export default router;
