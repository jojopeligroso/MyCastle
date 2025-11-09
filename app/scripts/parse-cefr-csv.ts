/**
 * CEFR CSV Parser
 * Parses a CSV file containing CEFR descriptors and returns structured data
 *
 * Expected CSV format:
 * Level,Category,Subcategory,Descriptor Text,Metadata
 * A1,Reading,Overall Reading Comprehension,"Can understand very short...","{""skill_type"": ""receptive""}"
 *
 * Usage:
 * ```
 * npm run parse:cefr -- path/to/cefr-data.csv
 * ```
 */

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
 * Parse a CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse CEFR data from a CSV file
 * @param filePath Path to the CSV file
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
    const fileContent = readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return {
        success: false,
        errors: ['File is empty'],
      };
    }

    // Skip header row
    const dataLines = lines.slice(1);

    // Parse each row
    dataLines.forEach((line, index) => {
      const rowNumber = index + 2; // +2 because we skipped header and array is 0-indexed

      // Parse CSV line
      const fields = parseCSVLine(line);

      if (fields.length < 4) {
        warnings.push(`Row ${rowNumber}: Insufficient columns (expected at least 4), skipping`);
        return;
      }

      // Extract values
      const level = fields[0].trim().toUpperCase();
      const category = fields[1].trim();
      const subcategory = fields[2].trim() || undefined;
      const descriptor_text = fields[3].trim();
      const metadataRaw = fields[4] ? fields[4].trim() : '';

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
        subcategory,
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
    console.error('Usage: tsx scripts/parse-cefr-csv.ts <path-to-csv-file>');
    process.exit(1);
  }

  const filePath = join(process.cwd(), args[0]);
  console.log(`📄 Parsing CEFR data from: ${filePath}`);
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

  console.log('📊 Summary by level:');
  VALID_LEVELS.forEach(level => {
    const count = byLevel[level] || 0;
    console.log(`  ${level}: ${count} descriptors`);
  });

  console.log('\n📖 Sample descriptors:');
  result.data!.slice(0, 3).forEach((d, i) => {
    console.log(`\n${i + 1}. [${d.level}] ${d.category}${d.subcategory ? ` > ${d.subcategory}` : ''}`);
    console.log(`   ${d.descriptor_text.substring(0, 100)}${d.descriptor_text.length > 100 ? '...' : ''}`);
  });

  console.log('\n---');
  console.log('✅ To seed the database, run:');
  console.log(`   npm run seed:cefr -- ${args[0]}`);
}
