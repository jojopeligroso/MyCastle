// @ts-nocheck
/**
 * Unit tests for Courses Management APIs
 * Tests: GET, POST, PATCH, DELETE operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Type helper for mocks
type MockFn = jest.Mock<any>;

// Mock dependencies
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    id: 'admin-user-id',
    user_metadata: { role: 'admin' },
  }),
  getTenantId: jest.fn().mockResolvedValue('tenant-123'),
}));

describe('Courses Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  // Helper to create mock select chain
  const mockSelectChain = (resolvedValue: any[] = []) => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(resolvedValue),
    limit: jest.fn().mockReturnThis(),
    $dynamic: jest.fn().mockReturnThis(),
  });

  // Helper to create mock insert chain
  const mockInsertChain = (resolvedValue: any = { id: 'new-course-id', name: 'Test Course', code: 'B1-TES' }) => ({
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([resolvedValue]),
  });

  // Helper to create mock update chain
  const mockUpdateChain = (resolvedValue: any = { id: 'course-id', updated_at: new Date().toISOString() }) => ({
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([resolvedValue]),
  });

  describe('GET /api/admin/courses', () => {
    it('should return list of courses', async () => {
      const { db } = await import('@/db');
      const mockCourses = [
        { id: 'course-1', name: 'General English', code: 'GEN-001', level: 'B1' },
        { id: 'course-2', name: 'Business English', code: 'BUS-001', level: 'B2' },
      ];
      (db.select as MockFn).mockReturnValueOnce(mockSelectChain(mockCourses));

      const { GET } = await import('../route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('courses');
      expect(data.courses).toBeInstanceOf(Array);
    });

    it('should filter courses by level', async () => {
      const { db } = await import('@/db');
      (db.select as MockFn).mockReturnValueOnce(mockSelectChain([]));

      const { GET } = await import('../route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses?level=B1');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as MockFn).mockRejectedValueOnce(new Error('Unauthorized'));

      const { GET } = await import('../route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      (db.select as MockFn).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        $dynamic: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const { GET } = await import('../route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });
  });

  describe('POST /api/admin/courses', () => {
    it('should create a new course with valid data', async () => {
      const { db } = await import('@/db');
      const newCourse = {
        id: 'new-course-id',
        name: 'General English',
        code: 'B1-GEN',
        level: 'B1',
        status: 'active',
      };
      (db.insert as MockFn).mockReturnValueOnce(mockInsertChain(newCourse));

      const { POST } = await import('../route');
      const courseData = {
        name: 'General English',
        level: 'B1',
        description: 'Learn English fundamentals',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('General English');
    });

    it('should auto-generate course code', async () => {
      const { db } = await import('@/db');
      const newCourse = {
        id: 'new-id',
        name: 'Test Course',
        code: 'B1-TES',
        level: 'B1',
      };
      (db.insert as MockFn).mockReturnValueOnce(mockInsertChain(newCourse));

      const { POST } = await import('../route');
      const courseData = {
        name: 'Test Course',
        level: 'B1',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('code');
    });

    it('should validate required fields', async () => {
      const { POST } = await import('../route');
      const invalidData = {
        // Missing name
        level: 'B1',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should handle database errors', async () => {
      const { db } = await import('@/db');
      (db.insert as MockFn).mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Insert failed')),
      });

      const { POST } = await import('../route');
      const courseData = {
        name: 'Test Course',
        level: 'B1',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to create');
    });
  });

  describe('GET /api/admin/courses/[id]', () => {
    it('should return course detail', async () => {
      const { db } = await import('@/db');
      const mockCourse = {
        id: 'course-123',
        name: 'General English',
        code: 'GEN-001',
        level: 'B1',
      };
      (db.select as MockFn).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockCourse]),
      });

      const { GET } = await import('../[id]/route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses/course-123');
      const mockParams = { params: Promise.resolve({ id: 'course-123' }) };

      const response = await GET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
    });

    it('should return 404 for non-existent course', async () => {
      const { db } = await import('@/db');
      (db.select as MockFn).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const { GET } = await import('../[id]/route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses/non-existent');
      const mockParams = { params: Promise.resolve({ id: 'non-existent' }) };

      const response = await GET(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('PATCH /api/admin/courses/[id]', () => {
    it('should update course information', async () => {
      const { db } = await import('@/db');
      const updatedCourse = {
        id: 'course-123',
        name: 'Updated Course',
        updated_at: new Date().toISOString(),
      };
      (db.update as MockFn).mockReturnValueOnce(mockUpdateChain(updatedCourse));

      const { PATCH } = await import('../[id]/route');
      const updateData = {
        description: 'Updated description',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses/course-123', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: Promise.resolve({ id: 'course-123' }) };

      const response = await PATCH(mockRequest, mockParams);

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/admin/courses/[id]', () => {
    it('should soft delete a course', async () => {
      const { db } = await import('@/db');
      const deletedCourse = {
        id: 'course-123',
        status: 'deleted',
      };
      (db.update as MockFn).mockReturnValueOnce(mockUpdateChain(deletedCourse));

      const { DELETE } = await import('../[id]/route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses/course-123', {
        method: 'DELETE',
      });
      const mockParams = { params: Promise.resolve({ id: 'course-123' }) };

      const response = await DELETE(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when deleting non-existent course', async () => {
      const { db } = await import('@/db');
      (db.update as MockFn).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      });

      const { DELETE } = await import('../[id]/route');
      const mockRequest = new NextRequest('http://localhost/api/admin/courses/non-existent', {
        method: 'DELETE',
      });
      const mockParams = { params: Promise.resolve({ id: 'non-existent' }) };

      const response = await DELETE(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });
});
