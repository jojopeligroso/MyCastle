/**
 * Session Generation Utility
 * Automatically generates class session records based on class schedule
 */

import { NewClassSession } from '@/db/schema/academic';

interface GenerateSessionsParams {
  classId: string;
  tenantId: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string | null; // ISO date string (YYYY-MM-DD) or null for ongoing
  daysOfWeek: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

/**
 * Maps day names to JavaScript day numbers (0 = Sunday, 1 = Monday, etc.)
 */
const DAY_NAME_TO_NUMBER: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Generate class session records for a given date range and schedule
 *
 * @param params - Session generation parameters
 * @returns Array of NewClassSession objects ready to insert
 *
 * @example
 * const sessions = generateSessions({
 *   classId: 'uuid',
 *   tenantId: 'uuid',
 *   startDate: '2026-01-27',
 *   endDate: '2026-03-27',
 *   daysOfWeek: ['Monday', 'Wednesday', 'Friday'],
 *   startTime: '09:00',
 *   endTime: '11:00',
 * });
 * // Returns ~26 session records (9 weeks × 3 days/week)
 */
export function generateSessions(params: GenerateSessionsParams): NewClassSession[] {
  const { classId, tenantId, startDate, endDate, daysOfWeek, startTime, endTime } = params;

  // Validate inputs
  if (!classId || !tenantId || !startDate) {
    throw new Error('Missing required parameters for session generation');
  }

  if (!daysOfWeek || daysOfWeek.length === 0) {
    throw new Error('At least one day of week must be specified');
  }

  if (!startTime || !endTime) {
    throw new Error('Start time and end time are required');
  }

  // Convert day names to day numbers
  const dayNumbers = daysOfWeek
    .map(day => DAY_NAME_TO_NUMBER[day])
    .filter(num => num !== undefined);

  if (dayNumbers.length === 0) {
    throw new Error('Invalid day names provided');
  }

  // Parse dates (avoid timezone issues by using local dates)
  const start = new Date(startDate + 'T00:00:00');
  const end = endDate ? new Date(endDate + 'T00:00:00') : null;

  // Validate date range
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start date');
  }

  if (end && isNaN(end.getTime())) {
    throw new Error('Invalid end date');
  }

  if (end && end < start) {
    throw new Error('End date must be after start date');
  }

  // If no end date, default to 12 weeks from start (typical term length)
  const effectiveEnd = end || new Date(start.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);

  // Generate sessions
  const sessions: NewClassSession[] = [];
  const currentDate = new Date(start);

  // Iterate through each day in the date range
  while (currentDate <= effectiveEnd) {
    const dayOfWeek = currentDate.getDay();

    // Check if this day matches our schedule
    if (dayNumbers.includes(dayOfWeek)) {
      // Format date as YYYY-MM-DD for PostgreSQL DATE type
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const sessionDateStr = `${year}-${month}-${day}`;

      sessions.push({
        tenantId,
        classId,
        sessionDate: sessionDateStr,
        startTime,
        endTime,
        topic: null,
        notes: null,
        status: 'scheduled',
      });
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return sessions;
}

/**
 * Calculate total number of sessions that will be generated
 * Useful for displaying preview before generation
 */
export function calculateSessionCount(
  params: Omit<GenerateSessionsParams, 'classId' | 'tenantId'>
): number {
  try {
    // Use dummy IDs for calculation
    const sessions = generateSessions({
      ...params,
      classId: 'dummy',
      tenantId: 'dummy',
    });
    return sessions.length;
  } catch {
    return 0;
  }
}
