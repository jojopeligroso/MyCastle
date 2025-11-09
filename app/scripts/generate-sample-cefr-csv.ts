/**
 * Generate Sample CEFR CSV Data
 * Creates a sample CSV file with CEFR descriptors for testing
 *
 * Usage:
 * ```
 * npm run generate:cefr-sample
 * ```
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Sample CEFR descriptors based on the Common European Framework of Reference
 * These are simplified examples for demonstration purposes
 */
const sampleDescriptors = [
  // A1 Level - Beginner
  {
    level: 'A1',
    category: 'Reading',
    subcategory: 'Overall Reading Comprehension',
    descriptor_text:
      'Can understand very short, simple texts a single phrase at a time, picking up familiar names, words and basic phrases and rereading as required.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'A1',
    category: 'Writing',
    subcategory: 'Overall Written Production',
    descriptor_text: 'Can write simple isolated phrases and sentences.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },
  {
    level: 'A1',
    category: 'Listening',
    subcategory: 'Overall Listening Comprehension',
    descriptor_text:
      'Can follow speech which is very slow and carefully articulated, with long pauses for them to assimilate meaning.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'A1',
    category: 'Speaking',
    subcategory: 'Overall Spoken Production',
    descriptor_text: 'Can produce simple mainly isolated phrases about people and places.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },

  // A2 Level - Elementary
  {
    level: 'A2',
    category: 'Reading',
    subcategory: 'Overall Reading Comprehension',
    descriptor_text:
      'Can understand short, simple texts on familiar matters of a concrete type which consist of high frequency everyday or job-related language.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'A2',
    category: 'Writing',
    subcategory: 'Overall Written Production',
    descriptor_text: 'Can write short, simple texts on familiar topics.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },
  {
    level: 'A2',
    category: 'Listening',
    subcategory: 'Overall Listening Comprehension',
    descriptor_text:
      'Can understand phrases and expressions related to areas of most immediate priority (e.g. very basic personal and family information, shopping, local geography, employment).',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'A2',
    category: 'Speaking',
    subcategory: 'Overall Spoken Interaction',
    descriptor_text:
      'Can communicate in simple and routine tasks requiring a simple and direct exchange of information on familiar topics and activities.',
    metadata: { skill_type: 'interactive', domain: 'general' },
  },

  // B1 Level - Intermediate
  {
    level: 'B1',
    category: 'Reading',
    subcategory: 'Overall Reading Comprehension',
    descriptor_text:
      'Can read straightforward factual texts on subjects related to their field and interest with a satisfactory level of comprehension.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'B1',
    category: 'Writing',
    subcategory: 'Overall Written Production',
    descriptor_text: 'Can write straightforward connected texts on topics which are familiar or of personal interest.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },
  {
    level: 'B1',
    category: 'Listening',
    subcategory: 'Overall Listening Comprehension',
    descriptor_text:
      'Can understand straightforward factual information about common everyday or job related topics, identifying both general messages and specific details.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'B1',
    category: 'Speaking',
    subcategory: 'Overall Spoken Interaction',
    descriptor_text:
      'Can communicate with some confidence on familiar routine and non-routine matters related to their interests and professional field.',
    metadata: { skill_type: 'interactive', domain: 'general' },
  },

  // B2 Level - Upper Intermediate
  {
    level: 'B2',
    category: 'Reading',
    subcategory: 'Overall Reading Comprehension',
    descriptor_text:
      'Can read with a large degree of independence, adapting style and speed of reading to different texts and purposes, and using appropriate reference sources selectively.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'B2',
    category: 'Writing',
    subcategory: 'Overall Written Production',
    descriptor_text:
      'Can write clear, detailed texts on a variety of subjects related to their field of interest, synthesising and evaluating information and arguments from a number of sources.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },
  {
    level: 'B2',
    category: 'Listening',
    subcategory: 'Overall Listening Comprehension',
    descriptor_text:
      'Can understand standard spoken language, live or broadcast, on both familiar and unfamiliar topics normally encountered in personal, social, academic or vocational life.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'B2',
    category: 'Speaking',
    subcategory: 'Overall Spoken Production',
    descriptor_text:
      'Can give clear, detailed descriptions and presentations on a wide range of subjects related to their field of interest, expanding and supporting ideas with subsidiary points and relevant examples.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },

  // C1 Level - Advanced
  {
    level: 'C1',
    category: 'Reading',
    subcategory: 'Overall Reading Comprehension',
    descriptor_text:
      'Can understand in detail lengthy, complex texts whether or not they relate to their own area of speciality, provided they can reread difficult sections.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'C1',
    category: 'Writing',
    subcategory: 'Overall Written Production',
    descriptor_text:
      'Can write clear, well-structured texts on complex subjects, underlining the relevant salient issues, expanding and supporting points of view at some length with subsidiary points, reasons and relevant examples.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },
  {
    level: 'C1',
    category: 'Listening',
    subcategory: 'Overall Listening Comprehension',
    descriptor_text:
      'Can understand enough to follow extended speech on abstract and complex topics beyond their own field, though they may need to confirm occasional details, especially if the accent is unfamiliar.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'C1',
    category: 'Speaking',
    subcategory: 'Overall Spoken Interaction',
    descriptor_text:
      'Can express themselves fluently and spontaneously, almost effortlessly. Has a good command of a broad lexical repertoire allowing gaps to be readily overcome with circumlocutions.',
    metadata: { skill_type: 'interactive', domain: 'general' },
  },

  // C2 Level - Proficient
  {
    level: 'C2',
    category: 'Reading',
    subcategory: 'Overall Reading Comprehension',
    descriptor_text:
      'Can understand and interpret critically virtually all forms of the written language including abstract, structurally complex, or highly colloquial literary and non-literary writings.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'C2',
    category: 'Writing',
    subcategory: 'Overall Written Production',
    descriptor_text:
      'Can write clear, smoothly flowing, complex texts in an appropriate and effective style and a logical structure which helps the reader to find significant points.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },
  {
    level: 'C2',
    category: 'Listening',
    subcategory: 'Overall Listening Comprehension',
    descriptor_text: 'Has no difficulty in understanding any kind of spoken language, whether live or broadcast, delivered at fast native speed.',
    metadata: { skill_type: 'receptive', domain: 'general' },
  },
  {
    level: 'C2',
    category: 'Speaking',
    subcategory: 'Overall Spoken Production',
    descriptor_text:
      'Can produce clear, smoothly flowing, well-structured speech with an effective logical structure which helps the recipient to notice and remember significant points.',
    metadata: { skill_type: 'productive', domain: 'general' },
  },
];

/**
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  // If value contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate the sample CSV file
 */
function generateSampleFile() {
  console.log('📝 Generating sample CEFR CSV data...\n');

  // Create CSV content
  const headers = ['Level', 'Category', 'Subcategory', 'Descriptor Text', 'Metadata'];
  const rows = sampleDescriptors.map(d => [
    escapeCSV(d.level),
    escapeCSV(d.category),
    escapeCSV(d.subcategory),
    escapeCSV(d.descriptor_text),
    escapeCSV(JSON.stringify(d.metadata)),
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  // Ensure data directory exists
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Write to file
  const outputPath = join(dataDir, 'sample-cefr-descriptors.csv');
  writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`✅ Sample CSV file created: ${outputPath}`);
  console.log(`\n📊 Generated ${sampleDescriptors.length} sample descriptors:`);

  // Count by level
  const counts: Record<string, number> = {};
  sampleDescriptors.forEach(d => {
    counts[d.level] = (counts[d.level] || 0) + 1;
  });

  Object.entries(counts)
    .sort()
    .forEach(([level, count]) => {
      console.log(`  ${level}: ${count} descriptors`);
    });

  console.log('\n📖 Next steps:');
  console.log('  1. Review the generated file: data/sample-cefr-descriptors.csv');
  console.log('  2. Parse the file: npm run parse:cefr data/sample-cefr-descriptors.csv');
  console.log('  3. Seed the database: npm run seed:cefr data/sample-cefr-descriptors.csv');
  console.log('\n  Or seed with clearing existing data:');
  console.log('     npm run seed:cefr data/sample-cefr-descriptors.csv -- --clear');
}

/**
 * CLI entry point
 */
if (require.main === module) {
  generateSampleFile();
}
