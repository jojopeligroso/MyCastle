/**
 * MCP Host Service - Proper MCP Protocol Implementation
 *
 * This host connects to MCP servers as separate processes via stdio transport
 * and communicates using JSON-RPC 2.0 protocol.
 *
 * T-020: MCP Host Service (21 points, XL)
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * MCP Server Configuration
 */
interface MCPServerConfig {
  name: string;
  version: string;
  scopePrefix: string;
  command: string; // Command to start the server
  args?: string[]; // Arguments to pass
  env?: Record<string, string>; // Environment variables
}

/**
 * Session information (passed as metadata in requests)
 */
interface MCPSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  role: string;
  scopes: string[];
  expiresAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Connected MCP server client
 */
interface ConnectedServer {
  config: MCPServerConfig;
  client: Client;
  transport: StdioClientTransport;
  capabilities?: any;
}

/**
 * MCP Host - Orchestrates requests across multiple MCP servers via protocol
 */
export class MCPHost {
  private servers: Map<string, ConnectedServer> = new Map();
  private sessions: Map<string, MCPSession> = new Map();
  private __dirname: string;

  constructor() {
    // Get the current file's directory for resolving server paths
    this.__dirname = process.cwd();
  }

  /**
   * Register and connect to an MCP server process
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    console.log(`[MCP Host] Registering server: ${config.name} (prefix: ${config.scopePrefix})`);

    try {
      // Create client
      const client = new Client(
        {
          name: 'mycastle-host',
          version: '1.0.0',
        },
        {
          capabilities: {
            sampling: {},
          },
        }
      );

      // Create transport to spawn the server process
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: {
          ...process.env,
          ...config.env,
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      });

      // Connect to server
      await client.connect(transport);

      console.log(`[MCP Host] Connected to ${config.name}`);

      // Get server capabilities
      const capabilities = await client.getServerCapabilities();
      console.log(`[MCP Host] ${config.name} capabilities:`, JSON.stringify(capabilities, null, 2));

      // Store the connected server
      this.servers.set(config.scopePrefix, {
        config,
        client,
        transport,
        capabilities,
      });
    } catch (error) {
      console.error(`[MCP Host] Failed to register server ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Create a session (same as before)
   */
  async createSession(claims: {
    sub: string;
    email?: string;
    role: string;
    tenant_id: string;
    scopes?: string[];
  }): Promise<MCPSession> {
    const session: MCPSession = {
      sessionId: crypto.randomUUID(),
      userId: claims.sub,
      tenantId: claims.tenant_id,
      role: claims.role,
      scopes: claims.scopes || this.generateScopes(claims.role),
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      metadata: {
        email: claims.email,
      },
    };

    this.sessions.set(session.sessionId, session);
    console.log(`[MCP Host] Created session ${session.sessionId} for user ${session.userId}`);

    return session;
  }

  /**
   * Generate default scopes for a role
   */
  private generateScopes(role: string): string[] {
    const scopeMap: Record<string, string[]> = {
      super_admin: ['identity:*', 'academic:*', 'attendance:*', 'finance:*'],
      admin: ['academic:*', 'attendance:*', 'finance:*'],
      teacher: ['teacher:*', 'academic:read'],
      student: ['student:*'],
    };
    return scopeMap[role] || [];
  }

  /**
   * Execute a tool via MCP protocol
   */
  async executeTool(
    toolName: string,
    input: unknown,
    session: MCPSession
  ): Promise<{
    success: boolean;
    data?: any;
    error?: any;
    metadata?: any;
  }> {
    const startTime = Date.now();

    try {
      // Find which server provides this tool
      let targetServer: ConnectedServer | null = null;

      for (const [_prefix, server] of this.servers.entries()) {
        // List tools from this server
        const toolsList = await server.client.listTools();
        const hasTool = toolsList.tools?.some((t: any) => t.name === toolName);

        if (hasTool) {
          targetServer = server;
          break;
        }
      }

      if (!targetServer) {
        return {
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool '${toolName}' not found in any registered server`,
          },
        };
      }

      // Check scopes (simplified for now)
      // TODO: Implement proper scope checking against tool requirements

      // Call the tool via MCP protocol
      const result = await targetServer.client.callTool({
        name: toolName,
        arguments: input as Record<string, unknown>,
        _meta: {
          // Pass session context as metadata
          tenant_id: session.tenantId,
          user_id: session.userId,
          role: session.role,
          scopes: session.scopes,
        },
      });

      return {
        success: !result.isError,
        data: result.content,
        metadata: {
          server: targetServer.config.name,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Fetch a resource via MCP protocol
   */
  async fetchResource(
    resourceUri: string,
    session: MCPSession,
    params?: Record<string, string>
  ): Promise<{
    success: boolean;
    data?: any;
    error?: any;
  }> {
    try {
      // Find which server provides this resource
      let targetServer: ConnectedServer | null = null;

      for (const [_prefix, server] of this.servers.entries()) {
        const resourcesList = await server.client.listResources();
        const hasResource = resourcesList.resources?.some((r: any) => r.uri === resourceUri);

        if (hasResource) {
          targetServer = server;
          break;
        }
      }

      if (!targetServer) {
        return {
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: `Resource '${resourceUri}' not found`,
          },
        };
      }

      // Read the resource
      const result = await targetServer.client.readResource({
        uri: resourceUri,
        _meta: {
          tenant_id: session.tenantId,
          user_id: session.userId,
          role: session.role,
          scopes: session.scopes,
        },
      });

      return {
        success: true,
        data: result.contents,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get a prompt via MCP protocol
   */
  async getPrompt(promptName: string, session: MCPSession): Promise<{
    success: boolean;
    data?: any;
    error?: any;
  }> {
    try {
      let targetServer: ConnectedServer | null = null;

      for (const [_prefix, server] of this.servers.entries()) {
        const promptsList = await server.client.listPrompts();
        const hasPrompt = promptsList.prompts?.some((p: any) => p.name === promptName);

        if (hasPrompt) {
          targetServer = server;
          break;
        }
      }

      if (!targetServer) {
        return {
          success: false,
          error: {
            code: 'PROMPT_NOT_FOUND',
            message: `Prompt '${promptName}' not found`,
          },
        };
      }

      const result = await targetServer.client.getPrompt({
        name: promptName,
        _meta: {
          tenant_id: session.tenantId,
          user_id: session.userId,
        },
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * List all available tools across all servers
   */
  async listTools(session: MCPSession): Promise<any[]> {
    const allTools: any[] = [];

    for (const [_prefix, server] of this.servers.entries()) {
      try {
        const result = await server.client.listTools();
        if (result.tools) {
          allTools.push(...result.tools);
        }
      } catch (error) {
        console.error(`[MCP Host] Failed to list tools from ${server.config.name}:`, error);
      }
    }

    return allTools;
  }

  /**
   * List all available resources across all servers
   */
  async listResources(session: MCPSession): Promise<any[]> {
    const allResources: any[] = [];

    for (const [_prefix, server] of this.servers.entries()) {
      try {
        const result = await server.client.listResources();
        if (result.resources) {
          allResources.push(...result.resources);
        }
      } catch (error) {
        console.error(`[MCP Host] Failed to list resources from ${server.config.name}:`, error);
      }
    }

    return allResources;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded';
    servers: { name: string; status: string; connected: boolean }[];
  }> {
    const serverStatuses = [];

    for (const [_prefix, server] of this.servers.entries()) {
      try {
        // Try to ping the server
        await server.client.ping();
        serverStatuses.push({
          name: server.config.name,
          status: 'healthy',
          connected: true,
        });
      } catch (error) {
        serverStatuses.push({
          name: server.config.name,
          status: 'error',
          connected: false,
        });
      }
    }

    const allHealthy = serverStatuses.every(s => s.connected);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      servers: serverStatuses,
    };
  }

  /**
   * Close all server connections
   */
  async close(): Promise<void> {
    console.log('[MCP Host] Closing all server connections...');

    for (const [_prefix, server] of this.servers.entries()) {
      try {
        await server.client.close();
        console.log(`[MCP Host] Closed connection to ${server.config.name}`);
      } catch (error) {
        console.error(`[MCP Host] Error closing ${server.config.name}:`, error);
      }
    }

    this.servers.clear();
  }
}

/**
 * Singleton instance
 */
let mcpHostInstance: MCPHost | null = null;

export function getMCPHost(): MCPHost {
  if (!mcpHostInstance) {
    mcpHostInstance = new MCPHost();
  }
  return mcpHostInstance;
}
