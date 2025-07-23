import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

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
async function handleSequentialThinking(args: any) {
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
}

// Create MCP server
const server = new Server(
	{
		name: "Sequential Thinking Server",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	}
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
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
			{
				name: "get_thinking_session",
				description: "Retrieve the complete thinking history for a session",
				inputSchema: {
					type: "object",
					properties: {
						sessionId: {
							type: "string",
							description: "Session ID to retrieve",
						},
					},
					required: ["sessionId"],
				},
			},
			{
				name: "list_thinking_sessions",
				description: "List all active thinking sessions with their basic information",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
			{
				name: "analyze_thinking_patterns",
				description: "Analyze thinking patterns and provide insights",
				inputSchema: {
					type: "object",
					properties: {
						sessionId: {
							type: "string",
							description: "Specific session to analyze (optional)",
						},
					},
				},
			},
			{
				name: "clear_thinking_sessions",
				description: "Clear thinking sessions based on criteria",
				inputSchema: {
					type: "object",
					properties: {
						sessionId: {
							type: "string",
							description: "Specific session to clear (optional - if not provided, clears all)",
						},
						olderThanHours: {
							type: "number",
							description: "Clear sessions older than X hours (optional)",
						},
					},
				},
			},
		],
	};
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	switch (name) {
		case "sequential_thinking": {
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
			} = args as any;

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
		}

		case "get_thinking_session": {
			const { sessionId } = args as any;
			const session = sessions.get(sessionId);
			if (!session) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								status: "error",
								message: `Session ${sessionId} not found`,
							}, null, 2),
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							status: "success",
							session: {
								sessionId: session.sessionId,
								totalThoughts: session.totalThoughts,
								currentThought: session.currentThought,
								isCompleted: session.isCompleted,
								created: session.created,
								lastUpdated: session.lastUpdated,
								steps: session.steps,
								branches: Object.fromEntries(session.branches),
							},
						}, null, 2),
					},
				],
			};
		}

		case "list_thinking_sessions": {
			const sessionList = Array.from(sessions.values()).map((session) => ({
				sessionId: session.sessionId,
				totalThoughts: session.totalThoughts,
				currentThought: session.currentThought,
				isCompleted: session.isCompleted,
				created: session.created,
				lastUpdated: session.lastUpdated,
				stepCount: session.steps.length,
				branchCount: session.branches.size,
			}));

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							status: "success",
							totalSessions: sessionList.length,
							sessions: sessionList,
						}, null, 2),
					},
				],
			};
		}

		case "analyze_thinking_patterns": {
			const { sessionId } = args as any;
			const sessionsToAnalyze = sessionId 
				? [sessions.get(sessionId)].filter(Boolean)
				: Array.from(sessions.values());

			if (sessionsToAnalyze.length === 0) {
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								status: "error",
								message: "No sessions found for analysis",
							}, null, 2),
						},
					],
				};
			}

			let totalThoughts = 0;
			let totalRevisions = 0;
			let totalBranches = 0;
			let completedSessions = 0;
			const thinkingVelocity: number[] = [];

			sessionsToAnalyze.forEach((session) => {
				if (!session) return;
				
				totalThoughts += session.steps.length;
				totalRevisions += session.steps.filter(step => step.isRevision).length;
				totalBranches += session.branches.size;
				if (session.isCompleted) completedSessions++;

				// Calculate thinking velocity (thoughts per minute)
				if (session.steps.length > 1) {
					const startTime = session.steps[0].timestamp.getTime();
					const endTime = session.steps[session.steps.length - 1].timestamp.getTime();
					const duration = (endTime - startTime) / 60000; // minutes
					if (duration > 0) {
						thinkingVelocity.push(session.steps.length / duration);
					}
				}
			});

			const avgVelocity = thinkingVelocity.length > 0 
				? thinkingVelocity.reduce((a, b) => a + b, 0) / thinkingVelocity.length 
				: 0;

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							status: "success",
							analysis: {
								sessionsAnalyzed: sessionsToAnalyze.length,
								totalThoughts,
								averageThoughtsPerSession: sessionsToAnalyze.length > 0 ? totalThoughts / sessionsToAnalyze.length : 0,
								revisionRate: totalThoughts > 0 ? (totalRevisions / totalThoughts) * 100 : 0,
								branchingFrequency: totalBranches,
								completionRate: sessionsToAnalyze.length > 0 ? (completedSessions / sessionsToAnalyze.length) * 100 : 0,
								averageThinkingVelocity: avgVelocity,
								patterns: {
									highRevisionSessions: sessionsToAnalyze.filter(s => s && s.steps.filter(step => step.isRevision).length > 0).length,
									branchedSessions: sessionsToAnalyze.filter(s => s && s.branches.size > 0).length,
									quickSessions: sessionsToAnalyze.filter(s => s && s.steps.length <= 3).length,
									deepSessions: sessionsToAnalyze.filter(s => s && s.steps.length > 10).length,
								},
							},
						}, null, 2),
					},
				],
			};
		}

		case "clear_thinking_sessions": {
			const { sessionId, olderThanHours } = args as any;
			
			if (sessionId) {
				// Clear specific session
				const existed = sessions.has(sessionId);
				sessions.delete(sessionId);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								status: "success",
								message: existed 
									? `Session ${sessionId} cleared` 
									: `Session ${sessionId} not found`,
								cleared: existed ? 1 : 0,
							}, null, 2),
						},
					],
				};
			} else if (olderThanHours) {
				// Clear old sessions
				const cutoffTime = new Date(Date.now() - olderThanHours * 3600000);
				let cleared = 0;
				for (const [sessionId, session] of sessions.entries()) {
					if (session.lastUpdated < cutoffTime) {
						sessions.delete(sessionId);
						cleared++;
					}
				}
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								status: "success",
								message: `Cleared ${cleared} sessions older than ${olderThanHours} hours`,
								cleared,
							}, null, 2),
						},
					],
				};
			} else {
				// Clear all sessions
				const cleared = sessions.size;
				sessions.clear();
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								status: "success",
								message: `Cleared all ${cleared} sessions`,
								cleared,
							}, null, 2),
						},
					],
				};
			}
		}

		default:
			throw new Error(`Unknown tool: ${name}`);
	}
});

// Handle Server-Sent Events for remote MCP clients
async function handleSSE(request: Request): Promise<Response> {
	const { readable, writable } = new TransformStream();
	const writer = writable.getWriter();
	const encoder = new TextEncoder();

	// Set up SSE headers
	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	});

	// Handle OPTIONS for CORS
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 200, headers });
	}

	// Start the SSE connection
	writer.write(encoder.encode('data: {"type":"connection","status":"connected"}\n\n'));

			// Handle MCP protocol over SSE
		if (request.method === 'POST') {
			let mcpRequest: any = null;
			try {
				const body = await request.text();
				mcpRequest = JSON.parse(body);
				
				// Process the MCP request manually
				let result;
				if (mcpRequest.method === 'tools/list') {
					result = {
						tools: [
							{
								name: "sequential_thinking",
								description: "Process sequential thinking steps for complex problem-solving and analysis",
								inputSchema: {
									type: "object",
									properties: {
										thought: { type: "string", description: "The current thinking step" },
										nextThoughtNeeded: { type: "boolean", description: "Whether another thought step is needed" },
										thoughtNumber: { type: "integer", minimum: 1, description: "Current thought number" },
										totalThoughts: { type: "integer", minimum: 1, description: "Estimated total thoughts needed" },
										sessionId: { type: "string", description: "Session ID to track thinking process (defaults to 'default')" },
										isRevision: { type: "boolean", description: "Whether this revises previous thinking" },
										revisesThought: { type: "integer", description: "Which thought is being reconsidered" },
										branchFromThought: { type: "integer", description: "Branching point thought number" },
										branchId: { type: "string", description: "Branch identifier for alternative reasoning paths" },
									},
									required: ["thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"],
								},
							},
						],
					};
				} else if (mcpRequest.method === 'tools/call') {
					// Handle tool calls directly
					const { name, arguments: args } = mcpRequest.params;
					if (name === 'sequential_thinking') {
						result = await handleSequentialThinking(args);
					} else {
						throw new Error(`Unknown tool: ${name}`);
					}
				} else {
					throw new Error(`Method not found: ${mcpRequest.method}`);
				}
				
				// Send the response
				const responseData = JSON.stringify({
					jsonrpc: '2.0',
					id: mcpRequest.id,
					result,
				});
				writer.write(encoder.encode(`data: ${responseData}\n\n`));
			} catch (error) {
				const errorResponse = {
					jsonrpc: '2.0',
					id: mcpRequest?.id || null,
					error: {
						code: -32000,
						message: error instanceof Error ? error.message : 'Unknown error',
					},
				};
				writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
			}
		}

	// Keep connection alive
	const keepAlive = setInterval(() => {
		writer.write(encoder.encode('data: {"type":"ping"}\n\n'));
	}, 30000);

	// Cleanup on disconnect
	request.signal?.addEventListener('abort', () => {
		clearInterval(keepAlive);
		writer.close();
	});

	return new Response(readable, { headers });
}

// Export default function for Cloudflare Workers
export default {
	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({
				status: 'healthy',
				service: 'Sequential Thinking MCP Server',
				version: '1.0.0',
				timestamp: new Date().toISOString(),
				sessionsCount: sessions.size,
			}), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// SSE endpoint for MCP clients
		if (url.pathname === '/sse' || url.pathname === '/') {
			return handleSSE(request);
		}

		// Information endpoint
		if (url.pathname === '/info') {
			return new Response(`
# Sequential Thinking MCP Server 🧠

**Status:** Running
**Version:** 1.0.0
**Active Sessions:** ${sessions.size}

## Connection Instructions for Claude Desktop

Add this to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-remote", "${url.origin}/"]
    }
  }
}
\`\`\`

## Available Tools:
- **sequential_thinking** - Process reasoning steps
- **get_thinking_session** - Retrieve session history  
- **list_thinking_sessions** - List all sessions
- **analyze_thinking_patterns** - Analyze thinking patterns
- **clear_thinking_sessions** - Clear sessions

Visit: ${url.origin}/health for health status
			`, {
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		return new Response('Not found', { status: 404 });
	},
};
