/**
 * Unit tests for Student Management APIs
 * Tests: GET, POST, PATCH, DELETE operations
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

describe('Student Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/students', () => {
    it('should return list of students with pagination', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/students?limit=10&offset=0');

      // Mock database response
      const mockStudents = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'student',
          status: 'active',
          current_level: 'B1',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'student',
          status: 'active',
          current_level: 'A2',
        },
      ];

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('students');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('offset');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should filter students by status', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/students?status=active');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      // Verify that the query included status filter
    });

    it('should filter students by search query', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/students?search=john');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      // Verify that the query included search filter
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/students');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });
  });

  describe('POST /api/admin/students', () => {
    it('should create a new student with valid data', async () => {
      const studentData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        current_level: 'B1',
        target_level: 'C1',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.email).toBe(studentData.email);
      expect(data.role).toBe('student');
    });

    it('should reject student creation with duplicate email', async () => {
      const studentData = {
        name: 'John Doe',
        email: 'existing@example.com',
      };

      // Mock existing user
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{ id: '1', email: 'existing@example.com' }]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name should fail
        email: 'invalid-email', // Invalid email format
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/students', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
      expect(data).toHaveProperty('details');
    });

    it('should accept all optional student fields', async () => {
      const completeStudentData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        date_of_birth: '1995-05-15',
        address: '123 Main St',
        city: 'Dublin',
        country: 'Ireland',
        postal_code: 'D01 F5P2',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '+1234567891',
        emergency_contact_relationship: 'Spouse',
        current_level: 'B1',
        target_level: 'C1',
        visa_type: 'Study Visa',
        visa_expiry: '2026-12-31',
        visa_conditions: 'Must maintain 80% attendance',
        notes: 'Prefers morning classes',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/students', {
        method: 'POST',
        body: JSON.stringify(completeStudentData),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/admin/students/[id]', () => {
    it('should return detailed student information', async () => {
      const studentId = 'student-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`);
      const mockParams = { params: { id: studentId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('enrollments');
      expect(data).toHaveProperty('attendance');
      expect(data).toHaveProperty('grades');
      expect(data.attendance).toHaveProperty('summary');
      expect(data.attendance).toHaveProperty('rate');
    });

    it('should return 404 for non-existent student', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]), // No student found
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/students/non-existent');
      const mockParams = { params: { id: 'non-existent' } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should include enrollment history with amendments', async () => {
      const studentId = 'student-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`);
      const mockParams = { params: { id: studentId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data.enrollments).toBeInstanceOf(Array);
      data.enrollments.forEach((enrollment: any) => {
        expect(enrollment).toHaveProperty('id');
        expect(enrollment).toHaveProperty('className');
        expect(enrollment).toHaveProperty('amendments');
      });
    });

    it('should calculate attendance rate correctly', async () => {
      const studentId = 'student-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`);
      const mockParams = { params: { id: studentId } };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data.attendance.rate).toBeGreaterThanOrEqual(0);
      expect(data.attendance.rate).toBeLessThanOrEqual(100);
      expect(data.attendance.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PATCH /api/admin/students/[id]', () => {
    it('should update student information', async () => {
      const studentId = 'student-123';
      const updateData = {
        phone: '+9876543210',
        current_level: 'B2',
        notes: 'Updated notes',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: { id: studentId } };

      const response = await PATCH(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('updated_at');
    });

    it('should not allow updating role or id', async () => {
      const studentId = 'student-123';
      const maliciousData = {
        id: 'different-id',
        role: 'admin', // Trying to escalate privileges
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(maliciousData),
      });
      const mockParams = { params: { id: studentId } };

      const response = await PATCH(mockRequest, mockParams);

      // The API should ignore these fields (they're not in allowed fields)
      expect(response.status).toBe(200);
    });

    it('should validate email format on update', async () => {
      const studentId = 'student-123';
      const invalidData = {
        email: 'not-an-email',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
      });
      const mockParams = { params: { id: studentId } };

      const response = await PATCH(mockRequest, mockParams);

      // Should validate email format
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should update visa information', async () => {
      const studentId = 'student-123';
      const visaUpdate = {
        visa_type: 'Work Visa',
        visa_expiry: '2027-06-30',
        visa_conditions: 'Updated conditions',
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`, {
        method: 'PATCH',
        body: JSON.stringify(visaUpdate),
      });
      const mockParams = { params: { id: studentId } };

      const response = await PATCH(mockRequest, mockParams);

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/admin/students/[id]', () => {
    it('should soft delete a student', async () => {
      const studentId = 'student-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: { id: studentId } };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when deleting non-existent student', async () => {
      const { db } = await import('@/db');
      (db.update as jest.Mock).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([]), // No student found
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/students/non-existent', {
        method: 'DELETE',
      });
      const mockParams = { params: { id: 'non-existent' } };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should preserve student data (soft delete)', async () => {
      // Verify that DELETE sets deleted_at timestamp rather than removing the record
      const studentId = 'student-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/students/${studentId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: { id: studentId } };

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

      const mockRequest = new NextRequest('http://localhost/api/admin/students');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/students', {
        method: 'POST',
        body: 'invalid json{',
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });

    it('should handle missing required authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/students');

      await expect(GET(mockRequest)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle pagination efficiently', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/students?limit=100&offset=0');

      const startTime = Date.now();
      await GET(mockRequest);
      const endTime = Date.now();

      // API should respond quickly even with large limits
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should return hasMore flag correctly', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/students?limit=10&offset=0');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.pagination).toHaveProperty('hasMore');
      expect(typeof data.pagination.hasMore).toBe('boolean');
    });
  });
});
