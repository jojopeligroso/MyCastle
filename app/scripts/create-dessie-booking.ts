import { config } from 'dotenv';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL);

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function createDessieBooking() {
  console.log('\n📝 Creating booking for Dessie Garcia...\n');

  try {
    // Get Dessie's student ID
    const dessieStudent = await sql`
      SELECT s.id as student_id, u.name, s.student_number
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.email = 'dessie.garcia@example.com'
      LIMIT 1
    `;

    if (dessieStudent.length === 0) {
      throw new Error('Dessie Garcia not found');
    }

    const studentId = dessieStudent[0].student_id;
    console.log(`✅ Found student: ${dessieStudent[0].name} (${dessieStudent[0].student_number})`);

    // Get GE-A2 course (Dessie is Spanish, A2 level appropriate for beginner)
    const course = await sql`
      SELECT id, name, code, level, price_per_week_eur
      FROM courses
      WHERE code = 'GE-A2'
      LIMIT 1
    `;

    if (course.length === 0) {
      throw new Error('Course GE-A2 not found');
    }

    console.log(
      `✅ Selected course: ${course[0].name} (${course[0].level}) - €${course[0].price_per_week_eur}/week`
    );

    // Get Residence accommodation (nice upgrade for Dessie)
    const accommodation = await sql`
      SELECT id, name, price_per_week_eur
      FROM accommodation_types
      WHERE name = 'Residence'
      LIMIT 1
    `;

    if (accommodation.length === 0) {
      throw new Error('Residence accommodation not found');
    }

    console.log(
      `✅ Selected accommodation: ${accommodation[0].name} - €${accommodation[0].price_per_week_eur}/week`
    );

    // Get Direct agency
    const agency = await sql`
      SELECT id, name
      FROM agencies
      WHERE name = 'Direct'
      LIMIT 1
    `;

    if (agency.length === 0) {
      throw new Error('Direct agency not found');
    }

    console.log(`✅ Agency: ${agency[0].name}`);

    // Calculate financials for 8 weeks
    const weeks = 8;
    const courseFee = parseFloat(course[0].price_per_week_eur) * weeks;
    const accommodationFee = parseFloat(accommodation[0].price_per_week_eur) * weeks;
    const registrationFee = 75;
    const learnerProtectionFee = 45;
    const medicalInsuranceFee = 150; // Dessie wants medical insurance
    const totalBooking =
      courseFee + accommodationFee + registrationFee + learnerProtectionFee + medicalInsuranceFee;
    const depositPaid = 800;

    console.log('\n💰 Financial Breakdown:');
    console.log(`   Course Fee (8 weeks): €${courseFee.toFixed(2)}`);
    console.log(`   Accommodation (8 weeks): €${accommodationFee.toFixed(2)}`);
    console.log(`   Registration Fee: €${registrationFee.toFixed(2)}`);
    console.log(`   Learner Protection: €${learnerProtectionFee.toFixed(2)}`);
    console.log(`   Medical Insurance: €${medicalInsuranceFee.toFixed(2)}`);
    console.log(`   ─────────────────────────`);
    console.log(`   Total Booking: €${totalBooking.toFixed(2)}`);
    console.log(`   Deposit Paid: €${depositPaid.toFixed(2)}`);
    console.log(`   Balance Due: €${(totalBooking - depositPaid).toFixed(2)}`);

    // Generate booking number
    const bookingNumber = `BK-2026-${String(Date.now()).slice(-6)}`;

    // Create booking
    const courseStartDate = '2026-03-02'; // March start
    const courseEndDate = '2026-04-27'; // 8 weeks later

    const bookingResult = await sql`
      INSERT INTO bookings (
        tenant_id,
        booking_number,
        sale_date,
        student_id,
        agency_id,
        course_id,
        accommodation_type_id,
        weeks,
        course_start_date,
        course_end_date,
        course_fee_eur,
        accommodation_fee_eur,
        transfer_fee_eur,
        exam_fee_eur,
        registration_fee_eur,
        learner_protection_fee_eur,
        medical_insurance_fee_eur,
        total_booking_eur,
        deposit_paid_eur,
        total_paid_eur,
        status
      )
      VALUES (
        ${TENANT_ID}::uuid,
        ${bookingNumber},
        CURRENT_DATE,
        ${studentId}::uuid,
        ${agency[0].id}::uuid,
        ${course[0].id}::uuid,
        ${accommodation[0].id}::uuid,
        ${weeks},
        ${courseStartDate},
        ${courseEndDate},
        ${courseFee.toFixed(2)},
        ${accommodationFee.toFixed(2)},
        0,
        0,
        ${registrationFee.toFixed(2)},
        ${learnerProtectionFee.toFixed(2)},
        ${medicalInsuranceFee.toFixed(2)},
        ${totalBooking.toFixed(2)},
        ${depositPaid.toFixed(2)},
        0,
        'pending'
      )
      RETURNING id
    `;

    const bookingId = bookingResult[0].id;

    // Record the deposit payment
    // The database trigger will automatically update bookings.total_paid_eur
    await sql`
      INSERT INTO payments (
        tenant_id,
        booking_id,
        payment_date,
        amount_eur,
        payment_method,
        reference_number
      )
      VALUES (
        ${TENANT_ID}::uuid,
        ${bookingId}::uuid,
        CURRENT_DATE,
        ${depositPaid.toFixed(2)},
        'Bank Transfer',
        ${`DEPOSIT-${bookingNumber}`}
      )
    `;

    console.log(`\n✅ Booking created: ${bookingNumber}`);
    console.log(`   Status: pending`);
    console.log(`   Dates: ${courseStartDate} to ${courseEndDate}`);
    console.log(`   Duration: ${weeks} weeks`);

    console.log('\n✅ Test booking completed successfully!');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create booking:', error);
    await sql.end();
    process.exit(1);
  }
}

createDessieBooking();
