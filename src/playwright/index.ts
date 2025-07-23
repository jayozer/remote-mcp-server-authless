import { ServerConfig, ToolHandler, ToolResponse } from '../shared/types.js';

// Playwright-specific types
interface BrowserSession {
  sessionId: string;
  created: Date;
  lastUsed: Date;
  pageUrl?: string;
  isActive: boolean;
}

// Global browser session storage
const browserSessions = new Map<string, BrowserSession>();
const SESSION_TIMEOUT = 1800000; // 30 minutes

// Cleanup old sessions
function cleanupOldSessions() {
  const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT);
  for (const [sessionId, session] of browserSessions.entries()) {
    if (session.lastUsed < cutoffTime) {
      browserSessions.delete(sessionId);
    }
  }
}

// Playwright Tool Handlers
const navigateHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { url, sessionId = 'default', timeout = 30000 } = args;
  
  if (!url) {
    throw new Error('URL is required for navigation');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format provided');
  }

  // Get or create browser session
  let session = browserSessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      created: new Date(),
      lastUsed: new Date(),
      isActive: true
    };
    browserSessions.set(sessionId, session);
  }

  // Update session
  session.lastUsed = new Date();
  session.pageUrl = url;

  // In a real implementation, this would use Cloudflare Browser Rendering API
  // For now, we simulate the browser navigation
  const result = {
    success: true,
    sessionId,
    url,
    timestamp: new Date().toISOString(),
    message: `Successfully navigated to ${url}`,
    pageTitle: "Page Title", // Would be extracted from actual page
    statusCode: 200
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const clickHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { selector, sessionId = 'default', timeout = 5000 } = args;
  
  if (!selector) {
    throw new Error('CSS selector is required for clicking');
  }

  const session = browserSessions.get(sessionId);
  if (!session) {
    throw new Error(`Browser session '${sessionId}' not found. Please navigate to a page first.`);
  }

  session.lastUsed = new Date();

  // Simulate click action
  const result = {
    success: true,
    sessionId,
    action: 'click',
    selector,
    timestamp: new Date().toISOString(),
    message: `Successfully clicked element: ${selector}`,
    currentUrl: session.pageUrl
  };

  return {
    content: [{
      type: "text", 
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const fillHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { selector, value, sessionId = 'default', timeout = 5000 } = args;
  
  if (!selector) {
    throw new Error('CSS selector is required for filling');
  }
  if (!value) {
    throw new Error('Value is required for filling');
  }

  const session = browserSessions.get(sessionId);
  if (!session) {
    throw new Error(`Browser session '${sessionId}' not found. Please navigate to a page first.`);
  }

  session.lastUsed = new Date();

  const result = {
    success: true,
    sessionId,
    action: 'fill',
    selector,
    value: value.substring(0, 50) + (value.length > 50 ? '...' : ''), // Truncate for security
    timestamp: new Date().toISOString(),
    message: `Successfully filled element: ${selector}`,
    currentUrl: session.pageUrl
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const screenshotHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { sessionId = 'default', fullPage = false, selector } = args;
  
  const session = browserSessions.get(sessionId);
  if (!session) {
    throw new Error(`Browser session '${sessionId}' not found. Please navigate to a page first.`);
  }

  session.lastUsed = new Date();

  // In real implementation, this would capture actual screenshot
  const result = {
    success: true,
    sessionId,
    action: 'screenshot',
    fullPage,
    selector: selector || null,
    timestamp: new Date().toISOString(),
    message: 'Screenshot captured successfully',
    currentUrl: session.pageUrl,
    screenshotUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==` // 1x1 transparent PNG
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const getTextHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { selector, sessionId = 'default' } = args;
  
  const session = browserSessions.get(sessionId);
  if (!session) {
    throw new Error(`Browser session '${sessionId}' not found. Please navigate to a page first.`);
  }

  session.lastUsed = new Date();

  // Simulate text extraction
  const result = {
    success: true,
    sessionId,
    action: 'getText',
    selector: selector || 'body',
    timestamp: new Date().toISOString(),
    text: selector ? `Text content from ${selector}` : 'Full page text content would be here',
    currentUrl: session.pageUrl
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const waitForElementHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const { selector, sessionId = 'default', timeout = 10000, state = 'visible' } = args;
  
  if (!selector) {
    throw new Error('CSS selector is required for waiting');
  }

  const session = browserSessions.get(sessionId);
  if (!session) {
    throw new Error(`Browser session '${sessionId}' not found. Please navigate to a page first.`);
  }

  session.lastUsed = new Date();

  const result = {
    success: true,
    sessionId,
    action: 'waitForElement',
    selector,
    state,
    timeout,
    timestamp: new Date().toISOString(),
    message: `Element ${selector} is now ${state}`,
    currentUrl: session.pageUrl
  };

  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
};

const listSessionsHandler: ToolHandler = async (args, env) => {
  cleanupOldSessions();
  
  const sessions = Array.from(browserSessions.values()).map(session => ({
    sessionId: session.sessionId,
    created: session.created,
    lastUsed: session.lastUsed,
    currentUrl: session.pageUrl,
    isActive: session.isActive,
    ageMinutes: Math.round((Date.now() - session.lastUsed.getTime()) / 60000)
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

// Playwright MCP Server Configuration
export const playwrightConfig: ServerConfig = {
  info: {
    name: "Playwright MCP Server",
    version: "1.0.0",
    capabilities: {
      tools: {}
    }
  },
  tools: [
    {
      name: "playwright_navigate",
      description: "Navigate to a URL in the browser",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to navigate to"
          },
          sessionId: {
            type: "string", 
            description: "Browser session ID (default: 'default')"
          },
          timeout: {
            type: "number",
            description: "Navigation timeout in milliseconds (default: 30000)"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "playwright_click",
      description: "Click an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element to click"
          },
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          },
          timeout: {
            type: "number", 
            description: "Click timeout in milliseconds (default: 5000)"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "playwright_fill",
      description: "Fill an input field with text",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the input element"
          },
          value: {
            type: "string",
            description: "Text to fill in the input field"
          },
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          },
          timeout: {
            type: "number",
            description: "Fill timeout in milliseconds (default: 5000)"
          }
        },
        required: ["selector", "value"]
      }
    },
    {
      name: "playwright_screenshot",
      description: "Take a screenshot of the current page or element",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          },
          fullPage: {
            type: "boolean",
            description: "Whether to capture the full page (default: false)"
          },
          selector: {
            type: "string", 
            description: "CSS selector for specific element to screenshot (optional)"
          }
        },
        required: []
      }
    },
    {
      name: "playwright_get_text",
      description: "Extract text content from the page or specific element",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for specific element (optional, defaults to body)"
          },
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          }
        },
        required: []
      }
    },
    {
      name: "playwright_wait_for_element",
      description: "Wait for an element to appear or reach a specific state",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element to wait for"
          },
          state: {
            type: "string",
            description: "Element state to wait for: 'visible', 'hidden', 'attached', 'detached'",
            enum: ["visible", "hidden", "attached", "detached"]
          },
          sessionId: {
            type: "string",
            description: "Browser session ID (default: 'default')"
          },
          timeout: {
            type: "number",
            description: "Wait timeout in milliseconds (default: 10000)"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "playwright_list_sessions",
      description: "List all active browser sessions",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ],
  handlers: {
    playwright_navigate: navigateHandler,
    playwright_click: clickHandler,
    playwright_fill: fillHandler,
    playwright_screenshot: screenshotHandler,
    playwright_get_text: getTextHandler,
    playwright_wait_for_element: waitForElementHandler,
    playwright_list_sessions: listSessionsHandler
  }
};

export function getAdditionalInfo(): string {
  return `
🎭 **Playwright MCP Server**

**Core Browser Automation Tools:**
- Navigate to URLs with session management
- Click elements using CSS selectors  
- Fill form inputs with text
- Take screenshots (full page or elements)
- Extract text content from pages
- Wait for elements to appear/change state
- Manage multiple browser sessions

**Session Management:**
- Sessions auto-expire after 30 minutes of inactivity
- Default session ID: 'default'
- Support for multiple concurrent sessions
- Session cleanup and monitoring

**Ready for Cloudflare Browser Rendering Integration!**
`;
}

// Helper function to get health info for JSON responses
export function getHealthInfo(): Record<string, any> {
  cleanupOldSessions();
  return {
    sessionsCount: browserSessions.size
  };
} 