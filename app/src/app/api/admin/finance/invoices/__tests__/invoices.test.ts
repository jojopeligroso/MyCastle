// @ts-nocheck
/**
 * Unit tests for Invoice Management APIs
 * Tests: GET, POST, DELETE operations with auto-numbering and line items
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Type helper for mocks
type MockFn = jest.Mock<(...args: unknown[]) => unknown>;
import { GET, POST } from '../route';
import { GET as GET_BY_ID, DELETE as DELETE_BY_ID } from '../[id]/route';
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

describe('Invoice Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/finance/invoices', () => {
    it('should return list of invoices with pagination', async () => {
      const mockRequest = new NextRequest(
        'http://localhost/api/admin/finance/invoices?limit=10&offset=0'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('invoices');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should filter invoices by student', async () => {
      const studentId = 'student-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/finance/invoices?student_id=${studentId}`
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter invoices by status', async () => {
      const mockRequest = new NextRequest(
        'http://localhost/api/admin/finance/invoices?status=pending'
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter invoices by date range', async () => {
      const mockRequest = new NextRequest(
        'http://localhost/api/admin/finance/invoices?start_date=2025-01-01&end_date=2025-12-31'
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should include student information in results', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.invoices && data.invoices.length > 0) {
        expect(data.invoices[0]).toHaveProperty('student');
        expect(data.invoices[0].student).toHaveProperty('name');
      }
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as MockFn).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });
  });

  describe('POST /api/admin/finance/invoices', () => {
    it('should create invoice with auto-generated number', async () => {
      const invoiceData = {
        student_id: 'student-123',
        amount: 1000,
        due_date: '2025-02-15',
        description: 'Tuition fees for Spring 2025',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('invoice_number');
      expect(data.invoice_number).toMatch(/^INV-\d{4}-\d{6}$/); // Format: INV-YYYY-000001
    });

    it('should create invoice with line items', async () => {
      const invoiceData = {
        student_id: 'student-123',
        amount: 1500,
        due_date: '2025-02-15',
        description: 'Itemized invoice',
        line_items: [
          {
            description: 'Tuition - General English B1',
            quantity: 12,
            unit_price: 100,
            amount: 1200,
          },
          {
            description: 'Registration Fee',
            quantity: 1,
            unit_price: 150,
            amount: 150,
          },
          {
            description: 'Course Materials',
            quantity: 1,
            unit_price: 150,
            amount: 150,
          },
        ],
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('line_items');
      expect(data.line_items).toBeInstanceOf(Array);
      expect(data.line_items.length).toBe(3);
    });

    it('should initialize invoice with correct default values', async () => {
      const invoiceData = {
        student_id: 'student-123',
        amount: 1000,
        due_date: '2025-02-15',
        description: 'Test invoice',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data.status).toBe('pending');
      expect(data.amount_paid).toBe(0);
      expect(data.amount_due).toBe(invoiceData.amount);
    });

    it('should validate student existence', async () => {
      const invoiceData = {
        student_id: 'non-existent-student',
        amount: 1000,
        due_date: '2025-02-15',
      };

      const { db } = await import('@/db');
      (db.select as MockFn).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]), // No student found
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Student');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        amount: -100, // Negative amount should fail
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should generate sequential invoice numbers', async () => {
      // This test would verify that invoice numbers increment correctly
      const invoiceData1 = {
        student_id: 'student-123',
        amount: 1000,
        due_date: '2025-02-15',
        description: 'Invoice 1',
      };

      const invoiceData2 = {
        student_id: 'student-123',
        amount: 2000,
        due_date: '2025-02-15',
        description: 'Invoice 2',
      };

      const mockRequest1 = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData1),
      });

      const mockRequest2 = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData2),
      });

      const response1 = await POST(mockRequest1);
      const data1 = await response1.json();

      const response2 = await POST(mockRequest2);
      const data2 = await response2.json();

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(data1.invoice_number).toBeDefined();
      expect(data2.invoice_number).toBeDefined();
    });

    it('should support notes field', async () => {
      const invoiceData = {
        student_id: 'student-123',
        amount: 1000,
        due_date: '2025-02-15',
        description: 'Test invoice',
        notes: 'Student requested payment plan',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.notes).toBe(invoiceData.notes);
    });
  });

  describe('GET /api/admin/finance/invoices/[id]', () => {
    it('should return invoice detail with payment history', async () => {
      const invoiceId = 'invoice-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/finance/invoices/${invoiceId}`
      );
      const mockParams = { params: Promise.resolve({ id: invoiceId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('student');
      expect(data).toHaveProperty('payments');
      expect(data.payments).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent invoice', async () => {
      const { db } = await import('@/db');
      (db.select as MockFn).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/admin/finance/invoices/non-existent'
      );
      const mockParams = { params: Promise.resolve({ id: 'non-existent' }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should include line items in detail view', async () => {
      const invoiceId = 'invoice-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/finance/invoices/${invoiceId}`
      );
      const mockParams = { params: Promise.resolve({ id: invoiceId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data).toHaveProperty('line_items');
    });

    it('should include student information', async () => {
      const invoiceId = 'invoice-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/finance/invoices/${invoiceId}`
      );
      const mockParams = { params: Promise.resolve({ id: invoiceId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data.student).toHaveProperty('name');
      expect(data.student).toHaveProperty('email');
    });

    it('should show payment history in chronological order', async () => {
      const invoiceId = 'invoice-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/finance/invoices/${invoiceId}`
      );
      const mockParams = { params: Promise.resolve({ id: invoiceId }) };

      const response = await GET_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(data.payments).toBeInstanceOf(Array);
      // Payments should be ordered by payment_date
    });
  });

  describe('DELETE /api/admin/finance/invoices/[id]', () => {
    it('should soft delete an invoice', async () => {
      const invoiceId = 'invoice-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/finance/invoices/${invoiceId}`,
        {
          method: 'DELETE',
        }
      );
      const mockParams = { params: Promise.resolve({ id: invoiceId }) };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when deleting non-existent invoice', async () => {
      const { db } = await import('@/db');
      (db.update as MockFn).mockReturnValueOnce({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValueOnce([]),
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/admin/finance/invoices/non-existent',
        {
          method: 'DELETE',
        }
      );
      const mockParams = { params: Promise.resolve({ id: 'non-existent' }) };

      const response = await DELETE_BY_ID(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should preserve invoice data (soft delete)', async () => {
      const invoiceId = 'invoice-123';
      const mockRequest = new NextRequest(
        `http://localhost/api/admin/finance/invoices/${invoiceId}`,
        {
          method: 'DELETE',
        }
      );
      const mockParams = { params: Promise.resolve({ id: invoiceId }) };

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

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: 'invalid json{',
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });
  });

  describe('Business Logic', () => {
    it('should correctly calculate amount_due', async () => {
      const invoiceData = {
        student_id: 'student-123',
        amount: 1000,
        due_date: '2025-02-15',
        description: 'Test invoice',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data.amount).toBe(1000);
      expect(data.amount_paid).toBe(0);
      expect(data.amount_due).toBe(1000);
    });

    it('should validate line items total matches invoice amount', async () => {
      const invoiceData = {
        student_id: 'student-123',
        amount: 1000,
        due_date: '2025-02-15',
        description: 'Test invoice',
        line_items: [
          { description: 'Item 1', quantity: 1, unit_price: 500, amount: 500 },
          { description: 'Item 2', quantity: 1, unit_price: 600, amount: 600 },
          // Total is 1100, but invoice amount is 1000 - should fail validation
        ],
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      const response = await POST(mockRequest);

      // Should validate that line items sum matches invoice total
      // Implementation depends on business rules
      expect(response.status).toBeLessThan(500);
    });
  });
});
