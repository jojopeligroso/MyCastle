/**
 * Authentication Utilities Unit Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase client
const mockGetUser = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
  }),
}));

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { role: 'teacher', tenant_id: 'test-tenant' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { getCurrentUser } = await import('@/lib/auth/utils');
      const user = await getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });

    it('should return null when not authenticated', async () => {
      (mockGetUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { getCurrentUser } = await import('@/lib/auth/utils');
      const user = await getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { role: 'teacher', tenant_id: 'test-tenant' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { requireAuth } = await import('@/lib/auth/utils');
      const user = await requireAuth();

      expect(user).toEqual(mockUser);
    });

    it('should throw when not authenticated', async () => {
      (mockGetUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { requireAuth } = await import('@/lib/auth/utils');

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should allow access when role is permitted', async () => {
      const mockUser = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        user_metadata: { role: 'admin' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { requireAuth } = await import('@/lib/auth/utils');
      const user = await requireAuth(['admin']);

      expect(user).toEqual(mockUser);
    });

    it('should allow super_admin when admin is required', async () => {
      const mockUser = {
        id: 'super-admin-user-id',
        email: 'superadmin@example.com',
        user_metadata: { role: 'super_admin' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { requireAuth } = await import('@/lib/auth/utils');
      const user = await requireAuth(['admin']);

      expect(user).toEqual(mockUser);
    });

    it('should throw when role is not permitted', async () => {
      const mockUser = {
        id: 'teacher-user-id',
        email: 'teacher@example.com',
        user_metadata: { role: 'teacher' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { requireAuth } = await import('@/lib/auth/utils');

      await expect(requireAuth(['admin'])).rejects.toThrow('Forbidden: Insufficient permissions');
    });
  });

  describe('requireRole', () => {
    it('should allow access when role matches', async () => {
      const mockUser = {
        id: 'teacher-user-id',
        email: 'teacher@example.com',
        user_metadata: { role: 'teacher' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { requireRole } = await import('@/lib/auth/utils');
      const user = await requireRole(['teacher']);

      expect(user).toEqual(mockUser);
    });

    it('should throw when role does not match', async () => {
      const mockUser = {
        id: 'student-user-id',
        email: 'student@example.com',
        user_metadata: { role: 'student' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { requireRole } = await import('@/lib/auth/utils');

      await expect(requireRole(['admin'])).rejects.toThrow('Forbidden: Insufficient permissions');
    });
  });

  describe('getTenantId', () => {
    it('should return tenant ID from user metadata', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { tenant_id: 'test-tenant-123' },
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { getTenantId } = await import('@/lib/auth/utils');
      const tenantId = await getTenantId();

      expect(tenantId).toBe('test-tenant-123');
    });

    it('should return null when user has no tenant', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {},
      };

      (mockGetUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { getTenantId } = await import('@/lib/auth/utils');
      const tenantId = await getTenantId();

      expect(tenantId).toBeNull();
    });

    it('should return null when not authenticated', async () => {
      (mockGetUser as any).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { getTenantId } = await import('@/lib/auth/utils');
      const tenantId = await getTenantId();

      expect(tenantId).toBeNull();
    });
  });
});
