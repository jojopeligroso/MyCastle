'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth/utils';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

/**
 * Get users with metadata
 */
export async function getUsersWithMetadata() {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    const result = await db.execute(sql`
      SELECT
        id,
        tenant_id,
        auth_id,
        email,
        name,
        role,
        status,
        last_login,
        created_at,
        updated_at,
        enrollment_count,
        class_count
      FROM v_users_with_metadata
    `);

    return result as unknown as Array<{
      id: string;
      tenant_id: string;
      auth_id: string | null;
      email: string;
      name: string;
      role: string;
      status: string;
      last_login: Date | null;
      created_at: Date;
      updated_at: Date;
      enrollment_count: number;
      class_count: number;
    }>;
  } catch (error) {
    console.error('Error fetching users with metadata:', error);
    return [];
  }
}

/**
 * Change user role with audit trail
 */
export async function changeUserRole(userId: string, newRole: string, reason: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Get current user and target user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)));

    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    const oldRole = targetUser.role;

    // Validate role change
    if (newRole === 'super_admin') {
      // Only super_admin can create super_admin
      // This would need to check current user's role
      // Simplified for now
    }

    // Update user role
    await db
      .update(users)
      .set({ role: newRole, updated_at: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)));

    // Create audit record
    await db.execute(sql`
      INSERT INTO user_role_audit (tenant_id, user_id, old_role, new_role, change_reason, changed_by)
      VALUES (
        ${tenantId},
        ${userId},
        ${oldRole},
        ${newRole},
        ${reason},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
      )
    `);

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes, metadata)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'user.role.change',
        'user',
        ${userId},
        ${JSON.stringify({ old_role: oldRole, new_role: newRole })},
        ${JSON.stringify({ reason })}
      )
    `);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error changing user role:', error);
    return { success: false, error: 'Failed to change user role' };
  }
}

/**
 * Deactivate user
 */
export async function deactivateUser(userId: string, reason: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    await db
      .update(users)
      .set({ status: 'inactive', updated_at: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)));

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes, metadata)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'user.deactivate',
        'user',
        ${userId},
        ${JSON.stringify({ status: 'inactive' })},
        ${JSON.stringify({ reason })}
      )
    `);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deactivating user:', error);
    return { success: false, error: 'Failed to deactivate user' };
  }
}

/**
 * Reactivate user
 */
export async function reactivateUser(userId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    await db
      .update(users)
      .set({ status: 'active', updated_at: new Date() })
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)));

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'user.reactivate',
        'user',
        ${userId},
        ${JSON.stringify({ status: 'active' })}
      )
    `);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error reactivating user:', error);
    return { success: false, error: 'Failed to reactivate user' };
  }
}

/**
 * Revoke all user sessions
 * Requires Supabase service role key
 */
export async function revokeUserSessions(userId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: 'Supabase configuration missing' };
  }

  try {
    // Get user's auth_id
    const [user] = await db
      .select({ auth_id: users.auth_id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)));

    if (!user?.auth_id) {
      return { success: false, error: 'User auth ID not found' };
    }

    // Use Supabase Admin API to revoke sessions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Sign out the user (revokes all sessions)
    const { error } = await supabase.auth.admin.signOut(user.auth_id);

    if (error) {
      console.error('Supabase session revocation error:', error);
      return { success: false, error: error.message };
    }

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'user.sessions.revoke',
        'user',
        ${userId},
        ${JSON.stringify({ revoked_at: new Date().toISOString() })}
      )
    `);

    return { success: true };
  } catch (error) {
    console.error('Error revoking user sessions:', error);
    return { success: false, error: 'Failed to revoke sessions' };
  }
}

/**
 * Reset user MFA
 * Requires Supabase service role key
 */
export async function resetUserMFA(userId: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { success: false, error: 'Supabase configuration missing' };
  }

  try {
    // Get user's auth_id
    const [user] = await db
      .select({ auth_id: users.auth_id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)));

    if (!user?.auth_id) {
      return { success: false, error: 'User auth ID not found' };
    }

    // Use Supabase Admin API to remove MFA factors
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // List and delete all MFA factors
    const { data: factors } = await supabase.auth.mfa.listFactors();

    if (factors && factors.totp) {
      for (const factor of factors.totp) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    // Create audit log
    await db.execute(sql`
      INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes)
      VALUES (
        ${tenantId},
        (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1),
        'user.mfa.reset',
        'user',
        ${userId},
        ${JSON.stringify({ reset_at: new Date().toISOString() })}
      )
    `);

    return { success: true };
  } catch (error) {
    console.error('Error resetting user MFA:', error);
    return { success: false, error: 'Failed to reset MFA' };
  }
}

/**
 * Get orphaned auth users
 */
export async function getOrphanedAuthUsers() {
  try {
    const result = await db.execute(sql`
      SELECT
        auth_id,
        email,
        created_at
      FROM v_orphaned_auth_users
      LIMIT 50
    `);

    return result as unknown as Array<{
      auth_id: string;
      email: string;
      created_at: Date;
    }>;
  } catch (error) {
    console.error('Error fetching orphaned auth users:', error);
    return [];
  }
}

/**
 * Repair orphaned auth user by creating profile
 */
export async function repairOrphanedUser(authId: string, name: string, role: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Tenant not found');

  try {
    // Get auth user details
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: authUser, error } = await supabase.auth.admin.getUserById(authId);

    if (error || !authUser) {
      return { success: false, error: 'Auth user not found' };
    }

    // Create user profile
    await db.insert(users).values({
      tenant_id: tenantId,
      auth_id: authId,
      email: authUser.user.email!,
      name,
      role,
      status: 'active',
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error repairing orphaned user:', error);
    return { success: false, error: 'Failed to repair orphaned user' };
  }
}
