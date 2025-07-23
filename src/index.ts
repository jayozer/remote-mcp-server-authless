import { handleSSE } from './shared/sse-handler.js';
import { createHealthResponse, createInfoResponse } from './shared/mcp-protocol.js';
import { sequentialThinkingConfig, getAdditionalInfo as getSTInfo, getHealthInfo as getSTHealth } from './sequential-thinking/index.js';
import { playwrightConfig, getAdditionalInfo as getPWInfo, getHealthInfo as getPWHealth } from './playwright/index.js';
// Import browser-use server config when created
// import { browserUseConfig, getAdditionalInfo as getBUInfo, getHealthInfo as getBUHealth } from './browser-use/index.js';

/**
 * Multi-server MCP routing system
 */
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Determine which server based on hostname or routing
    const serverType = getServerType(url);
    
    switch (serverType) {
      case 'sequential-thinking':
        return handleServerRequest(request, sequentialThinkingConfig, getSTHealth, getSTInfo(), env);
      
      case 'playwright':
        return handleServerRequest(request, playwrightConfig, getPWHealth, getPWInfo(), env);
      
      // case 'browser-use':
      //   return handleServerRequest(request, browserUseConfig, getBUHealth, getBUInfo(), env);
      
      default:
        // Default to sequential thinking for backward compatibility
        return handleServerRequest(request, sequentialThinkingConfig, getSTHealth, getSTInfo(), env);
    }
  }
};

/**
 * Determine server type based on URL patterns
 */
function getServerType(url: URL): string {
  const hostname = url.hostname;
  
  // Map hostnames to server types
  if (hostname.includes('playwright-mcp-server') || hostname.includes('playwright')) {
    return 'playwright';
  }
  if (hostname.includes('browser-use-mcp-server') || hostname.includes('browser-use')) {
    return 'browser-use';
  }
  if (hostname.includes('remote-mcp-server-authless') || hostname.includes('sequential-thinking')) {
    return 'sequential-thinking';
  }
  
  // Default to sequential thinking
  return 'sequential-thinking';
}

/**
 * Handle requests for a specific MCP server
 */
async function handleServerRequest(
  request: Request, 
  config: any, 
  getHealthInfo: () => Record<string, any>,
  additionalInfo: string,
  env: any
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Route to different endpoints
  switch (pathname) {
    case '/':
      return new Response(`Welcome to ${config.info.name}!\n\nAvailable endpoints:\n- GET /health - Health check\n- GET /info - Server information\n- GET /sse - MCP protocol endpoint\n- POST /sse - MCP tool execution\n\n${additionalInfo}`, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });

    case '/health':
      return createHealthResponse(config.info.name, config.info.version, getHealthInfo());

    case '/info':
      return createInfoResponse(
        config.info.name, 
        config.info.version, 
        url, 
        config.tools.map((t: any) => t.name),
        additionalInfo
      );

    case '/sse':
      return handleSSE(request, config, env);

    default:
      return new Response(`Not Found\n\nServer: ${config.info.name}\nEndpoint not found: ${pathname}`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
  }
}
