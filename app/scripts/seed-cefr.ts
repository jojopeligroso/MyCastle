/**
 * CEFR Database Seeder
 * Seeds the cefr_descriptors table from a CSV file
 *
 * Usage:
 * ```
 * npm run seed:cefr -- path/to/cefr-data.csv [--clear]
 * ```
 *
 * Options:
 * --clear: Clear existing CEFR descriptors before seeding
 */

import { parseCEFRFile } from './parse-cefr-csv';
import { db, schema } from '../src/db';
import { sql } from 'drizzle-orm';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const { cefrDescriptors } = schema;

/**
 * Seed CEFR descriptors into the database
 */
async function seedCEFRDescriptors(filePath: string, clearExisting: boolean = false) {
  console.log('🌱 CEFR Database Seeder');
  console.log('=======================\n');

  try {
    // Parse the file
    console.log(`📄 Parsing file: ${filePath}`);
    const parseResult = parseCEFRFile(filePath);

    if (!parseResult.success) {
      console.error('\n❌ Failed to parse CEFR file:');
      parseResult.errors?.forEach(e => console.error(`  - ${e}`));
      process.exit(1);
    }

    if (parseResult.warnings && parseResult.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      parseResult.warnings.forEach(w => console.warn(`  - ${w}`));
    }

    const descriptors = parseResult.data!;
    console.log(`\n✅ Parsed ${descriptors.length} descriptors`);

    // Clear existing data if requested
    if (clearExisting) {
      console.log('\n🗑️  Clearing existing CEFR descriptors...');
      await db.delete(cefrDescriptors);
      console.log('✅ Existing data cleared');
    }

    // Insert descriptors in batches
    console.log('\n💾 Inserting descriptors into database...');
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < descriptors.length; i += batchSize) {
      const batch = descriptors.slice(i, i + batchSize);

      await db.insert(cefrDescriptors).values(
        batch.map(d => ({
          level: d.level,
          category: d.category,
          subcategory: d.subcategory || null,
          descriptor_text: d.descriptor_text,
          metadata: d.metadata || {},
        })),
      );

      inserted += batch.length;
      process.stdout.write(`\r  Inserted: ${inserted}/${descriptors.length}`);
    }

    console.log('\n\n✅ Successfully seeded CEFR descriptors!');

    // Show summary
    console.log('\n📊 Summary:');
    const summary = await db
      .select({
        level: cefrDescriptors.level,
        count: sql<number>`count(*)::int`,
      })
      .from(cefrDescriptors)
      .groupBy(cefrDescriptors.level)
      .orderBy(cefrDescriptors.level);

    summary.forEach(({ level, count }) => {
      console.log(`  ${level}: ${count} descriptors`);
    });

    // Show total
    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cefrDescriptors);

    console.log(`\n  Total: ${total?.count || 0} descriptors`);
  } catch (error) {
    console.error('\n❌ Error seeding database:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  // Check for --clear flag
  const clearIndex = args.indexOf('--clear');
  const clearExisting = clearIndex !== -1;
  if (clearExisting) {
    args.splice(clearIndex, 1);
  }

  if (args.length === 0) {
    console.error('Usage: tsx scripts/seed-cefr.ts <path-to-csv-file> [--clear]');
    console.error('\nOptions:');
    console.error('  --clear    Clear existing CEFR descriptors before seeding');
    process.exit(1);
  }

  const filePath = join(process.cwd(), args[0]);

  if (clearExisting) {
    console.log('⚠️  WARNING: This will clear all existing CEFR descriptors!');
    console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)\n');

    setTimeout(() => {
      seedCEFRDescriptors(filePath, clearExisting);
    }, 3000);
  } else {
    seedCEFRDescriptors(filePath, clearExisting);
  }
}
