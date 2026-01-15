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
 * User roles in the system (v3.0 architecture)
 *
 * Admin roles hierarchy (all require super_admin to assign):
 * - super_admin: Full system access including identity management
 * - admin: Legacy full operational access (gradually being replaced by specialized roles)
 * - admin_dos: Director of Studies - academic oversight and curriculum management
 * - admin_reception: Front desk operations, student check-in, basic info
 * - admin_student_operations: Student services, accommodations, enrollment management
 * - admin_sales: Financial operations, invoice creation, payment tracking
 * - admin_marketing: Marketing campaigns, lead management, demographics
 * - admin_agent: Limited partner/agent role - can request invoices only (requires approval)
 *
 * Teacher roles:
 * - teacher: Standard teaching staff
 * - teacher_dos: Director of Studies (teaching + academic leadership)
 * - teacher_assistant_dos: Assistant Director of Studies (teaching + limited academic admin)
 *
 * Other roles:
 * - student: Students
 * - guest: No access
 *
 * NOTE: Multi-role support planned for v3.1 - users will be able to hold multiple roles
 * Currently: Single primary role per user
 */
export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'admin_dos'
  | 'admin_reception'
  | 'admin_student_operations'
  | 'admin_sales'
  | 'admin_marketing'
  | 'admin_agent'
  | 'teacher'
  | 'teacher_dos'
  | 'teacher_assistant_dos'
  | 'student'
  | 'guest';

/**
 * JWT Claims extracted from Supabase session
 */
export interface JWTClaims {
  sub: string; // User ID
  email?: string;
  role: UserRole;
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
  role: UserRole;
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
   * Generate scopes from user role (v3.0 architecture)
   */
  static generateScopes(role: UserRole): string[] {
    switch (role) {
      case 'super_admin':
        // Full system access including identity management and student profiles
        return [
          'identity:*',
          'academic:*',
          'attendance:*',
          'finance:*',
          'student_services:*',
          'operations:*',
          'marketing:*',
          'student:profile:*',
        ];

      case 'admin':
        // Legacy full admin role - all operational scopes except identity:*
        return [
          'academic:*',
          'attendance:*',
          'finance:*',
          'student_services:*',
          'operations:read',
          'student:profile:read',
        ];

      case 'admin_dos':
        // Director of Studies: academic operations, curriculum, quality assurance, full student profile access
        return [
          'academic:*',
          'attendance:read',
          'teacher:view_all',
          'operations:quality_assurance',
          'student:profile:*',
        ];

      case 'admin_reception':
        // Front desk: view students, check attendance, view schedules
        return ['academic:read', 'attendance:read', 'student_services:read', 'student:view_info'];

      case 'admin_student_operations':
        // Student services: manage accommodations, enrollments, student records, full student profile access
        return [
          'student_services:*',
          'academic:read',
          'academic:enroll_students',
          'attendance:write',
          'student:profile:*',
        ];

      case 'admin_sales':
        // Sales & invoicing: full finance access, view academic offerings
        return ['finance:*', 'academic:read', 'student:view_info', 'marketing:read'];

      case 'admin_marketing':
        // Marketing: campaigns, leads, demographics
        return ['marketing:*', 'academic:read', 'student:view_demographics', 'finance:read'];

      case 'admin_agent':
        // Limited partner/agent role: request invoices only (requires approval)
        return ['finance:request_invoice', 'academic:read', 'student:view_public_info'];

      case 'teacher':
        // Standard teaching: lessons, attendance, grading, full student profile access
        return ['teacher:*', 'academic:read', 'attendance:write', 'student:profile:*'];

      case 'teacher_dos':
        // Director of Studies (teacher): teaching + academic leadership + teacher oversight + student profiles
        return [
          'teacher:*',
          'academic:write',
          'academic:curriculum_design',
          'attendance:*',
          'teacher:view_all',
          'operations:quality_assurance',
          'student:profile:*',
        ];

      case 'teacher_assistant_dos':
        // Assistant Director of Studies: teaching + limited academic admin + student profiles
        return [
          'teacher:*',
          'academic:read',
          'academic:suggest_changes',
          'attendance:write',
          'teacher:view_all',
          'student:profile:*',
        ];

      case 'student':
        // Student portal access
        return ['student:*'];

      case 'guest':
        // No access
        return [];

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

export type MCPErrorCodeType = (typeof MCPErrorCode)[keyof typeof MCPErrorCode];
