import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { AdminContext, JWTClaims } from '../../types/index.js';
import { AuthenticationError } from '../../types/index.js';

const JWKS_URI = process.env.JWKS_URI || '';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'admin-mcp';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Get or create JWKS instance for token verification
 */
function getJWKS() {
  if (!JWKS_URI) {
    throw new AuthenticationError('JWKS_URI not configured');
  }

  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(JWKS_URI));
  }

  return jwksCache;
}

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new AuthenticationError('Missing Authorization header');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AuthenticationError('Invalid Authorization header format. Expected: Bearer <token>');
  }

  return parts[1];
}

/**
 * Verify JWT token and extract claims
 */
export async function verifyToken(token: string): Promise<JWTClaims> {
  try {
    const jwks = getJWKS();

    const { payload } = await jwtVerify(token, jwks, {
      audience: JWT_AUDIENCE,
      clockTolerance: 30, // Allow 30 seconds clock skew
    });

    if (!payload.sub) {
      throw new AuthenticationError('Token missing required claim: sub');
    }

    if (!payload.role || typeof payload.role !== 'string') {
      throw new AuthenticationError('Token missing required claim: role');
    }

    // Extract scopes from token (could be string array or space-separated string)
    let scopes: string[] = [];
    if (payload.scopes) {
      if (Array.isArray(payload.scopes)) {
        scopes = payload.scopes as string[];
      } else if (typeof payload.scopes === 'string') {
        scopes = payload.scopes.split(' ');
      }
    }

    return {
      sub: payload.sub,
      role: payload.role as string,
      scopes,
      aud: payload.aud as string | undefined,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new AuthenticationError(`Token verification failed: ${error.message}`);
    }

    throw new AuthenticationError('Token verification failed');
  }
}

/**
 * Verify JWT from Authorization header and create AdminContext
 */
export async function verifyAuthHeader(authHeader: string | undefined): Promise<AdminContext> {
  const token = extractToken(authHeader);
  const claims = await verifyToken(token);

  return {
    actorId: claims.sub,
    actorRole: claims.role,
    scopes: claims.scopes || [],
    supabaseToken: token, // Pass through the JWT for Supabase RLS
  };
}
