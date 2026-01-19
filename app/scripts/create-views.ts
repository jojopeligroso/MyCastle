/**
 * Create Database Views for Admin Dashboard
 * Creates all missing views required by the admin UI
 *
 * Run with: npx tsx scripts/create-views.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

async function createViews() {
  console.log('\n📊 Creating database views...\n');

  try {
    // =========================================================================
    // 1. v_admin_alerts - System alerts for admin dashboard
    // =========================================================================
    console.log('Creating v_admin_alerts...');
    await sql`
      CREATE OR REPLACE VIEW v_admin_alerts AS
      SELECT
        gen_random_uuid() as alert_id,
        'info' as alert_type,
        1 as priority,
        'system' as entity_type,
        NULL::uuid as entity_id,
        'No alerts configured yet' as message,
        NULL as action_url,
        NOW() as created_at,
        NULL::timestamp as acknowledged_at,
        NULL::uuid as acknowledged_by,
        NULL as acknowledged_by_name
      WHERE FALSE;
    `;
    console.log('✓ v_admin_alerts created');

    // =========================================================================
    // 2. v_admin_kpis_daily - Daily KPI metrics
    // =========================================================================
    console.log('Creating v_admin_kpis_daily...');
    await sql`
      CREATE OR REPLACE VIEW v_admin_kpis_daily AS
      SELECT
        (SELECT COUNT(*) FROM students WHERE status = 'active')::bigint as active_students,
        0::numeric as attendance_rate_7d,
        0::numeric as attendance_rate_30d,
        0::bigint as classes_running_today,
        0::numeric as capacity_utilisation,
        0::bigint as new_enrolments_7d,
        0::bigint as outstanding_compliance_tasks;
    `;
    console.log(
      '✓ v_admin_kpis_daily created (basic version - attendance/classes tables not yet migrated)'
    );

    // =========================================================================
    // 3. v_admin_work_queue - Pending work items
    // =========================================================================
    console.log('Creating v_admin_work_queue...');
    await sql`
      CREATE OR REPLACE VIEW v_admin_work_queue AS
      SELECT
        'info' as item_type,
        'No pending tasks' as item_label,
        NULL::uuid as entity_id,
        'Work queue not yet implemented' as description,
        NULL as action_url,
        NOW() as created_at
      WHERE FALSE;
    `;
    console.log('✓ v_admin_work_queue created');

    // =========================================================================
    // 4. v_audit_events_recent - Recent audit log entries
    // =========================================================================
    console.log('Creating v_audit_events_recent...');
    await sql`
      CREATE OR REPLACE VIEW v_audit_events_recent AS
      SELECT
        gen_random_uuid() as id,
        'info' as action,
        NULL as resource_type,
        NULL as resource_id,
        NULL::jsonb as changes,
        NOW() as timestamp,
        NULL as actor_name,
        NULL as actor_email,
        NULL as actor_role
      WHERE FALSE;
    `;
    console.log('✓ v_audit_events_recent created (stub - audit_logs table not yet migrated)');

    // =========================================================================
    // 5. v_users_with_metadata - Users with enrollment/class counts
    // =========================================================================
    console.log('Creating v_users_with_metadata...');
    await sql`
      CREATE OR REPLACE VIEW v_users_with_metadata AS
      SELECT
        u.id,
        u.tenant_id,
        u.auth_id,
        u.email,
        u.name,
        u.primary_role as role,
        u.status,
        u.last_login,
        u.created_at,
        u.updated_at,
        0::bigint as enrollment_count,
        0::bigint as class_count
      FROM users u;
    `;
    console.log(
      '✓ v_users_with_metadata created (basic version - enrollments/classes tables not yet migrated)'
    );

    // =========================================================================
    // 6. v_orphaned_auth_users - Auth users without profile records
    // =========================================================================
    console.log('Creating v_orphaned_auth_users...');
    await sql`
      CREATE OR REPLACE VIEW v_orphaned_auth_users AS
      SELECT
        gen_random_uuid() as auth_id,
        'orphan@example.com' as email,
        NOW() as created_at
      WHERE FALSE;
    `;
    console.log('✓ v_orphaned_auth_users created (stub)');

    // =========================================================================
    // 7. v_student_duplicate_candidates - Potential duplicate students
    // =========================================================================
    console.log('Creating v_student_duplicate_candidates...');
    await sql`
      CREATE OR REPLACE VIEW v_student_duplicate_candidates AS
      SELECT
        s1.id as student1_id,
        u1.name as student1_name,
        u1.email as student1_email,
        s1.created_at as student1_created,
        s2.id as student2_id,
        u2.name as student2_name,
        u2.email as student2_email,
        s2.created_at as student2_created,
        CASE
          WHEN u1.email = u2.email THEN 100
          WHEN LOWER(u1.name) = LOWER(u2.name) THEN 80
          WHEN u1.phone = u2.phone AND u1.phone IS NOT NULL THEN 90
          ELSE 50
        END as match_score,
        (u1.email = u2.email) as email_match,
        (LOWER(u1.name) = LOWER(u2.name)) as name_match,
        (u1.phone = u2.phone AND u1.phone IS NOT NULL) as phone_match,
        (LOWER(REGEXP_REPLACE(u1.name, '[^a-z]', '', 'g')) =
         LOWER(REGEXP_REPLACE(u2.name, '[^a-z]', '', 'g'))) as name_normalized_match,
        (ABS(EXTRACT(EPOCH FROM (s1.created_at - s2.created_at))) < 86400) as date_proximity
      FROM students s1
      JOIN users u1 ON s1.user_id = u1.id
      JOIN students s2 ON s1.tenant_id = s2.tenant_id AND s1.id < s2.id
      JOIN users u2 ON s2.user_id = u2.id
      WHERE
        u1.email = u2.email
        OR LOWER(u1.name) = LOWER(u2.name)
        OR (u1.phone = u2.phone AND u1.phone IS NOT NULL);
    `;
    console.log('✓ v_student_duplicate_candidates created');

    console.log('\n✅ All views created successfully!\n');

    // Test each view
    console.log('Testing views...\n');

    const views = [
      'v_admin_alerts',
      'v_admin_kpis_daily',
      'v_admin_work_queue',
      'v_audit_events_recent',
      'v_users_with_metadata',
      'v_orphaned_auth_users',
      'v_student_duplicate_candidates',
    ];

    for (const view of views) {
      try {
        const result = await sql`SELECT * FROM ${sql(view)} LIMIT 1`;
        console.log(`  ✓ ${view} - OK (${result.length} rows)`);
      } catch (error: any) {
        console.log(`  ✗ ${view} - ERROR: ${error.message}`);
      }
    }

    console.log('\n🎉 View creation complete!\n');
  } catch (error) {
    console.error('\n❌ Error creating views:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the script
createViews().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
