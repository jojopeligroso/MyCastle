/**
 * Column Matcher for Import Module
 * Matches Excel headers to schema fields using multiple strategies
 * Ref: spec/IMPORTS_UI_SPEC.md
 */

import {
  IMPORTABLE_FIELDS,
  ImportableField,
  buildAliasMap,
  normalizeForMatching,
  FIELD_MAP,
} from './schema-registry';

/**
 * Result of matching a single Excel header
 */
export interface ColumnMatchEntry {
  /** Original Excel header */
  excelHeader: string;
  /** Index of the header in the Excel file */
  headerIndex: number;
  /** Matched field definition (null if no match) */
  matchedField: ImportableField | null;
  /** Confidence score 0-100 */
  confidence: number;
  /** How the match was made */
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
}

/**
 * Result of matching all columns
 */
export interface ColumnColumnMatchEntry {
  /** Successfully matched columns */
  matched: ColumnMatchEntry[];
  /** Columns that couldn't be matched (stray columns) */
  unmatched: string[];
  /** Summary of matching */
  summary: {
    totalHeaders: number;
    matchedCount: number;
    unmatchedCount: number;
    requiredFieldsMissing: string[];
  };
}

/**
 * Position-based date column tracking
 * Used to handle "Start Date" / "End Date" appearing twice (course + accommodation)
 */
interface DateColumnContext {
  afterAccomType: boolean;
  courseStartFound: boolean;
  courseEndFound: boolean;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first column and row
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity percentage based on Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Find best fuzzy match for a header
 */
function findFuzzyMatch(
  normalizedHeader: string,
  threshold: number = 80
): { field: ImportableField; confidence: number } | null {
  let bestMatch: ImportableField | null = null;
  let bestScore = 0;

  for (const field of IMPORTABLE_FIELDS) {
    // Check against display label
    const labelScore = calculateSimilarity(normalizedHeader, normalizeForMatching(field.label));
    if (labelScore > bestScore && labelScore >= threshold) {
      bestScore = labelScore;
      bestMatch = field;
    }

    // Check against all aliases
    for (const alias of field.aliases) {
      const aliasScore = calculateSimilarity(normalizedHeader, normalizeForMatching(alias));
      if (aliasScore > bestScore && aliasScore >= threshold) {
        bestScore = aliasScore;
        bestMatch = field;
      }
    }
  }

  if (bestMatch && bestScore >= threshold) {
    return { field: bestMatch, confidence: bestScore };
  }

  return null;
}

/**
 * Check if a header indicates accommodation type column
 */
function isAccommodationTypeHeader(normalizedHeader: string): boolean {
  const accomPatterns = ['accom type', 'accommodation type', 'accomtype', 'accommodationtype'];
  return accomPatterns.some(pattern => normalizedHeader.includes(pattern));
}

/**
 * Check if a header is a date column that needs position-based disambiguation
 */
function isAmbiguousDateHeader(normalizedHeader: string): boolean {
  const datePatterns = ['start date', 'startdate', 'start', 'end date', 'enddate', 'end'];
  return datePatterns.some(
    pattern => normalizedHeader === pattern || normalizedHeader === pattern.replace(' ', '')
  );
}

/**
 * Match a single header with position context
 */
function matchSingleHeader(
  header: string,
  headerIndex: number,
  aliasMap: Map<string, string>,
  dateContext: DateColumnContext
): ColumnMatchEntry {
  const normalized = normalizeForMatching(header);

  // Handle position-based date column disambiguation
  if (isAmbiguousDateHeader(normalized)) {
    const isStartDate = normalized.includes('start');
    const isEndDate = normalized.includes('end');

    if (dateContext.afterAccomType) {
      // After Accom Type, these are accommodation dates
      if (isStartDate) {
        return {
          excelHeader: header,
          headerIndex,
          matchedField: FIELD_MAP.get('accommodationStartDate') || null,
          confidence: 100,
          matchType: 'exact',
        };
      }
      if (isEndDate) {
        return {
          excelHeader: header,
          headerIndex,
          matchedField: FIELD_MAP.get('accommodationEndDate') || null,
          confidence: 100,
          matchType: 'exact',
        };
      }
    } else {
      // Before Accom Type, these are course dates
      if (isStartDate && !dateContext.courseStartFound) {
        return {
          excelHeader: header,
          headerIndex,
          matchedField: FIELD_MAP.get('courseStartDate') || null,
          confidence: 100,
          matchType: 'exact',
        };
      }
      if (isEndDate && !dateContext.courseEndFound) {
        return {
          excelHeader: header,
          headerIndex,
          matchedField: FIELD_MAP.get('courseEndDate') || null,
          confidence: 100,
          matchType: 'exact',
        };
      }
    }
  }

  // Strategy 1: Exact match via alias map
  const exactMatch = aliasMap.get(normalized);
  if (exactMatch) {
    const field = FIELD_MAP.get(exactMatch);
    if (field) {
      return {
        excelHeader: header,
        headerIndex,
        matchedField: field,
        confidence: 100,
        matchType: 'exact',
      };
    }
  }

  // Strategy 2: Alias match (check if normalized header contains any alias)
  for (const field of IMPORTABLE_FIELDS) {
    for (const alias of field.aliases) {
      const normalizedAlias = normalizeForMatching(alias);
      if (normalized === normalizedAlias) {
        return {
          excelHeader: header,
          headerIndex,
          matchedField: field,
          confidence: 100,
          matchType: 'alias',
        };
      }
    }
  }

  // Strategy 3: Fuzzy match (Levenshtein > 80%)
  const fuzzyResult = findFuzzyMatch(normalized, 80);
  if (fuzzyResult) {
    return {
      excelHeader: header,
      headerIndex,
      matchedField: fuzzyResult.field,
      confidence: fuzzyResult.confidence,
      matchType: 'fuzzy',
    };
  }

  // No match found
  return {
    excelHeader: header,
    headerIndex,
    matchedField: null,
    confidence: 0,
    matchType: 'none',
  };
}

/**
 * Match Excel headers to schema fields
 * Uses multiple strategies: exact, alias, fuzzy
 * Handles position-based disambiguation for duplicate column names
 */
export function matchColumns(excelHeaders: string[]): ColumnColumnMatchEntry {
  const aliasMap = buildAliasMap();
  const matched: ColumnMatchEntry[] = [];
  const unmatched: string[] = [];
  const matchedFieldNames = new Set<string>();

  // Track date context for position-based matching
  const dateContext: DateColumnContext = {
    afterAccomType: false,
    courseStartFound: false,
    courseEndFound: false,
  };

  // First pass: detect accommodation type position
  for (const header of excelHeaders) {
    if (isAccommodationTypeHeader(normalizeForMatching(header))) {
      // We'll set afterAccomType when we process past this header
      break;
    }
  }

  // Match each header
  for (let i = 0; i < excelHeaders.length; i++) {
    const header = excelHeaders[i];
    const normalized = normalizeForMatching(header);

    // Update date context when we pass accommodation type
    if (isAccommodationTypeHeader(normalized)) {
      dateContext.afterAccomType = true;
    }

    const result = matchSingleHeader(header, i, aliasMap, dateContext);

    // Avoid duplicate matches - first match wins
    if (result.matchedField && !matchedFieldNames.has(result.matchedField.name)) {
      matchedFieldNames.add(result.matchedField.name);
      matched.push(result);

      // Track course date matches
      if (result.matchedField.name === 'courseStartDate') {
        dateContext.courseStartFound = true;
      }
      if (result.matchedField.name === 'courseEndDate') {
        dateContext.courseEndFound = true;
      }
    } else if (result.matchedField && matchedFieldNames.has(result.matchedField.name)) {
      // Already matched this field - treat as unmatched
      unmatched.push(header);
    } else {
      unmatched.push(header);
    }
  }

  // Check for missing required fields
  const requiredFields = IMPORTABLE_FIELDS.filter(f => f.required);
  const requiredFieldsMissing: string[] = [];

  for (const field of requiredFields) {
    if (!matchedFieldNames.has(field.name)) {
      requiredFieldsMissing.push(field.label);
    }
  }

  return {
    matched,
    unmatched,
    summary: {
      totalHeaders: excelHeaders.length,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      requiredFieldsMissing,
    },
  };
}

/**
 * Create a field mapping object from match results
 * Maps header index to field name
 */
export function createFieldMapping(matchResult: ColumnColumnMatchEntry): Map<number, string> {
  const mapping = new Map<number, string>();

  for (const match of matchResult.matched) {
    if (match.matchedField) {
      mapping.set(match.headerIndex, match.matchedField.name);
    }
  }

  return mapping;
}

/**
 * Format matching summary for display
 */
export function formatMatchingSummary(result: ColumnColumnMatchEntry): string {
  const lines: string[] = [];

  lines.push(`Matched ${result.summary.matchedCount}/${result.summary.totalHeaders} columns`);

  if (result.summary.unmatchedCount > 0) {
    lines.push(`Ignored: ${result.unmatched.join(', ')}`);
  }

  if (result.summary.requiredFieldsMissing.length > 0) {
    lines.push(`Missing required: ${result.summary.requiredFieldsMissing.join(', ')}`);
  }

  return lines.join('\n');
}
