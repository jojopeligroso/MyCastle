/**
 * Seed CEFR Descriptors from Excel Files
 *
 * Imports two data sources:
 * - File A: CEFR Filtering tool.xlsx (1,229 official CEFR descriptors)
 * - File B: CEFR descriptions in Speakout Second Edition books.xlsx (696 textbook mappings)
 *
 * Usage: npx tsx scripts/seed-cefr-descriptors.ts [--force]
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import { db } from '../src/db';
import { cefrDescriptors, textbookDescriptors } from '../src/db/schema/curriculum';

// File paths (relative to MyCastle root)
const FILE_A_PATH = path.resolve(__dirname, '../../CEFR Filtering tool.xlsx');
const FILE_B_PATH = path.resolve(
  __dirname,
  '../../CEFR descriptions in Speakout Second Edition books.xlsx'
);

/**
 * Normalize CEFR level to standard format
 */
function normalizeLevel(level: string): string {
  if (!level) return 'A1';
  const normalized = level.toString().trim().toUpperCase();
  // Handle variations like "A2+" -> "A2+"
  return normalized;
}

/**
 * Extract category from skill focus (for legacy compatibility)
 */
function extractCategory(skillFocus: string | undefined): string {
  if (!skillFocus) return 'General';
  const skill = skillFocus.toString().trim();
  // Map to standard categories
  if (skill.toLowerCase().includes('speak')) return 'Speaking';
  if (skill.toLowerCase().includes('listen')) return 'Listening';
  if (skill.toLowerCase().includes('read')) return 'Reading';
  if (skill.toLowerCase().includes('writ')) return 'Writing';
  if (skill.toLowerCase().includes('mediat')) return 'Mediation';
  return skill || 'General';
}

// Row type for File A
interface FileARow {
  Index?: number;
  'Activity.Strategy.Competence'?: string | number;
  Competencies?: string;
  Strategies?: string | number;
  Mode?: string | number;
  'Skill focus'?: string;
  Overall?: string;
  Scale?: string;
  Level?: string;
  'CEFR CV 2020 Descriptor'?: string;
  'Young Learners (7 - 10) descriptors'?: string;
  'Young Learners (11 - 15) descriptors'?: string;
}

// Row type for File B
interface FileBRow {
  'Skill focus'?: string;
  Book?: string;
  Unit?: string;
  Page?: number;
  Level?: string;
  Lesson?: string;
  Descriptor?: string;
}

/**
 * Import File A: Official CEFR Descriptors
 */
async function importFileA(): Promise<number> {
  console.log('\n📖 Reading File A: CEFR Filtering tool.xlsx...');

  const workbook = XLSX.readFile(FILE_A_PATH);
  const sheetName = workbook.SheetNames[0]; // 'CEFR descriptors'
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<FileARow>(sheet);

  console.log(`   Found ${data.length} rows in sheet "${sheetName}"`);

  // Filter valid rows (must have descriptor text and level)
  const validRows = data.filter(
    row =>
      row['CEFR CV 2020 Descriptor'] &&
      row['CEFR CV 2020 Descriptor'].toString().trim() !== '' &&
      row['Level']
  );

  console.log(`   ${validRows.length} rows have valid descriptor text`);

  // Transform to database format
  const descriptors = validRows.map((row, index) => ({
    level: normalizeLevel(row['Level'] || ''),
    category: extractCategory(row['Skill focus']),
    subcategory: row['Scale'] || null,
    descriptorText: (row['CEFR CV 2020 Descriptor'] || '').trim(),

    // File A specific columns
    sourceIndex: row['Index'] ? Number(row['Index']) : index + 1,
    activityStrategyCompetence:
      row['Activity.Strategy.Competence'] !== 0
        ? String(row['Activity.Strategy.Competence'])
        : null,
    competencies: row['Competencies'] ? String(row['Competencies']) : null,
    strategies: row['Strategies'] !== 0 ? String(row['Strategies']) : null,
    mode: row['Mode'] !== 0 ? String(row['Mode']) : null,
    skillFocus: row['Skill focus'] || null,
    isOverall: row['Overall'] === 'Yes',
    scale: row['Scale'] || null,

    // Young Learner variants
    youngLearners7To10:
      row['Young Learners (7 - 10) descriptors'] &&
      row['Young Learners (7 - 10) descriptors'] !== 'None available'
        ? String(row['Young Learners (7 - 10) descriptors'])
        : null,
    youngLearners11To15:
      row['Young Learners (11 - 15) descriptors'] &&
      row['Young Learners (11 - 15) descriptors'] !== 'None available'
        ? String(row['Young Learners (11 - 15) descriptors'])
        : null,

    metadata: {},
  }));

  // Insert in batches
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < descriptors.length; i += BATCH_SIZE) {
    const batch = descriptors.slice(i, i + BATCH_SIZE);
    await db.insert(cefrDescriptors).values(batch);
    inserted += batch.length;
    process.stdout.write(`\r   Inserted ${inserted}/${descriptors.length} descriptors...`);
  }

  console.log(`\n✅ Imported ${inserted} CEFR descriptors from File A`);
  return inserted;
}

/**
 * Import File B: Speakout Textbook Descriptors
 */
async function importFileB(): Promise<number> {
  console.log('\n📖 Reading File B: CEFR descriptions in Speakout Second Edition books.xlsx...');

  const workbook = XLSX.readFile(FILE_B_PATH);
  console.log(`   Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);

  const allDescriptors: Array<{
    book: string;
    unit: string;
    page: number | null;
    lesson: string | null;
    level: string;
    skillFocus: string;
    descriptorText: string;
  }> = [];

  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<FileBRow>(sheet);

    // Filter valid rows (must have Descriptor text)
    const validRows = data.filter(
      row => row['Descriptor'] && row['Descriptor'].toString().trim() !== ''
    );

    if (validRows.length === 0) {
      console.log(`   ${sheetName}: 0 valid rows (skipped)`);
      continue;
    }

    console.log(`   ${sheetName}: ${validRows.length} valid rows`);

    // Transform rows
    for (const row of validRows) {
      // Handle page number - ensure it's a valid integer or null
      let pageNum: number | null = null;
      if (row['Page'] !== undefined && row['Page'] !== null) {
        const parsed = Number(row['Page']);
        if (!isNaN(parsed) && isFinite(parsed)) {
          pageNum = Math.floor(parsed);
        }
      }

      allDescriptors.push({
        book: row['Book'] || `Speakout ${sheetName}`,
        unit: row['Unit'] || '',
        page: pageNum,
        lesson: row['Lesson'] || null,
        level: normalizeLevel(row['Level'] || ''),
        skillFocus: row['Skill focus'] || 'General',
        descriptorText: (row['Descriptor'] || '').trim(),
      });
    }
  }

  console.log(`\n   Total valid rows across all sheets: ${allDescriptors.length}`);

  // Insert in batches
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < allDescriptors.length; i += BATCH_SIZE) {
    const batch = allDescriptors.slice(i, i + BATCH_SIZE);
    await db.insert(textbookDescriptors).values(batch);
    inserted += batch.length;
    process.stdout.write(
      `\r   Inserted ${inserted}/${allDescriptors.length} textbook descriptors...`
    );
  }

  console.log(`\n✅ Imported ${inserted} textbook descriptors from File B`);
  return inserted;
}

/**
 * Main seed function
 */
async function seedCEFRDescriptors() {
  console.log('🌱 Starting CEFR descriptors seed...\n');

  const forceMode = process.argv.includes('--force');

  try {
    // Check existing data
    const existingCefr = await db.select().from(cefrDescriptors).limit(1);
    const existingTextbook = await db.select().from(textbookDescriptors).limit(1);

    if (existingCefr.length > 0 || existingTextbook.length > 0) {
      console.log('⚠️  Tables already contain data:');
      if (existingCefr.length > 0) console.log('   - cefr_descriptors has data');
      if (existingTextbook.length > 0) console.log('   - textbook_descriptors has data');

      if (!forceMode) {
        console.log('\nRun with --force to delete existing data and re-seed.');
        process.exit(0);
      }

      console.log('\n🗑️  Deleting existing data (--force mode)...');
      await db.delete(textbookDescriptors);
      await db.delete(cefrDescriptors);
      console.log('✅ Existing data deleted');
    }

    // Import both files
    const cefrCount = await importFileA();
    const textbookCount = await importFileB();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SEED SUMMARY');
    console.log('='.repeat(50));
    console.log(`   CEFR Descriptors (File A):     ${cefrCount.toLocaleString()} rows`);
    console.log(`   Textbook Descriptors (File B): ${textbookCount.toLocaleString()} rows`);
    console.log(
      `   TOTAL:                         ${(cefrCount + textbookCount).toLocaleString()} rows`
    );
    console.log('='.repeat(50));

    console.log('\n🎉 Seed complete!');
    console.log('\n💡 Verify with SQL:');
    console.log('   SELECT level, COUNT(*) FROM cefr_descriptors GROUP BY level ORDER BY level;');
    console.log('   SELECT book, COUNT(*) FROM textbook_descriptors GROUP BY book ORDER BY book;');
  } catch (error) {
    console.error('\n❌ Error seeding CEFR descriptors:', error);
    throw error;
  }
}

// Run seed if executed directly
seedCEFRDescriptors()
  .then(() => {
    console.log('\n✨ Seed script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });
