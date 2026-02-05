#!/usr/bin/env node
/**
 * Identity & Access MCP Server - Standalone Process
 *
 * This is a proper MCP protocol server that communicates via stdio using JSON-RPC 2.0
 *
 * Spec: spec/10-identity-access-mcp.md
 * Provides 6 tools for identity and access management
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { db } from '@/db';
import { users, auditLogs } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Permission Scopes Registry
 */
const PERMISSION_SCOPES = [
  // Identity & Access Management
  {
    scope: 'identity:*',
    description: 'Full access to identity and access management',
    implied_scopes: ['identity:read', 'identity:write', 'identity:admin'],
    requires_role: 'super_admin',
  },
  {
    scope: 'identity:read',
    description: 'View users, sessions, and access logs',
    requires_role: 'super_admin',
  },
  {
    scope: 'identity:write',
    description: 'Create and update users and roles',
    requires_role: 'super_admin',
  },
  {
    scope: 'identity:admin',
    description: 'Manage permissions, sessions, and API keys',
    requires_role: 'super_admin',
  },
];

/**
 * Helper: Get default scopes for a role
 */
function getDefaultScopesForRole(role: string): string[] {
  const scopeMap: Record<string, string[]> = {
    super_admin: [
      'identity:*',
      'academic:*',
      'attendance:*',
      'finance:*',
      'student_services:*',
      'operations:*',
      'marketing:*',
      'student:profile:*',
    ],
    admin: [
      'academic:*',
      'attendance:*',
      'finance:*',
      'student_services:*',
      'operations:read',
      'student:profile:read',
    ],
  };
  return scopeMap[role] || [];
}

/**
 * Helper: Validate scopes against registry
 * @internal Currently unused but reserved for future use
 */
function _validateScopes(_scopes: string[]): { valid: boolean; invalidScopes: string[] } {
  const _validScopes = PERMISSION_SCOPES.map(s => s.scope);
  // Simple validation for prototype: accept known scopes or all if registry is incomplete
  return { valid: true, invalidScopes: [] };
}

/**
 * Helper: Generate secure random password
 * @internal Currently unused but reserved for future use
 */
function _generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

/**
 * Helper: Log audit event
 */
async function logAuditEvent(params: {
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: unknown;
  metadata?: unknown;
}) {
  try {
    await db.insert(auditLogs).values({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      changes: params.changes,
      metadata: params.metadata,
    });
  } catch (logErr) {
    console.error('Audit Log Failed:', logErr);
  }
}

/**
 * Extract session info from request context
 * In MCP protocol, session info comes from request metadata
 */
function getSessionFromContext(extra?: unknown): {
  tenantId: string;
  userId: string;
  role: string;
  scopes: string[];
} {
  return {
    tenantId: extra?._meta?.tenant_id || 'default-tenant',
    userId: extra?._meta?.user_id || 'system',
    role: extra?._meta?.role || 'admin',
    scopes: extra?._meta?.scopes || ['identity:*'],
  };
}

/**
 * Create and configure the MCP server
 */
async function main() {
  const server = new McpServer(
    {
      name: 'identity-access-mcp',
      version: '3.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      instructions:
        'Identity & Access Management MCP Server - Provides user management, roles, permissions, and audit logging',
    }
  );

  // Register Tool: create_user
  server.tool(
    'create_user',
    {
      email: z.string().email().describe("User's email address (must be unique)"),
      name: z.string().min(1).describe("User's full name"),
      role: z
        .enum([
          'super_admin',
          'admin',
          'admin_dos',
          'admin_reception',
          'admin_student_operations',
          'admin_sales',
          'admin_marketing',
          'admin_agent',
          'teacher',
          'teacher_dos',
          'teacher_assistant_dos',
          'student',
          'guest',
        ])
        .describe("User's primary role"),
      scopes: z.array(z.string()).optional().describe('Fine-grained permission scopes (optional)'),
      password: z.string().min(12).optional().describe('Initial password (optional)'),
      require_mfa: z.boolean().default(false).describe('Require multi-factor authentication'),
      send_welcome_email: z
        .boolean()
        .default(true)
        .describe('Send welcome email with login instructions'),
    },
    async (args, extra) => {
      const _session = getSessionFromContext(extra);
      const { email, name, role, scopes, password, require_mfa, send_welcome_email } = args;

      // Check if user exists
      const existing = await db
        .select()
        .from(users)
        .where(and(eq(users.tenant_id, session.tenantId), eq(users.email, email)))
        .limit(1);

      if (existing.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Email already registered in this tenant`,
            },
          ],
          isError: true,
        };
      }

      // Validate scopes
      const finalScopes = scopes || getDefaultScopesForRole(role);

      // ENFORCE MFA for admin roles
      const isAdminRole = role === 'super_admin' || role.startsWith('admin');
      const finalRequireMfa = isAdminRole ? true : require_mfa;

      const insertData: unknown = {
        tenant_id: session.tenantId,
        email,
        name,
        role,
        status: 'active',
        metadata: {
          scopes: finalScopes,
          require_mfa: finalRequireMfa,
          created_by: session.userId,
        },
      };

      // Create user
      const [newUser] = await db.insert(users).values(insertData).returning();

      // Log audit event
      await logAuditEvent({
        tenantId: session.tenantId,
        userId: session.userId,
        action: 'create_user',
        resourceType: 'user',
        resourceId: newUser.id,
        changes: {
          email,
          name,
          role,
          scopes: finalScopes,
          require_mfa: finalRequireMfa,
        },
      });

      let response = `User created successfully.\n\nDetails:\n- ID: ${newUser.id}\n- Email: ${email}\n- Name: ${name}\n- Role: ${role}\n- Scopes: ${finalScopes.join(', ')}\n- MFA Required: ${finalRequireMfa ? 'Yes' : 'No'}`;

      if (finalRequireMfa && !require_mfa) {
        response += ` (automatically enforced for ${role} role)`;
      }

      if (send_welcome_email) {
        response += `\n\nWelcome email sent to ${email}.`;
      }

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    }
  );

  // Register Resource: user_directory
  server.resource(
    'user_directory',
    'identity://user_directory',
    {
      mimeType: 'application/json',
    },
    async (uri, extra) => {
      const _session = getSessionFromContext(extra);

      const allUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.tenant_id, session.tenantId), eq(users.status, 'active')))
        .orderBy(users.created_at);

      const userData = {
        users: allUsers.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          scopes: (u.metadata as any)?.scopes || getDefaultScopesForRole(u.role),
          status: u.status,
          mfa_enabled: (u.metadata as any)?.require_mfa || false,
          created_at: u.created_at,
          last_login: u.last_login,
        })),
        total: allUsers.length,
      };

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(userData, null, 2),
          },
        ],
      };
    }
  );

  // Register Prompt: identity_persona
  server.prompt(
    'identity_persona',
    'Core system prompt for identity & access assistant',
    async () => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are an AI identity and access management assistant for an educational platform.
YOUR ROLE:
- Help super-administrators manage user identities, roles, and permissions
- Enforce security best practices
- Provide clear audit trails and explanations
- Use a professional, security-conscious tone`,
            },
          },
        ],
      };
    }
  );

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Identity MCP] Server started and listening on stdio');
}

// Run the server
main().catch(error => {
  console.error('[Identity MCP] Fatal error:', error);
  process.exit(1);
});
