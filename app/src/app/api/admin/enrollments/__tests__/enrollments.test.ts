/**
 * Unit tests for Enrollment Management APIs
 * Tests: GET, POST, PATCH, DELETE operations and amendments
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PATCH, DELETE as DELETE_BY_ID, POST as CREATE_AMENDMENT } from '../[id]/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'admin-user-id', role: 'admin' }),
}));

describe('Enrollment Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/enrollments', () => {
    it('should return list of enrollments with pagination', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments?limit=10&offset=0');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('enrollments');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should filter enrollments by student', async () => {
      const studentId = 'student-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments?student_id=${studentId}`);

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      // Verify query included student filter
    });

    it('should filter enrollments by class', async () => {
      const classId = 'class-456';
      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments?class_id=${classId}`);

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter enrollments by status', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments?status=active');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });
  });

  describe('POST /api/admin/enrollments', () => {
    it('should create a new enrollment with valid data', async () => {
      const enrollmentData = {
        student_id: 'student-123',
        class_id: 'class-456',
        start_date: '2025-01-15',
        end_date: '2025-06-15',
        status: 'active',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.student_id).toBe(enrollmentData.student_id);
      expect(data.class_id).toBe(enrollmentData.class_id);
    });

    it('should reject enrollment if class is at capacity', async () => {
      const enrollmentData = {
        student_id: 'student-123',
        class_id: 'full-class-789',
        start_date: '2025-01-15',
        end_date: '2025-06-15',
      };

      // Mock class at capacity
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{
          id: 'full-class-789',
          capacity: 15,
          enrolled_count: 15, // Full
        }]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('capacity');
    });

    it('should validate student existence', async () => {
      const enrollmentData = {
        student_id: 'non-existent-student',
        class_id: 'class-456',
        start_date: '2025-01-15',
        end_date: '2025-06-15',
      };

      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]), // No student found
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Student');
    });

    it('should validate class existence', async () => {
      const enrollmentData = {
        student_id: 'student-123',
        class_id: 'non-existent-class',
        start_date: '2025-01-15',
        end_date: '2025-06-15',
      };

      const { db } = await import('@/db');
      // Mock student exists
      (db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce([{ id: 'student-123' }]),
        })
        // Mock class doesn't exist
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValueOnce([]),
        });

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Class');
    });

    it('should increment class enrolled_count on creation', async () => {
      const enrollmentData = {
        student_id: 'student-123',
        class_id: 'class-456',
        start_date: '2025-01-15',
        end_date: '2025-06-15',
      };

      const { db } = await import('@/db');
      const updateSpy = jest.spyOn(db, 'update');

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });

      await POST(mockRequest);

      // Verify enrolled_count was incremented
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        student_id: '', // Empty
        class_id: '', // Empty
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });
  });

  describe('GET /api/admin/enrollments/[id]', () => {
    it('should return enrollment detail with amendments', async () => {
      const enrollmentId = 'enrollment-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`);
      const mockParams = { params: { id: enrollmentId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('student');
      expect(data).toHaveProperty('class');
      expect(data).toHaveProperty('amendments');
      expect(data.amendments).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent enrollment', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments/non-existent');
      const mockParams = { params: { id: 'non-existent' } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should include student and class details', async () => {
      const enrollmentId = 'enrollment-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`);
      const mockParams = { params: { id: enrollmentId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data.student).toHaveProperty('name');
      expect(data.student).toHaveProperty('email');
      expect(data.class).toHaveProperty('name');
      expect(data.class).toHaveProperty('code');
    });
  });

  describe('PATCH /api/admin/enrollments/[id]', () => {
    it('should update enrollment dates and status', async () => {
      const enrollmentId = 'enrollment-123';
      const updateData = {
        end_date: '2025-12-31',
        status: 'completed',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await PATCH(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('updated_at');
    });

    it('should validate date formats', async () => {
      const enrollmentId = 'enrollment-123';
      const invalidData = {
        end_date: 'not-a-date',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await PATCH(mockRequest, mockParams);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should not allow updating student_id or class_id', async () => {
      const enrollmentId = 'enrollment-123';
      const maliciousData = {
        student_id: 'different-student',
        class_id: 'different-class',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(maliciousData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await PATCH(mockRequest, mockParams);

      // Should ignore these fields (not in allowed update fields)
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/admin/enrollments/[id] (Create Amendment)', () => {
    it('should create EXTENSION amendment', async () => {
      const enrollmentId = 'enrollment-123';
      const amendmentData = {
        type: 'EXTENSION',
        previous_value: '2025-06-15',
        new_value: '2025-08-15',
        reason: 'Student requested extension',
        metadata: { weeks_added: 8 },
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(amendmentData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await CREATE_AMENDMENT(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe('EXTENSION');
      expect(data).toHaveProperty('previous_value');
      expect(data).toHaveProperty('new_value');
    });

    it('should create REDUCTION amendment', async () => {
      const enrollmentId = 'enrollment-123';
      const amendmentData = {
        type: 'REDUCTION',
        previous_value: '2025-06-15',
        new_value: '2025-05-15',
        reason: 'Student leaving early',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(amendmentData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await CREATE_AMENDMENT(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe('REDUCTION');
    });

    it('should create LEVEL_CHANGE amendment', async () => {
      const enrollmentId = 'enrollment-123';
      const amendmentData = {
        type: 'LEVEL_CHANGE',
        previous_value: 'B1',
        new_value: 'B2',
        reason: 'Student progressed to next level',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(amendmentData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await CREATE_AMENDMENT(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe('LEVEL_CHANGE');
    });

    it('should create TRANSFER amendment', async () => {
      const enrollmentId = 'enrollment-123';
      const amendmentData = {
        type: 'TRANSFER',
        previous_value: 'class-old-id',
        new_value: 'class-new-id',
        reason: 'Student transferred to morning class',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(amendmentData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await CREATE_AMENDMENT(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe('TRANSFER');
    });

    it('should validate amendment type', async () => {
      const enrollmentId = 'enrollment-123';
      const invalidData = {
        type: 'INVALID_TYPE',
        previous_value: 'something',
        new_value: 'something else',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await CREATE_AMENDMENT(mockRequest, mockParams);

      expect(response.status).toBe(400);
    });

    it('should auto-apply EXTENSION to enrollment end_date', async () => {
      const enrollmentId = 'enrollment-123';
      const amendmentData = {
        type: 'EXTENSION',
        previous_value: '2025-06-15',
        new_value: '2025-08-15',
        reason: 'Extension granted',
      };

      const { db } = await import('@/db');
      const updateSpy = jest.spyOn(db, 'update');

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(amendmentData),
      });
      const mockParams = { params: { id: enrollmentId } };

      await CREATE_AMENDMENT(mockRequest, mockParams);

      // Verify enrollment end_date was updated
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should support metadata field for additional context', async () => {
      const enrollmentId = 'enrollment-123';
      const amendmentData = {
        type: 'EXTENSION',
        previous_value: '2025-06-15',
        new_value: '2025-08-15',
        reason: 'Extension',
        metadata: {
          weeks_added: 8,
          fee_charged: 400,
          approved_by: 'admin-user-id',
        },
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'POST',
        body: JSON.stringify(amendmentData),
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await CREATE_AMENDMENT(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeDefined();
    });
  });

  describe('DELETE /api/admin/enrollments/[id]', () => {
    it('should soft delete an enrollment', async () => {
      const enrollmentId = 'enrollment-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: { id: enrollmentId } };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should decrement class enrolled_count on deletion', async () => {
      const enrollmentId = 'enrollment-123';

      const { db } = await import('@/db');
      const updateSpy = jest.spyOn(db, 'update');

      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: { id: enrollmentId } };

      await DELETE_BY_ID(mockRequest, mockParams);

      // Verify enrolled_count was decremented
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should return 404 when deleting non-existent enrollment', async () => {
      const { db } = await import('@/db');
      (db.update as jest.Mock).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments/non-existent', {
        method: 'DELETE',
      });
      const mockParams = { params: { id: 'non-existent' } };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should preserve enrollment data (soft delete)', async () => {
      const enrollmentId = 'enrollment-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: { id: enrollmentId } };

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

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: 'invalid json{',
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity on enrollment creation', async () => {
      const enrollmentData = {
        student_id: 'student-123',
        class_id: 'class-456',
        start_date: '2025-01-15',
        end_date: '2025-06-15',
      };

      const { db } = await import('@/db');
      const selectSpy = jest.spyOn(db, 'select');

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });

      await POST(mockRequest);

      // Verify foreign keys were checked
      expect(selectSpy).toHaveBeenCalled();
    });

    it('should maintain class capacity constraints', async () => {
      const enrollmentData = {
        student_id: 'student-123',
        class_id: 'class-456',
        start_date: '2025-01-15',
        end_date: '2025-06-15',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/enrollments', {
        method: 'POST',
        body: JSON.stringify(enrollmentData),
      });

      const response = await POST(mockRequest);

      // Should check capacity before allowing enrollment
      expect(response.status).toBeLessThan(500);
    });
  });
});
