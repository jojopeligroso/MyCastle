/**
 * Authentication and Authorization Module
 *
 * Provides JWT verification using JWKS and scope-based permission checking.
 * All MCP requests must include a valid JWT token with admin role.
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

/**
 * User claims extracted from JWT
 */
export interface UserClaims {
  sub: string; // User ID
  email: string;
  role: 'admin' | 'teacher' | 'student';
  tenant_id: string;
  scopes?: string[];
}

/**
 * Authentication error types
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * JWKS-based JWT verifier
 */
export class JWTVerifier {
  private jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private jwksUri: string,
    private audience: string,
    private issuer: string
  ) {
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
  }

  /**
   * Verify JWT token and extract claims
   *
   * @param token - JWT token string
   * @returns Verified user claims
   * @throws {AuthError} If token is invalid or missing required claims
   */
  async verify(token: string): Promise<UserClaims> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        audience: this.audience,
        issuer: this.issuer,
      });

      return this.extractClaims(payload);
    } catch (error) {
      if (error instanceof Error) {
        throw new AuthError(
          'JWT verification failed',
          'AUTH_001',
          { message: error.message }
        );
      }
      throw new AuthError('JWT verification failed', 'AUTH_001');
    }
  }

  /**
   * Extract and validate user claims from JWT payload
   */
  private extractClaims(payload: JWTPayload): UserClaims {
    const { sub, email, role, tenant_id, scopes } = payload;

    if (!sub || typeof sub !== 'string') {
      throw new AuthError(
        'Missing or invalid subject claim',
        'AUTH_001',
        { claim: 'sub' }
      );
    }

    if (!email || typeof email !== 'string') {
      throw new AuthError(
        'Missing or invalid email claim',
        'AUTH_001',
        { claim: 'email' }
      );
    }

    if (!role || !['admin', 'teacher', 'student'].includes(role as string)) {
      throw new AuthError(
        'Missing or invalid role claim',
        'AUTH_001',
        { claim: 'role' }
      );
    }

    if (!tenant_id || typeof tenant_id !== 'string') {
      throw new AuthError(
        'Missing or invalid tenant_id claim',
        'AUTH_001',
        { claim: 'tenant_id' }
      );
    }

    return {
      sub,
      email,
      role: role as 'admin' | 'teacher' | 'student',
      tenant_id,
      scopes: Array.isArray(scopes) ? scopes : [],
    };
  }
}

/**
 * Check if user has admin role
 */
export function requireAdmin(claims: UserClaims): void {
  if (claims.role !== 'admin') {
    throw new AuthError(
      'Admin role required',
      'AUTH_002',
      { required_role: 'admin', user_role: claims.role }
    );
  }
}

/**
 * Check if user has required scope
 *
 * @param claims - User claims from JWT
 * @param requiredScope - Scope to check (e.g., 'admin.write.user')
 * @throws {AuthError} If user lacks required scope
 */
export function requireScope(claims: UserClaims, requiredScope: string): void {
  const scopes = claims.scopes ?? [];

  // Check for super admin scope
  if (scopes.includes('admin.super')) {
    return;
  }

  // Check for specific scope
  if (!scopes.includes(requiredScope)) {
    throw new AuthError(
      'Insufficient scope for operation',
      'AUTH_002',
      {
        required_scope: requiredScope,
        user_scopes: scopes,
      }
    );
  }
}

/**
 * Check if user has any of the required scopes
 */
export function requireAnyScope(
  claims: UserClaims,
  requiredScopes: string[]
): void {
  const scopes = claims.scopes ?? [];

  // Check for super admin scope
  if (scopes.includes('admin.super')) {
    return;
  }

  // Check if user has any of the required scopes
  const hasScope = requiredScopes.some((scope) => scopes.includes(scope));

  if (!hasScope) {
    throw new AuthError(
      'Insufficient scope for operation',
      'AUTH_002',
      {
        required_scopes: requiredScopes,
        user_scopes: scopes,
      }
    );
  }
}

/**
 * Create JWT verifier from environment variables
 */
export function createJWTVerifier(): JWTVerifier {
  const jwksUri = process.env.JWKS_URI;
  const audience = process.env.JWT_AUDIENCE ?? 'admin-mcp';
  const issuer = process.env.JWT_ISSUER;

  if (!jwksUri) {
    throw new Error('JWKS_URI environment variable is required');
  }

  if (!issuer) {
    throw new Error('JWT_ISSUER environment variable is required');
  }

  return new JWTVerifier(jwksUri, audience, issuer);
}
