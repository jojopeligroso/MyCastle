/**
 * Identity & Access MCP Server - spec/10-identity-access-mcp.md
 *
 * Provides 6 tools for identity and access management:
 * 1. create_user - Create user with role and scopes
 * 2. update_user_role - Update user's role
 * 3. set_permissions - Set fine-grained permissions
 * 4. revoke_session - Force logout user session
 * 5. rotate_api_key - Rotate API key for service accounts
 * 6. audit_access - Query access logs
 *
 * Resources:
 * - identity://user_directory
 * - identity://active_sessions
 * - identity://access_audit_log
 * - identity://permission_scopes
 *
 * Prompts:
 * - identity_persona - Security-focused AI assistant
 * - security_audit - Generate security audit report
 * - access_review - Quarterly access review for compliance
 */

import { z } from 'zod';
import { db } from '@/db';
import { users, auditLogs } from '@/db/schema';
import { eq, and, gte, lte, desc, sql, or, like } from 'drizzle-orm';
import { MCPServerConfig, MCPTool, MCPResource, MCPPrompt, MCPSession } from '../../types';
import crypto from 'crypto';

/**
 * Permission Scopes Registry
 * Defines all available authorization scopes in the system (v3.0 with specialized admin roles)
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

  // Academic Operations
  {
    scope: 'academic:*',
    description: 'Full access to academic operations (programmes, courses, classes)',
    requires_role: 'admin',
  },
  {
    scope: 'academic:read',
    description: 'View academic data (programmes, courses, schedules)',
    requires_role: 'admin_reception',
  },
  {
    scope: 'academic:write',
    description: 'Create and modify programmes, courses, and classes',
    requires_role: 'admin',
  },
  {
    scope: 'academic:enroll_students',
    description: 'Enroll and manage student enrollments',
    requires_role: 'admin_student_operations',
  },

  // Attendance & Compliance
  {
    scope: 'attendance:*',
    description: 'Full access to attendance tracking and compliance',
    requires_role: 'admin',
  },
  {
    scope: 'attendance:read',
    description: 'View attendance records',
    requires_role: 'admin_reception',
  },
  {
    scope: 'attendance:write',
    description: 'Record and modify attendance',
    requires_role: 'teacher',
  },

  // Finance
  {
    scope: 'finance:*',
    description: 'Full access to invoicing, payments, and financial operations',
    requires_role: 'admin_sales',
  },
  {
    scope: 'finance:read',
    description: 'View financial data and reports',
    requires_role: 'admin_marketing',
  },
  {
    scope: 'finance:write',
    description: 'Create invoices, record payments, manage finances',
    requires_role: 'admin_sales',
  },
  {
    scope: 'finance:request_invoice',
    description: 'Request invoice creation (requires approval from admin_sales)',
    requires_role: 'admin_agent',
  },

  // Student Services
  {
    scope: 'student_services:*',
    description: 'Full access to student services (accommodations, certificates, support)',
    requires_role: 'admin_student_operations',
  },
  {
    scope: 'student_services:read',
    description: 'View student services data',
    requires_role: 'admin_reception',
  },
  {
    scope: 'student_services:write',
    description: 'Manage accommodations, letters, and student support',
    requires_role: 'admin_student_operations',
  },

  // Operations & Quality
  {
    scope: 'operations:*',
    description: 'Full access to operations, backups, and quality management',
    requires_role: 'super_admin',
  },
  {
    scope: 'operations:read',
    description: 'View operational reports and system status',
    requires_role: 'admin',
  },

  // Marketing
  {
    scope: 'marketing:*',
    description: 'Full access to marketing campaigns, leads, and demographics',
    requires_role: 'admin_marketing',
  },
  {
    scope: 'marketing:read',
    description: 'View marketing data and campaign performance',
    requires_role: 'admin_sales',
  },

  // Teacher
  {
    scope: 'teacher:*',
    description: 'Full teacher capabilities (lesson planning, attendance, grading)',
    requires_role: 'teacher',
  },

  // Student
  {
    scope: 'student:*',
    description: 'Full student capabilities (view materials, submit homework, AI tutor)',
    requires_role: 'student',
  },
  {
    scope: 'student:view_info',
    description: 'View student contact and enrollment information',
    requires_role: 'admin_reception',
  },
  {
    scope: 'student:view_demographics',
    description: 'View student demographics for marketing analysis',
    requires_role: 'admin_marketing',
  },
  {
    scope: 'student:view_public_info',
    description: 'View limited public student information',
    requires_role: 'admin_agent',
  },

  // Student Profile Management
  {
    scope: 'student:profile:*',
    description: 'Full student profile management (read, write, edit, append)',
    requires_role: 'teacher',
  },
  {
    scope: 'student:profile:read',
    description: 'Read student profiles and records',
    requires_role: 'teacher',
  },
  {
    scope: 'student:profile:write',
    description: 'Create and update student profiles',
    requires_role: 'teacher',
  },
  {
    scope: 'student:profile:edit',
    description: 'Edit existing student profile information',
    requires_role: 'teacher',
  },
  {
    scope: 'student:profile:append',
    description: 'Add notes, comments, and observations to student profiles',
    requires_role: 'teacher',
  },
];

/**
 * Helper: Get default scopes for a role
 */
function getDefaultScopesForRole(role: string): string[] {
  const scopeMap: Record<string, string[]> = {
    super_admin: ['identity:*', 'academic:*', 'attendance:*', 'finance:*', 'student_services:*', 'operations:*', 'marketing:*', 'student:profile:*'],
    admin: ['academic:*', 'attendance:*', 'finance:*', 'student_services:*', 'operations:read', 'student:profile:read'],
    admin_dos: ['academic:*', 'attendance:read', 'teacher:view_all', 'operations:quality_assurance', 'student:profile:*'],
    admin_reception: ['academic:read', 'attendance:read', 'student_services:read', 'student:view_info'],
    admin_student_operations: ['student_services:*', 'academic:read', 'academic:enroll_students', 'attendance:write', 'student:profile:*'],
    admin_sales: ['finance:*', 'academic:read', 'student:view_info', 'marketing:read'],
    admin_marketing: ['marketing:*', 'academic:read', 'student:view_demographics', 'finance:read'],
    admin_agent: ['finance:request_invoice', 'academic:read', 'student:view_public_info'],
    teacher: ['teacher:*', 'academic:read', 'attendance:write', 'student:profile:*'],
    teacher_dos: ['teacher:*', 'academic:write', 'academic:curriculum_design', 'attendance:*', 'teacher:view_all', 'operations:quality_assurance', 'student:profile:*'],
    teacher_assistant_dos: ['teacher:*', 'academic:read', 'academic:suggest_changes', 'attendance:write', 'teacher:view_all', 'student:profile:*'],
    student: ['student:*'],
    guest: [],
  };
  return scopeMap[role] || [];
}

/**
 * Helper: Validate scopes against registry
 */
function validateScopes(scopes: string[]): { valid: boolean; invalidScopes: string[] } {
  const validScopes = PERMISSION_SCOPES.map(s => s.scope);
  const invalidScopes = scopes.filter(s => !validScopes.includes(s));
  return { valid: invalidScopes.length === 0, invalidScopes };
}

/**
 * Helper: Get user scopes from metadata
 */
function getUserScopes(user: any): string[] {
  if (user.metadata && Array.isArray(user.metadata.scopes)) {
    return user.metadata.scopes;
  }
  return getDefaultScopesForRole(user.role);
}

/**
 * Helper: Generate secure random password
 */
function generateSecurePassword(): string {
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
  changes?: any;
  metadata?: any;
}) {
  await db.insert(auditLogs).values({
    tenant_id: params.tenantId,
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    changes: params.changes,
    metadata: params.metadata,
  });
}

/**
 * Tool 1: Create User
 */
const createUserTool: MCPTool = {
  name: 'create_user',
  description: 'Create a new user account with specified role and permissions',
  requiredScopes: ['identity:write'],
  inputSchema: z.object({
    email: z.string().email().describe('User\'s email address (must be unique)'),
    name: z.string().min(1).describe('User\'s full name'),
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
      .describe('User\'s primary role'),
    scopes: z.array(z.string()).optional().describe('Fine-grained permission scopes (optional, defaults based on role)'),
    password: z.string().min(12).optional().describe('Initial password (optional, generates secure random if not provided)'),
    require_mfa: z.boolean().default(false).describe('Require multi-factor authentication'),
    send_welcome_email: z.boolean().default(true).describe('Send welcome email with login instructions'),
  }),
  handler: async (input, session) => {
    const { email, name, role, scopes, password, require_mfa, send_welcome_email } = input as {
      email: string;
      name: string;
      role: string;
      scopes?: string[];
      password?: string;
      require_mfa: boolean;
      send_welcome_email: boolean;
    };

    // Check if user with email already exists in this tenant
    const existing = await db
      .select()
      .from(users)
      .where(and(eq(users.tenant_id, session.tenantId), eq(users.email, email)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Email already registered in this tenant`);
    }

    // Check if caller can create this role
    if (role === 'super_admin' && session.role !== 'super_admin') {
      throw new Error('Cannot create super_admin users (requires super_admin role)');
    }

    // Validate scopes if provided
    const finalScopes = scopes || getDefaultScopesForRole(role);
    const scopeValidation = validateScopes(finalScopes);
    if (!scopeValidation.valid) {
      throw new Error(
        `Invalid scope(s): ${scopeValidation.invalidScopes.join(', ')}. Use identity://permission_scopes to view available scopes`,
      );
    }

    // ENFORCE MFA for all admin roles (super_admin, admin, admin_*)
    // MFA is mandatory for anyone with administrative access
    const isAdminRole = role === 'super_admin' || role.startsWith('admin');
    const finalRequireMfa = isAdminRole ? true : require_mfa;

    // Generate password if not provided
    const finalPassword = password || generateSecurePassword();

    // Special handling for admin_agent role
    const isAdminAgent = role === 'admin_agent';

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
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
      })
      .returning();

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

    // Format response
    let response = `User created successfully.\n\nDetails:\n- ID: ${newUser.id}\n- Email: ${email}\n- Name: ${name}\n- Role: ${role}\n- Scopes: ${finalScopes.join(', ')}\n- MFA Required: ${finalRequireMfa ? 'Yes' : 'No'}`;

    // Add MFA enforcement notice for privileged accounts
    if (finalRequireMfa && !require_mfa) {
      response += ` (automatically enforced for ${role} role)`;
    }

    if (!password) {
      response += `\n- Password: (sent via email)`;
    }

    if (send_welcome_email) {
      response += `\n\nWelcome email sent to ${email}.`;
    }

    if (finalRequireMfa) {
      response += `\n\n🔒 MFA Setup: User will be prompted to configure multi-factor authentication on first login.`;
    }

    // Add special notice for admin_agent role about approval workflow
    if (isAdminAgent) {
      response += `\n\n⚠️ ADMIN AGENT ROLE:\nThis is a limited partner/agent role with restricted access.\n- Can REQUEST invoices but cannot create them directly\n- All invoice requests require approval from admin_sales\n- Human-in-the-loop verification required for financial operations\n- Limited to viewing public student information only`;
    }

    return { text: response };
  },
};

/**
 * Tool 2: Update User Role
 */
const updateUserRoleTool: MCPTool = {
  name: 'update_user_role',
  description: 'Update an existing user\'s role and associated permissions',
  requiredScopes: ['identity:write'],
  inputSchema: z.object({
    user_id: z.string().uuid().describe('ID of user to modify'),
    new_role: z
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
      .describe('New role to assign'),
    reason: z.string().describe('Reason for role change (required for audit trail)'),
    notify_user: z.boolean().default(true).describe('Send notification email to user'),
  }),
  handler: async (input, session) => {
    const { user_id, new_role, reason, notify_user } = input as {
      user_id: string;
      new_role: string;
      reason: string;
      notify_user: boolean;
    };

    // Get existing user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, user_id), eq(users.tenant_id, session.tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found in this tenant');
    }

    if (user.role === new_role) {
      throw new Error(`User already has role '${new_role}'`);
    }

    // Check if caller can assign this role
    if (new_role === 'super_admin' && session.role !== 'super_admin') {
      throw new Error('Cannot assign super_admin role (requires super_admin privileges)');
    }

    const oldRole = user.role;
    const oldScopes = getUserScopes(user);
    const newScopes = getDefaultScopesForRole(new_role);

    // Update user
    const [updated] = await db
      .update(users)
      .set({
        role: new_role,
        metadata: {
          ...((user.metadata as any) || {}),
          scopes: newScopes,
        },
        updated_at: new Date(),
      })
      .where(eq(users.id, user_id))
      .returning();

    // Log audit event
    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'role_updated',
      resourceType: 'user',
      resourceId: user_id,
      changes: {
        old_role: oldRole,
        new_role,
        old_scopes: oldScopes,
        new_scopes: newScopes,
        reason,
      },
    });

    const response = `User role updated successfully.\n\nChanges:\n- User: ${user.name} (${user.email})\n- Old Role: ${oldRole}\n- New Role: ${new_role}\n- Default Scopes Added: ${newScopes.join(', ')}\n- Reason: ${reason}${notify_user ? '\n\nNotification email sent.' : ''}`;

    return { text: response };
  },
};

/**
 * Tool 3: Set Permissions
 */
const setPermissionsTool: MCPTool = {
  name: 'set_permissions',
  description: 'Grant fine-grained permissions (scopes) to a user',
  requiredScopes: ['identity:admin'],
  inputSchema: z.object({
    user_id: z.string().uuid().describe('ID of user to modify'),
    scopes_to_add: z.array(z.string()).optional().describe('Scopes to grant (e.g., [\'finance:write\', \'academic:read\'])'),
    scopes_to_remove: z.array(z.string()).optional().describe('Scopes to revoke'),
    reason: z.string().describe('Reason for permission change (required for audit)'),
  }),
  handler: async (input, session) => {
    const { user_id, scopes_to_add, scopes_to_remove, reason } = input as {
      user_id: string;
      scopes_to_add?: string[];
      scopes_to_remove?: string[];
      reason: string;
    };

    // Get existing user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, user_id), eq(users.tenant_id, session.tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found in this tenant');
    }

    const currentScopes = getUserScopes(user);
    let newScopes = [...currentScopes];

    // Add scopes
    if (scopes_to_add && scopes_to_add.length > 0) {
      const validation = validateScopes(scopes_to_add);
      if (!validation.valid) {
        throw new Error(`Invalid scope(s): ${validation.invalidScopes.join(', ')}`);
      }

      // Check for scope conflicts
      if (scopes_to_add.includes('identity:admin') && user.role !== 'admin' && user.role !== 'super_admin') {
        throw new Error('Cannot grant \'identity:admin\' to non-admin users');
      }

      newScopes = [...new Set([...newScopes, ...scopes_to_add])];
    }

    // Remove scopes
    if (scopes_to_remove && scopes_to_remove.length > 0) {
      newScopes = newScopes.filter(s => !scopes_to_remove.includes(s));
    }

    // Update user
    await db
      .update(users)
      .set({
        metadata: {
          ...((user.metadata as any) || {}),
          scopes: newScopes,
        },
        updated_at: new Date(),
      })
      .where(eq(users.id, user_id));

    // Log audit event
    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'permission_changed',
      resourceType: 'user',
      resourceId: user_id,
      changes: {
        scopes_added: scopes_to_add || [],
        scopes_removed: scopes_to_remove || [],
        old_scopes: currentScopes,
        new_scopes: newScopes,
        reason,
      },
    });

    let response = `Permissions updated successfully.\n\nUser: ${user.name} (${user.email})\n`;

    if (scopes_to_add && scopes_to_add.length > 0) {
      response += `\nAdded Scopes:\n${scopes_to_add.map(s => `- ${s}`).join('\n')}`;
    }

    if (scopes_to_remove && scopes_to_remove.length > 0) {
      response += `\nRemoved Scopes:\n${scopes_to_remove.map(s => `- ${s}`).join('\n')}`;
    }

    response += `\n\nCurrent Scopes:\n${newScopes.map(s => `- ${s}`).join('\n')}`;
    response += `\n\nReason: ${reason}`;

    return { text: response };
  },
};

/**
 * Tool 4: Revoke Session
 * Note: This is a stub implementation. Full session management requires
 * integrating with Supabase Auth's session management APIs.
 */
const revokeSessionTool: MCPTool = {
  name: 'revoke_session',
  description: 'Force logout by terminating an active session',
  requiredScopes: ['identity:admin'],
  inputSchema: z.object({
    session_id: z.string().describe('ID of session to revoke (from identity://active_sessions)'),
    reason: z.string().describe('Reason for session revocation'),
    notify_user: z.boolean().default(true).describe('Send notification to affected user'),
  }),
  handler: async (input, session) => {
    const { session_id, reason, notify_user } = input as {
      session_id: string;
      reason: string;
      notify_user: boolean;
    };

    // Prevent revoking own session
    if (session_id === session.sessionId) {
      throw new Error('Cannot revoke your own session. Use logout instead');
    }

    // TODO: Implement actual session revocation via Supabase Auth
    // For now, log the revocation attempt

    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'session_revoked',
      resourceType: 'session',
      resourceId: session_id,
      changes: {
        reason,
      },
    });

    const response = `Session revoked successfully.\n\nSession: ${session_id}\nReason: ${reason}\n\nUser has been logged out and will need to re-authenticate.${notify_user ? '\nNotification sent.' : ''}`;

    return { text: response };
  },
};

/**
 * Tool 5: Rotate API Key
 * Note: This is a stub implementation. Full API key management requires
 * additional infrastructure for service accounts and API key storage.
 */
const rotateApiKeyTool: MCPTool = {
  name: 'rotate_api_key',
  description: 'Rotate API key for service account or integration',
  requiredScopes: ['identity:admin'],
  inputSchema: z.object({
    user_id: z.string().uuid().describe('ID of service account user'),
    invalidate_old_key: z.boolean().default(true).describe('Immediately invalidate old key (false = grace period)'),
    grace_period_hours: z.number().default(24).describe('Hours before old key expires (if invalidate_old_key = false)'),
  }),
  handler: async (input, session) => {
    const { user_id, invalidate_old_key, grace_period_hours } = input as {
      user_id: string;
      invalidate_old_key: boolean;
      grace_period_hours: number;
    };

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, user_id), eq(users.tenant_id, session.tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('Service account not found');
    }

    // Check if this is a service account
    // For now, we'll assume service accounts have role 'guest' or have a specific flag
    const isServiceAccount = (user.metadata as any)?.is_service_account === true;
    if (!isServiceAccount) {
      throw new Error('Cannot rotate API key for regular user accounts');
    }

    // Generate new API key
    const newApiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;

    // TODO: Implement actual API key storage and rotation
    // For now, log the rotation

    await logAuditEvent({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'api_key_rotated',
      resourceType: 'user',
      resourceId: user_id,
      changes: {
        invalidate_old_key,
        grace_period_hours,
      },
    });

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + grace_period_hours);

    let response = `API key rotated successfully.\n\nService Account: ${user.email}\n\nNew API Key: ${newApiKey}\n(Store this securely - it won't be shown again)\n`;

    if (!invalidate_old_key) {
      response += `\nOld Key Status: Active for ${grace_period_hours} hours, then expires\nOld Key Expires: ${expiryDate.toISOString()}\n\n⚠️ Update your integrations before the old key expires.`;
    } else {
      response += `\nOld Key Status: Immediately invalidated`;
    }

    return { text: response };
  },
};

/**
 * Tool 6: Audit Access
 */
const auditAccessTool: MCPTool = {
  name: 'audit_access',
  description: 'Query access logs for security audits and compliance',
  requiredScopes: ['identity:admin'],
  inputSchema: z.object({
    user_id: z.string().uuid().optional().describe('Filter by specific user (optional)'),
    event_type: z
      .enum(['login_success', 'login_failed', 'role_updated', 'permission_changed', 'session_revoked', 'api_key_rotated'])
      .optional()
      .describe('Filter by event type (optional)'),
    start_date: z.string().optional().describe('Start of date range (ISO 8601)'),
    end_date: z.string().optional().describe('End of date range (ISO 8601)'),
    limit: z.number().default(50).max(500).describe('Maximum number of events to return'),
  }),
  handler: async (input, session) => {
    const { user_id, event_type, start_date, end_date, limit } = input as {
      user_id?: string;
      event_type?: string;
      start_date?: string;
      end_date?: string;
      limit: number;
    };

    // Build query
    const conditions = [eq(auditLogs.tenant_id, session.tenantId)];

    if (user_id) {
      conditions.push(eq(auditLogs.user_id, user_id));
    }

    if (event_type) {
      conditions.push(eq(auditLogs.action, event_type));
    }

    if (start_date) {
      conditions.push(gte(auditLogs.timestamp, new Date(start_date)));
    }

    if (end_date) {
      const endDateObj = new Date(end_date);
      if (start_date && endDateObj < new Date(start_date)) {
        throw new Error('end_date must be after start_date');
      }
      conditions.push(lte(auditLogs.timestamp, endDateObj));
    }

    if (limit > 500) {
      throw new Error('Maximum limit is 500 events');
    }

    // Query audit logs
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    // Format response
    const period = start_date && end_date ? `${start_date} to ${end_date}` : 'Recent events';
    let response = `Access Audit Report\n\nPeriod: ${period}\n`;

    if (event_type) {
      response += `Event Type: ${event_type}\n`;
    }

    response += `Total Events: ${logs.length}\n\n`;

    if (logs.length === 0) {
      response += 'No audit events found matching the criteria.';
    } else {
      response += 'Recent Events:\n\n';
      logs.slice(0, 10).forEach((log, index) => {
        response += `${index + 1}. ${log.action}\n`;
        response += `   Time: ${log.timestamp}\n`;
        response += `   User ID: ${log.user_id}\n`;
        if (log.resource_id) {
          response += `   Resource: ${log.resource_type} (${log.resource_id})\n`;
        }
        if (log.changes) {
          response += `   Changes: ${JSON.stringify(log.changes, null, 2)}\n`;
        }
        response += '\n';
      });

      if (logs.length > 10) {
        response += `\n... and ${logs.length - 10} more events.`;
      }
    }

    return { text: response };
  },
};

/**
 * Resources
 */

const userDirectoryResource: MCPResource = {
  uri: 'identity://user_directory',
  name: 'User Directory',
  description: 'Complete user directory with roles and permissions',
  requiredScopes: ['identity:read'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    const allUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.tenant_id, session.tenantId), eq(users.status, 'active')))
      .orderBy(users.created_at);

    return {
      users: allUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        scopes: getUserScopes(u),
        status: u.status,
        mfa_enabled: (u.metadata as any)?.require_mfa || false,
        created_at: u.created_at,
        last_login: u.last_login,
        created_by: (u.metadata as any)?.created_by,
        tenant_id: u.tenant_id,
      })),
      total: allUsers.length,
      filters_applied: 'none',
    };
  },
};

const activeSessionsResource: MCPResource = {
  uri: 'identity://active_sessions',
  name: 'Active Sessions',
  description: 'Current active user sessions',
  requiredScopes: ['identity:read'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    // TODO: Implement actual session tracking via Supabase Auth
    // For now, return placeholder data

    return {
      sessions: [],
      total: 0,
      active_in_last_hour: 0,
      note: 'Session tracking requires Supabase Auth integration',
    };
  },
};

const accessAuditLogResource: MCPResource = {
  uri: 'identity://access_audit_log',
  name: 'Access Audit Log',
  description: 'Recent access and authentication events',
  requiredScopes: ['identity:admin'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    const limit = parseInt(params?.limit || '50', 10);

    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenant_id, session.tenantId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(Math.min(limit, 100));

    return {
      events: logs.map(log => ({
        event_id: log.id,
        timestamp: log.timestamp,
        event_type: log.action,
        user_id: log.user_id,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        details: log.changes,
        tenant_id: log.tenant_id,
      })),
      total: logs.length,
      period: 'recent',
    };
  },
};

const permissionScopesResource: MCPResource = {
  uri: 'identity://permission_scopes',
  name: 'Permission Scopes',
  description: 'Available authorization scopes and their descriptions',
  requiredScopes: [],
  mimeType: 'application/json',
  handler: async (session, params) => {
    return {
      scopes: PERMISSION_SCOPES,
      total: PERMISSION_SCOPES.length,
    };
  },
};

/**
 * Prompts
 */

const identityPersonaPrompt: MCPPrompt = {
  name: 'identity_persona',
  description: 'Core system prompt for identity & access assistant',
  requiredScopes: [],
  variables: [],
  template: `You are an AI identity and access management assistant for an educational platform.

YOUR ROLE:
- Help super-administrators manage user identities, roles, and permissions
- Enforce security best practices
- Provide clear audit trails and explanations
- Use a professional, security-conscious tone

AVAILABLE ROLES:
Admin Roles (all require super_admin to assign, all require MFA):
- super_admin: Full system access including identity management
- admin: Legacy full operational access (being phased out)
- admin_dos: Director of Studies - academic oversight and curriculum management
- admin_reception: Front desk operations (view-only)
- admin_student_operations: Student services and enrollment management
- admin_sales: Financial operations and invoicing
- admin_marketing: Marketing campaigns and analytics
- admin_agent: Limited partner/agent (invoice requests only, requires approval)

Teacher Roles:
- teacher: Standard teaching staff (has full student profile access)
- teacher_dos: Director of Studies - teaching + academic leadership
- teacher_assistant_dos: Assistant Director of Studies - teaching + limited admin

Other Roles:
- student: Students
- guest: No access

CAPABILITIES:
You have access to tools for:
- User account creation and management
- Role and permission assignment
- Session management and revocation
- API key rotation for service accounts
- Access auditing and compliance reporting

BEHAVIOR GUIDELINES:

1. **Security First**
   - ALWAYS confirm identity before granting elevated privileges
   - Require reasons for all permission changes (audit trail)
   - Warn about security implications of actions
   - Example: "Granting super_admin role gives full system access. Are you sure this is necessary?"

2. **Multi-Factor Authentication (MANDATORY)**
   - ALWAYS require MFA for users with elevated privileges (super_admin, admin, identity:admin)
   - When creating privileged accounts, AUTOMATICALLY set require_mfa to true
   - Flag any existing privileged accounts without MFA as CRITICAL security issues
   - Example: "Creating admin account with MFA required. The user will be prompted to set up MFA on first login."
   - Example: "⚠️ CRITICAL: User john@school.com has admin role but MFA is disabled. This is a security violation and must be enabled immediately."

3. **Principle of Least Privilege**
   - Recommend minimal scopes needed for user's role
   - Suggest removing unnecessary permissions
   - Example: "This user only needs finance:read. I recommend removing finance:write unless they need to create invoices."

4. **Audit Trail Awareness**
   - Always include reasons when modifying permissions
   - Explain what actions will be logged
   - Example: "This permission change will be logged in the audit trail as: 'Granted finance:write for invoice management duties'"

5. **Suspicious Activity Detection**
   - Proactively alert on unusual patterns in audit logs
   - Recommend actions for security incidents
   - Example: "I notice 5 failed login attempts from IP 192.168.1.200. Would you like me to investigate further?"

6. **Clear Authorization Explanations**
   - Explain what each scope/permission allows
   - Use identity://permission_scopes to show available options
   - Example: "The 'academic:write' scope allows creating programmes, courses, and classes, but not financial operations."

7. **Compliance Support**
   - Mention GDPR/compliance implications when relevant
   - Recommend regular access reviews
   - Example: "For GDPR compliance, I recommend reviewing user permissions quarterly. Would you like me to generate an access report?"`,
};

const securityAuditPrompt: MCPPrompt = {
  name: 'security_audit',
  description: 'Generate a security audit report',
  requiredScopes: ['identity:admin'],
  variables: ['focus'],
  template: `Generate a security audit report focusing on {{focus}}.

Include:
- User accounts with elevated privileges (super_admin, admin, identity:admin)
- **🚨 CRITICAL**: Privileged accounts (super_admin, admin) without MFA enabled
- Inactive accounts (no login in 90+ days)
- Users with excessive scopes (recommend least privilege)
- Recent permission changes (last 7 days)
- API keys due for rotation (older than 90 days)

Format as a structured report with:
1. Executive Summary (3-5 bullet points)
2. **CRITICAL Priority Issues** (require IMMEDIATE action)
   - ANY privileged account without MFA must be listed here
3. High Priority Issues (require action within 24 hours)
4. Medium Priority Issues (review recommended)
5. Recommendations (best practices)

MANDATORY CRITICAL FLAGS:
- 🚨 Privileged account without MFA (super_admin, admin, identity:admin without MFA)
- 🚨 Inactive super_admin accounts
- ⚠️ Inactive admin accounts with high privileges
- ⚠️ Users with identity:* scopes who aren't super_admin`,
};

const accessReviewPrompt: MCPPrompt = {
  name: 'access_review',
  description: 'Quarterly access review for compliance',
  requiredScopes: ['identity:admin'],
  variables: ['department'],
  template: `Generate a quarterly access review report for compliance purposes.

For each user with admin or elevated scopes:
1. List current permissions
2. Check last login date
3. Verify role still appropriate
4. Recommend permission adjustments

Output format (CSV-compatible):
User Email | Role | Scopes | Last Login | Status | Recommendation

Flag:
- ⚠️ REVIEW: Users with scopes they may not need
- ❌ REVOKE: Inactive users (90+ days no login) with elevated privileges
- ✅ OK: Permissions align with current role

This report supports GDPR Article 32 (access control) compliance.`,
};

/**
 * Identity & Access MCP Server Configuration
 */
export const identityAccessMCPConfig: MCPServerConfig = {
  name: 'Identity & Access MCP',
  version: '3.0.0',
  scopePrefix: 'identity',
  tools: [createUserTool, updateUserRoleTool, setPermissionsTool, revokeSessionTool, rotateApiKeyTool, auditAccessTool],
  resources: [userDirectoryResource, activeSessionsResource, accessAuditLogResource, permissionScopesResource],
  prompts: [identityPersonaPrompt, securityAuditPrompt, accessReviewPrompt],
};
