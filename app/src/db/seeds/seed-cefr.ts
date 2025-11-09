/**
 * CEFR Descriptors Seed Script
 * T-034: Seed CEFR Descriptors
 *
 * Usage:
 *   npx tsx src/db/seeds/seed-cefr.ts
 */

import { db } from '@/db';
import { cefrDescriptors } from '@/db/schema/curriculum';
import { cefrDescriptorsData } from './cefr-descriptors-data';
import { eq } from 'drizzle-orm';

async function seedCEFRDescriptors() {
  console.log('🌱 Seeding CEFR Descriptors...');

  try {
    // Check if descriptors already exist
    const existing = await db.select().from(cefrDescriptors).limit(1);

    if (existing.length > 0) {
      console.log('⚠️  CEFR descriptors already seeded. Skipping...');
      console.log('   To re-seed, delete existing records first.');
      return;
    }

    // Insert descriptors
    let count = 0;
    for (const descriptor of cefrDescriptorsData) {
      await db.insert(cefrDescriptors).values({
        level: descriptor.level,
        category: descriptor.category,
        subcategory: descriptor.subcategory,
        descriptor_text: descriptor.descriptor_text,
        metadata: descriptor.metadata || {},
      });
      count++;

      if (count % 10 === 0) {
        console.log(`   Inserted ${count}/${cefrDescriptorsData.length} descriptors...`);
      }
    }

    console.log(`✅ Successfully seeded ${count} CEFR descriptors`);
    console.log('');
    console.log('Summary:');
    console.log(`   Total descriptors: ${count}`);
    console.log(`   Levels: A1, A2, B1, B2, C1, C2`);
    console.log(`   Categories: ${new Set(cefrDescriptorsData.map(d => d.category)).size}`);

    // Verify insertion
    const byLevel = await db
      .select()
      .from(cefrDescriptors)
      .orderBy(cefrDescriptors.level, cefrDescriptors.category);

    const levelCounts: Record<string, number> = {};
    byLevel.forEach(d => {
      levelCounts[d.level] = (levelCounts[d.level] || 0) + 1;
    });

    console.log('');
    console.log('Descriptors by level:');
    Object.entries(levelCounts)
      .sort()
      .forEach(([level, count]) => {
        console.log(`   ${level}: ${count} descriptors`);
      });
  } catch (error) {
    console.error('❌ Error seeding CEFR descriptors:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCEFRDescriptors()
    .then(() => {
      console.log('');
      console.log('🎉 CEFR seed complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seed failed:', error);
      process.exit(1);
    });
}

export { seedCEFRDescriptors };
