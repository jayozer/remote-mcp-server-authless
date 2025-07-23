# Sequential Thinking MCP Server 🧠

A comprehensive Model Context Protocol (MCP) server that facilitates structured, step-by-step problem-solving and analysis workflows. Built on Cloudflare Workers for global edge deployment.

## 🚀 Live Server

**Production URL:** https://remote-mcp-server-authless.jayozer.workers.dev/

✅ **Status:** Fully operational and ready for Claude Desktop connection

## ✨ Features

- **Sequential Thinking Tool**: Break down complex problems into manageable steps
- **Session Management**: Track multiple thinking sessions with persistent state
- **Thought Revision**: Revise and refine previous thoughts as understanding deepens
- **Branching Logic**: Explore alternative reasoning paths
- **Progress Tracking**: Monitor completion and analyze thinking patterns
- **Real-time Analytics**: Session insights and thinking velocity analysis

## 🔧 Claude Desktop Setup

### Step 1: Open Claude Desktop Configuration

**macOS:**
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
notepad %APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Add the MCP Server Configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-remote", "https://remote-mcp-server-authless.jayozer.workers.dev/"]
    }
  }
}
```

### Step 3: Restart Claude Desktop

After saving the configuration, completely quit and restart Claude Desktop. You should see the sequential thinking tools become available.

## 🛠️ Available Tools

### 1. **sequential_thinking**
Process sequential thinking steps for complex problem-solving and analysis
- **Parameters:**
  - `thought` (required): The current thinking step
  - `nextThoughtNeeded` (required): Whether another thought step is needed
  - `thoughtNumber` (required): Current thought number (1-based)
  - `totalThoughts` (required): Estimated total thoughts needed
  - `sessionId` (optional): Session ID to track thinking process (defaults to 'default')
  - `isRevision` (optional): Whether this revises previous thinking
  - `revisesThought` (optional): Which thought number is being reconsidered
  - `branchFromThought` (optional): Branching point thought number
  - `branchId` (optional): Branch identifier for alternative reasoning paths

### 2. **get_thinking_session**
Retrieve the complete thinking history for a session
- **Parameters:**
  - `sessionId` (required): Session ID to retrieve

### 3. **list_thinking_sessions**
List all active thinking sessions with their basic information
- **Parameters:** None

### 4. **analyze_thinking_patterns**
Analyze thinking patterns and provide insights
- **Parameters:**
  - `sessionId` (optional): Specific session to analyze (analyzes all if omitted)

### 5. **clear_thinking_sessions**
Clear thinking sessions based on criteria
- **Parameters:**
  - `sessionId` (optional): Specific session to clear
  - `olderThanHours` (optional): Clear sessions older than X hours

## 📊 Usage Examples

### Basic Sequential Thinking
```
Use the sequential_thinking tool to work through this problem:
- Thought 1: "Let me understand the problem..."
- Thought 2: "Now I'll consider possible approaches..."
- Thought 3: "The best solution seems to be..."
```

### Advanced Features
- **Session Management**: Use different `sessionId` values for parallel thinking processes
- **Thought Revision**: Set `isRevision: true` and `revisesThought: 2` to refine earlier thinking
- **Branching**: Use `branchFromThought` and `branchId` to explore alternative paths

## 🏗️ Architecture

- **Runtime**: Cloudflare Workers (Edge deployment)
- **Protocol**: Model Context Protocol (MCP) via Server-Sent Events
- **Storage**: In-memory session management (1-hour timeout)
- **Transport**: SSE for real-time client communication

## 🔍 Health & Monitoring

- **Health Check**: https://remote-mcp-server-authless.jayozer.workers.dev/health
- **Server Info**: https://remote-mcp-server-authless.jayozer.workers.dev/info
- **Active Sessions**: Check health endpoint for current session count

## 🚀 Deployment

This server is deployed on Cloudflare Workers and automatically scales globally. No additional setup required for end users.

### Local Development
```bash
git clone <repository>
cd remote-mcp-server-authless
npm install
npm run dev      # Local development
npm run deploy   # Deploy to Cloudflare
```

## 📝 Example Session

```json
{
  "sessionId": "analysis-123",
  "totalThoughts": 5,
  "currentThought": 3,
  "isCompleted": false,
  "steps": [
    {
      "thoughtNumber": 1,
      "thought": "Let me first understand the core problem...",
      "timestamp": "2024-01-01T10:00:00Z"
    },
    {
      "thoughtNumber": 2,
      "thought": "Now I need to consider the constraints...",
      "timestamp": "2024-01-01T10:01:00Z"
    }
  ]
}
```

## 🤝 Support

For issues or questions, please check:
1. The health endpoint for server status
2. Claude Desktop logs for connection issues
3. The configuration file syntax

---

**Ready to think systematically with AI? Connect your Claude Desktop now!** 🧠✨ 
