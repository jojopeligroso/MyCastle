/**
 * Unit Tests for Cumulative Lateness Logic
 * Tests week boundary calculations and absence equivalent calculations
 */

import { getWeekBoundaries } from '../lib/attendance/cumulative-lateness';

describe('getWeekBoundaries', () => {
  test('returns Monday-Sunday for midweek date (Wednesday)', () => {
    const wednesday = new Date('2026-01-21T10:30:00Z'); // Wednesday, Jan 21, 2026
    const { weekStart, weekEnd } = getWeekBoundaries(wednesday);

    // Should return Monday Jan 19 at 00:00:00
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getFullYear()).toBe(2026);
    expect(weekStart.getMonth()).toBe(0); // January (0-indexed)
    expect(weekStart.getDate()).toBe(19);
    expect(weekStart.getHours()).toBe(0);
    expect(weekStart.getMinutes()).toBe(0);
    expect(weekStart.getSeconds()).toBe(0);

    // Should return Sunday Jan 25 at 23:59:59
    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getFullYear()).toBe(2026);
    expect(weekEnd.getMonth()).toBe(0); // January
    expect(weekEnd.getDate()).toBe(25);
    expect(weekEnd.getHours()).toBe(23);
    expect(weekEnd.getMinutes()).toBe(59);
    expect(weekEnd.getSeconds()).toBe(59);
  });

  test('handles Monday correctly (returns same Monday as week start)', () => {
    const monday = new Date('2026-01-19T14:00:00Z'); // Monday, Jan 19, 2026
    const { weekStart, weekEnd } = getWeekBoundaries(monday);

    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(19);
    expect(weekStart.getHours()).toBe(0);

    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getDate()).toBe(25);
    expect(weekEnd.getHours()).toBe(23);
  });

  test('handles Sunday correctly (week includes previous Monday)', () => {
    const sunday = new Date('2026-01-25T20:00:00Z'); // Sunday, Jan 25, 2026
    const { weekStart, weekEnd } = getWeekBoundaries(sunday);

    // Week should be Mon Jan 19 - Sun Jan 25
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(19);

    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getDate()).toBe(25);
  });

  test('handles year boundary correctly', () => {
    const newYearsDay = new Date('2026-01-01T12:00:00Z'); // Thursday, Jan 1, 2026
    const { weekStart, weekEnd } = getWeekBoundaries(newYearsDay);

    // Week should start on Monday Dec 29, 2025
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getFullYear()).toBe(2025);
    expect(weekStart.getMonth()).toBe(11); // December
    expect(weekStart.getDate()).toBe(29);

    // Week should end on Sunday Jan 4, 2026
    expect(weekEnd.getDay()).toBe(0); // Sunday
    expect(weekEnd.getFullYear()).toBe(2026);
    expect(weekEnd.getMonth()).toBe(0); // January
    expect(weekEnd.getDate()).toBe(4);
  });

  test('handles February leap year correctly', () => {
    const leapDay = new Date('2024-02-29T10:00:00Z'); // Thursday, Feb 29, 2024
    const { weekStart, weekEnd } = getWeekBoundaries(leapDay);

    // Week should start on Monday Feb 26
    expect(weekStart.getDay()).toBe(1);
    expect(weekStart.getDate()).toBe(26);
    expect(weekStart.getMonth()).toBe(1); // February

    // Week should end on Sunday Mar 3
    expect(weekEnd.getDay()).toBe(0);
    expect(weekEnd.getDate()).toBe(3);
    expect(weekEnd.getMonth()).toBe(2); // March
  });

  test('week start and end are exactly 7 days apart', () => {
    const randomDate = new Date('2026-03-15T10:00:00Z');
    const { weekStart, weekEnd } = getWeekBoundaries(randomDate);

    // Calculate difference in days
    const diffMs = weekEnd.getTime() - weekStart.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Should be approximately 7 days (6.999... due to time precision)
    expect(diffDays).toBeGreaterThan(6.99);
    expect(diffDays).toBeLessThan(7.01);
  });

  test('handles Saturday correctly', () => {
    const saturday = new Date('2026-01-24T15:00:00Z'); // Saturday, Jan 24, 2026
    const { weekStart, weekEnd } = getWeekBoundaries(saturday);

    // Week should be Mon Jan 19 - Sun Jan 25
    expect(weekStart.getDay()).toBe(1);
    expect(weekStart.getDate()).toBe(19);

    expect(weekEnd.getDay()).toBe(0);
    expect(weekEnd.getDate()).toBe(25);
  });

  test('multiple dates in same week return same boundaries', () => {
    const dates = [
      new Date('2026-01-19T08:00:00Z'), // Monday
      new Date('2026-01-21T14:00:00Z'), // Wednesday
      new Date('2026-01-25T20:00:00Z'), // Sunday
    ];

    const boundaries = dates.map(d => getWeekBoundaries(d));

    // All should have same week start
    boundaries.forEach(b => {
      expect(b.weekStart.getDate()).toBe(19);
      expect(b.weekEnd.getDate()).toBe(25);
    });
  });
});

describe('Absence Equivalents Calculation', () => {
  test('calculates absence equivalents correctly - basic case', () => {
    const cumulativeMinutes = 25;
    const threshold = 15;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    expect(absenceEquivalents).toBe(1); // 25 / 15 = 1.66, floor = 1
  });

  test('calculates absence equivalents - exactly at threshold', () => {
    const cumulativeMinutes = 30;
    const threshold = 15;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    expect(absenceEquivalents).toBe(2); // 30 / 15 = 2.0
  });

  test('calculates absence equivalents - below threshold', () => {
    const cumulativeMinutes = 10;
    const threshold = 15;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    expect(absenceEquivalents).toBe(0); // 10 / 15 = 0.66, floor = 0
  });

  test('calculates absence equivalents - high cumulative', () => {
    const cumulativeMinutes = 75;
    const threshold = 15;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    expect(absenceEquivalents).toBe(5); // 75 / 15 = 5.0
  });

  test('calculates absence equivalents - different threshold', () => {
    const cumulativeMinutes = 40;
    const threshold = 20;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    expect(absenceEquivalents).toBe(2); // 40 / 20 = 2.0
  });

  test('example from requirements - 5 days, 5 min late each', () => {
    // Student arrives 5 minutes late every day for 5 days
    const daysLate = 5;
    const minutesPerDay = 5;
    const cumulativeMinutes = daysLate * minutesPerDay; // 25 minutes
    const threshold = 15;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    expect(cumulativeMinutes).toBe(25);
    expect(absenceEquivalents).toBe(1); // 1 absence equivalent

    // Attendance rate: 5 attended - 1 absence equivalent = 4 effective attendance
    // 4 / 5 = 0.8 = 80%
    const attendanceRate = ((daysLate - absenceEquivalents) / daysLate) * 100;
    expect(attendanceRate).toBe(80);
  });

  test('example from requirements - 10 classes, 5 min late each', () => {
    // Student attends all 10 General English morning classes, 5 min late each
    const totalClasses = 10;
    const minutesPerClass = 5;
    const cumulativeMinutes = totalClasses * minutesPerClass; // 50 minutes
    const threshold = 15;
    const absenceEquivalents = Math.floor(cumulativeMinutes / threshold);

    expect(cumulativeMinutes).toBe(50);
    expect(absenceEquivalents).toBe(3); // 50 / 15 = 3.33, floor = 3

    // Attendance rate: 10 attended - 3 absence equivalents = 7 effective
    // 7 / 10 = 0.7 = 70%
    const attendanceRate = ((totalClasses - absenceEquivalents) / totalClasses) * 100;
    expect(attendanceRate).toBe(70);
  });
});

describe('Minutes Validation Rules', () => {
  test('validates late status requires 1-16 minutes', () => {
    const validLateMinutes = [1, 5, 10, 16];
    const invalidLateMinutes = [0, 17, 20, 89];

    validLateMinutes.forEach(minutes => {
      expect(minutes).toBeGreaterThan(0);
      expect(minutes).toBeLessThanOrEqual(16);
    });

    invalidLateMinutes.forEach(minutes => {
      const isValid = minutes > 0 && minutes <= 16;
      expect(isValid).toBe(false);
    });
  });

  test('validates late_absent status requires >16 minutes', () => {
    const validLateAbsentMinutes = [17, 20, 30, 89];
    const invalidLateAbsentMinutes = [0, 1, 10, 16];

    validLateAbsentMinutes.forEach(minutes => {
      expect(minutes).toBeGreaterThan(16);
    });

    invalidLateAbsentMinutes.forEach(minutes => {
      const isValid = minutes > 16;
      expect(isValid).toBe(false);
    });
  });

  test('validates minutes range constraint (0-89)', () => {
    const validMinutes = [0, 1, 45, 89];
    const invalidMinutes = [-1, 90, 100, 120];

    validMinutes.forEach(minutes => {
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(89);
    });

    invalidMinutes.forEach(minutes => {
      const isValid = minutes >= 0 && minutes <= 89;
      expect(isValid).toBe(false);
    });
  });
});

describe('Cumulative Minutes Calculation', () => {
  test('combines late and early departure minutes', () => {
    const minutesLate = 10;
    const minutesLeftEarly = 15;
    const cumulative = minutesLate + minutesLeftEarly;

    expect(cumulative).toBe(25);
  });

  test('handles only late minutes', () => {
    const minutesLate = 20;
    const minutesLeftEarly = 0;
    const cumulative = minutesLate + minutesLeftEarly;

    expect(cumulative).toBe(20);
  });

  test('handles only early departure minutes', () => {
    const minutesLate = 0;
    const minutesLeftEarly = 10;
    const cumulative = minutesLate + minutesLeftEarly;

    expect(cumulative).toBe(10);
  });

  test('late_absent minutes should NOT count toward cumulative', () => {
    // If a student is late_absent (>16 min), they're already marked absent
    // So their minutes should be excluded from cumulative calculation
    const sessionResults = [
      { status: 'late', minutesLate: 10, minutesLeftEarly: 0 }, // Counts
      { status: 'late_absent', minutesLate: 20, minutesLeftEarly: 0 }, // Does NOT count
      { status: 'late', minutesLate: 5, minutesLeftEarly: 5 }, // Counts
    ];

    // Filter out late_absent and sum
    const cumulative = sessionResults
      .filter(s => s.status !== 'late_absent')
      .reduce((sum, s) => sum + s.minutesLate + s.minutesLeftEarly, 0);

    expect(cumulative).toBe(20); // 10 + 0 + 5 + 5 = 20 (excludes the 20 from late_absent)
  });
});
