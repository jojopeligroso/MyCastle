/**
 * Unit Tests for Session Generation Utility
 */

import { generateSessions, calculateSessionCount } from '@/lib/utils/generateSessions';

describe('generateSessions', () => {
  const baseParams = {
    classId: 'test-class-id',
    tenantId: 'test-tenant-id',
    startDate: '2026-02-02', // Monday
    endDate: '2026-02-13', // Friday (12 days later)
    daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
    startTime: '09:00',
    endTime: '11:00',
  };

  test('generates correct number of sessions for MWF schedule', () => {
    const sessions = generateSessions(baseParams);

    // From Feb 2 (Mon) to Feb 13 (Fri) - 12 days
    // Week 1: Mon 2, Wed 4, Fri 6 (3 sessions)
    // Week 2: Mon 9, Wed 11, Fri 13 (3 sessions)
    // Total: 6 sessions
    expect(sessions).toHaveLength(6);
  });

  test('generates sessions with correct structure', () => {
    const sessions = generateSessions(baseParams);

    sessions.forEach(session => {
      expect(session).toHaveProperty('classId', 'test-class-id');
      expect(session).toHaveProperty('tenantId', 'test-tenant-id');
      expect(session).toHaveProperty('sessionDate');
      expect(session).toHaveProperty('startTime', '09:00');
      expect(session).toHaveProperty('endTime', '11:00');
      expect(session).toHaveProperty('status', 'scheduled');
      expect(session).toHaveProperty('topic', null);
      expect(session).toHaveProperty('notes', null);
    });
  });

  test('generates sessions on correct days only', () => {
    const sessions = generateSessions(baseParams);

    const sessionDates = sessions.map(s => new Date(s.sessionDate));
    const dayNumbers = sessionDates.map(d => d.getDay());

    // Monday = 1, Wednesday = 3, Friday = 5
    dayNumbers.forEach(dayNum => {
      expect([1, 3, 5]).toContain(dayNum);
    });
  });

  test('handles single day schedule', () => {
    const sessions = generateSessions({
      ...baseParams,
      daysOfWeek: ['Monday'],
    });

    // Only Mondays: Feb 2, Feb 9
    expect(sessions).toHaveLength(2);
  });

  test('handles daily schedule (all days)', () => {
    const sessions = generateSessions({
      ...baseParams,
      startDate: '2026-02-02', // Monday
      endDate: '2026-02-08', // Sunday
      daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    });

    // 7 days, all included
    expect(sessions).toHaveLength(7);
  });

  test('handles null end date (defaults to 12 weeks)', () => {
    const sessions = generateSessions({
      ...baseParams,
      endDate: null,
    });

    // 12 weeks × 3 days/week = ~36 sessions
    // (exact count may vary slightly due to calendar alignment)
    expect(sessions.length).toBeGreaterThan(30);
    expect(sessions.length).toBeLessThanOrEqual(37); // Max possible: 12 weeks × 3 days + 1
  });

  test('throws error for missing required fields', () => {
    expect(() =>
      generateSessions({
        ...baseParams,
        classId: '',
      })
    ).toThrow('Missing required parameters');
  });

  test('throws error for empty days of week', () => {
    expect(() =>
      generateSessions({
        ...baseParams,
        daysOfWeek: [],
      })
    ).toThrow('At least one day of week must be specified');
  });

  test('throws error for invalid start date', () => {
    expect(() =>
      generateSessions({
        ...baseParams,
        startDate: 'invalid-date',
      })
    ).toThrow('Invalid start date');
  });

  test('throws error when end date is before start date', () => {
    expect(() =>
      generateSessions({
        ...baseParams,
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      })
    ).toThrow('End date must be after start date');
  });

  test('handles year boundary correctly', () => {
    const sessions = generateSessions({
      ...baseParams,
      startDate: '2025-12-29', // Monday
      endDate: '2026-01-09', // Friday
      daysOfWeek: ['Monday', 'Friday'],
    });

    // Mon 29 Dec, Fri 2 Jan, Mon 5 Jan, Fri 9 Jan = 4 sessions
    expect(sessions).toHaveLength(4);
  });

  test('calculateSessionCount returns correct count', () => {
    const count = calculateSessionCount({
      startDate: baseParams.startDate,
      endDate: baseParams.endDate,
      daysOfWeek: baseParams.daysOfWeek,
      startTime: baseParams.startTime,
      endTime: baseParams.endTime,
    });

    expect(count).toBe(6);
  });

  test('calculateSessionCount returns 0 for invalid params', () => {
    const count = calculateSessionCount({
      startDate: 'invalid',
      endDate: baseParams.endDate,
      daysOfWeek: baseParams.daysOfWeek,
      startTime: baseParams.startTime,
      endTime: baseParams.endTime,
    });

    expect(count).toBe(0);
  });
});
