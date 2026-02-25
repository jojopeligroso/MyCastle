/**
 * Import Row Matcher - OPTIMIZED VERSION
 * Key changes:
 * 1. Pre-fetch all enrollments in single query
 * 2. Process matching in parallel batches with Promise.all()
 * 3. In-memory matching instead of N+1 queries
 */

import { db } from '@/db';
import { enrollments, classes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ParsedRow } from './parser';

export interface MatchCandidate {
  enrollmentId: string;
  studentName: string | null;
  className: string;
  score: number;
}

export interface MatchResult {
  type: 'no_match' | 'single_match' | 'ambiguous';
  candidates: MatchCandidate[];
  bestMatch: MatchCandidate | null;
}

// Keep existing similarity functions unchanged
function calculateStringSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 80;

  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  const distance = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  return Math.round((1 - distance / maxLen) * 100);
}

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

function calculateMatchScore(
  parsed: ParsedRow['parsedData'],
  candidate: { studentName: string | null; className: string; startDate: Date | string | null }
): number {
  const nameScore = calculateStringSimilarity(parsed.studentName, candidate.studentName);
  const classScore = calculateStringSimilarity(parsed.className, candidate.className);
  let dateScore = 0;
  if (parsed.startDate && candidate.startDate) {
    const candidateDate =
      candidate.startDate instanceof Date ? candidate.startDate : new Date(candidate.startDate);
    dateScore = calculateDateSimilarity(parsed.startDate, candidateDate);
  }
  return Math.round(nameScore * 0.4 + classScore * 0.4 + dateScore * 0.2);
}

const MATCH_THRESHOLD = 70;
const EXACT_MATCH_THRESHOLD = 95;
const AMBIGUITY_RANGE = 15;

// Type for cached enrollment data
interface CachedEnrollment {
  enrollmentId: string;
  studentName: string | null;
  className: string;
  startDate: Date | string | null;
  studentNameLower: string; // Pre-computed for faster matching
}

/**
 * OPTIMIZED: Pre-fetch ALL active enrollments for tenant in single query
 */
async function prefetchAllEnrollments(tenantId: string): Promise<CachedEnrollment[]> {
  console.time('prefetchAllEnrollments');

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
    .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.status, 'active')));

  console.timeEnd('prefetchAllEnrollments');
  console.log(`Prefetched ${results.length} enrollments`);

  // Pre-compute lowercase names for faster matching
  return results.map(r => ({
    ...r,
    studentNameLower: (r.studentName || '').toLowerCase(),
  }));
}

/**
 * OPTIMIZED: Match against cached enrollments (in-memory, no DB query)
 */
function findCandidatesInMemory(
  parsed: ParsedRow['parsedData'],
  cachedEnrollments: CachedEnrollment[]
): MatchResult {
  if (!parsed.studentName || !parsed.className) {
    return { type: 'no_match', candidates: [], bestMatch: null };
  }

  const searchFirstName = parsed.studentName.split(' ')[0].toLowerCase();

  // Filter candidates by first name match (fast in-memory filter)
  const potentialMatches = cachedEnrollments.filter(e =>
    e.studentNameLower.includes(searchFirstName)
  );

  if (potentialMatches.length === 0) {
    return { type: 'no_match', candidates: [], bestMatch: null };
  }

  // Score candidates
  const scoredCandidates: MatchCandidate[] = potentialMatches
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

  if (scoredCandidates.length === 1 || bestCandidate.score >= EXACT_MATCH_THRESHOLD) {
    return { type: 'single_match', candidates: scoredCandidates, bestMatch: bestCandidate };
  }

  const closeMatches = scoredCandidates.filter(
    c => bestCandidate.score - c.score <= AMBIGUITY_RANGE
  );

  if (closeMatches.length > 1) {
    return { type: 'ambiguous', candidates: scoredCandidates, bestMatch: bestCandidate };
  }

  return { type: 'single_match', candidates: scoredCandidates, bestMatch: bestCandidate };
}

/**
 * OPTIMIZED: Calculate diff (still needs DB query, but batched)
 */
export async function calculateDiff(
  tenantId: string,
  parsed: ParsedRow['parsedData'],
  enrollmentId: string
): Promise<Record<string, { old: unknown; new: unknown }>> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

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

  if (!existing) return diff;

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
 * OPTIMIZED: Batch process with pre-fetched data and parallel diff calculations
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
  console.time('processRowsForMatching');

  // OPTIMIZATION 1: Pre-fetch all enrollments in single query
  const cachedEnrollments = await prefetchAllEnrollments(tenantId);

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

  // OPTIMIZATION 2: Process matching in-memory (no DB queries in loop)
  console.time('inMemoryMatching');
  const matchResults = rows.map(row => ({
    row,
    matchResult: row.isValid
      ? findCandidatesInMemory(row.parsedData, cachedEnrollments)
      : { type: 'no_match' as const, candidates: [], bestMatch: null },
  }));
  console.timeEnd('inMemoryMatching');

  // OPTIMIZATION 3: Batch diff calculations with Promise.all (parallel)
  console.time('diffCalculations');
  const diffPromises: Promise<{
    index: number;
    diff: Record<string, { old: unknown; new: unknown }>;
  }>[] = [];

  matchResults.forEach((mr, index) => {
    if (mr.row.isValid && mr.matchResult.type === 'single_match' && mr.matchResult.bestMatch) {
      diffPromises.push(
        calculateDiff(tenantId, mr.row.parsedData, mr.matchResult.bestMatch.enrollmentId).then(
          diff => ({ index, diff })
        )
      );
    }
  });

  const diffResults = await Promise.all(diffPromises);
  const diffMap = new Map(diffResults.map(d => [d.index, d.diff]));
  console.timeEnd('diffCalculations');

  // Build final results
  matchResults.forEach((mr, index) => {
    const { row, matchResult } = mr;

    if (!row.isValid) {
      counts.invalid++;
      results.push({
        rowNumber: row.rowNumber,
        rowStatus: 'INVALID',
        matchResult: { type: 'no_match', candidates: [], bestMatch: null },
        action: 'NEEDS_RESOLUTION',
      });
      return;
    }

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
      const diff = diffMap.get(index);
      if (diff && Object.keys(diff).length > 0) {
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
  });

  console.timeEnd('processRowsForMatching');
  return { rowResults: results, counts };
}

/**
 * Find candidate enrollments for a parsed row
 * DEPRECATED: Use processRowsForMatching for batch operations
 * Kept for backwards compatibility with single-row operations
 */
export async function findCandidateEnrollments(
  tenantId: string,
  parsed: ParsedRow['parsedData']
): Promise<MatchResult> {
  // For single-row lookups, fetch and match immediately
  const cachedEnrollments = await prefetchAllEnrollments(tenantId);
  return findCandidatesInMemory(parsed, cachedEnrollments);
}
