import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function setSuperAdmin() {
  const targetEmail = 'eoinmaleoin@gmail.com'; // Your email

  try {
    console.log('🔍 Checking for user:', targetEmail);

    // Check if user exists
    const result = await client.unsafe(`
      SELECT id, email, is_super_admin, primary_role
      FROM users
      WHERE email = '${targetEmail}'
      LIMIT 1
    `);

    if (result.length === 0) {
      console.log('❌ User not found:', targetEmail);
      console.log('   Please create the user first or check the email address.');
      await client.end();
      process.exit(1);
    }

    const user = result[0];
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.primary_role);
    console.log('   Super Admin:', user.is_super_admin);

    if (user.is_super_admin) {
      console.log('\n✅ User is already a super admin!');
    } else {
      console.log('\n⚙️  Setting super admin flag...');

      await client.unsafe(`
        UPDATE users
        SET is_super_admin = true,
            updated_at = NOW()
        WHERE id = '${user.id}'
      `);

      console.log('✅ Super admin flag set successfully!');
      console.log('\n🎉 User', targetEmail, 'is now a super admin');
      console.log('   This user will have access to ALL tenant data');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setSuperAdmin();
