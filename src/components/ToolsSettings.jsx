import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Trash2, Save, Copy } from 'lucide-react';

function ToolsSettings({ isOpen, onClose }) {
  const [mcpServers, setMcpServers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [newServerName, setNewServerName] = useState('');
  const [newServerConfig, setNewServerConfig] = useState('');
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJson, setRawJson] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMcpConfig();
    }
  }, [isOpen]);

  const fetchMcpConfig = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth-token');
      
      const response = await fetch('/api/mcp/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.config) {
          setMcpServers(result.config.mcpServers || {});
          setRawJson(JSON.stringify(result.config, null, 2));
        }
      }
    } catch (error) {
      console.error('Error fetching MCP config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async (newConfig) => {
    try {
      const token = localStorage.getItem('auth-token');
      
      const response = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: { mcpServers: newConfig } })
      });

      if (response.ok) {
        setMcpServers(newConfig);
        setRawJson(JSON.stringify({ mcpServers: newConfig }, null, 2));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving MCP config:', error);
      return false;
    }
  };

  const handleAddServer = async () => {
    if (!newServerName.trim() || !newServerConfig.trim()) {
      alert('Please provide both server name and configuration');
      return;
    }

    try {
      const config = JSON.parse(newServerConfig);
      const updatedServers = {
        ...mcpServers,
        [newServerName]: config
      };
      
      const success = await saveConfig(updatedServers);
      if (success) {
        setNewServerName('');
        setNewServerConfig('');
      } else {
        alert('Failed to save server configuration');
      }
    } catch (error) {
      alert('Invalid JSON configuration: ' + error.message);
    }
  };

  const handleEditServer = (serverName) => {
    setEditingServer(serverName);
    setNewServerConfig(JSON.stringify(mcpServers[serverName], null, 2));
  };

  const handleSaveEdit = async () => {
    if (!editingServer || !newServerConfig.trim()) return;

    try {
      const config = JSON.parse(newServerConfig);
      const updatedServers = {
        ...mcpServers,
        [editingServer]: config
      };
      
      const success = await saveConfig(updatedServers);
      if (success) {
        setEditingServer(null);
        setNewServerConfig('');
      } else {
        alert('Failed to save server configuration');
      }
    } catch (error) {
      alert('Invalid JSON configuration: ' + error.message);
    }
  };

  const handleDeleteServer = async (serverName) => {
    if (!confirm(`Are you sure you want to delete "${serverName}"?`)) return;

    const updatedServers = { ...mcpServers };
    delete updatedServers[serverName];
    
    const success = await saveConfig(updatedServers);
    if (!success) {
      alert('Failed to delete server');
    }
  };

  const handleToggleServer = async (serverName) => {
    const server = mcpServers[serverName];
    const updatedServers = {
      ...mcpServers,
      [serverName]: {
        ...server,
        disabled: !server.disabled
      }
    };
    
    const success = await saveConfig(updatedServers);
    if (!success) {
      alert('Failed to toggle server status');
    }
  };

  const handleRawJsonSave = async () => {
    try {
      const config = JSON.parse(rawJson);
      const success = await saveConfig(config.mcpServers || {});
      if (success) {
        setRawJsonMode(false);
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      alert('Invalid JSON: ' + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">MCP Server Configuration</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setRawJsonMode(!rawJsonMode)}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              {rawJsonMode ? 'Visual Mode' : 'Raw JSON'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading MCP configuration...</p>
            </div>
          ) : rawJsonMode ? (
            /* Raw JSON Editor */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Raw JSON Configuration</h3>
                <button
                  onClick={handleRawJsonSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                className="w-full h-96 p-4 border border-border rounded-lg bg-background text-foreground font-mono text-sm"
                placeholder="Paste your MCP configuration JSON here..."
              />
              <p className="text-sm text-muted-foreground">
                Edit the complete MCP configuration in JSON format. Make sure to maintain valid JSON structure.
              </p>
            </div>
          ) : (
            /* Visual Mode */
            <div className="space-y-6">
              {/* Add New Server */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Add New MCP Server</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Server Name</label>
                    <input
                      type="text"
                      value={newServerName}
                      onChange={(e) => setNewServerName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      placeholder="e.g., aws-docs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Configuration (JSON)</label>
                    <textarea
                      value={newServerConfig}
                      onChange={(e) => setNewServerConfig(e.target.value)}
                      className="w-full h-32 p-3 border border-border rounded-lg bg-background font-mono text-sm"
                      placeholder={`{
  "command": "uvx",
  "args": ["awslabs.aws-documentation-mcp-server@latest"],
  "env": {
    "FASTMCP_LOG_LEVEL": "ERROR"
  },
  "disabled": false,
  "autoApprove": ["read_documentation", "search_documentation"]
}`}
                    />
                  </div>
                  <button
                    onClick={handleAddServer}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Server</span>
                  </button>
                </div>
              </div>

              {/* Existing Servers */}
              <div>
                <h3 className="text-lg font-medium mb-4">Configured MCP Servers</h3>
                {Object.keys(mcpServers).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No MCP servers configured. Add one above or use Raw JSON mode to paste a complete configuration.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(mcpServers).map(([name, config]) => (
                      <div key={name} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-lg">{name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              config.disabled 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {config.disabled ? 'Disabled' : 'Enabled'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleServer(name)}
                              className={`px-3 py-1 text-sm rounded ${
                                config.disabled
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-red-600 hover:bg-red-700 text-white'
                              }`}
                            >
                              {config.disabled ? 'Enable' : 'Disable'}
                            </button>
                            <button
                              onClick={() => handleEditServer(name)}
                              className="p-2 hover:bg-muted rounded-lg"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(JSON.stringify(config, null, 2))}
                              className="p-2 hover:bg-muted rounded-lg"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteServer(name)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {editingServer === name ? (
                          <div className="space-y-3">
                            <textarea
                              value={newServerConfig}
                              onChange={(e) => setNewServerConfig(e.target.value)}
                              className="w-full h-40 p-3 border border-border rounded-lg bg-background font-mono text-sm"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSaveEdit}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                              >
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingServer(null);
                                  setNewServerConfig('');
                                }}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted/30 rounded p-3">
                            <pre className="text-sm overflow-x-auto">
                              {JSON.stringify(config, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Model Context Protocol servers provide additional tools and data sources to Amazon Q Developer.
            Configuration is stored in <code>~/.aws/amazonq/mcp.json</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ToolsSettings;
