import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('✅ DATABASE_URL loaded from .env.local');
const client = postgres(connectionString);

interface ColumnInfo {
  column_name: string;
  data_type: string;
}

async function checkSchema() {
  try {
    console.log('🔌 Connecting to Supabase...\n');

    // Query the actual column names from the users table
    const usersTableQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;

    const usersColumns = await client.unsafe(usersTableQuery);

    console.log('📋 USERS TABLE COLUMNS (actual database):');
    console.log('=====================================');
    usersColumns.forEach(col => {
      const colInfo = col as unknown as ColumnInfo;
      console.log(`  ${colInfo.column_name} (${colInfo.data_type})`);
    });

    // Check students table too
    const studentsTableQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'students'
      ORDER BY ordinal_position;
    `;

    const studentsColumns = await client.unsafe(studentsTableQuery);

    console.log('\n📋 STUDENTS TABLE COLUMNS (actual database):');
    console.log('=====================================');
    studentsColumns.forEach(col => {
      const colInfo = col as unknown as ColumnInfo;
      console.log(`  ${colInfo.column_name} (${colInfo.data_type})`);
    });

    // Check classes table
    const classesTableQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'classes'
      ORDER BY ordinal_position;
    `;

    const classesColumns = await client.unsafe(classesTableQuery);

    console.log('\n📋 CLASSES TABLE COLUMNS (actual database):');
    console.log('=====================================');
    classesColumns.forEach(col => {
      const colInfo = col as unknown as ColumnInfo;
      console.log(`  ${colInfo.column_name} (${colInfo.data_type})`);
    });

    console.log('\n✅ Database connection successful!');
    console.log('\n🔍 NAMING CONVENTION ANALYSIS:');

    const allColumns = [...usersColumns, ...studentsColumns, ...classesColumns];
    const hasSnakeCase = allColumns.some(col =>
      (col as unknown as ColumnInfo).column_name.includes('_')
    );
    const hasCamelCase = allColumns.some(col =>
      /[a-z][A-Z]/.test((col as unknown as ColumnInfo).column_name)
    );

    console.log(`  Snake_case columns found: ${hasSnakeCase ? 'YES' : 'NO'}`);
    console.log(`  camelCase columns found: ${hasCamelCase ? 'YES' : 'NO'}`);

    if (hasSnakeCase && !hasCamelCase) {
      console.log('\n⚠️  SUPABASE PREFERS: snake_case');
    } else if (hasCamelCase && !hasSnakeCase) {
      console.log('\n⚠️  SUPABASE PREFERS: camelCase');
    } else if (hasSnakeCase && hasCamelCase) {
      console.log('\n⚠️  MIXED CASE DETECTED - INCONSISTENT SCHEMA');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSchema();
