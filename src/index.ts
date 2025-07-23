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

// Handle MCP protocol
async function handleMCPRequest(request: any): Promise<any> {
	const { method, params, id } = request;

	try {
		switch (method) {
			case "initialize": {
				return {
					jsonrpc: "2.0",
					id,
					result: {
						protocolVersion: "2024-11-05",
						capabilities: {
							tools: {},
						},
						serverInfo: {
							name: "Sequential Thinking Server",
							version: "1.0.0",
						},
					},
				};
			}

			case "tools/list": {
				return {
					jsonrpc: "2.0",
					id,
					result: {
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
					},
				};
			}

			case "tools/call": {
				const { name, arguments: args } = params;
				if (name === "sequential_thinking") {
					const result = await handleSequentialThinking(args);
					return {
						jsonrpc: "2.0",
						id,
						result,
					};
				} else {
					throw new Error(`Unknown tool: ${name}`);
				}
			}

			default:
				throw new Error(`Unknown method: ${method}`);
		}
	} catch (error) {
		return {
			jsonrpc: "2.0",
			id,
			error: {
				code: -32000,
				message: error instanceof Error ? error.message : "Unknown error",
			},
		};
	}
}

// Handle Server-Sent Events for remote MCP clients
async function handleSSE(request: Request): Promise<Response> {
	const url = new URL(request.url);
	
	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				'Access-Control-Max-Age': '86400',
			},
		});
	}

	// Set up SSE response
	const { readable, writable } = new TransformStream();
	const writer = writable.getWriter();
	const encoder = new TextEncoder();

	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	});

	// For GET requests, just send keep-alive
	if (request.method === 'GET') {
		// Send initial connection message
		writer.write(encoder.encode('data: {"type":"connection","status":"connected"}\n\n'));
		
		// Keep connection alive with periodic pings
		const keepAlive = setInterval(() => {
			try {
				writer.write(encoder.encode('data: {"type":"ping"}\n\n'));
			} catch (error) {
				clearInterval(keepAlive);
			}
		}, 30000);

		// Handle connection close
		request.signal?.addEventListener('abort', () => {
			clearInterval(keepAlive);
			try {
				writer.close();
			} catch (e) {
				// Connection already closed
			}
		});

		return new Response(readable, { headers });
	}

	// For POST requests, handle MCP protocol
	if (request.method === 'POST') {
		try {
			const body = await request.text();
			const mcpRequest = JSON.parse(body);
			
			// Process the MCP request
			const response = await handleMCPRequest(mcpRequest);
			
			// Send the response as SSE
			const responseData = JSON.stringify(response);
			writer.write(encoder.encode(`data: ${responseData}\n\n`));
			
			// Close after sending response
			setTimeout(() => {
				try {
					writer.close();
				} catch (e) {
					// Connection already closed
				}
			}, 100);
			
		} catch (error) {
			const errorResponse = {
				jsonrpc: "2.0",
				id: null,
				error: {
					code: -32700,
					message: error instanceof Error ? error.message : "Parse error",
				},
			};
			writer.write(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
			setTimeout(() => {
				try {
					writer.close();
				} catch (e) {
					// Connection already closed
				}
			}, 100);
		}

		return new Response(readable, { headers });
	}

	return new Response('Method not allowed', { status: 405 });
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

		// SSE endpoints for MCP clients
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
      "args": ["mcp-remote", "${url.origin}/sse"]
    }
  }
}
\`\`\`

## Available Tools:
- **sequential_thinking** - Process reasoning steps

Visit: ${url.origin}/health for health status
			`, {
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		return new Response('Not found', { status: 404 });
	},
};
