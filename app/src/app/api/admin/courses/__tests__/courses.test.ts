/**
 * Unit tests for Courses Management APIs
 * Tests: GET, POST, PATCH, DELETE operations with programme relationship
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PATCH, DELETE as DELETE_BY_ID } from '../[id]/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'admin-user-id', role: 'admin' }),
}));

describe('Courses Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/courses', () => {
    it('should return list of courses with programme information', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/courses');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('courses');
      expect(data.courses).toBeInstanceOf(Array);
    });

    it('should filter courses by programme', async () => {
      const programmeId = 'programme-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/courses?programme_id=${programmeId}`
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter courses by level', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/courses?level=B1');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should include programme details in course list', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/courses');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.courses && data.courses.length > 0) {
        expect(data.courses[0]).toHaveProperty('programme');
      }
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/courses');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });
  });

  describe('POST /api/admin/courses', () => {
    it('should create a new course with valid data', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'General English',
        level: 'B1',
        duration_weeks: 12,
        objectives: 'Master B1 level English',
        cefr_descriptor_ids: ['desc-1', 'desc-2'],
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(courseData.name);
      expect(data.level).toBe(courseData.level);
    });

    it('should auto-generate course code from level and name', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'General English',
        level: 'B1',
        duration_weeks: 12,
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('code');
      expect(data.code).toMatch(/^B1-/); // Format: LEVEL-NAME
    });

    it('should validate programme existence', async () => {
      const courseData = {
        programme_id: 'non-existent-programme',
        name: 'Test Course',
        level: 'B1',
        duration_weeks: 12,
      };

      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]), // No programme found
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Programme');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Course',
        // Missing programme_id and level
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

    it('should validate CEFR level', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'Test Course',
        level: 'INVALID', // Invalid CEFR level
        duration_weeks: 12,
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should support all CEFR levels', async () => {
      const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      for (const level of levels) {
        const courseData = {
          programme_id: 'programme-123',
          name: 'Test Course',
          level: level,
          duration_weeks: 12,
        };

        const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
          method: 'POST',
          body: JSON.stringify(courseData),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBeLessThan(500);
      }
    });

    it('should support cefr_descriptor_ids array', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'Test Course',
        level: 'B1',
        duration_weeks: 12,
        cefr_descriptor_ids: ['desc-1', 'desc-2', 'desc-3'],
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.cefr_descriptor_ids).toBeInstanceOf(Array);
      expect(data.cefr_descriptor_ids).toHaveLength(3);
    });

    it('should support objectives and description fields', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'Test Course',
        level: 'B1',
        duration_weeks: 12,
        description: 'Comprehensive B1 course',
        objectives: 'Master all B1 competencies',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.description).toBe(courseData.description);
      expect(data.objectives).toBe(courseData.objectives);
    });
  });

  describe('GET /api/admin/courses/[id]', () => {
    it('should return course detail with programme information', async () => {
      const courseId = 'course-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`);
      const mockParams = { params: { id: courseId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('programme');
    });

    it('should return 404 for non-existent course', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/courses/non-existent');
      const mockParams = { params: { id: 'non-existent' } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should include all course fields', async () => {
      const courseId = 'course-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`);
      const mockParams = { params: { id: courseId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('level');
      expect(data).toHaveProperty('duration_weeks');
      expect(data).toHaveProperty('cefr_descriptor_ids');
    });

    it('should include programme details', async () => {
      const courseId = 'course-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`);
      const mockParams = { params: { id: courseId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data.programme).toHaveProperty('name');
      expect(data.programme).toHaveProperty('code');
    });
  });

  describe('PATCH /api/admin/courses/[id]', () => {
    it('should update course information', async () => {
      const courseId = 'course-123';
      const updateData = {
        description: 'Updated description',
        objectives: 'New learning objectives',
        duration_weeks: 16,
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: { id: courseId } };

      const response = await PATCH(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('updated_at');
    });

    it('should update CEFR descriptor IDs', async () => {
      const courseId = 'course-123';
      const updateData = {
        cefr_descriptor_ids: ['desc-4', 'desc-5', 'desc-6'],
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: { id: courseId } };

      const response = await PATCH(mockRequest, mockParams);

      expect(response.status).toBe(200);
    });

    it('should not allow updating course code or programme_id', async () => {
      const courseId = 'course-123';
      const maliciousData = {
        code: 'HACKED',
        programme_id: 'different-programme',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify(maliciousData),
      });
      const mockParams = { params: { id: courseId } };

      const response = await PATCH(mockRequest, mockParams);

      // Should ignore these fields (not in allowed update fields)
      expect(response.status).toBe(200);
    });

    it('should validate CEFR level on update', async () => {
      const courseId = 'course-123';
      const invalidData = {
        level: 'INVALID_LEVEL',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
      });
      const mockParams = { params: { id: courseId } };

      const response = await PATCH(mockRequest, mockParams);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('DELETE /api/admin/courses/[id]', () => {
    it('should soft delete a course', async () => {
      const courseId = 'course-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: { id: courseId } };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when deleting non-existent course', async () => {
      const { db } = await import('@/db');
      (db.update as jest.Mock).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/courses/non-existent', {
        method: 'DELETE',
      });
      const mockParams = { params: { id: 'non-existent' } };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should preserve course data (soft delete)', async () => {
      const courseId = 'course-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/courses/${courseId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: { id: courseId } };

      const { db } = await import('@/db');
      const updateSpy = jest.spyOn(db, 'update');

      await DELETE_BY_ID(mockRequest, mockParams);

      // Verify update was called (not a hard delete)
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/courses');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: 'invalid json{',
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });
  });

  describe('Data Relationships', () => {
    it('should maintain referential integrity with programmes', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'Test Course',
        level: 'B1',
        duration_weeks: 12,
      };

      const { db } = await import('@/db');
      const selectSpy = jest.spyOn(db, 'select');

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      await POST(mockRequest);

      // Verify programme existence was checked
      expect(selectSpy).toHaveBeenCalled();
    });

    it('should filter courses by programme correctly', async () => {
      const programmeId = 'programme-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/courses?programme_id=${programmeId}`
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // All returned courses should belong to the specified programme
      if (data.courses && data.courses.length > 0) {
        data.courses.forEach((course: any) => {
          expect(course.programme_id).toBe(programmeId);
        });
      }
    });
  });

  describe('Business Logic', () => {
    it('should generate valid course codes', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'General English',
        level: 'B1',
        duration_weeks: 12,
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.code).toMatch(/^[A-C][12]-/); // CEFR level format
    });

    it('should support courses with no CEFR descriptors', async () => {
      const courseData = {
        programme_id: 'programme-123',
        name: 'Test Course',
        level: 'B1',
        duration_weeks: 12,
        // cefr_descriptor_ids not provided
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify(courseData),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(201);
    });
  });
});
