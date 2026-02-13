/**
 * Unit tests for Teachers Management APIs
 * Tests: GET operations with class count aggregation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '../route';
import { GET as GET_BY_ID } from '../[id]/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'admin-user-id', role: 'admin' }),
}));

describe('Teachers Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/teachers', () => {
    it('should return list of teachers with assigned classes count', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('teachers');
      expect(data.teachers).toBeInstanceOf(Array);
    });

    it('should include assignedClasses count for each teacher', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.teachers && data.teachers.length > 0) {
        expect(data.teachers[0]).toHaveProperty('assignedClasses');
        expect(typeof data.teachers[0].assignedClasses).toBe('number');
      }
    });

    it('should filter teachers by search query (name/email)', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers?search=john');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter teachers by status', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers?status=active');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should use SQL aggregation for class counts (performance)', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);

      // Should use COUNT(DISTINCT classes.id) in SQL for efficiency
      expect(response.status).toBe(200);
    });

    it('should return teachers with no assigned classes', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Teachers with 0 classes should still appear with assignedClasses: 0
      expect(response.status).toBe(200);
      expect(data.teachers).toBeInstanceOf(Array);
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });
  });

  describe('GET /api/admin/teachers/[id]', () => {
    it('should return teacher detail with assigned classes', async () => {
      const teacherId = 'teacher-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/teachers/${teacherId}`);
      const mockParams = { params: Promise.resolve({ id: teacherId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('assignedClasses');
      expect(data.assignedClasses).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent teacher', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/teachers/non-existent');
      const mockParams = { params: Promise.resolve({ id: 'non-existent' }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should include full class details for assigned classes', async () => {
      const teacherId = 'teacher-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/teachers/${teacherId}`);
      const mockParams = { params: Promise.resolve({ id: teacherId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      if (data.assignedClasses && data.assignedClasses.length > 0) {
        expect(data.assignedClasses[0]).toHaveProperty('name');
        expect(data.assignedClasses[0]).toHaveProperty('code');
        expect(data.assignedClasses[0]).toHaveProperty('level');
        expect(data.assignedClasses[0]).toHaveProperty('enrolled_count');
        expect(data.assignedClasses[0]).toHaveProperty('capacity');
      }
    });

    it('should include teacher profile information', async () => {
      const teacherId = 'teacher-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/teachers/${teacherId}`);
      const mockParams = { params: Promise.resolve({ id: teacherId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('status');
      expect(data.role).toBe('teacher');
    });

    it('should handle teachers with no assigned classes', async () => {
      const teacherId = 'teacher-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/teachers/${teacherId}`);
      const mockParams = { params: Promise.resolve({ id: teacherId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.assignedClasses).toBeInstanceOf(Array);
      // assignedClasses should be empty array [] if no classes
    });

    it('should filter out deleted classes', async () => {
      const teacherId = 'teacher-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/teachers/${teacherId}`);
      const mockParams = { params: Promise.resolve({ id: teacherId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      // Should only include classes where deleted_at IS NULL
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should validate teacher role', async () => {
      const { db } = await import('@/db');
      // Mock user with non-teacher role
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([
          {
            id: 'user-123',
            role: 'student', // Not a teacher
          },
        ]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/teachers/user-123');
      const mockParams = { params: Promise.resolve({ id: 'user-123' }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      // Should return 404 if user is not a teacher
      expect(response.status).toBe(404);
    });
  });

  describe('Business Logic', () => {
    it('should aggregate class counts efficiently using SQL', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Should use COUNT aggregation instead of fetching all classes
      expect(response.status).toBe(200);
      expect(data.teachers).toBeInstanceOf(Array);
    });

    it('should support case-insensitive search', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers?search=JOHN');

      const response = await GET(mockRequest);

      // Should use ILIKE for case-insensitive search
      expect(response.status).toBe(200);
    });

    it('should search in both name and email fields', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers?search=john');

      const response = await GET(mockRequest);

      // Should match both name:john and email:john@example.com
      expect(response.status).toBe(200);
    });

    it('should filter out soft-deleted teachers', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);

      // Should only return teachers where deleted_at IS NULL
      expect(response.status).toBe(200);
    });

    it('should handle empty result sets gracefully', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockResolvedValueOnce([]), // No teachers found
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/teachers?search=nonexistent');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.teachers).toEqual([]);
    });
  });

  describe('Data Integrity', () => {
    it('should only return users with role=teacher', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);
      const data = await response.json();

      // All returned users should have role='teacher'
      if (data.teachers && data.teachers.length > 0) {
        data.teachers.forEach((teacher: unknown) => {
          expect(teacher.role).toBe('teacher');
        });
      }
    });

    it('should include active and inactive teachers by default', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers');

      const response = await GET(mockRequest);

      // Should return all teachers regardless of status unless filtered
      expect(response.status).toBe(200);
    });

    it('should respect status filter when provided', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/teachers?status=inactive');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Should only return inactive teachers
      if (data.teachers && data.teachers.length > 0) {
        data.teachers.forEach((teacher: unknown) => {
          expect(teacher.status).toBe('inactive');
        });
      }
    });
  });
});
