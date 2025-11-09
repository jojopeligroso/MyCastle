/**
 * CEFR XLSX Parser
 * Parses an Excel file containing CEFR descriptors and returns structured data
 *
 * Expected .xlsx format:
 * - Column A: Level (A1, A2, B1, B2, C1, C2)
 * - Column B: Category (Reading, Writing, Listening, Speaking, etc.)
 * - Column C: Subcategory (optional)
 * - Column D: Descriptor Text
 * - Column E+: Metadata (optional, JSON or key-value pairs)
 *
 * Usage:
 * ```
 * npm run parse:cefr -- path/to/cefr-data.xlsx
 * ```
 */

import * as XLSX from 'xlsx';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CEFRDescriptor {
  level: string;
  category: string;
  subcategory?: string;
  descriptor_text: string;
  metadata?: Record<string, unknown>;
}

interface ParseResult {
  success: boolean;
  data?: CEFRDescriptor[];
  errors?: string[];
  warnings?: string[];
}

/**
 * Valid CEFR levels
 */
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Common CEFR categories
 */
const COMMON_CATEGORIES = [
  'Reading',
  'Writing',
  'Listening',
  'Speaking',
  'Interaction',
  'Production',
  'Reception',
  'Mediation',
];

/**
 * Parse CEFR data from an Excel file
 * @param filePath Path to the .xlsx file
 * @returns ParseResult with descriptors or errors
 */
export function parseCEFRFile(filePath: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const descriptors: CEFRDescriptor[] = [];

  try {
    // Check file exists
    if (!existsSync(filePath)) {
      return {
        success: false,
        errors: [`File not found: ${filePath}`],
      };
    }

    // Read the file
    const fileBuffer = readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        errors: ['No sheets found in the Excel file'],
      };
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON (each row becomes an object)
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      header: ['level', 'category', 'subcategory', 'descriptor_text', 'metadata'],
      defval: '',
      blankrows: false,
    });

    // Skip header row
    const dataRows = rows.slice(1);

    // Parse each row
    dataRows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because we skipped header and array is 0-indexed

      // Extract values
      const level = String(row.level || '').trim().toUpperCase();
      const category = String(row.category || '').trim();
      const subcategory = row.subcategory ? String(row.subcategory).trim() : undefined;
      const descriptor_text = String(row.descriptor_text || '').trim();
      const metadataRaw = row.metadata ? String(row.metadata).trim() : '';

      // Validation
      if (!level) {
        warnings.push(`Row ${rowNumber}: Missing level, skipping`);
        return;
      }

      if (!VALID_LEVELS.includes(level)) {
        warnings.push(`Row ${rowNumber}: Invalid level "${level}". Must be one of: ${VALID_LEVELS.join(', ')}`);
        return;
      }

      if (!category) {
        warnings.push(`Row ${rowNumber}: Missing category, skipping`);
        return;
      }

      if (!descriptor_text) {
        warnings.push(`Row ${rowNumber}: Missing descriptor text, skipping`);
        return;
      }

      // Parse metadata if provided
      let metadata: Record<string, unknown> = {};
      if (metadataRaw) {
        try {
          metadata = JSON.parse(metadataRaw);
        } catch (e) {
          // If not valid JSON, treat as a note
          metadata = { note: metadataRaw };
        }
      }

      // Add to descriptors
      descriptors.push({
        level,
        category,
        subcategory: subcategory || undefined,
        descriptor_text,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    });

    // Summary
    if (descriptors.length === 0) {
      return {
        success: false,
        errors: ['No valid descriptors found in the file'],
        warnings,
      };
    }

    return {
      success: true,
      data: descriptors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings,
    };
  }
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx scripts/parse-cefr-xlsx.ts <path-to-xlsx-file>');
    process.exit(1);
  }

  const filePath = join(process.cwd(), args[0]);
  console.log(`Parsing CEFR data from: ${filePath}`);
  console.log('---');

  const result = parseCEFRFile(filePath);

  if (result.warnings && result.warnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (!result.success) {
    console.error('\n❌ Parsing failed:');
    result.errors?.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`\n✅ Successfully parsed ${result.data!.length} CEFR descriptors\n`);

  // Group by level for summary
  const byLevel = result.data!.reduce(
    (acc, d) => {
      acc[d.level] = (acc[d.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log('Summary by level:');
  VALID_LEVELS.forEach(level => {
    const count = byLevel[level] || 0;
    console.log(`  ${level}: ${count} descriptors`);
  });

  console.log('\nSample descriptors:');
  result.data!.slice(0, 3).forEach((d, i) => {
    console.log(`\n${i + 1}. [${d.level}] ${d.category}${d.subcategory ? ` > ${d.subcategory}` : ''}`);
    console.log(`   ${d.descriptor_text.substring(0, 100)}${d.descriptor_text.length > 100 ? '...' : ''}`);
  });

  console.log('\n---');
  console.log('To seed the database, run:');
  console.log('  npm run seed:cefr -- <path-to-xlsx-file>');
}
