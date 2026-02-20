/**
 * RLS Policy Tests
 * T-011: Core RLS policies for tenant and role isolation
 * Ref: REQ-A-004, DESIGN §5.2
 *
 * Test Coverage:
 * - Multi-tenant isolation
 * - Role-based access control (admin, teacher, student)
 * - Positive cases (authorized access)
 * - Negative cases (unauthorized access blocked)
 * - Policy rollback safety
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { tenants, users, classes, enrollments } from '../db/schema';

// Test data IDs
let tenant1Id: string;
let tenant2Id: string;
let admin1Id: string;
let teacher1Id: string;
let teacher2Id: string;
let student1Id: string;
let student2Id: string;
let class1Id: string;
let class2Id: string;

/**
 * Helper function to set user context
 */
async function setUserContext(userId: string, tenantId: string, role: string) {
  await db.execute(sql`SELECT set_user_context(${userId}::uuid, ${tenantId}::uuid, ${role})`);
}

/**
 * Helper function to clear user context
 */
async function clearUserContext() {
  // Use set_config to clear variables (RESET doesn't work well with custom variables)
  await db.execute(sql`SELECT set_config('app.user_id', '', false)`);
  await db.execute(sql`SELECT set_config('app.tenant_id', '', false)`);
  await db.execute(sql`SELECT set_config('app.user_role', '', false)`);
}

describe('RLS Policies - Setup', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await db.execute(sql`
      DELETE FROM attendance WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM class_sessions WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM enrollments WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM classes WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM users WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM tenants WHERE subdomain LIKE 'test-rls%'
    `);

    // Create test tenants (with elevated privileges, bypassing RLS for setup)
    await db.execute(sql`SET session_replication_role = 'replica'`);

    const [tenant1] = await db
      .insert(tenants)
      .values({
        name: 'Test School 1',
        subdomain: 'test-rls-1',
        contactEmail: 'admin@test1.com',
      })
      .returning();
    tenant1Id = tenant1.id;

    const [tenant2] = await db
      .insert(tenants)
      .values({
        name: 'Test School 2',
        subdomain: 'test-rls-2',
        contactEmail: 'admin@test2.com',
      })
      .returning();
    tenant2Id = tenant2.id;

    // Create test users
    const [admin1] = await db
      .insert(users)
      .values({
        tenantId: tenant1Id,
        email: 'admin1@test1.com',
        name: 'Admin One',
        primaryRole: 'admin',
      })
      .returning();
    admin1Id = admin1.id;

    const [teacher1] = await db
      .insert(users)
      .values({
        tenantId: tenant1Id,
        email: 'teacher1@test1.com',
        name: 'Teacher One',
        primaryRole: 'teacher',
      })
      .returning();
    teacher1Id = teacher1.id;

    const [teacher2] = await db
      .insert(users)
      .values({
        tenantId: tenant2Id,
        email: 'teacher2@test2.com',
        name: 'Teacher Two',
        primaryRole: 'teacher',
      })
      .returning();
    teacher2Id = teacher2.id;

    const [student1] = await db
      .insert(users)
      .values({
        tenantId: tenant1Id,
        email: 'student1@test1.com',
        name: 'Student One',
        primaryRole: 'student',
      })
      .returning();
    student1Id = student1.id;

    const [student2] = await db
      .insert(users)
      .values({
        tenantId: tenant1Id,
        email: 'student2@test1.com',
        name: 'Student Two',
        primaryRole: 'student',
      })
      .returning();
    student2Id = student2.id;

    // Create test classes
    const [class1] = await db
      .insert(classes)
      .values({
        tenantId: tenant1Id,
        name: 'Math 101',
        code: 'MATH-101',
        teacherId: teacher1Id,
        startDate: '2025-01-01',
      })
      .returning();
    class1Id = class1.id;

    const [class2] = await db
      .insert(classes)
      .values({
        tenantId: tenant1Id,
        name: 'English 101',
        code: 'ENG-101',
        teacherId: teacher2Id, // Teacher from different tenant!
        startDate: '2025-01-01',
      })
      .returning();
    class2Id = class2.id;

    // Create enrollments
    await db.insert(enrollments).values({
      tenantId: tenant1Id,
      studentId: student1Id,
      classId: class1Id,
      enrollmentDate: '2025-01-01',
    });

    await db.execute(sql`SET session_replication_role = 'origin'`);
  });

  afterAll(async () => {
    // Clean up test data
    await clearUserContext();

    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`
      DELETE FROM attendance WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM class_sessions WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM enrollments WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM classes WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM users WHERE tenant_id IN (
        SELECT id FROM tenants WHERE subdomain LIKE 'test-rls%'
      )
    `);
    await db.execute(sql`
      DELETE FROM tenants WHERE subdomain LIKE 'test-rls%'
    `);
    await db.execute(sql`SET session_replication_role = 'origin'`);
  });

  beforeEach(async () => {
    // Clear context before each test
    await clearUserContext();
  });

  it('should create test data successfully', () => {
    expect(tenant1Id).toBeDefined();
    expect(tenant2Id).toBeDefined();
    expect(admin1Id).toBeDefined();
    expect(teacher1Id).toBeDefined();
    expect(student1Id).toBeDefined();
    expect(class1Id).toBeDefined();
  });
});

describe('RLS Policies - Tenants Table', () => {
  it('should allow user to see only their own tenant', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const result = await db.select().from(tenants);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(tenant1Id);
  });

  it('should prevent user from seeing other tenants', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const result = await db.select().from(tenants);
    const tenant2Visible = result.some(t => t.id === tenant2Id);

    expect(tenant2Visible).toBe(false);
  });
});

describe('RLS Policies - Users Table', () => {
  it('should allow users to see users in their tenant', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const result = await db.select().from(users);

    // Should see admin1, teacher1, student1, student2 (all in tenant1)
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.every(u => u.tenantId === tenant1Id)).toBe(true);
  });

  it('should prevent users from seeing users in other tenants', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const result = await db.select().from(users);
    const teacher2Visible = result.some(u => u.id === teacher2Id);

    expect(teacher2Visible).toBe(false);
  });
});

describe('RLS Policies - Classes Table', () => {
  it('should allow admin to see all classes in their tenant', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const result = await db.select().from(classes);

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every(c => c.tenantId === tenant1Id)).toBe(true);
  });

  it('should allow teacher to see only their assigned classes', async () => {
    await setUserContext(teacher1Id, tenant1Id, 'teacher');

    const result = await db.select().from(classes);

    // Teacher1 should only see class1
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(class1Id);
  });

  it('should allow student to see only enrolled classes', async () => {
    await setUserContext(student1Id, tenant1Id, 'student');

    const result = await db.select().from(classes);

    // Student1 is enrolled in class1
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(class1Id);
  });

  it('should prevent student from seeing non-enrolled classes', async () => {
    await setUserContext(student2Id, tenant1Id, 'student');

    const result = await db.select().from(classes);

    // Student2 is not enrolled in any classes
    expect(result.length).toBe(0);
  });
});

describe('RLS Policies - Enrollments Table', () => {
  it('should allow admin to see all enrollments in their tenant', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const result = await db.select().from(enrollments);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(e => e.tenantId === tenant1Id)).toBe(true);
  });

  it('should allow teacher to see enrollments for their classes', async () => {
    await setUserContext(teacher1Id, tenant1Id, 'teacher');

    const result = await db.select().from(enrollments);

    // Teacher1 should see enrollments for class1
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(e => e.classId === class1Id)).toBe(true);
  });

  it('should allow student to see only their own enrollments', async () => {
    await setUserContext(student1Id, tenant1Id, 'student');

    const result = await db.select().from(enrollments);

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(e => e.studentId === student1Id)).toBe(true);
  });
});

describe('RLS Policies - Multi-Tenant Isolation', () => {
  it('should enforce strict tenant isolation for classes', async () => {
    // Teacher2 is in tenant2, should not see any classes from tenant1
    await setUserContext(teacher2Id, tenant2Id, 'teacher');

    const result = await db.select().from(classes);

    // Even though teacher2 is assigned to class2, they can't see it
    // because they're authenticated with tenant2 context
    expect(result.length).toBe(0);
  });

  it('should prevent cross-tenant data access', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const allTenants = await db.select().from(tenants);
    const allUsers = await db.select().from(users);
    const allClasses = await db.select().from(classes);

    // All queries should only return tenant1 data
    expect(allTenants.every(t => t.id === tenant1Id)).toBe(true);
    expect(allUsers.every(u => u.tenantId === tenant1Id)).toBe(true);
    expect(allClasses.every(c => c.tenantId === tenant1Id)).toBe(true);
  });
});

describe('RLS Policies - Negative Cases', () => {
  it('should return empty results when user context is not set', async () => {
    // Don't set any user context
    await clearUserContext();

    const result = await db.select().from(classes);

    expect(result.length).toBe(0);
  });

  it('should prevent unauthorized insert operations', async () => {
    await setUserContext(student1Id, tenant1Id, 'student');

    // Students should not be able to create classes
    await expect(async () => {
      await db.insert(classes).values({
        tenantId: tenant1Id,
        name: 'Unauthorized Class',
        code: 'HACK-101',
        startDate: '2025-01-01',
      });
    }).rejects.toThrow();
  });

  it('should prevent unauthorized update operations', async () => {
    await setUserContext(student1Id, tenant1Id, 'student');

    // Students should not be able to update classes
    await expect(async () => {
      await db
        .update(classes)
        .set({ name: 'Hacked Class' })
        .where(sql`id = ${class1Id}::uuid`);
    }).rejects.toThrow();
  });

  it('should prevent unauthorized delete operations', async () => {
    await setUserContext(student1Id, tenant1Id, 'student');

    // Students should not be able to delete classes
    await expect(async () => {
      await db.delete(classes).where(sql`id = ${class1Id}::uuid`);
    }).rejects.toThrow();
  });
});

describe('RLS Policies - Admin Privileges', () => {
  it('should allow admin to create users', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: tenant1Id,
        email: 'newuser@test1.com',
        name: 'New User',
        primaryRole: 'student',
      })
      .returning();

    expect(newUser).toBeDefined();
    expect(newUser.tenantId).toBe(tenant1Id);

    // Clean up
    await db.delete(users).where(sql`id = ${newUser.id}::uuid`);
  });

  it('should allow admin to update users', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const [updated] = await db
      .update(users)
      .set({ name: 'Updated Student' })
      .where(sql`id = ${student1Id}::uuid`)
      .returning();

    expect(updated.name).toBe('Updated Student');

    // Restore original name
    await db
      .update(users)
      .set({ name: 'Student One' })
      .where(sql`id = ${student1Id}::uuid`);
  });

  it('should allow admin to create classes', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const [newClass] = await db
      .insert(classes)
      .values({
        tenantId: tenant1Id,
        name: 'Science 101',
        code: 'SCI-101',
        startDate: '2025-01-01',
      })
      .returning();

    expect(newClass).toBeDefined();
    expect(newClass.tenantId).toBe(tenant1Id);

    // Clean up
    await db.delete(classes).where(sql`id = ${newClass.id}::uuid`);
  });
});

describe('RLS Policies - Teacher Privileges', () => {
  it('should allow teacher to update their own classes', async () => {
    await setUserContext(teacher1Id, tenant1Id, 'teacher');

    const [updated] = await db
      .update(classes)
      .set({ description: 'Updated by teacher' })
      .where(sql`id = ${class1Id}::uuid`)
      .returning();

    expect(updated.description).toBe('Updated by teacher');
  });

  it('should prevent teacher from updating other teachers classes', async () => {
    await setUserContext(teacher1Id, tenant1Id, 'teacher');

    // Teacher1 should not be able to update class2 (assigned to teacher2)
    await expect(async () => {
      await db
        .update(classes)
        .set({ description: 'Hacked' })
        .where(sql`id = ${class2Id}::uuid`);
    }).rejects.toThrow();
  });
});

describe('RLS Policies - Rollback Safety', () => {
  it('should rollback transaction if policy is violated', async () => {
    await setUserContext(student1Id, tenant1Id, 'student');

    const initialCount = (await db.select().from(classes)).length;

    try {
      await db.transaction(async tx => {
        // This should fail due to RLS policy
        await tx.insert(classes).values({
          tenantId: tenant1Id,
          name: 'Unauthorized Class',
          code: 'HACK-101',
          startDate: '2025-01-01',
        });
      });
    } catch {
      // Expected to fail
    }

    const finalCount = (await db.select().from(classes)).length;

    // Count should remain unchanged
    expect(finalCount).toBe(initialCount);
  });

  it('should not leak data on policy violation', async () => {
    await setUserContext(student1Id, tenant1Id, 'student');

    // Try to query classes (student1 should only see enrolled classes)
    const visibleClasses = await db.select().from(classes);

    // Verify we only see enrolled classes, not all classes
    expect(visibleClasses.length).toBe(1);
    expect(visibleClasses[0].id).toBe(class1Id);
  });
});

describe('RLS Policies - Context Functions', () => {
  it('should correctly set and retrieve user context', async () => {
    await setUserContext(admin1Id, tenant1Id, 'admin');

    const [currentUserId] = await db.execute(sql`SELECT current_user_id()`);
    const [currentTenantId] = await db.execute(sql`SELECT current_tenant_id()`);
    const [currentRole] = await db.execute(sql`SELECT current_user_role()`);

    expect(currentUserId).toBeDefined();
    expect(currentTenantId).toBeDefined();
    expect(currentRole).toBeDefined();
  });

  it('should handle missing context gracefully', async () => {
    await clearUserContext();

    const [currentUserId] = await db.execute(sql`SELECT current_user_id()`);

    // Should return NULL when context is not set
    expect(currentUserId).toEqual({ current_user_id: null });
  });
});
