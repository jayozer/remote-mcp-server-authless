/**
 * Shared authentication utilities for MCP servers
 */

export interface AuthResult {
  success: boolean;
  error?: string;
  apiKey?: string;
}

/**
 * Extract and validate OpenAI API key from request headers
 */
export function validateOpenAIKey(request: Request): AuthResult {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      success: false,
      error: 'Missing Authorization header. Required format: Bearer sk-...'
    };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      success: false,
      error: 'Invalid Authorization format. Required format: Bearer sk-...'
    };
  }

  const apiKey = parts[1];
  
  // Basic OpenAI API key format validation
  if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
    return {
      success: false,
      error: 'Invalid OpenAI API key format. Must start with sk- and be at least 20 characters'
    };
  }

  return {
    success: true,
    apiKey
  };
}

/**
 * Create an authentication error response
 */
export function createAuthErrorResponse(message: string): Response {
  return new Response(JSON.stringify({
    error: 'Authentication failed',
    message,
    hint: 'Provide your OpenAI API key in the Authorization header: Bearer sk-...'
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="OpenAI API Key Required"'
    }
  });
}

/**
 * Middleware to check if authentication is required for a path
 */
export function requiresAuth(pathname: string, authPaths: string[] = ['/sse']): boolean {
  return authPaths.some(path => pathname.startsWith(path));
}

/**
 * Rate limiting utilities (basic implementation)
 */
export class RateLimit {
  private static requests = new Map<string, number[]>();
  
  static check(identifier: string, windowMs: number = 60000, maxRequests: number = 100): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const userRequests = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  static createRateLimitResponse(): Response {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.'
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    });
  }
} 