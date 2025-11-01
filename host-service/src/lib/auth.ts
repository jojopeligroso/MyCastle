/**
 * Authentication Utilities
 * JWT verification and user context extraction
 */

import * as jose from 'jose';
import { User } from './context-aggregator.js';

const JWKS_URI = process.env.JWKS_URI!;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'admin-mcp';

// Cache JWKS
let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheExpiry = 0;

/**
 * Get JWKS verification function (with caching)
 */
async function getJWKS(): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();

  // Return cached JWKS if still valid (cache for 1 hour)
  if (jwksCache && now < jwksCacheExpiry) {
    return jwksCache;
  }

  // Fetch new JWKS
  console.log('[Auth] Fetching JWKS from', JWKS_URI);

  jwksCache = jose.createRemoteJWKSet(new URL(JWKS_URI));
  jwksCacheExpiry = now + 60 * 60 * 1000; // 1 hour

  return jwksCache;
}

/**
 * Verify JWT token and extract user information
 */
export async function verifyJWT(token: string | undefined): Promise<User> {
  if (!token) {
    throw new Error('No authentication token provided');
  }

  try {
    const JWKS = await getJWKS();

    // Verify token
    const { payload } = await jose.jwtVerify(token, JWKS, {
      audience: JWT_AUDIENCE,
    });

    // Extract user information
    const user: User = {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'teacher' | 'student',
      tenant_id: payload.tenant_id as string,
      scopes: (payload.scopes as string[]) || [],
      jwt: token,
    };

    // Validate required fields
    if (!user.id || !user.email || !user.role || !user.tenant_id) {
      throw new Error('Invalid JWT claims: missing required fields');
    }

    // Validate role
    if (!['admin', 'teacher', 'student'].includes(user.role)) {
      throw new Error(`Invalid role: ${user.role}`);
    }

    return user;
  } catch (error: any) {
    console.error('[Auth] JWT verification failed:', error.message);
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Extract JWT from Authorization header
 */
export function extractJWT(authHeader: string | undefined): string | undefined {
  if (!authHeader) {
    return undefined;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return undefined;
  }

  return parts[1];
}

/**
 * Check if user can access MCP by role
 */
export function canAccessMCP(user: User, mcpRole: string): boolean {
  switch (mcpRole) {
    case 'admin':
      return user.role === 'admin';
    case 'teacher':
      return ['admin', 'teacher'].includes(user.role);
    case 'student':
      return ['admin', 'teacher', 'student'].includes(user.role);
    default:
      return false;
  }
}
