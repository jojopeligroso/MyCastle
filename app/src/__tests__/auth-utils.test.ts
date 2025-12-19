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
