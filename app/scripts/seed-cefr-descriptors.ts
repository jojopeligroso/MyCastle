/**
 * T-034: Seed CEFR Descriptors (3 points, S)
 *
 * Seeds the database with Common European Framework of Reference (CEFR) descriptors
 * Based on CEFR 2018 Companion Volume
 *
 * Usage: npx tsx scripts/seed-cefr-descriptors.ts
 */

import { db } from '../src/db';
import { cefrDescriptors } from '../src/db/schema/curriculum';

interface CEFRDescriptor {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: string;
  subcategory?: string;
  descriptor_text: string;
  metadata?: Record<string, unknown>;
}

/**
 * CEFR 2018 Descriptors
 * Source: Council of Europe CEFR Companion Volume (2018)
 */
const CEFR_DESCRIPTORS: CEFRDescriptor[] = [
  // A1 Level - Beginner
  {
    level: 'A1',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand very short, simple texts a single phrase at a time, picking up familiar names, words and basic phrases and rereading as required.',
  },
  {
    level: 'A1',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can follow speech which is very slow and carefully articulated, with long pauses for them to assimilate meaning.',
  },
  {
    level: 'A1',
    category: 'Speaking',
    subcategory: 'Spoken interaction',
    descriptor_text: 'Can interact in a simple way but communication is totally dependent on repetition at a slower rate of speech, rephrasing and repair.',
  },
  {
    level: 'A1',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write simple isolated phrases and sentences.',
  },
  {
    level: 'A1',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Shows only limited control of a few simple grammatical structures and sentence patterns in a memorised repertoire.',
  },

  // A2 Level - Elementary
  {
    level: 'A2',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand short, simple texts on familiar matters of a concrete type which consist of high frequency everyday or job-related language.',
  },
  {
    level: 'A2',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand phrases and expressions related to areas of most immediate priority (e.g. very basic personal and family information, shopping, local geography, employment).',
  },
  {
    level: 'A2',
    category: 'Speaking',
    subcategory: 'Spoken interaction',
    descriptor_text: 'Can communicate in simple and routine tasks requiring a simple and direct exchange of information on familiar topics and activities.',
  },
  {
    level: 'A2',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write short, simple notes and messages. Can write a very simple personal letter, for example thanking someone for something.',
  },
  {
    level: 'A2',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Uses some simple structures correctly, but still systematically makes basic mistakes.',
  },

  // B1 Level - Intermediate
  {
    level: 'B1',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can read straightforward factual texts on subjects related to their field of interest with a satisfactory level of comprehension.',
  },
  {
    level: 'B1',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand the main points of clear standard speech on familiar matters regularly encountered in work, school, leisure, etc.',
  },
  {
    level: 'B1',
    category: 'Speaking',
    subcategory: 'Spoken interaction',
    descriptor_text: 'Can deal with most situations likely to arise whilst travelling in an area where the language is spoken. Can enter unprepared into conversation on topics that are familiar, of personal interest or pertinent to everyday life.',
  },
  {
    level: 'B1',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write simple connected text on topics which are familiar or of personal interest. Can write personal letters describing experiences and impressions.',
  },
  {
    level: 'B1',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Uses reasonably accurately a repertoire of frequently used routines and patterns associated with more predictable situations.',
  },

  // B2 Level - Upper Intermediate
  {
    level: 'B2',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can read with a large degree of independence, adapting style and speed of reading to different texts and purposes, and using appropriate reference sources selectively.',
  },
  {
    level: 'B2',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand extended speech and lectures and follow even complex lines of argument provided the topic is reasonably familiar.',
  },
  {
    level: 'B2',
    category: 'Speaking',
    subcategory: 'Spoken interaction',
    descriptor_text: 'Can interact with a degree of fluency and spontaneity that makes regular interaction with proficient users quite possible. Can take an active part in discussion in familiar contexts, accounting for and sustaining their views.',
  },
  {
    level: 'B2',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write clear, detailed text on a wide range of subjects related to their interests. Can write an essay or report, passing on information or giving reasons in support of or against a particular point of view.',
  },
  {
    level: 'B2',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Shows a relatively high degree of grammatical control. Does not make errors which cause misunderstanding, and can correct most of their mistakes.',
  },

  // C1 Level - Advanced
  {
    level: 'C1',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand long and complex factual and literary texts, appreciating distinctions of style. Can understand specialised articles and longer technical instructions, even when they do not relate to their field.',
  },
  {
    level: 'C1',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Can understand extended speech even when it is not clearly structured and when relationships are only implied and not signalled explicitly.',
  },
  {
    level: 'C1',
    category: 'Speaking',
    subcategory: 'Spoken interaction',
    descriptor_text: 'Can express themselves fluently and spontaneously without much obvious searching for expressions. Can use language flexibly and effectively for social, academic and professional purposes.',
  },
  {
    level: 'C1',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can express themselves in clear, well-structured text, expressing points of view at some length. Can write about complex subjects in a letter, an essay or a report, underlining what they consider to be the salient issues.',
  },
  {
    level: 'C1',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Consistently maintains a high degree of grammatical accuracy; errors are rare, difficult to spot and generally corrected when they do occur.',
  },

  // C2 Level - Proficiency
  {
    level: 'C2',
    category: 'Reading',
    subcategory: 'Overall reading comprehension',
    descriptor_text: 'Can understand with ease virtually all forms of the written language, including abstract, structurally or linguistically complex texts such as manuals, specialised articles and literary works.',
  },
  {
    level: 'C2',
    category: 'Listening',
    subcategory: 'Overall listening comprehension',
    descriptor_text: 'Has no difficulty in understanding any kind of spoken language, whether live or broadcast, even when delivered at fast speed, provided they have some time to get familiar with the accent.',
  },
  {
    level: 'C2',
    category: 'Speaking',
    subcategory: 'Spoken interaction',
    descriptor_text: 'Can take part effortlessly in any conversation or discussion and have a good familiarity with idiomatic expressions and colloquialisms. Can express themselves fluently and convey finer shades of meaning precisely.',
  },
  {
    level: 'C2',
    category: 'Writing',
    subcategory: 'Overall written production',
    descriptor_text: 'Can write clear, smoothly flowing text in an appropriate style. Can write complex letters, reports or articles which present a case with an effective logical structure which helps the recipient to notice and remember significant points.',
  },
  {
    level: 'C2',
    category: 'Grammar',
    subcategory: 'Grammatical accuracy',
    descriptor_text: 'Maintains consistent grammatical control of complex language, even while attention is otherwise engaged (e.g. in forward planning, in monitoring others\' reactions).',
  },

  // Additional descriptors for teaching context
  {
    level: 'A1',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a basic vocabulary repertoire of isolated words and phrases related to particular concrete situations.',
  },
  {
    level: 'A2',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has sufficient vocabulary to conduct routine, everyday transactions involving familiar situations and topics.',
  },
  {
    level: 'B1',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has sufficient vocabulary to express themselves with some circumlocutions on most topics pertinent to their everyday life such as family, hobbies and interests, work, travel, and current events.',
  },
  {
    level: 'B2',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a good range of vocabulary for matters connected to their field and most general topics. Can vary formulation to avoid frequent repetition, but lexical gaps can still cause hesitation and circumlocution.',
  },
  {
    level: 'C1',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a good command of a broad vocabulary allowing gaps to be readily overcome with circumlocutions. Little obvious searching for expressions or avoidance strategies; only a conceptually difficult subject can hinder a natural, smooth flow of language.',
  },
  {
    level: 'C2',
    category: 'Vocabulary',
    subcategory: 'Vocabulary range',
    descriptor_text: 'Has a good command of a very broad lexical repertoire including idiomatic expressions and colloquialisms; shows awareness of connotative levels of meaning.',
  },

  // Pronunciation descriptors
  {
    level: 'A1',
    category: 'Speaking',
    subcategory: 'Phonological control',
    descriptor_text: 'Pronunciation of a very limited repertoire of learnt words and phrases can be understood with some effort by interlocutors used to dealing with speakers of their language group.',
  },
  {
    level: 'A2',
    category: 'Speaking',
    subcategory: 'Phonological control',
    descriptor_text: 'Pronunciation is generally clear enough to be understood despite a noticeable foreign accent, but conversational partners will need to ask for repetition from time to time.',
  },
  {
    level: 'B1',
    category: 'Speaking',
    subcategory: 'Phonological control',
    descriptor_text: 'Pronunciation is clearly intelligible even if a foreign accent is sometimes evident and occasional mispronunciations occur.',
  },
  {
    level: 'B2',
    category: 'Speaking',
    subcategory: 'Phonological control',
    descriptor_text: 'Has acquired a clear, natural pronunciation and intonation.',
  },
  {
    level: 'C1',
    category: 'Speaking',
    subcategory: 'Phonological control',
    descriptor_text: 'Can vary intonation and place sentence stress correctly in order to express finer shades of meaning.',
  },
  {
    level: 'C2',
    category: 'Speaking',
    subcategory: 'Phonological control',
    descriptor_text: 'Can convey subtle nuances of meaning precisely by using, with reasonable accuracy, a wide range of intonation patterns and placing stress correctly.',
  },
];

async function seedCEFRDescriptors() {
  console.log('🌱 Starting CEFR descriptors seed...\n');

  try {
    // Check if descriptors already exist
    const existingCount = await db.select().from(cefrDescriptors).execute();

    if (existingCount.length > 0) {
      console.log(`⚠️  Database already contains ${existingCount.length} CEFR descriptors.`);
      console.log('To re-seed, first delete existing descriptors.\n');

      const shouldContinue = process.argv.includes('--force');
      if (!shouldContinue) {
        console.log('Run with --force to overwrite existing data.');
        process.exit(0);
      }

      console.log('🗑️  Deleting existing descriptors...');
      await db.delete(cefrDescriptors).execute();
      console.log('✅ Deleted existing descriptors\n');
    }

    console.log(`📝 Inserting ${CEFR_DESCRIPTORS.length} CEFR descriptors...\n`);

    // Insert all descriptors
    await db.insert(cefrDescriptors).values(
      CEFR_DESCRIPTORS.map(descriptor => ({
        level: descriptor.level,
        category: descriptor.category,
        subcategory: descriptor.subcategory || null,
        descriptor_text: descriptor.descriptor_text,
        metadata: descriptor.metadata || {},
      }))
    );

    console.log('✅ Successfully seeded CEFR descriptors!\n');

    // Summary by level
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
    console.log('📊 Summary by level:');
    for (const level of levels) {
      const count = CEFR_DESCRIPTORS.filter(d => d.level === level).length;
      console.log(`   ${level}: ${count} descriptors`);
    }

    console.log('\n🎉 Seed complete!');
    console.log('\n💡 Verify with: npx tsx scripts/test-db-connection.ts');
    console.log('   Or query: SELECT level, category, COUNT(*) FROM cefr_descriptors GROUP BY level, category ORDER BY level, category;');

  } catch (error) {
    console.error('❌ Error seeding CEFR descriptors:', error);
    throw error;
  }
}

// Run seed if executed directly
if (require.main === module) {
  seedCEFRDescriptors()
    .then(() => {
      console.log('\n✨ Seed script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Seed script failed:', error);
      process.exit(1);
    });
}

export { seedCEFRDescriptors, CEFR_DESCRIPTORS };
