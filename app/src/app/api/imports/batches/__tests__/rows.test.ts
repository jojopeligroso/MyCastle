// @ts-nocheck
/**
 * Unit Tests for Imports Row Resolution API Routes
 * Tests validation, authentication, and error handling
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
const mockRequireAuth = jest.fn();
const mockGetTenantId = jest.fn();
const mockSetRLSContext = jest.fn();
const mockDbSelect = jest.fn();
const mockDbUpdate = jest.fn();
const mockDbTransaction = jest.fn();

jest.mock('@/db', () => ({
  db: {
    select: mockDbSelect,
    update: mockDbUpdate,
    transaction: mockDbTransaction,
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: mockRequireAuth,
  getTenantId: mockGetTenantId,
  setRLSContext: mockSetRLSContext,
}));

// Import after mocks
import { GET as GET_ROWS } from '../[id]/rows/route';
import { POST as POST_EXCLUDE } from '../[id]/rows/[rowId]/exclude/route';
import { POST as POST_RESOLVE } from '../[id]/rows/[rowId]/resolve/route';

describe('Imports Row Resolution API Routes', () => {
  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
  const mockBatchId = '323e4567-e89b-12d3-a456-426614174002';
  const mockRowId = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth setup
    mockRequireAuth.mockResolvedValue({
      id: mockUserId,
      user_metadata: { role: 'admin' },
    });
    mockGetTenantId.mockResolvedValue(mockTenantId);
    mockSetRLSContext.mockResolvedValue(undefined);
  });

  describe('GET /api/imports/batches/[id]/rows', () => {
    it('should require admin authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(`http://localhost/api/imports/batches/${mockBatchId}/rows`);
      const response = await GET_ROWS(request, { params: Promise.resolve({ id: mockBatchId }) });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should require tenant ID', async () => {
      mockGetTenantId.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/imports/batches/${mockBatchId}/rows`);
      const response = await GET_ROWS(request, { params: Promise.resolve({ id: mockBatchId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Tenant');
    });

    it('should return rows for a batch', async () => {
      const mockRows = [
        {
          id: mockRowId,
          rowNumber: 1,
          rowStatus: 'VALID',
          rawData: { 'Student Name': 'John Smith' },
        },
      ];

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockRows),
            }),
          }),
        }),
      });

      const request = new NextRequest(`http://localhost/api/imports/batches/${mockBatchId}/rows`);
      const response = await GET_ROWS(request, { params: Promise.resolve({ id: mockBatchId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rows).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
    });
  });

  describe('POST /api/imports/batches/[id]/rows/[rowId]/exclude', () => {
    it('should require admin authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/rows/${mockRowId}/exclude`,
        {
          method: 'POST',
        }
      );

      const response = await POST_EXCLUDE(request, {
        params: Promise.resolve({ id: mockBatchId, rowId: mockRowId }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject when batch is in terminal status', async () => {
      const mockBatch = { id: mockBatchId, status: 'APPLIED' };

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockBatch]),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/rows/${mockRowId}/exclude`,
        {
          method: 'POST',
        }
      );

      const response = await POST_EXCLUDE(request, {
        params: Promise.resolve({ id: mockBatchId, rowId: mockRowId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot modify');
    });

    it('should exclude invalid row successfully', async () => {
      const mockBatch = {
        id: mockBatchId,
        status: 'PROPOSED_NEEDS_REVIEW',
        invalidRows: 2,
      };
      const mockRow = {
        id: mockRowId,
        rowStatus: 'INVALID',
      };

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockBatch]),
          }),
        }),
      });

      mockDbTransaction.mockImplementation(async callback => {
        const tx = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([mockRow]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ ...mockRow, rowStatus: 'EXCLUDED' }]),
              }),
            }),
          }),
        };
        return callback(tx);
      });

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/rows/${mockRowId}/exclude`,
        {
          method: 'POST',
        }
      );

      const response = await POST_EXCLUDE(request, {
        params: Promise.resolve({ id: mockBatchId, rowId: mockRowId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.row.rowStatus).toBe('EXCLUDED');
    });
  });

  describe('POST /api/imports/batches/[id]/rows/[rowId]/resolve', () => {
    it('should require admin authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/rows/${mockRowId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolutionType: 'new' }),
        }
      );

      const response = await POST_RESOLVE(request, {
        params: Promise.resolve({ id: mockBatchId, rowId: mockRowId }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate resolution type', async () => {
      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/rows/${mockRowId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolutionType: 'invalid_type' }),
        }
      );

      const response = await POST_RESOLVE(request, {
        params: Promise.resolve({ id: mockBatchId, rowId: mockRowId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should require enrollmentId when linking', async () => {
      const mockBatch = { id: mockBatchId, status: 'PROPOSED_NEEDS_REVIEW' };

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockBatch]),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/rows/${mockRowId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolutionType: 'linked' }),
        }
      );

      const response = await POST_RESOLVE(request, {
        params: Promise.resolve({ id: mockBatchId, rowId: mockRowId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('enrollmentId');
    });

    it('should resolve ambiguous row as new', async () => {
      const mockBatch = {
        id: mockBatchId,
        status: 'PROPOSED_NEEDS_REVIEW',
        ambiguousRows: 1,
      };
      const mockRow = {
        id: mockRowId,
        rowStatus: 'AMBIGUOUS',
      };

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockBatch]),
          }),
        }),
      });

      mockDbTransaction.mockImplementation(async callback => {
        const tx = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([mockRow]),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([
                  {
                    ...mockRow,
                    rowStatus: 'VALID',
                    resolutionType: 'new',
                  },
                ]),
              }),
            }),
          }),
        };
        return callback(tx);
      });

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/rows/${mockRowId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolutionType: 'new' }),
        }
      );

      const response = await POST_RESOLVE(request, {
        params: Promise.resolve({ id: mockBatchId, rowId: mockRowId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.row.resolutionType).toBe('new');
    });
  });
});
