/**
 * Backend type definitions
 */

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * MCP Message types
 */
export interface MCPRequest {
  id: string;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * AI Service types
 */
export interface AICompletionRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Add more backend-specific types as needed
