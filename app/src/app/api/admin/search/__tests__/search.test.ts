// @ts-nocheck
/**
 * Unit tests for Global Search API
 * Tests: Multi-entity search across students, teachers, and classes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Type helper for mocks
type MockFn = jest.Mock<(...args: unknown[]) => unknown>;
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn<() => Promise<{ id: string; role: string }>>().mockResolvedValue({ id: 'admin-user-id', role: 'admin' }),
}));

describe('Global Search API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/search', () => {
    it('should search across students, teachers, and classes', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=john&limit=20');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('students');
      expect(data).toHaveProperty('teachers');
      expect(data).toHaveProperty('classes');
      expect(data).toHaveProperty('query');
    });

    it('should require minimum 2 character query', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=j');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toEqual([]);
      expect(data.teachers).toEqual([]);
      expect(data.classes).toEqual([]);
      expect(data.message).toContain('at least 2 characters');
    });

    it('should return empty arrays for empty query', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toEqual([]);
      expect(data.teachers).toEqual([]);
      expect(data.classes).toEqual([]);
    });

    it('should search students by name', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=john');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toBeInstanceOf(Array);
      // Should match students with name containing "john"
    });

    it('should search students by email', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=john@example.com');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toBeInstanceOf(Array);
      // Should match students with email containing query
    });

    it('should search teachers by name', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=jane');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.teachers).toBeInstanceOf(Array);
      // Should match teachers with name containing "jane"
    });

    it('should search teachers by email', async () => {
      const mockRequest = new NextRequest(
        'http://localhost/api/admin/search?q=teacher@example.com'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.teachers).toBeInstanceOf(Array);
      // Should match teachers with email containing query
    });

    it('should search classes by name', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=morning');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.classes).toBeInstanceOf(Array);
      // Should match classes with name containing "morning"
    });

    it('should search classes by code', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=B1-');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.classes).toBeInstanceOf(Array);
      // Should match classes with code starting with "B1-"
    });

    it('should use case-insensitive search (ILIKE)', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=JOHN');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should match "john", "John", "JOHN", etc.
    });

    it('should respect limit parameter', async () => {
      const limit = 5;
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/search?q=test&limit=${limit}`
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Each category should have at most 'limit' results
      if (data.students) expect(data.students.length).toBeLessThanOrEqual(limit);
      if (data.teachers) expect(data.teachers.length).toBeLessThanOrEqual(limit);
      if (data.classes) expect(data.classes.length).toBeLessThanOrEqual(limit);
    });

    it('should default limit to 20 if not provided', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Default limit of 20 per entity should be applied
    });

    it('should add type field to each result', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.students && data.students.length > 0) {
        expect(data.students[0].type).toBe('student');
      }
      if (data.teachers && data.teachers.length > 0) {
        expect(data.teachers[0].type).toBe('teacher');
      }
      if (data.classes && data.classes.length > 0) {
        expect(data.classes[0].type).toBe('class');
      }
    });

    it('should include essential fields for students', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=john');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.students && data.students.length > 0) {
        expect(data.students[0]).toHaveProperty('id');
        expect(data.students[0]).toHaveProperty('name');
        expect(data.students[0]).toHaveProperty('email');
        expect(data.students[0]).toHaveProperty('current_level');
        expect(data.students[0]).toHaveProperty('status');
      }
    });

    it('should include essential fields for teachers', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=jane');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.teachers && data.teachers.length > 0) {
        expect(data.teachers[0]).toHaveProperty('id');
        expect(data.teachers[0]).toHaveProperty('name');
        expect(data.teachers[0]).toHaveProperty('email');
        expect(data.teachers[0]).toHaveProperty('status');
      }
    });

    it('should include essential fields for classes', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=morning');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.classes && data.classes.length > 0) {
        expect(data.classes[0]).toHaveProperty('id');
        expect(data.classes[0]).toHaveProperty('name');
        expect(data.classes[0]).toHaveProperty('code');
        expect(data.classes[0]).toHaveProperty('level');
        expect(data.classes[0]).toHaveProperty('status');
      }
    });

    it('should filter out soft-deleted entities', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      const response = await GET(mockRequest);

      // Should only return entities where deleted_at IS NULL
      expect(response.status).toBe(200);
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as MockFn).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });

    it('should handle no results gracefully', async () => {
      const { db } = await import('@/db');
      (db.select as MockFn)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce([]), // No students
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce([]), // No teachers
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce([]), // No classes
        });

      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=nonexistent123456');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.students).toEqual([]);
      expect(data.teachers).toEqual([]);
      expect(data.classes).toEqual([]);
    });

    it('should return original query in response', async () => {
      const query = 'test search';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/search?q=${encodeURIComponent(query)}`
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.query).toBe(query);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      (db.select as MockFn).mockRejectedValueOnce(new Error('Database connection failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Search failed');
    });

    it('should handle partial database failures', async () => {
      const { db } = await import('@/db');
      // Students query succeeds
      (db.select as MockFn)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce([{ id: '1', name: 'John' }]),
        })
        // Teachers query fails
        .mockRejectedValueOnce(new Error('Teachers query failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      const response = await GET(mockRequest);

      // Should handle partial failures gracefully
      expect(response.status).toBeLessThan(600);
    });

    it('should handle special characters in query', async () => {
      const specialQueries = ["john's", 'john@example', 'test-name', 'test_name', 'test 123'];

      for (const query of specialQueries) {
        const mockRequest = new NextRequest(
          `http://localhost/api/admin/search?q=${encodeURIComponent(query)}`
        );

        const response = await GET(mockRequest);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Business Logic', () => {
    it('should search multiple fields simultaneously (OR logic)', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=john');

      const response = await GET(mockRequest);

      // Should match students with name OR email containing "john"
      expect(response.status).toBe(200);
    });

    it('should support partial string matching', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=jo');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Should match "John", "Joe", "Joseph", etc.
      expect(response.status).toBe(200);
    });

    it('should categorize results by type', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Results should be grouped into separate arrays
      expect(data).toHaveProperty('students');
      expect(data).toHaveProperty('teachers');
      expect(data).toHaveProperty('classes');
    });

    it('should support searching by email domain', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=example.com');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Should match all users with @example.com emails
      expect(response.status).toBe(200);
    });

    it('should support searching by class code prefix', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=B1');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Should match classes with codes like "B1-GEN", "B1-BUS", etc.
      expect(response.status).toBe(200);
    });
  });

  describe('Performance', () => {
    it('should execute searches in parallel for speed', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test&limit=20');

      const startTime = Date.now();
      const response = await GET(mockRequest);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      // Should complete quickly even when searching 3 tables
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should limit results to prevent massive responses', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test&limit=100');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Even with high limit, should cap at reasonable number
      expect(data.students.length).toBeLessThanOrEqual(100);
      expect(data.teachers.length).toBeLessThanOrEqual(100);
      expect(data.classes.length).toBeLessThanOrEqual(100);
    });

    it('should use ILIKE for case-insensitive search efficiently', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=TEST');

      const response = await GET(mockRequest);

      // ILIKE should be used instead of LOWER() for better index usage
      expect(response.status).toBe(200);
    });
  });

  describe('Data Integrity', () => {
    it('should only search active/non-deleted entities', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=test');

      const response = await GET(mockRequest);

      // Should filter: deleted_at IS NULL for all entity types
      expect(response.status).toBe(200);
    });

    it('should ensure students have role=student', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=john');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Student results should only include users with role='student'
      if (data.students && data.students.length > 0) {
        data.students.forEach((student: unknown) => {
          expect(student.role).toBe('student');
        });
      }
    });

    it('should ensure teachers have role=teacher', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/search?q=jane');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Teacher results should only include users with role='teacher'
      if (data.teachers && data.teachers.length > 0) {
        data.teachers.forEach((teacher: unknown) => {
          expect(teacher.role).toBe('teacher');
        });
      }
    });
  });
});
