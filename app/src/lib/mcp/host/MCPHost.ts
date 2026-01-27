/**
 * MCP Host Service - Central orchestration layer for MCP protocol
 *
 * T-020: MCP Host Service (21 points, XL)
 * - Scope-based routing (teacher:, admin:, student:*)
 * - Session management + JWT verification
 * - Context aggregation for LLM
 * - Critical path - enables all MCP servers
 */

import {
  MCPSession,
  MCPServerConfig,
  MCPResponse,
  MCPTool,
  MCPResource,
  MCPPrompt,
  ScopeMatcher,
  MCPErrorCode,
  AggregatedContext,
  ContextItem,
  JWTClaims,
} from '../types';
import { createClient } from '@/lib/supabase/server';

/**
 * MCP Host - Orchestrates requests across multiple MCP servers
 */
export class MCPHost {
  private servers: Map<string, MCPServerConfig> = new Map();
  private sessions: Map<string, MCPSession> = new Map();

  constructor() {
    // Initialize with no servers - they will be registered dynamically
  }

  /**
   * Register an MCP server with the host
   */
  registerServer(config: MCPServerConfig): void {
    console.log(`[MCP Host] Registering server: ${config.name} (prefix: ${config.scopePrefix})`);
    this.servers.set(config.scopePrefix, config);
  }

  /**
   * Create a session from JWT claims
   */
  async createSession(claims: JWTClaims): Promise<MCPSession> {
    // Generate scopes based on user role
    const scopes = ScopeMatcher.generateScopes(claims.role);

    const session: MCPSession = {
      sessionId: crypto.randomUUID(),
      userId: claims.sub,
      tenantId: claims.tenant_id,
      role: claims.role,
      scopes: claims.scopes || scopes,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      metadata: {
        email: claims.email,
        name: claims.user_metadata?.name,
      },
    };

    // Store session
    this.sessions.set(session.sessionId, session);

    console.log(
      `[MCP Host] Created session ${session.sessionId} for user ${session.userId} (role: ${session.role})`
    );

    return session;
  }

  /**
   * Verify JWT and create/retrieve session
   */
  async verifyAndCreateSession(): Promise<MCPSession> {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error(MCPErrorCode.UNAUTHORIZED);
    }

    // Extract JWT claims
    const claims: JWTClaims = {
      sub: session.user.id,
      email: session.user.email,
      role: (session.user.app_metadata?.role as 'admin' | 'teacher' | 'student') || 'student',
      tenant_id: session.user.app_metadata?.tenant_id as string,
      app_metadata: {
        role: (session.user.app_metadata?.role as string) || 'student',
        tenant_id: (session.user.app_metadata?.tenant_id as string) || '',
      },
      user_metadata: {
        name: session.user.user_metadata?.name as string | undefined,
        avatar_url: session.user.user_metadata?.avatar_url as string | undefined,
      },
    };

    // Create session
    return this.createSession(claims);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): MCPSession | null {
    const _session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Route a tool request to the appropriate MCP server
   */
  async executeTool(toolName: string, input: unknown, session: MCPSession): Promise<MCPResponse> {
    const startTime = Date.now();

    try {
      // Find the tool across all registered servers
      let tool: MCPTool | null = null;
      let serverName: string | null = null;

      for (const [_prefix, server] of this.servers.entries()) {
        const foundTool = server.tools.find(t => t.name === toolName);
        if (foundTool) {
          tool = foundTool;
          serverName = server.name;
          break;
        }
      }

      if (!tool || !serverName) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.TOOL_NOT_FOUND,
            message: `Tool '${toolName}' not found`,
          },
        };
      }

      // Check scopes
      if (!ScopeMatcher.hasScope(session.scopes, tool.requiredScopes)) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.FORBIDDEN,
            message: `Insufficient scopes. Required: ${tool.requiredScopes.join(', ')}`,
          },
        };
      }

      // Validate input
      const validationResult = tool.inputSchema.safeParse(input);
      if (!validationResult.success) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.INVALID_INPUT,
            message: 'Invalid input',
            details: validationResult.error.issues,
          },
        };
      }

      // Execute tool
      const result = await tool.handler(validationResult.data, session);

      return {
        success: true,
        data: result,
        metadata: {
          server: serverName,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: MCPErrorCode.EXECUTION_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          server: 'unknown',
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Fetch a resource from an MCP server
   */
  async fetchResource(
    resourceUri: string,
    session: MCPSession,
    params?: Record<string, string>
  ): Promise<MCPResponse> {
    const startTime = Date.now();

    try {
      // Find the resource across all registered servers
      let resource: MCPResource | null = null;
      let serverName: string | null = null;

      for (const [_prefix, server] of this.servers.entries()) {
        const foundResource = server.resources.find(r => r.uri === resourceUri);
        if (foundResource) {
          resource = foundResource;
          serverName = server.name;
          break;
        }
      }

      if (!resource || !serverName) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Resource '${resourceUri}' not found`,
          },
        };
      }

      // Check scopes
      if (!ScopeMatcher.hasScope(session.scopes, resource.requiredScopes)) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.FORBIDDEN,
            message: `Insufficient scopes. Required: ${resource.requiredScopes.join(', ')}`,
          },
        };
      }

      // Fetch resource
      const result = await resource.handler(session, params);

      return {
        success: true,
        data: result,
        metadata: {
          server: serverName,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: MCPErrorCode.EXECUTION_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
        metadata: {
          server: 'unknown',
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get a prompt template
   */
  async getPrompt(promptName: string, session: MCPSession): Promise<MCPResponse<MCPPrompt>> {
    try {
      // Find the prompt across all registered servers
      let prompt: MCPPrompt | null = null;
      let serverName: string | null = null;

      for (const [_prefix, server] of this.servers.entries()) {
        if (server.prompts) {
          const foundPrompt = server.prompts.find(p => p.name === promptName);
          if (foundPrompt) {
            prompt = foundPrompt;
            serverName = server.name;
            break;
          }
        }
      }

      if (!prompt || !serverName) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.RESOURCE_NOT_FOUND,
            message: `Prompt '${promptName}' not found`,
          },
        };
      }

      // Check scopes
      if (!ScopeMatcher.hasScope(session.scopes, prompt.requiredScopes)) {
        return {
          success: false,
          error: {
            code: MCPErrorCode.FORBIDDEN,
            message: `Insufficient scopes. Required: ${prompt.requiredScopes.join(', ')}`,
          },
        };
      }

      return {
        success: true,
        data: prompt,
        metadata: {
          server: serverName,
          executionTimeMs: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: MCPErrorCode.EXECUTION_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }

  /**
   * Aggregate context from multiple sources for LLM
   * This is critical for providing rich context to AI assistants
   */
  async aggregateContext(
    session: MCPSession,
    contextRequests: {
      type: 'tool' | 'resource' | 'prompt';
      target: string;
      params?: Record<string, unknown>;
    }[]
  ): Promise<AggregatedContext> {
    const items: ContextItem[] = [];

    // Execute all context requests in parallel
    const results = await Promise.allSettled(
      contextRequests.map(async req => {
        if (req.type === 'tool') {
          const response = await this.executeTool(req.target, req.params, session);
          return {
            type: 'tool_result' as const,
            target: req.target,
            response,
          };
        } else if (req.type === 'resource') {
          const response = await this.fetchResource(
            req.target,
            session,
            req.params as Record<string, string>
          );
          return {
            type: 'resource' as const,
            target: req.target,
            response,
          };
        } else {
          const response = await this.getPrompt(req.target, session);
          return {
            type: 'prompt' as const,
            target: req.target,
            response,
          };
        }
      })
    );

    // Process results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { type, target, response } = result.value;

        if (response.success) {
          items.push({
            source: response.metadata?.server || 'unknown',
            type,
            content: response.data,
            relevance: 1.0, // Could be enhanced with relevance scoring
            timestamp: new Date(),
          });
        } else {
          console.warn(`[MCP Host] Context request failed: ${target}`, response.error);
        }
      } else {
        console.error(`[MCP Host] Context request error:`, result.reason);
      }
    });

    return {
      session,
      items,
      totalTokens: undefined, // Could be calculated based on content
      truncated: false,
    };
  }

  /**
   * List all available tools for a session (based on scopes)
   */
  listTools(session: MCPSession): MCPTool[] {
    const tools: MCPTool[] = [];

    for (const [_prefix, server] of this.servers.entries()) {
      for (const tool of server.tools) {
        if (ScopeMatcher.hasScope(session.scopes, tool.requiredScopes)) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }

  /**
   * List all available resources for a session (based on scopes)
   */
  listResources(session: MCPSession): MCPResource[] {
    const resources: MCPResource[] = [];

    for (const [_prefix, server] of this.servers.entries()) {
      for (const resource of server.resources) {
        if (ScopeMatcher.hasScope(session.scopes, resource.requiredScopes)) {
          resources.push(resource);
        }
      }
    }

    return resources;
  }

  /**
   * List all registered servers
   */
  listServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded';
    servers: { name: string; status: string }[];
  }> {
    const serverStatuses = Array.from(this.servers.values()).map(server => ({
      name: server.name,
      status: 'healthy', // Could be enhanced with actual health checks
    }));

    return {
      status: 'healthy',
      servers: serverStatuses,
    };
  }
}

/**
 * Singleton instance of MCP Host
 */
let mcpHostInstance: MCPHost | null = null;

export function getMCPHost(): MCPHost {
  if (!mcpHostInstance) {
    mcpHostInstance = new MCPHost();
  }
  return mcpHostInstance;
}
