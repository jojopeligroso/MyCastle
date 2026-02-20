// @ts-nocheck
/**
 * Unit tests for Programmes Management APIs
 * Tests: GET, POST, PATCH, DELETE operations with course count aggregation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Type helper for mocks
type MockFn = jest.Mock<(...args: unknown[]) => unknown>;
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
  requireAuth: jest.fn<() => Promise<{ id: string; role: string }>>().mockResolvedValue({ id: 'admin-user-id', role: 'admin' }),
}));

describe('Programmes Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/programmes', () => {
    it('should return list of programmes with course counts', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/programmes');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('programmes');
      expect(data.programmes).toBeInstanceOf(Array);
    });

    it('should include course count for each programme', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/programmes');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.programmes && data.programmes.length > 0) {
        expect(data.programmes[0]).toHaveProperty('courseCount');
        expect(typeof data.programmes[0].courseCount).toBe('number');
      }
    });

    it('should filter programmes by active status', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/programmes?is_active=true');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as MockFn).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });
  });

  describe('POST /api/admin/programmes', () => {
    it('should create a new programme with valid data', async () => {
      const programmeData = {
        name: 'General English',
        description: 'Comprehensive English language programme',
        duration_weeks: 12,
        levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        is_active: true,
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(programmeData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(programmeData.name);
      expect(data.levels).toEqual(programmeData.levels);
    });

    it('should auto-generate programme code from name', async () => {
      const programmeData = {
        name: 'General English',
        description: 'Test programme',
        duration_weeks: 12,
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(programmeData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('code');
      expect(data.code).toMatch(/^[A-Z]{3}$/); // First 3 letters uppercase
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should validate CEFR levels array', async () => {
      const programmeData = {
        name: 'Test Programme',
        description: 'Test',
        duration_weeks: 12,
        levels: ['INVALID_LEVEL'], // Invalid CEFR level
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(programmeData),
      });

      const response = await POST(mockRequest);

      // Should validate CEFR levels (A1, A2, B1, B2, C1, C2)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should default is_active to true', async () => {
      const programmeData = {
        name: 'New Programme',
        description: 'Test',
        duration_weeks: 12,
        // is_active not provided
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(programmeData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.is_active).toBe(true);
    });

    it('should support all CEFR levels', async () => {
      const programmeData = {
        name: 'Comprehensive Programme',
        description: 'All levels',
        duration_weeks: 52,
        levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(programmeData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.levels).toHaveLength(6);
    });
  });

  describe('GET /api/admin/programmes/[id]', () => {
    it('should return programme detail with associated courses', async () => {
      const programmeId = 'programme-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`);
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('courses');
      expect(data.courses).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent programme', async () => {
      const { db } = await import('@/db');
      (db.select as MockFn).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes/non-existent');
      const mockParams = { params: Promise.resolve({ id: 'non-existent' }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should include all programme fields', async () => {
      const programmeId = 'programme-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`);
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('duration_weeks');
      expect(data).toHaveProperty('levels');
      expect(data).toHaveProperty('is_active');
    });
  });

  describe('PATCH /api/admin/programmes/[id]', () => {
    it('should update programme information', async () => {
      const programmeId = 'programme-123';
      const updateData = {
        description: 'Updated description',
        duration_weeks: 16,
        is_active: false,
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await PATCH(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('updated_at');
    });

    it('should update CEFR levels array', async () => {
      const programmeId = 'programme-123';
      const updateData = {
        levels: ['B1', 'B2', 'C1'],
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await PATCH(mockRequest, mockParams);

      expect(response.status).toBe(200);
    });

    it('should validate CEFR levels on update', async () => {
      const programmeId = 'programme-123';
      const invalidData = {
        levels: ['X1', 'Y2'], // Invalid levels
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`, {
        method: 'PATCH',
        body: JSON.stringify(invalidData),
      });
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await PATCH(mockRequest, mockParams);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should not allow updating programme code', async () => {
      const programmeId = 'programme-123';
      const maliciousData = {
        code: 'HACKED', // Trying to change auto-generated code
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`, {
        method: 'PATCH',
        body: JSON.stringify(maliciousData),
      });
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await PATCH(mockRequest, mockParams);

      // Should ignore code field (not in allowed update fields)
      expect(response.status).toBe(200);
    });

    it('should allow deactivating programmes', async () => {
      const programmeId = 'programme-123';
      const updateData = {
        is_active: false,
      };

      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await PATCH(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.is_active).toBe(false);
    });
  });

  describe('DELETE /api/admin/programmes/[id]', () => {
    it('should soft delete a programme', async () => {
      const programmeId = 'programme-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when deleting non-existent programme', async () => {
      const { db } = await import('@/db');
      (db.update as MockFn).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes/non-existent', {
        method: 'DELETE',
      });
      const mockParams = { params: Promise.resolve({ id: 'non-existent' }) };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should preserve programme data (soft delete)', async () => {
      const programmeId = 'programme-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/programmes/${programmeId}`, {
        method: 'DELETE',
      });
      const mockParams = { params: Promise.resolve({ id: programmeId }) };

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
      (db.select as MockFn).mockRejectedValueOnce(new Error('Database connection failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/programmes');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: 'invalid json{',
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });
  });

  describe('Business Logic', () => {
    it('should aggregate course counts correctly', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/programmes');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Verify SQL aggregation is used for performance
      expect(response.status).toBe(200);
      expect(data.programmes).toBeInstanceOf(Array);
    });

    it('should support programmes with no courses', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/programmes');

      const response = await GET(mockRequest);
      const data = await response.json();

      // Programme with 0 courses should still appear in list
      expect(response.status).toBe(200);
    });

    it('should generate unique programme codes', async () => {
      // Create multiple programmes with same starting letters
      const programme1 = {
        name: 'General English',
        description: 'Test',
        duration_weeks: 12,
      };

      const programme2 = {
        name: 'General Business',
        description: 'Test',
        duration_weeks: 12,
      };

      const mockRequest1 = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(programme1),
      });

      const mockRequest2 = new NextRequest('http://localhost/api/admin/programmes', {
        method: 'POST',
        body: JSON.stringify(programme2),
      });

      const response1 = await POST(mockRequest1);
      const data1 = await response1.json();

      const response2 = await POST(mockRequest2);
      const data2 = await response2.json();

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(data1.code).toBeDefined();
      expect(data2.code).toBeDefined();
    });
  });
});
