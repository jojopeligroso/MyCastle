/**
 * Tool Routing
 * Routes tool calls to the appropriate MCP server
 */

import { mcpManager } from './mcp-client-manager.js';
import { User } from './context-aggregator.js';

/**
 * Tool registry mapping tool names to MCP roles
 */
const TOOL_REGISTRY: Record<string, string> = {
  // Admin MCP tools - Identity & Access
  'create-user': 'admin',
  'update-user': 'admin',
  'suspend-user': 'admin',
  'assign-role': 'admin',
  'list-users': 'admin',
  'search-users': 'admin',

  // Admin MCP tools - Academic Programs
  'create-programme': 'admin',
  'create-course': 'admin',
  'assign-course-programme': 'admin',

  // Admin MCP tools - Class Management
  'create-class': 'admin',
  'list-classes': 'admin',
  'assign-teacher': 'admin',

  // Admin MCP tools - Scheduling
  'create-session': 'admin',

  // Admin MCP tools - Enrollment
  'enroll-student': 'admin',

  // Admin MCP tools - Attendance
  'mark-attendance': 'admin',
  'correct-attendance-admin': 'admin',

  // Admin MCP tools - Reporting & Analytics
  'get-attendance-summary': 'admin',

  // Admin MCP tools - Export & Data
  'generate-export': 'admin',
  'download-export': 'admin',
  'import-data': 'admin',

  // Future: Teacher MCP tools
  // 'create-lesson-plan': 'teacher',
  // 'assign-homework': 'teacher',

  // Future: Student MCP tools
  // 'ask-tutor': 'student',
  // 'submit-homework': 'student',
};

/**
 * Tool scope requirements mapping
 */
const TOOL_SCOPES: Record<string, string[]> = {
  // Admin tools - Identity & Access
  'create-user': ['admin.write.user'],
  'update-user': ['admin.write.user'],
  'suspend-user': ['admin.write.user'],
  'assign-role': ['admin.write.user', 'admin.write.role'],
  'list-users': ['admin.read.user'],
  'search-users': ['admin.read.user'],

  // Admin tools - Academic Programs
  'create-programme': ['admin.write.programme'],
  'create-course': ['admin.write.course'],
  'assign-course-programme': ['admin.write.course'],

  // Admin tools - Class Management
  'create-class': ['admin.write.class'],
  'list-classes': ['admin.read.class'],
  'assign-teacher': ['admin.write.class', 'admin.write.assignment'],

  // Admin tools - Scheduling
  'create-session': ['admin.write.session'],

  // Admin tools - Enrollment
  'enroll-student': ['admin.write.enrollment'],

  // Admin tools - Attendance
  'mark-attendance': ['admin.write.attendance', 'teacher.write.attendance'],
  'correct-attendance-admin': ['admin.write.attendance'],

  // Admin tools - Reporting & Analytics
  'get-attendance-summary': ['admin.read.attendance'],

  // Admin tools - Export & Data
  'generate-export': ['admin.write.export'],
  'download-export': ['admin.read.export'],
  'import-data': ['admin.write.import', 'admin.write.user', 'admin.write.class'],

  // Teacher tools
  // 'mark-attendance': ['teacher.write.attendance'], // Already listed above
};

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Route tool calls to the appropriate MCP server
 */
export class ToolRouter {
  /**
   * Get the MCP role for a tool
   */
  getToolRole(toolName: string): string {
    const role = TOOL_REGISTRY[toolName];
    if (!role) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return role;
  }

  /**
   * Get required scopes for a tool
   */
  getToolScopes(toolName: string): string[] {
    return TOOL_SCOPES[toolName] || [];
  }

  /**
   * Check if user has required scopes for a tool
   */
  hasRequiredScopes(user: User, toolName: string): boolean {
    const requiredScopes = this.getToolScopes(toolName);

    // Super admin has all permissions
    if (user.scopes.includes('admin.super')) {
      return true;
    }

    // Check if user has all required scopes
    return requiredScopes.every((scope) => user.scopes.includes(scope));
  }

  /**
   * Execute a tool call
   */
  async executeTool(
    toolCall: ToolCall,
    user: User
  ): Promise<ToolResult> {
    const { name, arguments: args } = toolCall;

    console.log(`[Tool] Executing ${name} for ${user.email}`);

    try {
      // Get MCP role for this tool
      const role = this.getToolRole(name);

      // Verify user has required scopes
      if (!this.hasRequiredScopes(user, name)) {
        const requiredScopes = this.getToolScopes(name);
        throw new Error(
          `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`
        );
      }

      // Get MCP client
      const client = await mcpManager.getClient(role);

      // Call tool on MCP server
      const result = await client.callTool(
        {
          name,
          arguments: args,
        },
        {
          _meta: {
            headers: {
              authorization: `Bearer ${user.jwt}`,
            },
          },
        } as any
      );

      console.log(`[Tool] ${name} completed successfully`);

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error(`[Tool] ${name} failed:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute multiple tool calls in sequence
   */
  async executeTools(
    toolCalls: ToolCall[],
    user: User
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall, user);
      results.push(result);

      // Stop on first error (optional - could continue)
      if (!result.success) {
        console.warn(
          `[Tool] Stopping execution due to error in ${toolCall.name}`
        );
        break;
      }
    }

    return results;
  }

  /**
   * List all available tools for a user
   */
  async listAvailableTools(user: User): Promise<string[]> {
    const availableTools: string[] = [];

    for (const [toolName, _role] of Object.entries(TOOL_REGISTRY)) {
      if (this.hasRequiredScopes(user, toolName)) {
        availableTools.push(toolName);
      }
    }

    return availableTools;
  }

  /**
   * Get tool schemas from MCP server
   */
  async getToolSchemas(role: string): Promise<any[]> {
    try {
      const client = await mcpManager.getClient(role);
      const response = await client.listTools();
      return response.tools || [];
    } catch (error: any) {
      console.error(`[Tool] Failed to get tool schemas for ${role}:`, error.message);
      return [];
    }
  }

  /**
   * Get all tool schemas for a user
   */
  async getAllToolSchemas(user: User): Promise<any[]> {
    const schemas: any[] = [];

    // Get unique roles
    const roles = new Set<string>();
    for (const [toolName, role] of Object.entries(TOOL_REGISTRY)) {
      if (this.hasRequiredScopes(user, toolName)) {
        roles.add(role);
      }
    }

    // Fetch schemas from each role's MCP
    for (const role of roles) {
      const roleSchemas = await this.getToolSchemas(role);
      schemas.push(...roleSchemas);
    }

    return schemas;
  }
}

export const toolRouter = new ToolRouter();
