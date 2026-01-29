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
