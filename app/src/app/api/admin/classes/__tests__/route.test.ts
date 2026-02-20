// @ts-nocheck
/**
 * Unit Tests for Admin Classes API Routes
 * Tests POST /api/admin/classes - Create class
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { db } from '@/db';
import { requireAuth, getTenantId } from '@/lib/auth/utils';

// Mock dependencies
jest.mock('@/db');
jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn(),
  getTenantId: jest.fn(),
}));

describe('POST /api/admin/classes', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      json: jest.fn() as unknown,
    };

    // Mock auth functions
    (requireAuth as any).mockResolvedValue({
      id: 'user-123',
      user_metadata: { role: 'admin' },
    });

    (getTenantId as any).mockResolvedValue('tenant-123');
  });

  it('should create a class with valid data', async () => {
    const validData = {
      name: 'General English - Beginner Morning',
      code: 'GEN-B101',
      level: 'Beginner',
      subject: 'General English',
      capacity: 20,
      teacher_id: '123e4567-e89b-12d3-a456-426614174000',
      schedule_description: 'Mon/Wed/Fri 09:00-11:00',
      start_date: '2025-02-01',
      end_date: '2025-05-01',
    };

    (mockRequest.json as any).mockResolvedValue(validData);

    const mockInsertedClass = {
      id: 'class-123',
      tenant_id: 'tenant-123',
      ...validData,
      enrolled_count: 0,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    (db.insert as any).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: (jest.fn() as unknown).mockResolvedValue([mockInsertedClass]),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.class).toHaveProperty('id');
    expect(data.class.name).toBe(validData.name);
  });

  it('should auto-generate class code when not provided', async () => {
    const dataWithoutCode = {
      name: 'General English - Beginner Morning',
      level: 'Beginner',
      subject: 'General English',
      capacity: 20,
      schedule_description: 'Mon/Wed/Fri 09:00-11:00',
      start_date: '2025-02-01',
    };

    (mockRequest.json as any).mockResolvedValue(dataWithoutCode);

    const mockInsertedClass = {
      id: 'class-123',
      tenant_id: 'tenant-123',
      code: 'GEN-B9XY', // Auto-generated
      ...dataWithoutCode,
      enrolled_count: 0,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    (db.insert as any).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: (jest.fn() as unknown).mockResolvedValue([mockInsertedClass]),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.class.code).toMatch(/^[A-Z]{3}-[A-Z0-9]+$/);
  });

  it('should reject request without authentication', async () => {
    (requireAuth as any).mockRejectedValue(new Error('Unauthorized'));

    const response = await POST(mockRequest as NextRequest);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('should reject request from non-admin user', async () => {
    (requireAuth as any).mockResolvedValue({
      id: 'user-123',
      user_metadata: { role: 'student' },
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Unauthorized');
  });

  it('should reject request without tenant', async () => {
    (getTenantId as any).mockResolvedValue(null);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Tenant not found');
  });

  it('should validate required fields', async () => {
    const invalidData = {
      // Missing required fields
      capacity: 20,
    };

    (mockRequest.json as any).mockResolvedValue(invalidData);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should validate capacity is positive', async () => {
    const invalidData = {
      name: 'Test Class',
      level: 'Beginner',
      subject: 'General English',
      capacity: 0, // Invalid
      schedule_description: 'Mon 09:00',
      start_date: '2025-02-01',
    };

    (mockRequest.json as any).mockResolvedValue(invalidData);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should validate teacher_id is UUID', async () => {
    const invalidData = {
      name: 'Test Class',
      level: 'Beginner',
      subject: 'General English',
      capacity: 20,
      teacher_id: 'not-a-uuid',
      schedule_description: 'Mon 09:00',
      start_date: '2025-02-01',
    };

    (mockRequest.json as any).mockResolvedValue(invalidData);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should handle database errors gracefully', async () => {
    const validData = {
      name: 'Test Class',
      level: 'Beginner',
      subject: 'General English',
      capacity: 20,
      schedule_description: 'Mon 09:00',
      start_date: '2025-02-01',
    };

    (mockRequest.json as any).mockResolvedValue(validData);

    (db.insert as any).mockReturnValue({
      values: (jest.fn() as unknown).mockReturnThis(),
      returning: (jest.fn() as unknown).mockRejectedValue(new Error('Database error')),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it('should allow admin_* roles', async () => {
    (requireAuth as any).mockResolvedValue({
      id: 'user-123',
      user_metadata: { role: 'admin_academic' },
    });

    const validData = {
      name: 'Test Class',
      level: 'Beginner',
      subject: 'General English',
      capacity: 20,
      schedule_description: 'Mon 09:00',
      start_date: '2025-02-01',
    };

    (mockRequest.json as any).mockResolvedValue(validData);

    (db.insert as any).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: (jest.fn() as unknown).mockResolvedValue([{ id: 'class-123', ...validData }]),
    });

    const response = await POST(mockRequest as NextRequest);

    expect(response.status).toBe(200);
  });

  it('should allow super_admin role', async () => {
    (requireAuth as any).mockResolvedValue({
      id: 'user-123',
      user_metadata: { role: 'super_admin' },
    });

    const validData = {
      name: 'Test Class',
      level: 'Beginner',
      subject: 'General English',
      capacity: 20,
      schedule_description: 'Mon 09:00',
      start_date: '2025-02-01',
    };

    (mockRequest.json as any).mockResolvedValue(validData);

    (db.insert as any).mockReturnValue({
      values: jest.fn().mockReturnThis(),
      returning: (jest.fn() as unknown).mockResolvedValue([{ id: 'class-123', ...validData }]),
    });

    const response = await POST(mockRequest as NextRequest);

    expect(response.status).toBe(200);
  });
});
