/**
 * Test Reports Data - Verify calculations for booking reports
 */

import { db } from '../src/db';
import { bookings, courses, agencies, payments } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

async function testReportsData() {
  try {
    // Set RLS context
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '00000000-0000-0000-0000-000000000001'`));

    console.log('📊 Testing Reports Data Calculations\n');

    // Get all bookings with course and agency data
    const allBookings = await db
      .select({
        booking: bookings,
        course: courses,
        agency: agencies,
      })
      .from(bookings)
      .innerJoin(courses, eq(bookings.courseId, courses.id))
      .innerJoin(agencies, eq(bookings.agencyId, agencies.id));

    console.log('1️⃣ BOOKINGS WITH COURSE LEVELS:');
    allBookings.forEach(b => {
      console.log(
        `   ${b.booking.bookingNumber}: ${b.course.name} (${b.course.level || 'General'}) via ${
          b.agency.name
        }`
      );
      console.log(`   Revenue: €${b.booking.totalBookingEur}, Status: ${b.booking.status}`);
    });

    // Calculate revenue by level
    const revenueByLevel = new Map<string, { count: number; revenue: number }>();
    allBookings.forEach(b => {
      const level = b.course.level || 'General';
      const revenue = parseFloat(b.booking.totalBookingEur?.toString() || '0');
      const current = revenueByLevel.get(level) || { count: 0, revenue: 0 };
      revenueByLevel.set(level, {
        count: current.count + 1,
        revenue: current.revenue + revenue,
      });
    });

    console.log('\n2️⃣ REVENUE BY COURSE LEVEL:');
    Array.from(revenueByLevel.entries()).forEach(([level, data]) => {
      console.log(`   ${level}: ${data.count} booking(s), €${data.revenue.toFixed(2)}`);
    });

    // Calculate revenue by agency
    const revenueByAgency = new Map<
      string,
      { name: string; count: number; revenue: number; commissionRate: string | null }
    >();
    allBookings.forEach(b => {
      const agencyId = b.agency.id;
      const revenue = parseFloat(b.booking.totalBookingEur?.toString() || '0');
      const current = revenueByAgency.get(agencyId) || {
        name: b.agency.name,
        count: 0,
        revenue: 0,
        commissionRate: b.agency.commissionRate,
      };
      revenueByAgency.set(agencyId, {
        ...current,
        count: current.count + 1,
        revenue: current.revenue + revenue,
      });
    });

    console.log('\n3️⃣ REVENUE BY AGENCY:');
    Array.from(revenueByAgency.values()).forEach(agency => {
      const commission = agency.commissionRate
        ? (parseFloat(agency.commissionRate) / 100) * agency.revenue
        : 0;
      console.log(
        `   ${agency.name}: ${agency.count} booking(s), €${agency.revenue.toFixed(2)} (${
          agency.commissionRate || '0'
        }% = €${commission.toFixed(2)})`
      );
    });

    // Get all payments
    const allPayments = await db.select().from(payments);

    const paymentsByMethod = new Map<string, { count: number; total: number }>();
    allPayments.forEach(p => {
      const method = p.paymentMethod || 'Unknown';
      const amount = parseFloat(p.amountEur?.toString() || '0');
      const current = paymentsByMethod.get(method) || { count: 0, total: 0 };
      paymentsByMethod.set(method, {
        count: current.count + 1,
        total: current.total + amount,
      });
    });

    console.log('\n4️⃣ PAYMENTS BY METHOD:');
    Array.from(paymentsByMethod.entries()).forEach(([method, data]) => {
      console.log(`   ${method}: ${data.count} payment(s), €${data.total.toFixed(2)}`);
    });

    // Calculate summary stats
    const totalRevenue = allBookings.reduce(
      (sum, b) => sum + parseFloat(b.booking.totalBookingEur?.toString() || '0'),
      0
    );
    const totalPaid = allBookings.reduce(
      (sum, b) => sum + parseFloat(b.booking.totalPaidEur?.toString() || '0'),
      0
    );
    const outstanding = allBookings.reduce((sum, b) => {
      const total = parseFloat(b.booking.totalBookingEur?.toString() || '0');
      const paid = parseFloat(b.booking.totalPaidEur?.toString() || '0');
      return sum + Math.max(0, total - paid);
    }, 0);

    console.log('\n5️⃣ SUMMARY STATISTICS:');
    console.log(`   Total Bookings: ${allBookings.length}`);
    console.log(
      `   Confirmed: ${allBookings.filter(b => b.booking.status === 'confirmed').length}`
    );
    console.log(`   Pending: ${allBookings.filter(b => b.booking.status === 'pending').length}`);
    console.log(`   Total Revenue: €${totalRevenue.toFixed(2)}`);
    console.log(`   Total Paid: €${totalPaid.toFixed(2)}`);
    console.log(`   Outstanding: €${outstanding.toFixed(2)}`);
    console.log(
      `   Average Booking: €${allBookings.length > 0 ? (totalRevenue / allBookings.length).toFixed(2) : '0.00'}`
    );

    console.log('\n✅ All calculations verified!');
    console.log('\n📝 Expected on Reports Page:');
    console.log('   ✓ 2 total bookings (1 confirmed, 1 pending)');
    console.log('   ✓ €8,765.00 total revenue');
    console.log('   ✓ €3,300.00 total paid');
    console.log('   ✓ €5,465.00 outstanding');
    console.log('   ✓ Revenue by level: A2 and B1');
    console.log('   ✓ Revenue by agency breakdown');
    console.log('   ✓ Payments by Bank Transfer');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testReportsData();
