/**
 * Tests for update-user tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestSupabaseClient, generateTestJWT, MOCK_USERS, cleanupTestData, TEST_ENV } from '../setup';
import { updateUser } from '../../src/tools/update-user';

describe('update-user tool', () => {
  let adminJWT: string;
  let teacherJWT: string;
  let supabase: ReturnType<typeof createTestSupabaseClient>;
  let testUserId: string;

  beforeEach(async () => {
    adminJWT = await generateTestJWT(MOCK_USERS.admin);
    teacherJWT = await generateTestJWT(MOCK_USERS.teacher);
    supabase = createTestSupabaseClient(adminJWT);

    // Create a test user to update
    const { data: testUser } = await supabase
      .from('users')
      .insert({
        email: 'testupdate@example.com',
        name: 'Test Update User',
        role: 'student',
        tenant_id: TEST_ENV.TENANT_ID,
        status: 'active',
      })
      .select()
      .single();

    testUserId = testUser?.id;
  });

  afterEach(async () => {
    await cleanupTestData(supabase, ['users', 'audit_logs']);
  });

  describe('Input Validation', () => {
    it('should validate user_id format', async () => {
      await expect(
        updateUser.execute(
          {
            user_id: 'invalid-uuid',
            name: 'New Name',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/uuid/i);
    });

    it('should validate email format if provided', async () => {
      await expect(
        updateUser.execute(
          {
            user_id: testUserId,
            email: 'invalid-email',
          },
          MOCK_USERS.admin
        )
      ).rejects.toThrow(/email/i);
    });

    it('should accept optional fields', async () => {
      const result = await updateUser.execute(
        {
          user_id: testUserId,
          name: 'Updated Name',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Updated Name');
    });
  });

  describe('Authorization', () => {
    it('should allow admin to update users', async () => {
      const result = await updateUser.execute(
        {
          user_id: testUserId,
          name: 'Admin Updated',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
    });

    it('should deny non-admin from updating users', async () => {
      await expect(
        updateUser.execute(
          {
            user_id: testUserId,
            name: 'Teacher Attempt',
          },
          MOCK_USERS.teacher
        )
      ).rejects.toThrow(/permission/i);
    });

    it('should enforce tenant isolation', async () => {
      const result = await updateUser.execute(
        {
          user_id: testUserId,
          name: 'Updated Name',
        },
        MOCK_USERS.unauthorized
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('User Update Operations', () => {
    it('should update user name', async () => {
      const result = await updateUser.execute(
        {
          user_id: testUserId,
          name: 'John Smith Updated',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('John Smith Updated');

      // Verify in database
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', testUserId)
        .single();

      expect(user?.name).toBe('John Smith Updated');
    });

    it('should update user email', async () => {
      const newEmail = 'newemail@example.com';

      const result = await updateUser.execute(
        {
          user_id: testUserId,
          email: newEmail,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe(newEmail);
    });

    it('should update user phone', async () => {
      const result = await updateUser.execute(
        {
          user_id: testUserId,
          phone: '+44 20 7946 0958',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.phone).toBe('+44 20 7946 0958');
    });

    it('should update multiple fields at once', async () => {
      const result = await updateUser.execute(
        {
          user_id: testUserId,
          name: 'Multiple Update',
          email: 'multiple@example.com',
          phone: '+1234567890',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
      expect(result.user?.name).toBe('Multiple Update');
      expect(result.user?.email).toBe('multiple@example.com');
      expect(result.user?.phone).toBe('+1234567890');
    });

    it('should update metadata', async () => {
      const metadata = {
        preferences: { theme: 'dark' },
        notes: 'Test notes',
      };

      const result = await updateUser.execute(
        {
          user_id: testUserId,
          metadata,
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log for user update', async () => {
      await updateUser.execute(
        {
          user_id: testUserId,
          name: 'Audited Update',
          email: 'audited@example.com',
        },
        MOCK_USERS.admin
      );

      const { data: auditLog } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_id', testUserId)
        .eq('action', 'update-user')
        .single();

      expect(auditLog).toBeDefined();
      expect(auditLog?.actor_id).toBe(MOCK_USERS.admin.id);
      expect(auditLog?.resource_type).toBe('user');

      // Verify before/after in changes
      const changes = auditLog?.changes as any;
      expect(changes.before).toBeDefined();
      expect(changes.after).toBeDefined();
      expect(changes.after.name).toBe('Audited Update');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent user', async () => {
      const result = await updateUser.execute(
        {
          user_id: '00000000-0000-0000-0000-000000000000',
          name: 'Should Fail',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle duplicate email', async () => {
      // Create another user
      await supabase
        .from('users')
        .insert({
          email: 'existing@example.com',
          name: 'Existing User',
          role: 'student',
          tenant_id: TEST_ENV.TENANT_ID,
        });

      // Try to update test user with existing email
      const result = await updateUser.execute(
        {
          user_id: testUserId,
          email: 'existing@example.com',
        },
        MOCK_USERS.admin
      );

      expect(result.success).toBe(false);
    });

    it('should provide meaningful error messages', async () => {
      const result = await updateUser.execute(
        {
          user_id: '00000000-0000-0000-0000-000000000000',
          name: 'Test',
        },
        MOCK_USERS.admin
      );

      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('Updated Timestamp', () => {
    it('should update the updated_at timestamp', async () => {
      const { data: beforeUpdate } = await supabase
        .from('users')
        .select('updated_at')
        .eq('id', testUserId)
        .single();

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      await updateUser.execute(
        {
          user_id: testUserId,
          name: 'Timestamp Test',
        },
        MOCK_USERS.admin
      );

      const { data: afterUpdate } = await supabase
        .from('users')
        .select('updated_at')
        .eq('id', testUserId)
        .single();

      expect(new Date(afterUpdate?.updated_at).getTime()).toBeGreaterThan(
        new Date(beforeUpdate?.updated_at).getTime()
      );
    });
  });
});
