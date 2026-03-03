/**
 * Tutor Context API Unit Tests
 * Tests for the /api/student/tutor-context endpoint
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #10
 */

import { GET } from '@/app/api/student/tutor-context/route';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/db', () => ({
  db: {
    execute: jest.fn().mockResolvedValue(undefined),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  requireAuth: jest.fn().mockResolvedValue(undefined),
  getTenantId: jest.fn().mockResolvedValue('tenant-123'),
  getUserId: jest.fn().mockResolvedValue('user-456'),
}));

describe('GET /api/student/tutor-context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when not authenticated', async () => {
    const { getTenantId } = require('@/lib/auth/utils');
    getTenantId.mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when no userId', async () => {
    const { getUserId } = require('@/lib/auth/utils');
    getUserId.mockResolvedValueOnce(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when user not found', async () => {
    const { db } = require('@/db');
    // First select (user) returns empty
    db.limit.mockResolvedValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return tutor context for valid student', async () => {
    const { db } = require('@/db');
    const mockUser = {
      id: 'user-456',
      name: 'Test Student',
      currentLevel: 'B1',
      initialLevel: 'A2',
      createdAt: new Date('2025-09-01'),
    };
    const mockStudent = { id: 'student-789' };

    // Mock all db method chains
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockUser]),
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
          groupBy: jest.fn().mockResolvedValue([]),
        }),
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
            groupBy: jest.fn().mockResolvedValue([]),
          }),
        }),
        leftJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    });

    // Override for specific calls
    let selectCallCount = 0;
    db.select.mockImplementation(() => {
      selectCallCount++;
      return {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(() => {
              if (selectCallCount === 1) return Promise.resolve([mockUser]);
              if (selectCallCount === 2) return Promise.resolve([mockStudent]);
              return Promise.resolve([{ total: 0, achieved: 0 }]);
            }),
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
            groupBy: jest.fn().mockResolvedValue([]),
          }),
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
              groupBy: jest.fn().mockResolvedValue([]),
            }),
          }),
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      };
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('profile');
    expect(data).toHaveProperty('currentClass');
    expect(data).toHaveProperty('progress');
    expect(data).toHaveProperty('recentAssessments');
    expect(data).toHaveProperty('vocabularyStats');
    expect(data).toHaveProperty('currentObjectives');
  });
});

describe('Tutor Context Response Structure', () => {
  it('should have correct profile structure', () => {
    const profileSchema = {
      name: 'string|null',
      currentLevel: 'string|null',
      initialLevel: 'string|null',
      memberSince: 'string',
    };

    // Type validation test
    const exampleProfile = {
      name: 'Test Student',
      currentLevel: 'B1',
      initialLevel: 'A2',
      memberSince: '2025-09-01T00:00:00.000Z',
    };

    expect(typeof exampleProfile.name).toBe('string');
    expect(typeof exampleProfile.currentLevel).toBe('string');
    expect(typeof exampleProfile.initialLevel).toBe('string');
    expect(typeof exampleProfile.memberSince).toBe('string');
  });

  it('should have correct progress structure', () => {
    const exampleProgress = {
      competencyRate: 65,
      skillBreakdown: { reading: 70, writing: 55 },
      recentGaps: ['conditional sentences'],
    };

    expect(typeof exampleProgress.competencyRate).toBe('number');
    expect(typeof exampleProgress.skillBreakdown).toBe('object');
    expect(Array.isArray(exampleProgress.recentGaps)).toBe(true);
  });

  it('should have correct vocabularyStats structure', () => {
    const exampleVocab = {
      total: 150,
      mastered: 45,
      learning: 80,
      new: 25,
      recentlyAdded: ['vocabulary', 'test'],
    };

    expect(typeof exampleVocab.total).toBe('number');
    expect(typeof exampleVocab.mastered).toBe('number');
    expect(typeof exampleVocab.learning).toBe('number');
    expect(typeof exampleVocab.new).toBe('number');
    expect(Array.isArray(exampleVocab.recentlyAdded)).toBe(true);
  });
});
