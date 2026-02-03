/**
 * Authentication Utilities
 * Helper functions for auth operations
 * Ref: spec/07-authentication.md, REQ.md §6.1
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

/**
 * Get the currently authenticated user (server-side)
 * Cached per request to avoid multiple calls
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Get the current user's session (server-side)
 */
export const getSession = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});

/**
 * Require authentication - throws if user is not logged in
 * Optionally enforce allowed roles when provided
 * Use in Server Components and Route Handlers
 */
export const requireAuth = async (allowedRoles?: string[]) => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  if (allowedRoles) {
    const userRole = user.user_metadata?.role || user.app_metadata?.role;
    const hasRole = userRole && allowedRoles.includes(userRole);
    const isSuperAdminAllowed = userRole === 'super_admin' && allowedRoles.includes('admin');
    if (!hasRole && !isSuperAdminAllowed) {
      throw new Error('Forbidden: Insufficient permissions');
    }
  }

  return user;
};

/**
 * Check if user has a specific role
 */
export const hasRole = async (allowedRoles: string[]) => {
  const user = await getCurrentUser();
  if (!user) return false;

  // Role is stored in user metadata or app_metadata
  const userRole = user.user_metadata?.role || user.app_metadata?.role;
  return allowedRoles.includes(userRole);
};

/**
 * Require specific role - throws if user doesn't have role
 */
export const requireRole = async (allowedRoles: string[]) => requireAuth(allowedRoles);

/**
 * Get tenant ID for the current user
 * Used for multi-tenancy isolation
 */
export const getTenantId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  return user.user_metadata?.tenant_id || user.app_metadata?.tenant_id || null;
};

/**
 * Require tenant context - throws if user doesn't belong to a tenant
 */
export const requireTenant = async (): Promise<string> => {
  const tenantId = await getTenantId();
  if (!tenantId) {
    throw new Error('No tenant context');
  }
  return tenantId;
};

/**
 * Set RLS context for database queries
 *
 * Super admins: Get access to all tenant data (platform owner)
 * Regular users: Restricted to their tenant only
 *
 * @param db - Drizzle database instance
 * @returns Promise<void>
 */
export const setRLSContext = async (db: any): Promise<void> => {
  const user = await getCurrentUser();
  const tenantId = await getTenantId();

  if (!user?.email) {
    throw new Error('User email not available for RLS context');
  }

  // Import users table dynamically to avoid circular dependency
  const { users } = await import('@/db/schema/core');
  const { eq } = await import('drizzle-orm');
  const { sql } = await import('drizzle-orm');

  // Check if user is super admin
  // DEFENSIVE: If is_super_admin column doesn't exist, default to regular user
  let isSuperAdmin = false;
  try {
    const [userRecord] = await db
      .select({ isSuperAdmin: users.isSuperAdmin })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);

    isSuperAdmin = userRecord?.isSuperAdmin || false;
  } catch (error) {
    // Column doesn't exist - migration not run yet
    console.warn(
      '[RLS] is_super_admin column not found - defaulting to regular user.',
      'Please run migration: app/migrations/add_is_super_admin.sql'
    );
    isSuperAdmin = false;
  }

  if (isSuperAdmin) {
    // Super admin: Bypass tenant restrictions
    await db.execute(sql.raw(`SET app.is_super_admin = 'true'`));
    await db.execute(sql.raw(`SET app.user_email = '${user.email}'`));
    console.log('[RLS] Super admin context set:', user.email);
  } else {
    // Regular user: Enforce tenant isolation
    if (!tenantId) {
      throw new Error('Tenant ID required for non-super-admin users');
    }
    await db.execute(sql.raw(`SET app.is_super_admin = 'false'`));
    await db.execute(sql.raw(`SET app.user_email = '${user.email}'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));
    console.log('[RLS] Tenant context set:', { email: user.email, tenantId });
  }
};
