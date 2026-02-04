import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const sql = postgres(process.env.DATABASE_URL!);

async function verifyAllMigrations() {
  try {
    console.log('🔍 COMPREHENSIVE MIGRATION VERIFICATION\n');
    console.log('='.repeat(60));

    // 1. Check is_super_admin column
    console.log('\n1️⃣ CHECKING: is_super_admin column');
    const superAdminColumn = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_super_admin'
    `;

    if (superAdminColumn.length > 0) {
      console.log(
        '   ✅ EXISTS:',
        superAdminColumn[0].column_name,
        `(${superAdminColumn[0].data_type})`
      );
    } else {
      console.log('   ❌ MISSING: is_super_admin column not found');
    }

    // 2. Check super admin user
    console.log('\n2️⃣ CHECKING: Super admin user setup');
    const superAdminUser = await sql`
      SELECT email, is_super_admin, primary_role, tenant_id
      FROM users
      WHERE email = 'eoinmaleoin@gmail.com'
    `;

    if (superAdminUser.length > 0) {
      console.log('   ✅ User found:', superAdminUser[0].email);
      console.log('   - is_super_admin:', superAdminUser[0].is_super_admin);
      console.log('   - primary_role:', superAdminUser[0].primary_role);
      console.log('   - tenant_id:', superAdminUser[0].tenant_id);
    } else {
      console.log('   ❌ User not found in database');
    }

    // 3. Check index
    console.log('\n3️⃣ CHECKING: Super admin index');
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users' AND indexname = 'idx_users_is_super_admin'
    `;

    if (indexes.length > 0) {
      console.log('   ✅ EXISTS:', indexes[0].indexname);
    } else {
      console.log('   ❌ MISSING: idx_users_is_super_admin');
    }

    // 4. Check all users table columns
    console.log('\n4️⃣ CHECKING: All users table columns');
    const allColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    console.log('   Total columns:', allColumns.length);
    const criticalColumns = [
      'id',
      'tenant_id',
      'email',
      'primary_role',
      'is_super_admin',
      'created_at',
      'updated_at',
    ];

    interface ColumnRow {
      column_name: string;
      data_type: string;
    }

    criticalColumns.forEach(col => {
      const exists = allColumns.some(c => (c as ColumnRow).column_name === col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });

    // 5. Check core tables exist
    console.log('\n5️⃣ CHECKING: Core tables exist');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const criticalTables = [
      'users',
      'tenants',
      'students',
      'classes',
      'enrollments',
      'bookings',
      'payments',
      'audit_logs',
    ];
    console.log('   Total tables:', tables.length);

    interface TableRow {
      table_name: string;
    }

    criticalTables.forEach(table => {
      const exists = tables.some(t => (t as TableRow).table_name === table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });

    // 6. Check database views
    console.log('\n6️⃣ CHECKING: Database views');
    const views = await sql`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const criticalViews = [
      'v_admin_kpis_daily',
      'v_admin_alerts',
      'v_admin_work_queue',
      'v_audit_events_recent',
    ];
    console.log('   Total views:', views.length);
    criticalViews.forEach(view => {
      const exists = views.some(v => (v as TableRow).table_name === view);
      console.log(`   ${exists ? '✅' : '❌'} ${view}`);
    });

    // 7. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION STATUS SUMMARY\n');

    const isSuperAdminComplete =
      superAdminColumn.length > 0 &&
      superAdminUser.length > 0 &&
      superAdminUser[0].is_super_admin === true &&
      indexes.length > 0;

    if (isSuperAdminComplete) {
      console.log('✅ is_super_admin migration: COMPLETE');
    } else {
      console.log('❌ is_super_admin migration: INCOMPLETE');
    }

    const hasAllCriticalTables = criticalTables.every(table =>
      tables.some(t => (t as TableRow).table_name === table)
    );

    if (hasAllCriticalTables) {
      console.log('✅ Core schema tables: COMPLETE');
    } else {
      console.log('❌ Core schema tables: INCOMPLETE');
    }

    console.log(
      '\n🎯 Overall Status:',
      isSuperAdminComplete && hasAllCriticalTables
        ? 'ALL MIGRATIONS COMPLETE'
        : 'MIGRATIONS INCOMPLETE'
    );
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await sql.end();
  }
}

verifyAllMigrations();
