import React, { useState, useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

import { FolderOpen, Folder, Plus, ChevronDown, ChevronRight, Edit3, Check, X, Trash2, Settings, FolderPlus, RefreshCw, Sparkles, Edit2, Star, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import QDeveloperLogo from './QDeveloperLogo';
import { api } from '../utils/api';

function Sidebar({ 
  projects, 
  selectedProject, 
  onProjectSelect, 
  onProjectDelete,
  isLoading,
  onRefresh,
  onShowSettings,
  updateAvailable,
  latestVersion,
  currentVersion,
  onShowVersionModal
}) {
  const [editingProject, setEditingProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectSortOrder, setProjectSortOrder] = useState('name');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Starred projects state - persisted in localStorage
  const [starredProjects, setStarredProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('starredProjects');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      console.error('Error loading starred projects:', error);
      return new Set();
    }
  });

  // Touch handler to prevent double-tap issues on iPad
  const handleTouchClick = (callback) => {
    return (e) => {
      if (e.target.closest('.overflow-y-auto') || e.target.closest('[data-scroll-container]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      callback();
    };
  };

  // Save starred projects to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('starredProjects', JSON.stringify([...starredProjects]));
    } catch (error) {
      console.error('Error saving starred projects:', error);
    }
  }, [starredProjects]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProjectEdit = (project, e) => {
    e.stopPropagation();
    setEditingProject(project.name);
    setEditingName(project.displayName || project.name);
  };

  const handleProjectEditSave = async (projectName) => {
    if (!editingName.trim()) return;
    
    try {
      const response = await api.updateProject(projectName, { displayName: editingName.trim() });
      if (response.ok) {
        // Refresh projects to get updated data
        await onRefresh();
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
    
    setEditingProject(null);
    setEditingName('');
  };

  const handleProjectEditCancel = () => {
    setEditingProject(null);
    setEditingName('');
  };

  const handleProjectDelete = async (projectName, e) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await api.deleteProject(projectName);
      if (response.ok) {
        onProjectDelete(projectName);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleNewProject = async () => {
    if (!newProjectPath.trim()) return;
    
    setCreatingProject(true);
    try {
      const response = await api.createProject({ path: newProjectPath.trim() });
      if (response.ok) {
        setShowNewProject(false);
        setNewProjectPath('');
        await onRefresh();
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setCreatingProject(false);
    }
  };

  const toggleProjectStar = (projectName, e) => {
    e.stopPropagation();
    setStarredProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectName)) {
        newSet.delete(projectName);
      } else {
        newSet.add(projectName);
      }
      return newSet;
    });
  };

  // Filter and sort projects
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = projects;
    
    // Apply search filter
    if (searchFilter.trim()) {
      const searchTerm = searchFilter.toLowerCase();
      filtered = projects.filter(project => 
        (project.displayName || project.name).toLowerCase().includes(searchTerm) ||
        project.fullPath.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort projects
    return [...filtered].sort((a, b) => {
      // Always put starred projects first
      const aStarred = starredProjects.has(a.name);
      const bStarred = starredProjects.has(b.name);
      
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      
      // Then sort by selected order
      switch (projectSortOrder) {
        case 'name':
          return (a.displayName || a.name).localeCompare(b.displayName || b.name);
        case 'path':
          return a.fullPath.localeCompare(b.fullPath);
        case 'recent':
          // Sort by most recent activity (you might need to add this field)
          return 0; // For now, maintain current order
        default:
          return 0;
      }
    });
  }, [projects, searchFilter, projectSortOrder, starredProjects]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QDeveloperLogo className="w-6 h-6" />
            <h1 className="text-lg font-semibold text-foreground">Q Developer</h1>
            {updateAvailable && (
              <Badge 
                variant="secondary" 
                className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                onClick={onShowVersionModal}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Update
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowSettings}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Project Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Projects</span>
            <Badge variant="secondary" className="text-xs">
              {filteredAndSortedProjects.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={projectSortOrder}
              onChange={(e) => setProjectSortOrder(e.target.value)}
              className="text-xs bg-transparent border-none text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <option value="name">Name</option>
              <option value="path">Path</option>
              <option value="recent">Recent</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewProject(true)}
              className="h-7 w-7 p-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1" data-scroll-container>
        <div className="p-2">
          {/* New Project Form */}
          {showNewProject && (
            <div className="mb-3 p-3 border border-border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <Input
                  placeholder="Enter project path..."
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNewProject();
                    if (e.key === 'Escape') {
                      setShowNewProject(false);
                      setNewProjectPath('');
                    }
                  }}
                  className="h-8"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleNewProject}
                    disabled={!newProjectPath.trim() || creatingProject}
                    className="h-7"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {creatingProject ? 'Creating...' : 'Create'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewProject(false);
                      setNewProjectPath('');
                    }}
                    className="h-7"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Projects */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchFilter ? 'No projects match your search' : 'No projects found'}
              </p>
              {!searchFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewProject(true)}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Project
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredAndSortedProjects.map((project) => (
                <div key={project.name} className="group">
                  <div
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                      selectedProject?.name === project.name
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    )}
                    onClick={() => onProjectSelect(project)}
                    onTouchStart={handleTouchClick(() => onProjectSelect(project))}
                  >
                    {/* Star Button */}
                    <button
                      onClick={(e) => toggleProjectStar(project.name, e)}
                      onTouchStart={handleTouchClick((e) => toggleProjectStar(project.name, e))}
                      className={cn(
                        "p-1 rounded hover:bg-muted-foreground/10 transition-colors",
                        starredProjects.has(project.name) 
                          ? "text-yellow-500" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Star className={cn(
                        "h-3 w-3",
                        starredProjects.has(project.name) && "fill-current"
                      )} />
                    </button>

                    {/* Project Icon */}
                    <div className="flex-shrink-0">
                      {selectedProject?.name === project.name ? (
                        <FolderOpen className="h-4 w-4" />
                      ) : (
                        <Folder className="h-4 w-4" />
                      )}
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      {editingProject === project.name ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleProjectEditSave(project.name);
                            if (e.key === 'Escape') handleProjectEditCancel();
                          }}
                          onBlur={() => handleProjectEditSave(project.name)}
                          className="h-6 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <div className="text-sm font-medium truncate">
                            {project.displayName || project.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {project.fullPath}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Project Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleProjectEdit(project, e)}
                        onTouchStart={handleTouchClick((e) => handleProjectEdit(project, e))}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleProjectDelete(project.name, e)}
                        onTouchStart={handleTouchClick((e) => handleProjectDelete(project.name, e))}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default Sidebar;
