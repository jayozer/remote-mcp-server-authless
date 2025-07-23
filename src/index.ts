import { handleSSE } from './shared/sse-handler.js';
import { createHealthResponse, createInfoResponse } from './shared/mcp-protocol.js';
import { sequentialThinkingConfig, getAdditionalInfo as getSTInfo } from './sequential-thinking/index.js';
// Import other server configs as we create them
// import { playwrightConfig, getAdditionalInfo as getPWInfo } from './playwright/index.js';
// import { browserUseConfig, getAdditionalInfo as getBUInfo } from './browser-use/index.js';

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
        return handleSequentialThinkingServer(request, url, env);
      
      case 'playwright':
        return handlePlaywrightServer(request, url, env);
      
      case 'browser-use':
        return handleBrowserUseServer(request, url, env);
        
      default:
        return new Response('Unknown server type', { status: 404 });
    }
  },
};

/**
 * Determine server type based on URL or environment
 */
function getServerType(url: URL): string {
  // For development, use URL path to determine server type
  if (url.pathname.startsWith('/playwright')) {
    return 'playwright';
  }
  if (url.pathname.startsWith('/browser-use')) {
    return 'browser-use';
  }
  
  // For production, use hostname to determine server type
  const hostname = url.hostname;
  if (hostname.includes('playwright')) {
    return 'playwright';
  }
  if (hostname.includes('browser-use')) {
    return 'browser-use';
  }
  
  // Default to sequential thinking for main domain
  return 'sequential-thinking';
}

/**
 * Handle Sequential Thinking MCP Server requests
 */
async function handleSequentialThinkingServer(
  request: Request, 
  url: URL, 
  env: any
): Promise<Response> {
  // Health check endpoint
  if (url.pathname === '/health') {
    return createHealthResponse(
      sequentialThinkingConfig.info.name,
      sequentialThinkingConfig.info.version,
      getSTInfo()
    );
  }

  // SSE endpoints for MCP clients
  if (url.pathname === '/sse' || url.pathname === '/') {
    return handleSSE(request, sequentialThinkingConfig, env);
  }

  // Information endpoint
  if (url.pathname === '/info') {
    return createInfoResponse(
      sequentialThinkingConfig.info.name,
      sequentialThinkingConfig.info.version,
      url,
      sequentialThinkingConfig.tools.map(t => t.name)
    );
  }

  return new Response('Not found', { status: 404 });
}

/**
 * Handle Playwright MCP Server requests (placeholder for now)
 */
async function handlePlaywrightServer(
  request: Request, 
  url: URL, 
  env: any
): Promise<Response> {
  // TODO: Implement Playwright server
  return new Response(JSON.stringify({
    status: 'coming_soon',
    service: 'Playwright MCP Server',
    message: 'Playwright server is under development',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handle Browser-use MCP Server requests (placeholder for now)
 */
async function handleBrowserUseServer(
  request: Request, 
  url: URL, 
  env: any
): Promise<Response> {
  // TODO: Implement Browser-use server
  return new Response(JSON.stringify({
    status: 'coming_soon',
    service: 'Browser-use MCP Server',
    message: 'Browser-use server is under development',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
