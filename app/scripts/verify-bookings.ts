import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

async function verifyBookings() {
  console.log('\n📊 Verifying all bookings...\n');

  try {
    const bookings = await sql`
      SELECT
        b.booking_number,
        b.status,
        b.weeks,
        b.course_start_date,
        b.total_booking_eur,
        b.total_paid_eur,
        u.name as student_name,
        st.student_number,
        c.name as course_name,
        c.level as course_level,
        a.name as accommodation_name
      FROM bookings b
      JOIN students st ON b.student_id = st.id
      JOIN users u ON st.user_id = u.id
      JOIN courses c ON b.course_id = c.id
      LEFT JOIN accommodation_types a ON b.accommodation_type_id = a.id
      WHERE b.cancelled_at IS NULL
      ORDER BY b.sale_date DESC
    `;

    console.log(`Found ${bookings.length} active bookings:\n`);

    bookings.forEach((booking, index) => {
      const balance = (parseFloat(booking.total_booking_eur) - parseFloat(booking.total_paid_eur)).toFixed(2);

      console.log(`${index + 1}. ${booking.booking_number} - ${booking.student_name}`);
      console.log(`   Student: ${booking.student_number}`);
      console.log(`   Course: ${booking.course_name} (${booking.course_level})`);
      console.log(`   Accommodation: ${booking.accommodation_name || 'None'}`);
      console.log(`   Duration: ${booking.weeks} weeks starting ${booking.course_start_date.toISOString().split('T')[0]}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Total: €${booking.total_booking_eur}`);
      console.log(`   Paid: €${booking.total_paid_eur}`);
      console.log(`   Balance: €${balance}`);
      console.log('');
    });

    // Calculate stats
    const totalRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.total_booking_eur), 0);
    const totalPaid = bookings.reduce((sum, b) => sum + parseFloat(b.total_paid_eur), 0);
    const outstanding = totalRevenue - totalPaid;

    console.log('📈 Summary:');
    console.log(`   Total Bookings: ${bookings.length}`);
    console.log(`   Pending: ${bookings.filter(b => b.status === 'pending').length}`);
    console.log(`   Confirmed: ${bookings.filter(b => b.status === 'confirmed').length}`);
    console.log(`   Total Revenue: €${totalRevenue.toFixed(2)}`);
    console.log(`   Total Paid: €${totalPaid.toFixed(2)}`);
    console.log(`   Outstanding Balance: €${outstanding.toFixed(2)}`);

    console.log('\n✅ Verification complete!');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    await sql.end();
    process.exit(1);
  }
}

verifyBookings();
