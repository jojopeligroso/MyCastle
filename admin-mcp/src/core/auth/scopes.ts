import type { AdminContext } from '../../types/index.js';
import { AuthorizationError } from '../../types/index.js';

/**
 * Scope constants for admin operations
 */
export const SCOPES = {
  // User management
  ADMIN_READ_USER: 'admin.read.user',
  ADMIN_WRITE_USER: 'admin.write.user',
  ADMIN_DELETE_USER: 'admin.delete.user',

  // PII access
  ADMIN_READ_PII: 'admin.read.pii',
  ADMIN_WRITE_PII: 'admin.write.pii',

  // Role management
  ADMIN_WRITE_ROLE: 'admin.write.role',

  // Class management
  ADMIN_READ_CLASS: 'admin.read.class',
  ADMIN_WRITE_CLASS: 'admin.write.class',

  // Roster management
  ADMIN_READ_ROSTER: 'admin.read.roster',
  ADMIN_WRITE_ROSTER: 'admin.write.roster',

  // Attendance management
  ADMIN_READ_ATTENDANCE: 'admin.read.attendance',
  ADMIN_WRITE_ATTENDANCE: 'admin.write.attendance',

  // Enrolment management
  ADMIN_READ_ENROLMENT: 'admin.read.enrolment',
  ADMIN_WRITE_ENROLMENT: 'admin.write.enrolment',

  // Register management
  ADMIN_READ_REGISTER: 'admin.read.register',

  // Finance management
  ADMIN_READ_FINANCE: 'admin.read.finance',
  ADMIN_WRITE_FINANCE: 'admin.write.finance',

  // Refund management
  ADMIN_WRITE_REFUND: 'admin.write.refund',

  // Accommodation management
  ADMIN_READ_ACCOMMODATION: 'admin.read.accommodation',
  ADMIN_WRITE_ACCOMMODATION: 'admin.write.accommodation',

  // Vendor management
  ADMIN_READ_VENDOR: 'admin.read.vendor',
  ADMIN_WRITE_VENDOR: 'admin.write.vendor',

  // Compliance management
  ADMIN_READ_COMPLIANCE: 'admin.read.compliance',
  ADMIN_WRITE_COMPLIANCE: 'admin.write.compliance',

  // Report management
  ADMIN_READ_REPORT: 'admin.read.report',
  ADMIN_WRITE_REPORT: 'admin.write.report',

  // Subscription management
  ADMIN_READ_SUBSCRIPTION: 'admin.read.subscription',
  ADMIN_WRITE_SUBSCRIPTION: 'admin.write.subscription',

  // System operations
  ADMIN_READ_AUDIT: 'admin.read.audit',
  ADMIN_READ_SYSTEM: 'admin.read.system',
  ADMIN_WRITE_SYSTEM: 'admin.write.system',

  // Super admin
  ADMIN_SUPER: 'admin.super',
} as const;

export type Scope = typeof SCOPES[keyof typeof SCOPES];

/**
 * Check if context has a specific scope
 */
export function hasScope(context: AdminContext, required: Scope): boolean {
  // Super admin has all scopes
  if (context.scopes.includes(SCOPES.ADMIN_SUPER)) {
    return true;
  }

  return context.scopes.includes(required);
}

/**
 * Check if context has the required scope, throw if not
 */
export function requireScope(context: AdminContext, required: Scope): void {
  if (!hasScope(context, required)) {
    throw new AuthorizationError(
      `Missing required scope: ${required}. Actor ${context.actorId} has: ${context.scopes.join(', ')}`
    );
  }
}

/**
 * Check if context has ANY of the provided scopes
 */
export function hasAnyScope(context: AdminContext, scopes: Scope[]): boolean {
  if (context.scopes.includes(SCOPES.ADMIN_SUPER)) {
    return true;
  }

  return scopes.some(scope => context.scopes.includes(scope));
}

/**
 * Check if context has ALL of the provided scopes
 */
export function hasAllScopes(context: AdminContext, scopes: Scope[]): boolean {
  if (context.scopes.includes(SCOPES.ADMIN_SUPER)) {
    return true;
  }

  return scopes.every(scope => context.scopes.includes(scope));
}

/**
 * Check if context has PII access
 */
export function hasPIIAccess(context: AdminContext): boolean {
  return hasAnyScope(context, [SCOPES.ADMIN_READ_PII, SCOPES.ADMIN_WRITE_PII]);
}

/**
 * Check if context has write PII access
 */
export function hasWritePIIAccess(context: AdminContext): boolean {
  return hasScope(context, SCOPES.ADMIN_WRITE_PII);
}

/**
 * Check if context is super admin
 */
export function isSuperAdmin(context: AdminContext): boolean {
  return hasScope(context, SCOPES.ADMIN_SUPER);
}

/**
 * Get list of all available scopes
 */
export function getAllScopes(): Scope[] {
  return Object.values(SCOPES);
}
