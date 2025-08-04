# Q Developer WebUI

A simplified web-based UI for Amazon Q Developer CLI, focused on shell interaction, file management, and git operations.

## Features

- **Shell Integration** - Direct access to Q Developer CLI through built-in terminal
- **File Explorer** - Interactive file tree with syntax highlighting and live editing
- **Git Operations** - View, stage and commit your changes, switch branches
- **Project Management** - Manage multiple Q Developer projects
- **Responsive Design** - Works seamlessly across desktop, tablet, and mobile

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [Amazon Q Developer CLI](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-dev-cli.html) installed and configured

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/mengchen-tam/q-dev-cli-ui.git
cd q-dev-cli-ui
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your preferred settings
```

4. **Start the application:**
```bash
# Development mode (with automatic cleanup and hot reload)
npm run dev

# Alternative: Use the enhanced start script
npm run start-dev

# Manual cleanup if needed
npm run cleanup
```

The application will automatically clean up any conflicting processes and start at the port specified in your .env file (default: http://localhost:3001)

## Usage

### Core Features

#### Project Management
- **Visual Project Browser** - All available Q Developer projects with metadata
- **Project Actions** - Create, rename, and delete projects
- **Smart Navigation** - Quick access to recent projects

#### Shell Interface
- **Direct CLI Access** - Use Q Developer CLI commands directly in the web interface
- **Real-time Output** - Stream responses and see command execution in real-time
- **Project Context** - Automatically switches to the correct project directory

#### File Explorer & Editor
- **Interactive File Tree** - Browse project structure with expand/collapse navigation
- **Live File Editing** - Read, modify, and save files directly in the interface
- **Syntax Highlighting** - Support for multiple programming languages
- **File Operations** - Create, rename, delete files and directories

#### Git Integration
- **Status Overview** - View current branch, staged/unstaged changes
- **Stage & Commit** - Interactive staging and committing of changes
- **Branch Management** - Switch between branches, view commit history

### Mobile Support
- **Responsive Design** - Optimized for all screen sizes
- **Touch-friendly Interface** - Swipe gestures and touch navigation
- **Mobile Navigation** - Bottom tab bar for easy thumb navigation

## Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │  Q Developer    │
│   (React/Vite)  │◄──►│ (Express/WS)    │◄──►│  CLI            │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend (Node.js + Express)
- **Express Server** - RESTful API with static file serving
- **WebSocket Server** - Real-time communication for shell and project updates
- **Q Developer CLI Integration** - Process spawning and management
- **File System API** - File browser and editor functionality

### Frontend (React + Vite)
- **React 18** - Modern component architecture with hooks
- **CodeMirror** - Advanced code editor with syntax highlighting
- **Responsive Design** - Mobile-first approach with Tailwind CSS

## Changes from Original

This version has been simplified to focus on Q Developer CLI shell usage:

- **Removed Chat Interface** - No longer includes the chat-based interaction
- **Shell-First Approach** - Default tab is now the shell terminal
- **Simplified Navigation** - Three main tabs: Shell, Files, Git
- **Streamlined UI** - Removed session management and chat-related components

## License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file for details.

This project is open source and free to use, modify, and distribute under the GPL v3 license.

## Acknowledgments

### Built With
- **[Amazon Q Developer CLI](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-dev-cli.html)** - Amazon's AI-powered CLI
- **[React](https://react.dev/)** - User interface library
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[CodeMirror](https://codemirror.net/)** - Advanced code editor

### Based On
This project is based on [Claude Code UI](https://github.com/siteboon/claudecodeui) but adapted for Amazon Q Developer CLI usage.

---

<div align="center">
  <strong>Simplified for Q Developer CLI usage.</strong>
</div>
