import { describe, it, expect } from 'vitest';
import {
  hasScope,
  requireScope,
  hasAnyScope,
  hasAllScopes,
  hasPIIAccess,
  hasWritePIIAccess,
  isSuperAdmin,
  getAllScopes,
  SCOPES,
} from '../../src/core/auth/scopes.js';
import type { AdminContext } from '../../src/types/index.js';
import { AuthorizationError } from '../../src/types/index.js';

describe('Scope Validation', () => {
  describe('hasScope', () => {
    it('should return true when context has the scope', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user', 'admin.write.user'],
        supabaseToken: 'token',
      };

      expect(hasScope(context, SCOPES.ADMIN_READ_USER)).toBe(true);
      expect(hasScope(context, SCOPES.ADMIN_WRITE_USER)).toBe(true);
    });

    it('should return false when context lacks the scope', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user'],
        supabaseToken: 'token',
      };

      expect(hasScope(context, SCOPES.ADMIN_DELETE_USER)).toBe(false);
      expect(hasScope(context, SCOPES.ADMIN_WRITE_USER)).toBe(false);
    });

    it('should return true for super admin on any scope', () => {
      const context: AdminContext = {
        actorId: 'super-admin',
        actorRole: 'super_admin',
        scopes: ['admin.super'],
        supabaseToken: 'token',
      };

      expect(hasScope(context, SCOPES.ADMIN_READ_USER)).toBe(true);
      expect(hasScope(context, SCOPES.ADMIN_WRITE_USER)).toBe(true);
      expect(hasScope(context, SCOPES.ADMIN_DELETE_USER)).toBe(true);
      expect(hasScope(context, SCOPES.ADMIN_READ_PII)).toBe(true);
    });
  });

  describe('requireScope', () => {
    it('should not throw when context has required scope', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.write.user'],
        supabaseToken: 'token',
      };

      expect(() => requireScope(context, SCOPES.ADMIN_WRITE_USER)).not.toThrow();
    });

    it('should throw AuthorizationError when context lacks scope', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user'],
        supabaseToken: 'token',
      };

      expect(() => requireScope(context, SCOPES.ADMIN_WRITE_USER)).toThrow(AuthorizationError);
      expect(() => requireScope(context, SCOPES.ADMIN_WRITE_USER)).toThrow(/Missing required scope/);
    });

    it('should include scope details in error message', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user'],
        supabaseToken: 'token',
      };

      try {
        requireScope(context, SCOPES.ADMIN_WRITE_USER);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
        expect((error as Error).message).toContain('admin.write.user');
        expect((error as Error).message).toContain('test-user');
      }
    });

    it('should not throw for super admin', () => {
      const context: AdminContext = {
        actorId: 'super-admin',
        actorRole: 'super_admin',
        scopes: ['admin.super'],
        supabaseToken: 'token',
      };

      expect(() => requireScope(context, SCOPES.ADMIN_DELETE_USER)).not.toThrow();
      expect(() => requireScope(context, SCOPES.ADMIN_WRITE_FINANCE)).not.toThrow();
    });
  });

  describe('hasAnyScope', () => {
    it('should return true when context has at least one scope', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user'],
        supabaseToken: 'token',
      };

      const result = hasAnyScope(context, [
        SCOPES.ADMIN_READ_USER,
        SCOPES.ADMIN_WRITE_USER,
      ]);

      expect(result).toBe(true);
    });

    it('should return false when context has none of the scopes', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.class'],
        supabaseToken: 'token',
      };

      const result = hasAnyScope(context, [
        SCOPES.ADMIN_READ_USER,
        SCOPES.ADMIN_WRITE_USER,
      ]);

      expect(result).toBe(false);
    });

    it('should return true for super admin', () => {
      const context: AdminContext = {
        actorId: 'super-admin',
        actorRole: 'super_admin',
        scopes: ['admin.super'],
        supabaseToken: 'token',
      };

      const result = hasAnyScope(context, [
        SCOPES.ADMIN_READ_USER,
        SCOPES.ADMIN_WRITE_FINANCE,
      ]);

      expect(result).toBe(true);
    });
  });

  describe('hasAllScopes', () => {
    it('should return true when context has all required scopes', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user', 'admin.write.user', 'admin.read.class'],
        supabaseToken: 'token',
      };

      const result = hasAllScopes(context, [
        SCOPES.ADMIN_READ_USER,
        SCOPES.ADMIN_WRITE_USER,
      ]);

      expect(result).toBe(true);
    });

    it('should return false when context lacks any required scope', () => {
      const context: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user'],
        supabaseToken: 'token',
      };

      const result = hasAllScopes(context, [
        SCOPES.ADMIN_READ_USER,
        SCOPES.ADMIN_WRITE_USER,
      ]);

      expect(result).toBe(false);
    });

    it('should return true for super admin', () => {
      const context: AdminContext = {
        actorId: 'super-admin',
        actorRole: 'super_admin',
        scopes: ['admin.super'],
        supabaseToken: 'token',
      };

      const result = hasAllScopes(context, [
        SCOPES.ADMIN_READ_USER,
        SCOPES.ADMIN_WRITE_USER,
        SCOPES.ADMIN_DELETE_USER,
      ]);

      expect(result).toBe(true);
    });
  });

  describe('PII Access Helpers', () => {
    it('should detect PII read access', () => {
      const contextWithPII: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.pii'],
        supabaseToken: 'token',
      };

      const contextWithoutPII: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.user'],
        supabaseToken: 'token',
      };

      expect(hasPIIAccess(contextWithPII)).toBe(true);
      expect(hasPIIAccess(contextWithoutPII)).toBe(false);
    });

    it('should detect PII write access', () => {
      const contextWithWritePII: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.write.pii'],
        supabaseToken: 'token',
      };

      const contextWithReadPII: AdminContext = {
        actorId: 'test-user',
        actorRole: 'admin',
        scopes: ['admin.read.pii'],
        supabaseToken: 'token',
      };

      expect(hasWritePIIAccess(contextWithWritePII)).toBe(true);
      expect(hasWritePIIAccess(contextWithReadPII)).toBe(false);
    });

    it('should grant PII access to super admin', () => {
      const context: AdminContext = {
        actorId: 'super-admin',
        actorRole: 'super_admin',
        scopes: ['admin.super'],
        supabaseToken: 'token',
      };

      expect(hasPIIAccess(context)).toBe(true);
      expect(hasWritePIIAccess(context)).toBe(true);
    });
  });

  describe('isSuperAdmin', () => {
    it('should identify super admin', () => {
      const superAdminContext: AdminContext = {
        actorId: 'super-admin',
        actorRole: 'super_admin',
        scopes: ['admin.super'],
        supabaseToken: 'token',
      };

      expect(isSuperAdmin(superAdminContext)).toBe(true);
    });

    it('should reject regular admin', () => {
      const regularAdminContext: AdminContext = {
        actorId: 'admin',
        actorRole: 'admin',
        scopes: ['admin.read.user', 'admin.write.user'],
        supabaseToken: 'token',
      };

      expect(isSuperAdmin(regularAdminContext)).toBe(false);
    });
  });

  describe('getAllScopes', () => {
    it('should return all available scopes', () => {
      const allScopes = getAllScopes();

      expect(Array.isArray(allScopes)).toBe(true);
      expect(allScopes.length).toBeGreaterThan(0);
      expect(allScopes).toContain('admin.read.user');
      expect(allScopes).toContain('admin.write.user');
      expect(allScopes).toContain('admin.super');
    });

    it('should include all scope categories', () => {
      const allScopes = getAllScopes();

      // User management scopes
      expect(allScopes).toContain('admin.read.user');
      expect(allScopes).toContain('admin.write.user');
      expect(allScopes).toContain('admin.delete.user');

      // PII scopes
      expect(allScopes).toContain('admin.read.pii');
      expect(allScopes).toContain('admin.write.pii');

      // Class management scopes
      expect(allScopes).toContain('admin.read.class');
      expect(allScopes).toContain('admin.write.class');

      // Finance scopes
      expect(allScopes).toContain('admin.read.finance');
      expect(allScopes).toContain('admin.write.finance');

      // System scopes
      expect(allScopes).toContain('admin.read.system');
      expect(allScopes).toContain('admin.write.system');

      // Super admin scope
      expect(allScopes).toContain('admin.super');
    });
  });

  describe('Scope Constants', () => {
    it('should define user management scopes', () => {
      expect(SCOPES.ADMIN_READ_USER).toBe('admin.read.user');
      expect(SCOPES.ADMIN_WRITE_USER).toBe('admin.write.user');
      expect(SCOPES.ADMIN_DELETE_USER).toBe('admin.delete.user');
    });

    it('should define PII scopes', () => {
      expect(SCOPES.ADMIN_READ_PII).toBe('admin.read.pii');
      expect(SCOPES.ADMIN_WRITE_PII).toBe('admin.write.pii');
    });

    it('should define role management scopes', () => {
      expect(SCOPES.ADMIN_WRITE_ROLE).toBe('admin.write.role');
    });

    it('should define super admin scope', () => {
      expect(SCOPES.ADMIN_SUPER).toBe('admin.super');
    });
  });
});
