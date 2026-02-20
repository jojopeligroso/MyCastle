/**
 * Development Authentication Bypass - Safety Guard
 * Enforces non-negotiable invariants for dev auth bypass
 *
 * CRITICAL SAFETY RULES:
 * 1. Bypass only activates when NODE_ENV === "development" AND DEV_AUTH_BYPASS === "true"
 * 2. If DEV_AUTH_BYPASS === "true" in non-development, crash immediately
 * 3. All production builds must mechanically prevent bypass activation
 */

/**
 * Fixed development user identity
 * Uses the real admin account (eoinmaleoin@gmail.com) from the database
 * This identity is injected server-side only when bypass is active
 * It obeys all normal authorization rules and RLS policies
 */
export const DEV_USER_IDENTITY = {
  id: '00000000-0000-0000-0000-000000000010', // Real user ID from seed data
  email: 'eoinmaleoin@gmail.com',
  role: 'authenticated',
  aud: 'authenticated',
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  user_metadata: {
    role: 'admin', // Admin role for testing admin interface
    tenant_id: '00000000-0000-0000-0000-000000000001', // Default tenant
    name: 'Eoin Malone',
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  phone: '+353 87 123 4567',
  confirmed_at: '2026-01-01T00:00:00Z',
  last_sign_in_at: new Date().toISOString(),
} as const;

/**
 * Validates environment configuration for dev auth bypass
 * Crashes the application if bypass is misconfigured
 *
 * @throws {Error} If DEV_AUTH_BYPASS is true in non-development environment
 */
export function validateDevBypassConfig(): void {
  const nodeEnv = process.env.NODE_ENV;
  const devAuthBypass = process.env.DEV_AUTH_BYPASS;

  // Allow test environment (Jest) to run without DEV_AUTH_BYPASS
  const allowedEnvironments = ['development', 'test'];

  // CRITICAL: Hard failure if bypass is enabled outside development/test
  if (devAuthBypass === 'true' && !allowedEnvironments.includes(nodeEnv || '')) {
    const errorMessage = [
      '🚨 FATAL SECURITY ERROR 🚨',
      '',
      'DEV_AUTH_BYPASS is set to "true" in a non-development environment.',
      `Current NODE_ENV: ${nodeEnv}`,
      '',
      'This is a critical security misconfiguration that would bypass',
      'all authentication in production.',
      '',
      'The application is terminating immediately to prevent data exposure.',
      '',
      'To fix this:',
      '1. Remove DEV_AUTH_BYPASS from environment variables in production',
      '2. Ensure NODE_ENV is set to "production" in production environments',
      '3. Review deployment configuration and secrets management',
    ].join('\n');

    // Hard crash - throw error (Edge Runtime compatible)
    throw new Error(errorMessage);
  }
}

/**
 * Checks if dev auth bypass is currently active
 * Only returns true when both conditions are met:
 * - NODE_ENV === "development"
 * - DEV_AUTH_BYPASS === "true"
 *
 * @returns {boolean} True if bypass is active and safe to use
 */
export function isDevBypassActive(): boolean {
  // Validate configuration on every check
  validateDevBypassConfig();

  const nodeEnv = process.env.NODE_ENV;
  const devAuthBypass = process.env.DEV_AUTH_BYPASS;

  // Bypass only activates when BOTH conditions are true
  return nodeEnv === 'development' && devAuthBypass === 'true';
}

/**
 * Gets the dev user identity for bypass mode
 * Only returns a user when bypass is safely active
 *
 * @returns {typeof DEV_USER_IDENTITY | null} Dev user or null if bypass not active
 */
export function getDevUserIdentity() {
  if (!isDevBypassActive()) {
    return null;
  }

  return DEV_USER_IDENTITY;
}

// Run validation on module load to fail fast
// Skip during build phase (Next.js sets NEXT_PHASE during build)
if (process.env.NEXT_PHASE !== 'phase-production-build') {
  validateDevBypassConfig();
}
