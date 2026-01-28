/**
 * Unit tests for Email Logs APIs
 * Tests: GET operations with filtering
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    id: 'admin-user-id',
    user_metadata: { role: 'admin' },
  }),
  getTenantId: jest.fn().mockResolvedValue('tenant-123'),
}));

describe('Email Logs APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEV_AUTH_BYPASS = 'false';
  });

  const mockSelectChain = () => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue([]),
    $dynamic: jest.fn().mockReturnThis(),
  });

  const mockCountChain = () => ({
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([{ count: 0 }]),
  });

  it('should return list of email logs with pagination', async () => {
    const { db } = await import('@/db');
    (db.select as jest.Mock)
      .mockReturnValueOnce(mockSelectChain())
      .mockReturnValueOnce(mockCountChain());

    const { GET } = await import('../route');
    const mockRequest = new NextRequest(
      'http://localhost/api/admin/communications/email-logs?limit=10&offset=0'
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('logs');
    expect(data).toHaveProperty('pagination');
  });

  it('should filter email logs by search term', async () => {
    const { db } = await import('@/db');
    (db.select as jest.Mock)
      .mockReturnValueOnce(mockSelectChain())
      .mockReturnValueOnce(mockCountChain());

    const { GET } = await import('../route');
    const mockRequest = new NextRequest(
      'http://localhost/api/admin/communications/email-logs?search=student@example.com'
    );

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
  });

  it('should filter email logs by date range', async () => {
    const { db } = await import('@/db');
    (db.select as jest.Mock)
      .mockReturnValueOnce(mockSelectChain())
      .mockReturnValueOnce(mockCountChain());

    const { GET } = await import('../route');
    const mockRequest = new NextRequest(
      'http://localhost/api/admin/communications/email-logs?from=2026-01-01&to=2026-01-31'
    );

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
  });

  it('should filter email logs by status', async () => {
    const { db } = await import('@/db');
    (db.select as jest.Mock)
      .mockReturnValueOnce(mockSelectChain())
      .mockReturnValueOnce(mockCountChain());

    const { GET } = await import('../route');
    const mockRequest = new NextRequest(
      'http://localhost/api/admin/communications/email-logs?status=failed'
    );

    const response = await GET(mockRequest);

    expect(response.status).toBe(200);
  });

  it('should require admin authentication', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { requireAuth } = await import('@/lib/auth/utils');
    (requireAuth as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

    const { GET } = await import('../route');
    const mockRequest = new NextRequest('http://localhost/api/admin/communications/email-logs');

    const response = await GET(mockRequest);

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
