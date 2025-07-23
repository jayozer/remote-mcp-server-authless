import { MCPRequest, MCPResponse, ServerConfig } from './types.js';

/**
 * Handle MCP protocol requests with configurable server configuration
 */
export async function handleMCPRequest(
  request: MCPRequest, 
  config: ServerConfig,
  env: any
): Promise<MCPResponse> {
  const { method, params, id } = request;

  try {
    switch (method) {
      case "initialize": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: config.info.capabilities || { tools: {} },
            serverInfo: {
              name: config.info.name,
              version: config.info.version,
            },
          },
        };
      }

      case "tools/list": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: config.tools,
          },
        };
      }

      case "tools/call": {
        const { name, arguments: args } = params;
        
        if (!config.handlers[name]) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const result = await config.handlers[name](args, env);
        return {
          jsonrpc: "2.0",
          id,
          result,
        };
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

/**
 * Create a health check response for server monitoring
 */
export function createHealthResponse(
  serverName: string, 
  version: string, 
  additionalInfo: Record<string, any> = {}
): Response {
  return new Response(JSON.stringify({
    status: 'healthy',
    service: serverName,
    version,
    timestamp: new Date().toISOString(),
    ...additionalInfo,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create an info page response for server documentation
 */
export function createInfoResponse(
  serverName: string,
  version: string,
  url: URL,
  tools: string[],
  additionalInfo: string = ""
): Response {
  const toolsList = tools.map(tool => `- **${tool}**`).join('\n');
  
  return new Response(`
# ${serverName} 🧠

**Status:** Running
**Version:** ${version}

## Connection Instructions for Claude Desktop

Add this to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "${serverName.toLowerCase().replace(/\s+/g, '-')}": {
      "command": "npx",
      "args": ["mcp-remote", "${url.origin}/sse"]
    }
  }
}
\`\`\`

## Available Tools:
${toolsList}

${additionalInfo}

Visit: ${url.origin}/health for health status
  `, {
    headers: { 'Content-Type': 'text/plain' },
  });
} 