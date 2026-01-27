/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed Programmes Script
 * Creates sample academic programmes for testing
 */

import { config } from 'dotenv';
import { join } from 'path';
import { db } from '../src/db';
import { programmes } from '../src/db/schema/programmes';
import { sql } from 'drizzle-orm';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

const TENANT_ID = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000001';

async function seedProgrammes() {
  if (!TENANT_ID) {
    console.error('❌ TENANT_ID not available');
    process.exit(1);
  }

  console.log('🌱 Seeding programmes...');

  try {
    // Set RLS context
    await db.execute(sql`
      SELECT set_user_context(
        NULL,
        ${TENANT_ID}::uuid,
        'admin'
      )
    `);

    const programmesData = [
      {
        tenant_id: sql`${TENANT_ID}::uuid`,
        name: 'General English',
        code: 'GE',
        description: 'General English courses for all levels',
        levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        duration_weeks: 12,
        hours_per_week: 15,
        status: 'active' as const,
        metadata: {
          description: 'Core English language programme covering all CEFR levels',
          lateness_policy: {
            threshold_minutes: 15,
            description: '15 cumulative minutes late = 1 absence equivalent',
          },
        },
      },
      {
        tenant_id: sql`${TENANT_ID}::uuid`,
        name: 'IELTS Preparation',
        code: 'IELTS',
        description: 'IELTS exam preparation course',
        levels: ['B1', 'B2', 'C1'],
        duration_weeks: 8,
        hours_per_week: 10,
        status: 'active' as const,
        metadata: {
          description: 'Intensive IELTS preparation focusing on exam techniques',
          lateness_policy: {
            threshold_minutes: 10,
            description:
              '10 cumulative minutes late = 1 absence equivalent (stricter for exam prep)',
          },
        },
      },
      {
        tenant_id: sql`${TENANT_ID}::uuid`,
        name: 'Conversation Classes',
        code: 'CONV',
        description: 'Conversational English practice',
        levels: ['A2', 'B1', 'B2', 'C1'],
        duration_weeks: 6,
        hours_per_week: 5,
        status: 'active' as const,
        metadata: {
          description: 'Supplementary conversation-focused classes',
          lateness_policy: {
            threshold_minutes: 15,
            description: 'Standard 15-minute threshold',
          },
        },
      },
      {
        tenant_id: sql`${TENANT_ID}::uuid`,
        name: 'Business English',
        code: 'BE',
        description: 'English for professional contexts',
        levels: ['B1', 'B2', 'C1'],
        duration_weeks: 10,
        hours_per_week: 12,
        status: 'active' as const,
        metadata: {
          description: 'Professional English for business contexts',
          lateness_policy: {
            threshold_minutes: 15,
            description: 'Standard 15-minute threshold',
          },
        },
      },
    ];

    // Insert programmes
    const inserted = await db.insert(programmes).values(programmesData).returning();

    console.log(`✅ Successfully seeded ${inserted.length} programmes:`);
    inserted.forEach(prog => {
      console.log(`  - ${prog.name} (${prog.code})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding programmes:', error);
    process.exit(1);
  }
}

seedProgrammes();
