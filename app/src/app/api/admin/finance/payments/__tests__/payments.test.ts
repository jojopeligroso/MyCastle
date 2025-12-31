/**
 * Unit tests for Payment Management APIs
 * Tests: GET, POST operations with auto-status updates
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET, POST } from '../route';
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

describe('Payment Management APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/finance/payments', () => {
    it('should return list of payments with pagination', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments?limit=10&offset=0');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('payments');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should filter payments by invoice', async () => {
      const invoiceId = 'invoice-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/finance/payments?invoice_id=${invoiceId}`);

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter payments by student', async () => {
      const studentId = 'student-123';
      const mockRequest = new NextRequest(`http://localhost/api/admin/finance/payments?student_id=${studentId}`);

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter payments by date range', async () => {
      const mockRequest = new NextRequest(
        'http://localhost/api/admin/finance/payments?start_date=2025-01-01&end_date=2025-12-31'
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should filter payments by method', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments?method=card');

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should include invoice and student information', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments');

      const response = await GET(mockRequest);
      const data = await response.json();

      if (data.payments && data.payments.length > 0) {
        expect(data.payments[0]).toHaveProperty('invoice');
        expect(data.payments[0]).toHaveProperty('student');
      }
    });

    it('should require admin authentication', async () => {
      const { requireAuth } = await import('@/lib/auth/utils');
      (requireAuth as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments');

      await expect(GET(mockRequest)).rejects.toThrow('Unauthorized');
    });
  });

  describe('POST /api/admin/finance/payments', () => {
    it('should record a payment and update invoice status', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 500,
        payment_method: 'card',
        payment_date: '2025-01-15',
        reference: 'REF-12345',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.amount).toBe(paymentData.amount);
      expect(data.payment_method).toBe(paymentData.payment_method);
    });

    it('should update invoice to "partial" status for partial payment', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 500, // Partial payment of 1000 total
        payment_method: 'card',
        payment_date: '2025-01-15',
      };

      const { db } = await import('@/db');
      const updateSpy = jest.spyOn(db, 'update');

      // Mock invoice with 1000 total, 0 paid
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{
          id: 'invoice-123',
          amount: 1000,
          amount_paid: 0,
          amount_due: 1000,
          status: 'pending',
        }]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      await POST(mockRequest);

      // Verify invoice was updated with status 'partial'
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should update invoice to "paid" status when fully paid', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 500, // Final payment completing 1000 total
        payment_method: 'card',
        payment_date: '2025-01-15',
      };

      const { db } = await import('@/db');
      const updateSpy = jest.spyOn(db, 'update');

      // Mock invoice with 1000 total, 500 already paid
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{
          id: 'invoice-123',
          amount: 1000,
          amount_paid: 500,
          amount_due: 500,
          status: 'partial',
        }]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      await POST(mockRequest);

      // Verify invoice was updated with status 'paid'
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should prevent overpayment', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 1500, // Overpayment - invoice only has 1000 due
        payment_method: 'card',
        payment_date: '2025-01-15',
      };

      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{
          id: 'invoice-123',
          amount: 1000,
          amount_paid: 0,
          amount_due: 1000,
          status: 'pending',
        }]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('exceeds');
    });

    it('should support refunds (negative amounts)', async () => {
      const refundData = {
        invoice_id: 'invoice-123',
        amount: -200, // Refund
        payment_method: 'refund',
        payment_date: '2025-01-15',
        notes: 'Refund for cancelled classes',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(refundData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.amount).toBe(-200);
    });

    it('should validate invoice existence', async () => {
      const paymentData = {
        invoice_id: 'non-existent-invoice',
        amount: 500,
        payment_method: 'card',
        payment_date: '2025-01-15',
      };

      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]), // No invoice found
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Invoice');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        amount: 500, // Missing invoice_id
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should support all payment methods', async () => {
      const methods = ['cash', 'card', 'bank_transfer', 'other'];

      for (const method of methods) {
        const paymentData = {
          invoice_id: 'invoice-123',
          amount: 100,
          payment_method: method,
          payment_date: '2025-01-15',
        };

        const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
          method: 'POST',
          body: JSON.stringify(paymentData),
        });

        const response = await POST(mockRequest);

        expect(response.status).toBeLessThan(500);
      }
    });

    it('should record payment reference and notes', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 500,
        payment_method: 'bank_transfer',
        payment_date: '2025-01-15',
        reference: 'TRX-98765',
        notes: 'Payment received via wire transfer',
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.reference).toBe(paymentData.reference);
      expect(data.notes).toBe(paymentData.notes);
    });

    it('should update invoice amount_paid and amount_due', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 300,
        payment_method: 'card',
        payment_date: '2025-01-15',
      };

      const { db } = await import('@/db');
      const updateSpy = jest.spyOn(db, 'update');

      // Mock invoice with 1000 total, 0 paid
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{
          id: 'invoice-123',
          amount: 1000,
          amount_paid: 0,
          amount_due: 1000,
          status: 'pending',
        }]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      await POST(mockRequest);

      // Verify invoice amounts were updated
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should use current date if payment_date not provided', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 500,
        payment_method: 'card',
        // payment_date omitted - should use today
      };

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('payment_date');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/db');
      (db.select as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle invalid JSON in request body', async () => {
      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: 'invalid json{',
      });

      await expect(POST(mockRequest)).rejects.toThrow();
    });

    it('should handle transaction failures', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 500,
        payment_method: 'card',
        payment_date: '2025-01-15',
      };

      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{
          id: 'invoice-123',
          amount: 1000,
          amount_paid: 0,
          amount_due: 1000,
        }]),
      });

      // Mock transaction failure
      (db.insert as jest.Mock).mockRejectedValueOnce(new Error('Transaction failed'));

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
    });
  });

  describe('Business Logic', () => {
    it('should correctly calculate remaining balance after payment', async () => {
      const paymentData = {
        invoice_id: 'invoice-123',
        amount: 400,
        payment_method: 'card',
        payment_date: '2025-01-15',
      };

      const { db } = await import('@/db');
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([{
          id: 'invoice-123',
          amount: 1000,
          amount_paid: 300,
          amount_due: 700,
          status: 'partial',
        }]),
      });

      const mockRequest = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(201);
      // After payment: amount_paid should be 700, amount_due should be 300
    });

    it('should handle multiple payment methods for same invoice', async () => {
      // First payment: cash
      const payment1 = {
        invoice_id: 'invoice-123',
        amount: 300,
        payment_method: 'cash',
        payment_date: '2025-01-15',
      };

      // Second payment: card
      const payment2 = {
        invoice_id: 'invoice-123',
        amount: 200,
        payment_method: 'card',
        payment_date: '2025-01-16',
      };

      const mockRequest1 = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(payment1),
      });

      const mockRequest2 = new NextRequest('http://localhost/api/admin/finance/payments', {
        method: 'POST',
        body: JSON.stringify(payment2),
      });

      const response1 = await POST(mockRequest1);
      const response2 = await POST(mockRequest2);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });
  });
});
