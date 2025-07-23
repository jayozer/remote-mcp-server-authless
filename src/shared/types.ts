// Shared types for MCP protocol and common interfaces

export interface MCPRequest {
  jsonrpc: string;
  id: number | string | null;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface ServerInfo {
  name: string;
  version: string;
  capabilities?: any;
}

export interface Environment {
  [key: string]: any;
}

export type ToolHandler = (args: any, env: Environment) => Promise<ToolResponse>;

export interface ServerConfig {
  info: ServerInfo;
  tools: MCPTool[];
  handlers: Record<string, ToolHandler>;
} 