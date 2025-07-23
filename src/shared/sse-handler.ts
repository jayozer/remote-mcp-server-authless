import { handleMCPRequest } from './mcp-protocol.js';
import { ServerConfig } from './types.js';

/**
 * Handle Server-Sent Events for remote MCP clients
 */
export async function handleSSE(
  request: Request, 
  config: ServerConfig,
  env: any
): Promise<Response> {
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
      const response = await handleMCPRequest(mcpRequest, config, env);
      
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