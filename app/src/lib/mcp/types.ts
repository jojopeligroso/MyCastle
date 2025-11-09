/**
 * MCP Types - Shared types for Model Context Protocol implementation
 *
 * This module defines the core types used across the MCP infrastructure,
 * including scope-based routing, session management, and context aggregation.
 */

import { z } from 'zod';

/**
 * JWT Scope format: <domain>:<action>
 * Examples:
 * - teacher:view_timetable
 * - teacher:mark_attendance
 * - admin:create_user
 * - student:view_grades
 */
export const ScopeSchema = z.string().regex(/^[a-z]+:[a-z_*]+$/);

/**
 * JWT Claims extracted from Supabase session
 */
export interface JWTClaims {
  sub: string; // User ID
  email?: string;
  role: 'admin' | 'teacher' | 'student';
  tenant_id: string;
  scopes?: string[]; // e.g., ['teacher:*', 'student:view_grades']
  app_metadata?: {
    role: string;
    tenant_id: string;
  };
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

/**
 * MCP Session - Represents an authenticated session with scope-based access
 */
export interface MCPSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  role: 'admin' | 'teacher' | 'student';
  scopes: string[];
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * MCP Tool Definition
 */
export interface MCPTool {
  name: string;
  description: string;
  requiredScopes: string[]; // e.g., ['teacher:mark_attendance']
  inputSchema: z.ZodSchema;
  handler: (input: unknown, session: MCPSession) => Promise<unknown>;
}

/**
 * MCP Resource Definition
 */
export interface MCPResource {
  uri: string; // e.g., "mycastle://teacher/timetable"
  name: string;
  description: string;
  requiredScopes: string[]; // e.g., ['teacher:view_timetable']
  mimeType?: string;
  handler: (session: MCPSession, params?: Record<string, string>) => Promise<unknown>;
}

/**
 * MCP Prompt Template
 */
export interface MCPPrompt {
  name: string;
  description: string;
  template: string;
  variables: string[];
  requiredScopes: string[];
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  scopePrefix: string; // e.g., 'teacher', 'admin', 'student'
  tools: MCPTool[];
  resources: MCPResource[];
  prompts?: MCPPrompt[];
}

/**
 * MCP Request - Routed by the MCP Host
 */
export interface MCPRequest {
  type: 'tool' | 'resource' | 'prompt';
  target: string; // Tool name, resource URI, or prompt name
  params?: Record<string, unknown>;
  session: MCPSession;
}

/**
 * MCP Response
 */
export interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    server: string;
    executionTimeMs: number;
  };
}

/**
 * Context Item - For LLM context aggregation
 */
export interface ContextItem {
  source: string; // e.g., 'teacher-mcp', 'admin-mcp'
  type: 'tool_result' | 'resource' | 'prompt' | 'metadata';
  content: unknown;
  relevance?: number; // 0-1 score for context prioritization
  timestamp: Date;
}

/**
 * Aggregated Context - Sent to LLM
 */
export interface AggregatedContext {
  session: MCPSession;
  items: ContextItem[];
  totalTokens?: number; // Estimated token count
  truncated?: boolean;
}

/**
 * Scope Matcher - Helper for scope-based routing
 */
export class ScopeMatcher {
  /**
   * Check if user scopes satisfy required scopes
   * Supports wildcards: 'teacher:*' matches 'teacher:view_timetable'
   */
  static hasScope(userScopes: string[], requiredScopes: string[]): boolean {
    for (const required of requiredScopes) {
      const hasMatch = userScopes.some(userScope => {
        // Exact match
        if (userScope === required) return true;

        // Wildcard match (e.g., 'teacher:*' matches 'teacher:view_timetable')
        if (userScope.endsWith(':*')) {
          const prefix = userScope.slice(0, -1); // Remove '*'
          return required.startsWith(prefix);
        }

        return false;
      });

      if (!hasMatch) return false;
    }

    return true;
  }

  /**
   * Extract scope prefix (e.g., 'teacher' from 'teacher:view_timetable')
   */
  static getPrefix(scope: string): string {
    return scope.split(':')[0];
  }

  /**
   * Generate scopes from user role
   * Admin gets all scopes, teacher gets teacher:*, student gets student:*
   */
  static generateScopes(role: 'admin' | 'teacher' | 'student'): string[] {
    switch (role) {
      case 'admin':
        return ['admin:*', 'teacher:*', 'student:*'];
      case 'teacher':
        return ['teacher:*', 'student:view_grades', 'student:view_attendance'];
      case 'student':
        return ['student:*'];
      default:
        return [];
    }
  }
}

/**
 * MCP Error Codes
 */
export const MCPErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
} as const;

export type MCPErrorCodeType = typeof MCPErrorCode[keyof typeof MCPErrorCode];
