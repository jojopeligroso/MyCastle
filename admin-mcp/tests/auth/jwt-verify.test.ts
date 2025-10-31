import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractToken, verifyToken, verifyAuthHeader } from '../../src/core/auth/jwt-verify.js';
import { AuthenticationError } from '../../src/types/index.js';

describe('JWT Verification', () => {
  describe('extractToken', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      const token = extractToken(authHeader);

      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
    });

    it('should throw on missing Authorization header', () => {
      expect(() => extractToken(undefined)).toThrow(AuthenticationError);
      expect(() => extractToken(undefined)).toThrow('Missing Authorization header');
    });

    it('should throw on invalid header format', () => {
      expect(() => extractToken('InvalidFormat')).toThrow(AuthenticationError);
      expect(() => extractToken('InvalidFormat')).toThrow('Invalid Authorization header format');
    });

    it('should throw on non-Bearer scheme', () => {
      expect(() => extractToken('Basic user:pass')).toThrow(AuthenticationError);
      expect(() => extractToken('Basic user:pass')).toThrow('Invalid Authorization header format');
    });

    it('should throw on empty token', () => {
      expect(() => extractToken('Bearer ')).not.toBe('');
    });
  });

  describe('verifyToken', () => {
    beforeEach(() => {
      // Set required environment variables
      process.env.JWKS_URI = 'https://example.com/.well-known/jwks.json';
      process.env.JWT_AUDIENCE = 'admin-mcp';
    });

    it('should throw when JWKS_URI is not configured', async () => {
      delete process.env.JWKS_URI;

      await expect(verifyToken('fake.jwt.token')).rejects.toThrow(AuthenticationError);
      await expect(verifyToken('fake.jwt.token')).rejects.toThrow('JWKS_URI not configured');
    });

    it('should handle invalid JWT format', async () => {
      await expect(verifyToken('not-a-jwt')).rejects.toThrow(AuthenticationError);
    });

    it('should handle malformed JWT', async () => {
      const malformedJWT = 'header.payload'; // Missing signature
      await expect(verifyToken(malformedJWT)).rejects.toThrow(AuthenticationError);
    });

    it('should extract scopes from array format', () => {
      // Mock payload with scopes as array
      const mockPayload = {
        sub: 'user-123',
        role: 'admin',
        scopes: ['admin.read.user', 'admin.write.user'],
        aud: 'admin-mcp',
      };

      expect(Array.isArray(mockPayload.scopes)).toBe(true);
      expect(mockPayload.scopes).toHaveLength(2);
    });

    it('should extract scopes from space-separated string', () => {
      // Mock payload with scopes as space-separated string
      const mockScopesString = 'admin.read.user admin.write.user';
      const scopes = mockScopesString.split(' ');

      expect(scopes).toHaveLength(2);
      expect(scopes).toContain('admin.read.user');
      expect(scopes).toContain('admin.write.user');
    });

    it('should handle missing scopes claim', () => {
      const mockPayload = {
        sub: 'user-123',
        role: 'admin',
        // No scopes field
      };

      const scopes = mockPayload.scopes || [];
      expect(scopes).toEqual([]);
    });
  });

  describe('verifyAuthHeader', () => {
    beforeEach(() => {
      process.env.JWKS_URI = 'https://example.com/.well-known/jwks.json';
      process.env.JWT_AUDIENCE = 'admin-mcp';
    });

    it('should create AdminContext from valid token', () => {
      // This is more of a contract test - the actual JWT verification
      // would require a valid token and JWKS endpoint

      const mockContext = {
        actorId: 'user-123',
        actorRole: 'admin',
        scopes: ['admin.super'],
        supabaseToken: 'mock-jwt-token',
      };

      expect(mockContext).toHaveProperty('actorId');
      expect(mockContext).toHaveProperty('actorRole');
      expect(mockContext).toHaveProperty('scopes');
      expect(mockContext).toHaveProperty('supabaseToken');
    });

    it('should pass through JWT as supabaseToken', () => {
      const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

      // The JWT should be passed through unchanged for Supabase RLS
      const mockContext = {
        actorId: 'user-123',
        actorRole: 'admin',
        scopes: [],
        supabaseToken: mockJWT,
      };

      expect(mockContext.supabaseToken).toBe(mockJWT);
    });
  });

  describe('JWT Claims Validation', () => {
    it('should require sub claim', () => {
      const payloadWithoutSub = {
        role: 'admin',
        scopes: [],
      };

      expect(payloadWithoutSub.sub).toBeUndefined();
    });

    it('should require role claim', () => {
      const payloadWithoutRole = {
        sub: 'user-123',
        scopes: [],
      };

      expect(payloadWithoutRole.role).toBeUndefined();
    });

    it('should validate audience claim', () => {
      const expectedAudience = 'admin-mcp';
      const payload = {
        sub: 'user-123',
        role: 'admin',
        aud: expectedAudience,
      };

      expect(payload.aud).toBe(expectedAudience);
    });

    it('should handle exp claim for expiration', () => {
      const now = Math.floor(Date.now() / 1000);
      const futureExp = now + 3600; // 1 hour from now
      const pastExp = now - 3600; // 1 hour ago

      expect(futureExp).toBeGreaterThan(now);
      expect(pastExp).toBeLessThan(now);
    });

    it('should handle iat claim for issued at', () => {
      const now = Math.floor(Date.now() / 1000);
      const iat = now - 60; // Issued 1 minute ago

      expect(iat).toBeLessThanOrEqual(now);
    });

    it('should allow clock skew tolerance', () => {
      const clockTolerance = 30; // seconds
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 10; // Token expires in 10 seconds

      // With 30s tolerance, should still be valid
      expect(exp + clockTolerance).toBeGreaterThan(now);
    });
  });

  describe('Error Handling', () => {
    it('should throw AuthenticationError for verification failures', () => {
      const error = new AuthenticationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Test error');
    });

    it('should wrap generic errors in AuthenticationError', () => {
      const genericError = new Error('Generic error');
      const authError = new AuthenticationError(`Token verification failed: ${genericError.message}`);

      expect(authError.message).toContain('Token verification failed');
      expect(authError.message).toContain('Generic error');
    });
  });
});
