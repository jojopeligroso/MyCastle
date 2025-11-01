/**
 * MCP Client for Admin MCP Server
 * Provides methods to call Admin MCP tools via HTTP
 */

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface AdminMCPConfig {
  baseUrl: string;
  token?: string;
}

export class AdminMCPClient {
  private baseUrl: string;
  private token?: string;

  constructor(config: AdminMCPConfig) {
    this.baseUrl = config.baseUrl;
    this.token = config.token;
  }

  /**
   * Call an MCP tool
   */
  async callTool<TInput = unknown, TOutput = unknown>(
    toolName: string,
    input: TInput
  ): Promise<TOutput> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: `tools/call`,
      params: {
        name: toolName,
        arguments: input,
      },
    };

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MCPResponse<TOutput> = await response.json();

    if (data.error) {
      throw new Error(`MCP Error: ${data.error.message}`);
    }

    if (!data.result) {
      throw new Error('MCP call returned no result');
    }

    return data.result;
  }

  /**
   * List available tools
   */
  async listTools(): Promise<Array<{ name: string; description?: string }>> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
    };

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify(request),
    });

    const data: MCPResponse<{ tools: Array<{ name: string; description?: string }> }> =
      await response.json();

    if (data.error) {
      throw new Error(`MCP Error: ${data.error.message}`);
    }

    return data.result?.tools || [];
  }
}

// Create a default client instance
// In production, this would use environment variables
export const adminMCP = new AdminMCPClient({
  baseUrl: process.env.NEXT_PUBLIC_ADMIN_MCP_URL || 'http://localhost:3001',
});
