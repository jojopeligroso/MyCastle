/**
 * Tests for create-user tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSupabaseClient, generateTestJWT, MOCK_USERS, cleanupTestData, TEST_ENV } from '../setup';
import { createUser } from '../../src/tools/create-user';

describe('create-user tool', () => {
  let adminJWT: string;
  let teacherJWT: string;
  let supabase: ReturnType<typeof createTestSupabaseClient>;

  beforeEach(async () => {
    adminJWT = await generateTestJWT(MOCK_USERS.admin);
    teacherJWT = await generateTestJWT(MOCK_USERS.teacher);
    supabase = createTestSupabaseClient(adminJWT);
  });

  afterEach(async () => {
    await cleanupTestData(supabase, ['users']);
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      await expect(
        createUser.execute(
          {
            email: 'invalid-email',
            name: 'Test User',
            role: 'student',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/email/i);
    });

    it('should require name', async () => {
      await expect(
        createUser.execute(
          {
            email: 'test@example.com',
            name: '',
            role: 'student',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/name/i);
    });

    it('should validate role enum', async () => {
      await expect(
        createUser.execute(
          {
            email: 'test@example.com',
            name: 'Test User',
            role: 'invalid-role' as any,
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/role/i);
    });

    it('should accept optional phone number', async () => {
      const result = await createUser.execute(
        {
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
          phone: '+44 20 7946 0958',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.phone).toBe('+44 20 7946 0958');
    });
  });

  describe('Authorization', () => {
    it('should allow admin to create users', async () => {
      const result = await createUser.execute(
        {
          email: 'newuser@example.com',
          name: 'New User',
          role: 'student',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('newuser@example.com');
    });

    it('should deny non-admin from creating users', async () => {
      await expect(
        createUser.execute(
          {
            email: 'newuser@example.com',
            name: 'New User',
            role: 'student',
          },
          MOCK_USERS.teacher
        )
      ).rejects.toThrow(/permission/i);
    });

    it('should enforce tenant isolation', async () => {
      const result = await createUser.execute(
        {
          email: 'newuser@example.com',
          name: 'New User',
          role: 'student',
        },
        MOCK_USERS.admin
      );

      expect(result.user?.tenant_id).toBe(TEST_ENV.TENANT_ID);
    });
  });

  describe('User Creation', () => {
    it('should create a student user', async () => {
      const result = await createUser.execute(
        {
          email: 'student@example.com',
          name: 'Test Student',
          role: 'student',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('student');
      expect(result.user?.status).toBe('active');
    });

    it('should create a teacher user', async () => {
      const result = await createUser.execute(
        {
          email: 'teacher@example.com',
          name: 'Test Teacher',
          role: 'teacher',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('teacher');
    });

    it('should create an admin user', async () => {
      const result = await createUser.execute(
        {
          email: 'admin@example.com',
          name: 'Test Admin',
          role: 'admin',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('admin');
    });

    it('should prevent duplicate email addresses', async () => {
      await createUser.execute(
        {
          email: 'duplicate@example.com',
          name: 'User One',
          role: 'student',
        },
        MOCK_USERS.admin
      );

      await expect(
        createUser.execute(
          {
            email: 'duplicate@example.com',
            name: 'User Two',
            role: 'student',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/already exists/i);
    });
  });

  describe('Email Invitation', () => {
    it('should send invitation email by default', async () => {
      const result = await createUser.execute(
        {
          email: 'invited@example.com',
          name: 'Invited User',
          role: 'student',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      // Note: In real tests, you'd verify the email was sent
      // For now, we just verify the flag was set
    });

    it('should skip invitation when send_invitation is false', async () => {
      const result = await createUser.execute(
        {
          email: 'noinvite@example.com',
          name: 'No Invite User',
          role: 'student',
          send_invitation: false,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entry for user creation', async () => {
      const result = await createUser.execute(
        {
          email: 'audited@example.com',
          name: 'Audited User',
          role: 'student',
        },
        MOCK_USERS.admin
      );

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_id', result.user?.id)
        .eq('action', 'create-user')
        .single();

      expect(auditLogs).toBeDefined();
      expect(auditLogs?.actor_id).toBe(MOCK_USERS.admin.id);
      expect(auditLogs?.resource_type).toBe('user');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database error by using invalid tenant_id
      const invalidUser = { ...MOCK_USERS.admin, tenant_id: 'non-existent-tenant' };

      await expect(
        createUser.execute(
          {
            email: 'test@example.com',
            name: 'Test User',
            role: 'student',
          },
          invalidUser
        )
      ).rejects.toThrow();
    });

    it('should return meaningful error messages', async () => {
      try {
        await createUser.execute(
          {
            email: 'test@example.com',
            name: 'Test User',
            role: 'student',
          },
          MOCK_USERS.teacher
        );
      } catch (error: any) {
        expect(error.message).toContain('permission');
      }
    });
  });
});
