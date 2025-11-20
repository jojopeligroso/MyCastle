/**
 * Unit Tests for Admin Users API Routes
 * Tests POST /api/admin/users - Create user
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { db } from '@/db';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/db');
jest.mock('@/lib/auth/utils');
jest.mock('@supabase/supabase-js');

describe('POST /api/admin/users', () => {
  let mockRequest: Partial<NextRequest>;
  let mockSupabaseAdmin: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      json: jest.fn(),
    };

    // Mock auth functions
    (requireAuth as jest.Mock).mockResolvedValue({
      id: 'user-123',
      user_metadata: { role: 'admin' },
    });

    (getTenantId as jest.Mock).mockResolvedValue('tenant-123');

    // Mock Supabase Admin client
    mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'new-user-id', email: 'test@example.com' } },
            error: null,
          }),
        },
      },
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseAdmin);
  });

  it('should create a user with valid data', async () => {
    const validData = {
      email: 'student@example.com',
      name: 'John Doe',
      role: 'student',
      password: 'SecurePass123!',
      status: 'active',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(validData);

    const mockInsertedUser = {
      id: 'new-user-id',
      tenant_id: 'tenant-123',
      email: validData.email,
      name: validData.name,
      role: validData.role,
      status: validData.status,
      created_at: new Date(),
      updated_at: new Date(),
    };

    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockInsertedUser]),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toHaveProperty('id');
    expect(data.user.email).toBe(validData.email);
    expect(data).not.toHaveProperty('temporaryPassword'); // Password was provided
  });

  it('should generate temporary password when not provided', async () => {
    const dataWithoutPassword = {
      email: 'student@example.com',
      name: 'John Doe',
      role: 'student',
      status: 'active',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(dataWithoutPassword);

    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'new-user-id',
        ...dataWithoutPassword,
        tenant_id: 'tenant-123',
      }]),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.temporaryPassword).toBeDefined();
    expect(data.temporaryPassword.length).toBeGreaterThanOrEqual(12);
  });

  it('should validate email format', async () => {
    const invalidData = {
      email: 'not-an-email',
      name: 'John Doe',
      role: 'student',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(invalidData);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should validate role enum', async () => {
    const invalidData = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'invalid-role',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(invalidData);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should validate password minimum length', async () => {
    const invalidData = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'student',
      password: 'short',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(invalidData);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should reject request from non-admin user', async () => {
    (requireAuth as jest.Mock).mockResolvedValue({
      id: 'user-123',
      user_metadata: { role: 'student' },
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Unauthorized');
  });

  it('should handle Supabase Auth errors', async () => {
    const validData = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'student',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(validData);

    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: null,
      error: { message: 'Email already exists' },
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email already exists');
  });

  it('should create user with all valid roles', async () => {
    const roles = ['student', 'teacher', 'admin', 'super_admin'];

    for (const role of roles) {
      const validData = {
        email: `${role}@example.com`,
        name: 'Test User',
        role,
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(validData);

      (db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{
          id: 'user-id',
          ...validData,
          tenant_id: 'tenant-123',
        }]),
      });

      const response = await POST(mockRequest as NextRequest);
      expect(response.status).toBe(200);
    }
  });

  it('should set user metadata in Supabase Auth', async () => {
    const validData = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'teacher',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(validData);

    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'user-id',
        ...validData,
        tenant_id: 'tenant-123',
      }]),
    });

    await POST(mockRequest as NextRequest);

    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          name: validData.name,
          role: validData.role,
          tenant_id: 'tenant-123',
        }),
      })
    );
  });

  it('should confirm email automatically', async () => {
    const validData = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'student',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(validData);

    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'user-id',
        ...validData,
        tenant_id: 'tenant-123',
      }]),
    });

    await POST(mockRequest as NextRequest);

    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email_confirm: true,
      })
    );
  });

  it('should handle database insertion errors', async () => {
    const validData = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'student',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(validData);

    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should validate status enum', async () => {
    const invalidData = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'student',
      status: 'invalid-status',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(invalidData);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should default status to active when not provided', async () => {
    const dataWithoutStatus = {
      email: 'test@example.com',
      name: 'John Doe',
      role: 'student',
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(dataWithoutStatus);

    (db.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'user-id',
        ...dataWithoutStatus,
        status: 'active',
        tenant_id: 'tenant-123',
      }]),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.status).toBe('active');
  });
});
