// @ts-nocheck
/**
 * Unit Tests for Imports API Routes
 * Tests validation, authentication, and error handling
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock dependencies before imports
const mockRequireAuth = jest.fn();
const mockGetTenantId = jest.fn();
const mockSetRLSContext = jest.fn();
const mockDbSelect = jest.fn();
const mockDbInsert = jest.fn();
const mockDbUpdate = jest.fn();
const mockDbTransaction = jest.fn();

jest.mock('@/db', () => ({
  db: {
    select: mockDbSelect,
    insert: mockDbInsert,
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
import { GET, POST } from '../route';
import { GET as GET_DETAIL } from '../[id]/route';
import { POST as POST_TRIAGE } from '../[id]/triage/route';

describe('Imports API Routes', () => {
  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '223e4567-e89b-12d3-a456-426614174001';
  const mockBatchId = '323e4567-e89b-12d3-a456-426614174002';

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

  describe('GET /api/imports/batches', () => {
    it('should require admin authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest('http://localhost/api/imports/batches');
      const response = await GET(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should require tenant ID', async () => {
      mockGetTenantId.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/imports/batches');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Tenant');
    });

    it('should return batches when authenticated', async () => {
      const mockBatches = [
        {
          id: mockBatchId,
          fileName: 'test.xlsx',
          status: 'PROPOSED_OK',
          totalRows: 10,
        },
      ];

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(mockBatches),
                }),
              }),
            }),
          }),
        }),
      });

      const request = new NextRequest('http://localhost/api/imports/batches');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.batches).toBeDefined();
    });
  });

  describe('POST /api/imports/batches', () => {
    it('should reject request without file', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost/api/imports/batches', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should reject non-XLSX files', async () => {
      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

      const request = new NextRequest('http://localhost/api/imports/batches', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('XLSX');
    });

    it('should require admin authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.xlsx');

      const request = new NextRequest('http://localhost/api/imports/batches', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/imports/batches/[id]', () => {
    it('should require admin authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(`http://localhost/api/imports/batches/${mockBatchId}`);
      const response = await GET_DETAIL(request, { params: Promise.resolve({ id: mockBatchId }) });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 404 for non-existent batch', async () => {
      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const request = new NextRequest(`http://localhost/api/imports/batches/${mockBatchId}`);
      const response = await GET_DETAIL(request, { params: Promise.resolve({ id: mockBatchId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return batch details when found', async () => {
      const mockBatch = {
        id: mockBatchId,
        fileName: 'test.xlsx',
        status: 'PROPOSED_OK',
        totalRows: 10,
      };

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockBatch]),
            }),
          }),
        }),
      });

      const request = new NextRequest(`http://localhost/api/imports/batches/${mockBatchId}`);
      const response = await GET_DETAIL(request, { params: Promise.resolve({ id: mockBatchId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.batch).toBeDefined();
      expect(data.batch.id).toBe(mockBatchId);
    });
  });

  describe('POST /api/imports/batches/[id]/triage', () => {
    it('should require admin authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/triage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewOutcome: 'CONFIRM' }),
        }
      );

      const response = await POST_TRIAGE(request, { params: Promise.resolve({ id: mockBatchId }) });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject invalid review outcome', async () => {
      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/triage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewOutcome: 'INVALID_OUTCOME' }),
        }
      );

      const response = await POST_TRIAGE(request, { params: Promise.resolve({ id: mockBatchId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should reject triage on terminal status', async () => {
      const mockBatch = {
        id: mockBatchId,
        status: 'APPLIED', // Terminal status
      };

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockBatch]),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/triage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewOutcome: 'CONFIRM' }),
        }
      );

      const response = await POST_TRIAGE(request, { params: Promise.resolve({ id: mockBatchId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot triage');
    });

    it('should update review outcome successfully', async () => {
      const mockBatch = {
        id: mockBatchId,
        status: 'PROPOSED_OK',
        invalidRows: 0,
        ambiguousRows: 0,
      };

      mockDbSelect.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockBatch]),
          }),
        }),
      });

      mockDbUpdate.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                ...mockBatch,
                reviewOutcome: 'CONFIRM',
                status: 'READY_TO_APPLY',
              },
            ]),
          }),
        }),
      });

      const request = new NextRequest(
        `http://localhost/api/imports/batches/${mockBatchId}/triage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewOutcome: 'CONFIRM' }),
        }
      );

      const response = await POST_TRIAGE(request, { params: Promise.resolve({ id: mockBatchId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.batch.reviewOutcome).toBe('CONFIRM');
    });
  });
});
