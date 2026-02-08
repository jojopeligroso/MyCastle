/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

async function verify() {
  console.log('\n🔍 Verifying complete schema and seed data...\n');

  try {
    // 1. Verify all 9 tables exist
    const tables = await sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    console.log('✅ Tables (9 expected):');
    tables.forEach((t: any) => console.log(`   - ${t.tablename}`));

    // 2. Check tenant
    const tenants = await sql`SELECT id, name, subdomain, status FROM tenants`;
    console.log(`\n✅ Tenants: ${tenants.length}`);
    tenants.forEach((t: any) => console.log(`   - ${t.name} (${t.subdomain}) - ${t.status}`));

    // 3. Check user with multi-role support
    const users = await sql`SELECT id, email, name, primary_role, status FROM public.users`;
    console.log(`\n✅ Users: ${users.length}`);
    users.forEach((u: any) => console.log(`   - ${u.email} (${u.name}) - Role: ${u.primary_role}`));

    // 4. Check user_roles (multi-role verification)
    const roles = await sql`
      SELECT ur.role, u.email
      FROM user_roles ur
      JOIN public.users u ON ur.user_id = u.id
      WHERE ur.revoked_at IS NULL
    `;
    console.log(`\n✅ User Roles: ${roles.length}`);
    roles.forEach((r: any) => console.log(`   - ${r.email}: ${r.role}`));

    // 5. Check student record
    const students = await sql`
      SELECT s.student_number, s.is_visa_student, u.email
      FROM students s
      JOIN public.users u ON s.user_id = u.id
    `;
    console.log(`\n✅ Students: ${students.length}`);
    students.forEach((s: any) =>
      console.log(`   - ${s.email}: ${s.student_number} (Visa: ${s.is_visa_student})`)
    );

    // 6. Check courses
    const courses = await sql`SELECT code, name, level, price_per_week_eur FROM courses`;
    console.log(`\n✅ Courses: ${courses.length}`);
    courses.forEach((c: any) =>
      console.log(`   - ${c.code}: ${c.name} (${c.level}) - €${c.price_per_week_eur}/week`)
    );

    // 7. Check accommodation types
    const accom = await sql`SELECT name, price_per_week_eur FROM accommodation_types`;
    console.log(`\n✅ Accommodation Types: ${accom.length}`);
    accom.forEach((a: any) => console.log(`   - ${a.name}: €${a.price_per_week_eur}/week`));

    // 8. Check agencies
    const agencies = await sql`SELECT name, status FROM agencies`;
    console.log(`\n✅ Agencies: ${agencies.length}`);
    agencies.forEach((a: any) => console.log(`   - ${a.name} (${a.status})`));

    // 9. Check bookings with financial breakdown
    const bookings = await sql`
      SELECT booking_number, weeks, course_fee_eur, accommodation_fee_eur,
             total_booking_eur, deposit_paid_eur, total_paid_eur, status
      FROM bookings
    `;
    console.log(`\n✅ Bookings: ${bookings.length}`);
    bookings.forEach((b: any) =>
      console.log(
        `   - ${b.booking_number}: ${b.weeks} weeks, Total: €${b.total_booking_eur}, Paid: €${b.total_paid_eur} (${b.status})`
      )
    );

    // 10. Check payments
    const payments = await sql`
      SELECT payment_date, amount_eur, payment_method, reference_number
      FROM payments
    `;
    console.log(`\n✅ Payments: ${payments.length}`);
    payments.forEach((p: any) =>
      console.log(
        `   - ${p.payment_date}: €${p.amount_eur} via ${p.payment_method} (${p.reference_number})`
      )
    );

    // 11. Verify multi-role capability (CRITICAL business requirement)
    console.log('\n🎯 Business Logic Verification:');
    const multiRoleUser = await sql`
      SELECT u.email, array_agg(ur.role) as roles
      FROM public.users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.revoked_at IS NULL
      GROUP BY u.email
      HAVING COUNT(ur.role) > 1
    `;
    if (multiRoleUser.length > 0) {
      console.log('   ✅ Multi-role support working:');
      multiRoleUser.forEach((u: any) =>
        console.log(`      - ${u.email} has roles: ${u.roles.join(', ')}`)
      );
    } else {
      console.log('   ⚠️  No multi-role users found (expected at least one)');
    }

    // 12. Verify RLS policies exist
    const rlsPolicies = await sql`
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `;
    console.log(`\n✅ RLS Policies: ${rlsPolicies.length}`);
    const policyGroups = rlsPolicies.reduce((acc: Record<string, number>, p: any) => {
      acc[p.tablename] = (acc[p.tablename] || 0) + 1;
      return acc;
    }, {});
    Object.entries(policyGroups).forEach(([table, count]) =>
      console.log(`   - ${table}: ${count} policies`)
    );

    console.log('\n✅ Schema verification complete!\n');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    await sql.end();
    process.exit(1);
  }
}

verify();
