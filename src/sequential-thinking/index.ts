import { ServerConfig, ToolHandler, ToolResponse } from '../shared/types.js';

// Types for thinking sessions
interface ThinkingStep {
  thoughtNumber: number;
  thought: string;
  timestamp: Date;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
}

interface ThinkingSession {
  sessionId: string;
  totalThoughts: number;
  currentThought: number;
  steps: ThinkingStep[];
  branches: Map<string, ThinkingStep[]>;
  created: Date;
  lastUpdated: Date;
  isCompleted: boolean;
}

// Global storage for sessions (in-memory for now)
const sessions = new Map<string, ThinkingSession>();
const SESSION_TIMEOUT = 3600000; // 1 hour

// Cleanup function
function cleanupOldSessions() {
  const cutoffTime = new Date(Date.now() - SESSION_TIMEOUT);
  for (const [sessionId, session] of sessions.entries()) {
    if (session.lastUpdated < cutoffTime) {
      sessions.delete(sessionId);
    }
  }
}

// Sequential thinking handler function
const handleSequentialThinking: ToolHandler = async (args: any): Promise<ToolResponse> => {
  const {
    thought,
    nextThoughtNeeded,
    thoughtNumber,
    totalThoughts,
    sessionId = "default",
    isRevision = false,
    revisesThought,
    branchFromThought,
    branchId,
  } = args;

  // Get or create thinking session
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      totalThoughts: 0,
      currentThought: 0,
      steps: [],
      branches: new Map(),
      created: new Date(),
      lastUpdated: new Date(),
      isCompleted: false,
    };
    sessions.set(sessionId, session);
  }

  // Create the thinking step
  const step: ThinkingStep = {
    thoughtNumber,
    thought,
    timestamp: new Date(),
    isRevision,
    revisesThought,
    branchFromThought,
    branchId,
  };

  // Handle branching logic
  if (branchId && branchFromThought) {
    let branchSteps = session.branches.get(branchId) || [];
    branchSteps.push(step);
    session.branches.set(branchId, branchSteps);
  } else {
    session.steps.push(step);
  }

  // Update session metadata
  session.currentThought = thoughtNumber;
  session.totalThoughts = Math.max(session.totalThoughts, totalThoughts);
  session.lastUpdated = new Date();
  session.isCompleted = !nextThoughtNeeded;

  // Clean up old sessions to prevent memory buildup
  cleanupOldSessions();

  // Log for debugging (optional)
  console.log(`Thought ${thoughtNumber}/${totalThoughts} [${sessionId}]: ${thought.substring(0, 100)}...`);

  // Return comprehensive thinking analysis
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          status: "success",
          sessionId,
          currentThought: thoughtNumber,
          totalThoughts,
          progressPercentage: Math.round((thoughtNumber / totalThoughts) * 100),
          isCompleted: !nextThoughtNeeded,
          sessionSummary: {
            totalSteps: session.steps.length,
            branches: session.branches.size,
            created: session.created,
            lastUpdated: session.lastUpdated,
          },
          nextAction: nextThoughtNeeded 
            ? "Continue with next thinking step" 
            : "Thinking process completed",
          thought: {
            number: thoughtNumber,
            content: thought,
            isRevision,
            revisesThought,
            branchInfo: branchId ? { branchId, branchFromThought } : null,
          },
        }, null, 2),
      },
    ],
  };
};

// Export the server configuration
export const sequentialThinkingConfig: ServerConfig = {
  info: {
    name: "Sequential Thinking MCP Server",
    version: "1.0.0",
    capabilities: { tools: {} },
  },
  tools: [
    {
      name: "sequential_thinking",
      description: "Process sequential thinking steps for complex problem-solving and analysis",
      inputSchema: {
        type: "object",
        properties: {
          thought: {
            type: "string",
            description: "The current thinking step",
          },
          nextThoughtNeeded: {
            type: "boolean",
            description: "Whether another thought step is needed",
          },
          thoughtNumber: {
            type: "integer",
            minimum: 1,
            description: "Current thought number",
          },
          totalThoughts: {
            type: "integer",
            minimum: 1,
            description: "Estimated total thoughts needed",
          },
          sessionId: {
            type: "string",
            description: "Session ID to track thinking process (defaults to 'default')",
          },
          isRevision: {
            type: "boolean",
            description: "Whether this revises previous thinking",
          },
          revisesThought: {
            type: "integer",
            description: "Which thought is being reconsidered",
          },
          branchFromThought: {
            type: "integer",
            description: "Branching point thought number",
          },
          branchId: {
            type: "string",
            description: "Branch identifier for alternative reasoning paths",
          },
        },
        required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"],
      },
    },
  ],
  handlers: {
    sequential_thinking: handleSequentialThinking,
  },
};

// Additional info for the server
export function getAdditionalInfo(): Record<string, any> {
  return {
    sessionsCount: sessions.size,
  };
} 