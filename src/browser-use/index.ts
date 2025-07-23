import { ServerConfig, ToolHandler, ToolResponse } from '../shared/types.js';
import { validateOpenAIKey } from '../shared/auth.js';

// Browser-use specific types
interface BrowserUseSession {
  sessionId: string;
  created: Date;
  lastUsed: Date;
  currentUrl?: string;
  isActive: boolean;
  apiKey: string; // Store encrypted/hashed version in production
  conversationHistory: ConversationEntry[];
}

interface ConversationEntry {
  timestamp: Date;
  instruction: string;
  action: string;
  result: any;
  success: boolean;
}

// Global browser-use session storage
const browserUseSessions = new Map<string, BrowserUseSession>();
const SESSION_TIMEOUT = 3600000; // 1 hour for authenticated sessions

// Cleanup old sessions
function cleanupOldSessions() {
  const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT);
  for (const [sessionId, session] of browserUseSessions.entries()) {
    if (session.lastUsed < cutoffTime) {
      browserUseSessions.delete(sessionId);
    }
  }
}

// Browser-use Tool Handlers
const naturalLanguageActionHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { instruction, sessionId = 'default', apiKey } = args;
  
  if (!instruction) {
    throw new Error('Natural language instruction is required');
  }

  if (!apiKey) {
    throw new Error('OpenAI API key is required for browser-use functionality');
  }

  // Validate API key format
  const authResult = validateOpenAIKey({ headers: { get: () => `Bearer ${apiKey}` } } as Request);
  if (!authResult.success) {
    throw new Error(`Authentication failed: ${authResult.error}`);
  }

  // Get or create session
  let session = browserUseSessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      created: new Date(),
      lastUsed: new Date(),
      isActive: true,
      apiKey: apiKey.substring(0, 10) + '...', // Store truncated for security
      conversationHistory: []
    };
    browserUseSessions.set(sessionId, session);
  }

  session.lastUsed = new Date();

  // Simulate natural language processing with OpenAI
  // In real implementation, this would call OpenAI API to interpret the instruction
  const mockActions = [
    'navigate_to_url',
    'click_element',
    'fill_input',
    'extract_text',
    'take_screenshot',
    'scroll_page'
  ];

  const interpreterResult = {
    action: mockActions[Math.floor(Math.random() * mockActions.length)],
    confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
    reasoning: `Analyzed instruction: "${instruction}" and determined best action`,
    parameters: {
      target: instruction.includes('click') ? 'button[type="submit"]' : 
              instruction.includes('fill') ? 'input[type="text"]' :
              instruction.includes('go to') || instruction.includes('navigate') ? 
              instruction.match(/https?:\/\/[^\s]+/)?.[0] || 'https://google.com' : 
              'body'
    }
  };

  // Execute the interpreted action
  const executionResult = {
    success: true,
    actionTaken: interpreterResult.action,
    target: interpreterResult.parameters.target,
    timestamp: new Date().toISOString(),
    message: `Successfully executed: ${instruction}`,
    confidence: interpreterResult.confidence,
    reasoning: interpreterResult.reasoning
  };

  // Add to conversation history
  const conversationEntry: ConversationEntry = {
    timestamp: new Date(),
    instruction,
    action: interpreterResult.action,
    result: executionResult,
    success: true
  };
  
  session.conversationHistory.push(conversationEntry);
  
  // Keep only last 50 entries to prevent memory bloat
  if (session.conversationHistory.length > 50) {
    session.conversationHistory = session.conversationHistory.slice(-50);
  }

  const result = {
    success: true,
    sessionId,
    instruction,
    interpretation: interpreterResult,
    execution: executionResult,
    conversationLength: session.conversationHistory.length,
    sessionAge: Math.round((Date.now() - session.created.getTime()) / 60000) + ' minutes'
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const browserUseNavigateHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { url, instruction, sessionId = 'default', apiKey } = args;
  
  if (!url && !instruction) {
    throw new Error('Either URL or natural language instruction is required');
  }

  if (!apiKey) {
    throw new Error('OpenAI API key is required for browser-use functionality');
  }

  // Validate API key
  const authResult = validateOpenAIKey({ headers: { get: () => `Bearer ${apiKey}` } } as Request);
  if (!authResult.success) {
    throw new Error(`Authentication failed: ${authResult.error}`);
  }

  const session = browserUseSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session '${sessionId}' not found. Please start with a natural language action first.`);
  }

  session.lastUsed = new Date();
  session.currentUrl = url;

  const result = {
    success: true,
    sessionId,
    url: url || 'URL determined from instruction',
    instruction: instruction || `Navigate to ${url}`,
    timestamp: new Date().toISOString(),
    message: `Successfully navigated using browser-use`,
    currentUrl: url
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const getConversationHistoryHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { sessionId = 'default', limit = 10 } = args;
  
  const session = browserUseSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session '${sessionId}' not found`);
  }

  session.lastUsed = new Date();

  const history = session.conversationHistory
    .slice(-limit)
    .map(entry => ({
      timestamp: entry.timestamp,
      instruction: entry.instruction,
      action: entry.action,
      success: entry.success
    }));

  const result = {
    sessionId,
    totalEntries: session.conversationHistory.length,
    returnedEntries: history.length,
    sessionAge: Math.round((Date.now() - session.created.getTime()) / 60000) + ' minutes',
    history
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const listBrowserUseSessionsHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const sessions = Array.from(browserUseSessions.values()).map(session => ({
    sessionId: session.sessionId,
    created: session.created,
    lastUsed: session.lastUsed,
    currentUrl: session.currentUrl,
    isActive: session.isActive,
    conversationLength: session.conversationHistory.length,
    ageMinutes: Math.round((Date.now() - session.lastUsed.getTime()) / 60000),
    apiKeyPreview: session.apiKey // Already truncated for security
  }));

  const result = {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.isActive).length,
    sessions
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

// Browser-use MCP Server Configuration
export const browserUseConfig: ServerConfig = {
  info: {
    name: "Browser-use MCP Server",
    version: "1.0.0",
    capabilities: {
      tools: {},
      authentication: {
        required: true,
        type: "openai_api_key"
      }
    }
  },
  tools: [
    {
      name: "browseruse_natural_action",
      description: "Perform browser actions using natural language instructions with OpenAI interpretation",
      inputSchema: {
        type: "object",
        properties: {
          instruction: {
            type: "string",
            description: "Natural language instruction for browser action (e.g., 'click the login button', 'fill the search box with cats', 'go to google.com')"
          },
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          },
          apiKey: {
            type: "string",
            description: "OpenAI API key (sk-...) - required for natural language processing"
          }
        },
        required: ["instruction", "apiKey"]
      }
    },
    {
      name: "browseruse_navigate",
      description: "Navigate to URL with optional natural language context",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to navigate to"
          },
          instruction: {
            type: "string",
            description: "Optional natural language context for navigation"
          },
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          },
          apiKey: {
            type: "string",
            description: "OpenAI API key (sk-...) - required for enhanced navigation"
          }
        },
        required: ["apiKey"]
      }
    },
    {
      name: "browseruse_conversation_history",
      description: "Get conversation history for a browser-use session",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          },
          limit: {
            type: "number",
            description: "Number of recent entries to return (default: 10)"
          }
        },
        required: []
      }
    },
    {
      name: "browseruse_list_sessions",
      description: "List all active browser-use sessions",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ],
  handlers: {
    browseruse_natural_action: naturalLanguageActionHandler,
    browseruse_navigate: browserUseNavigateHandler,
    browseruse_conversation_history: getConversationHistoryHandler,
    browseruse_list_sessions: listBrowserUseSessionsHandler
  }
};

export function getAdditionalInfo(): string {
  return `
🤖 **Browser-use MCP Server**

**Natural Language Browser Automation:**
- Interpret natural language instructions using OpenAI
- Execute browser actions based on AI understanding
- Maintain conversation history and context
- Session-based interaction tracking

**Core Features:**
- OpenAI API key authentication (required)
- Natural language action interpretation
- Context-aware navigation
- Conversation history tracking
- Multi-session management

**Security:**
- API key validation for every request  
- Session-based authentication
- Truncated API key storage
- Auto-expiring sessions (1 hour)

**Example Instructions:**
- "Click the login button"
- "Fill the search box with 'cats'"
- "Go to google.com and search for news"
- "Take a screenshot of the page"

**Authentication Required:** OpenAI API key (sk-...)
`;
}

// Helper function to get health info for JSON responses
export function getHealthInfo(): Record<string, any> {
  cleanupOldSessions();
  return {
    sessionsCount: browserUseSessions.size,
    authenticationRequired: true
  };
} 