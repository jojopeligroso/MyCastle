/**
 * Import Row Matcher
 * Matches parsed rows to existing enrollments
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import { db } from '@/db';
import { enrollments, classes, users } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ParsedRow } from './parser';

/**
 * Match candidate representing a potential enrollment match
 */
export interface MatchCandidate {
  enrollmentId: string;
  studentName: string;
  className: string;
  score: number; // 0-100 matching score
}

/**
 * Match result for a parsed row
 */
export interface MatchResult {
  type: 'no_match' | 'single_match' | 'ambiguous';
  candidates: MatchCandidate[];
  bestMatch: MatchCandidate | null;
}

/**
 * Calculate similarity score between two strings (0-100)
 * Uses Levenshtein-like approach with normalization
 */
function calculateStringSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;

  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 100;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 80;
  }

  // Calculate Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);

  // Convert distance to similarity score (0-100)
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Calculate date similarity (0-100)
 * Exact match = 100, within 7 days = 80, within 30 days = 50
 */
function calculateDateSimilarity(a: Date | null, b: Date | null): number {
  if (!a || !b) return 0;

  const diffMs = Math.abs(a.getTime() - b.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return 100;
  if (diffDays <= 7) return 80;
  if (diffDays <= 30) return 50;
  if (diffDays <= 90) return 20;
  return 0;
}

/**
 * Calculate overall match score for an enrollment candidate
 * Weights:
 * - Student name: 40%
 * - Class name: 40%
 * - Start date: 20%
 */
function calculateMatchScore(
  parsed: ParsedRow['parsedData'],
  candidate: {
    studentName: string;
    className: string;
    startDate: Date | string | null;
  }
): number {
  const nameScore = calculateStringSimilarity(parsed.studentName, candidate.studentName);
  const classScore = calculateStringSimilarity(parsed.className, candidate.className);

  let dateScore = 0;
  if (parsed.startDate && candidate.startDate) {
    const candidateDate =
      candidate.startDate instanceof Date ? candidate.startDate : new Date(candidate.startDate);
    dateScore = calculateDateSimilarity(parsed.startDate, candidateDate);
  }

  // Weighted average
  return Math.round(nameScore * 0.4 + classScore * 0.4 + dateScore * 0.2);
}

/**
 * Thresholds for matching
 */
const MATCH_THRESHOLD = 70; // Minimum score to consider a match
const EXACT_MATCH_THRESHOLD = 95; // Score for a definitive single match
const AMBIGUITY_RANGE = 15; // If multiple matches within this range, consider ambiguous

/**
 * Find candidate enrollments for a parsed row
 * @param tenantId - Tenant ID for RLS
 * @param parsed - Parsed row data
 * @returns Match result with candidates
 */
export async function findCandidateEnrollments(
  tenantId: string,
  parsed: ParsedRow['parsedData']
): Promise<MatchResult> {
  // Skip if required fields are missing
  if (!parsed.studentName || !parsed.className) {
    return { type: 'no_match', candidates: [], bestMatch: null };
  }

  // Query enrollments with student and class info
  // Using fuzzy matching on student name and class name
  const results = await db
    .select({
      enrollmentId: enrollments.id,
      studentName: users.name,
      className: classes.name,
      startDate: enrollments.enrollmentDate,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(
      and(
        eq(enrollments.tenantId, tenantId),
        eq(enrollments.status, 'active'),
        // Use ILIKE for case-insensitive partial matching on student name
        sql`${users.name} ILIKE ${'%' + parsed.studentName.split(' ')[0] + '%'}`
      )
    )
    .limit(50); // Limit candidates for performance

  if (results.length === 0) {
    return { type: 'no_match', candidates: [], bestMatch: null };
  }

  // Calculate match scores
  const scoredCandidates: MatchCandidate[] = results
    .map(r => ({
      enrollmentId: r.enrollmentId,
      studentName: r.studentName,
      className: r.className,
      score: calculateMatchScore(parsed, {
        studentName: r.studentName,
        className: r.className,
        startDate: r.startDate,
      }),
    }))
    .filter(c => c.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (scoredCandidates.length === 0) {
    return { type: 'no_match', candidates: [], bestMatch: null };
  }

  const bestCandidate = scoredCandidates[0];

  // Single exact match
  if (scoredCandidates.length === 1 || bestCandidate.score >= EXACT_MATCH_THRESHOLD) {
    return {
      type: 'single_match',
      candidates: scoredCandidates,
      bestMatch: bestCandidate,
    };
  }

  // Check for ambiguity - multiple candidates with similar scores
  const closeMatches = scoredCandidates.filter(
    c => bestCandidate.score - c.score <= AMBIGUITY_RANGE
  );

  if (closeMatches.length > 1) {
    return {
      type: 'ambiguous',
      candidates: scoredCandidates,
      bestMatch: bestCandidate,
    };
  }

  // Best match is clearly better
  return {
    type: 'single_match',
    candidates: scoredCandidates,
    bestMatch: bestCandidate,
  };
}

/**
 * Calculate diff between parsed data and existing enrollment
 * Returns changed fields only
 */
export async function calculateDiff(
  tenantId: string,
  parsed: ParsedRow['parsedData'],
  enrollmentId: string
): Promise<Record<string, { old: unknown; new: unknown }>> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  // Fetch existing enrollment with related data
  const [existing] = await db
    .select({
      studentName: users.name,
      className: classes.name,
      enrollmentDate: enrollments.enrollmentDate,
      expectedEndDate: enrollments.expectedEndDate,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return diff;
  }

  // Compare fields
  if (
    parsed.studentName &&
    existing.studentName !== parsed.studentName &&
    calculateStringSimilarity(existing.studentName, parsed.studentName) < 95
  ) {
    diff.studentName = { old: existing.studentName, new: parsed.studentName };
  }

  if (
    parsed.className &&
    existing.className !== parsed.className &&
    calculateStringSimilarity(existing.className, parsed.className) < 95
  ) {
    diff.className = { old: existing.className, new: parsed.className };
  }

  // Compare dates
  if (parsed.startDate && existing.enrollmentDate) {
    const existingDate = new Date(existing.enrollmentDate);
    if (parsed.startDate.toDateString() !== existingDate.toDateString()) {
      diff.startDate = {
        old: existing.enrollmentDate,
        new: parsed.startDate.toISOString().split('T')[0],
      };
    }
  }

  if (parsed.endDate) {
    const existingEndDate = existing.expectedEndDate ? new Date(existing.expectedEndDate) : null;
    if (!existingEndDate || parsed.endDate.toDateString() !== existingEndDate.toDateString()) {
      diff.endDate = {
        old: existing.expectedEndDate,
        new: parsed.endDate.toISOString().split('T')[0],
      };
    }
  }

  return diff;
}

/**
 * Batch process all rows for matching
 * Returns row statuses and proposed changes
 */
export async function processRowsForMatching(
  tenantId: string,
  rows: ParsedRow[]
): Promise<{
  rowResults: Array<{
    rowNumber: number;
    rowStatus: 'VALID' | 'INVALID' | 'AMBIGUOUS';
    matchResult: MatchResult;
    action: 'INSERT' | 'UPDATE' | 'NOOP' | 'NEEDS_RESOLUTION';
    diff?: Record<string, { old: unknown; new: unknown }>;
  }>;
  counts: {
    valid: number;
    invalid: number;
    ambiguous: number;
    inserts: number;
    updates: number;
    noops: number;
  };
}> {
  const results: Array<{
    rowNumber: number;
    rowStatus: 'VALID' | 'INVALID' | 'AMBIGUOUS';
    matchResult: MatchResult;
    action: 'INSERT' | 'UPDATE' | 'NOOP' | 'NEEDS_RESOLUTION';
    diff?: Record<string, { old: unknown; new: unknown }>;
  }> = [];

  const counts = {
    valid: 0,
    invalid: 0,
    ambiguous: 0,
    inserts: 0,
    updates: 0,
    noops: 0,
  };

  for (const row of rows) {
    // Invalid rows skip matching
    if (!row.isValid) {
      counts.invalid++;
      results.push({
        rowNumber: row.rowNumber,
        rowStatus: 'INVALID',
        matchResult: { type: 'no_match', candidates: [], bestMatch: null },
        action: 'NEEDS_RESOLUTION',
      });
      continue;
    }

    // Find matches
    const matchResult = await findCandidateEnrollments(tenantId, row.parsedData);

    if (matchResult.type === 'no_match') {
      counts.valid++;
      counts.inserts++;
      results.push({
        rowNumber: row.rowNumber,
        rowStatus: 'VALID',
        matchResult,
        action: 'INSERT',
      });
    } else if (matchResult.type === 'single_match') {
      counts.valid++;

      // Calculate diff to determine UPDATE vs NOOP
      const diff = await calculateDiff(
        tenantId,
        row.parsedData,
        matchResult.bestMatch!.enrollmentId
      );

      if (Object.keys(diff).length > 0) {
        counts.updates++;
        results.push({
          rowNumber: row.rowNumber,
          rowStatus: 'VALID',
          matchResult,
          action: 'UPDATE',
          diff,
        });
      } else {
        counts.noops++;
        results.push({
          rowNumber: row.rowNumber,
          rowStatus: 'VALID',
          matchResult,
          action: 'NOOP',
        });
      }
    } else {
      // Ambiguous
      counts.ambiguous++;
      results.push({
        rowNumber: row.rowNumber,
        rowStatus: 'AMBIGUOUS',
        matchResult,
        action: 'NEEDS_RESOLUTION',
      });
    }
  }

  return { rowResults: results, counts };
}
