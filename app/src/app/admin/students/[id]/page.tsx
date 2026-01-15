/**
 * Student Detail Page - View student profile, bookings, and payment history
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { students, users, bookings, courses, payments } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface StudentDetails {
  // User fields
  id: string;
  email: string;
  name: string;
  phone: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  avatarUrl: string | null;
  // Student fields
  studentId: string;
  studentNumber: string | null;
  isVisaStudent: boolean | null;
  visaType: string | null;
  visaExpiryDate: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  medicalConditions: string | null;
  dietaryRequirements: string | null;
  status: string;
}

interface BookingWithCourse {
  id: string;
  bookingNumber: string;
  courseName: string;
  courseStartDate: string;
  courseEndDate: string;
  totalBookingEur: string;
  totalPaidEur: string;
  status: string;
}

interface PaymentRecord {
  id: string;
  paymentDate: string;
  amountEur: string;
  paymentMethod: string;
  referenceNumber: string | null;
  bookingNumber: string;
}

async function getStudentDetails(studentId: string): Promise<StudentDetails | null> {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      // User fields
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      dateOfBirth: users.dateOfBirth,
      nationality: users.nationality,
      avatarUrl: users.avatarUrl,
      // Student fields
      studentId: students.id,
      studentNumber: students.studentNumber,
      isVisaStudent: students.isVisaStudent,
      visaType: students.visaType,
      visaExpiryDate: students.visaExpiryDate,
      emergencyContactName: students.emergencyContactName,
      emergencyContactPhone: students.emergencyContactPhone,
      emergencyContactRelationship: students.emergencyContactRelationship,
      medicalConditions: students.medicalConditions,
      dietaryRequirements: students.dietaryRequirements,
      status: students.status,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(and(eq(students.id, studentId), eq(students.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0) return null;

  return {
    ...result[0],
    dateOfBirth: result[0].dateOfBirth?.toString() || null,
    visaExpiryDate: result[0].visaExpiryDate?.toString() || null,
  };
}

async function getStudentBookings(studentId: string): Promise<BookingWithCourse[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  // RLS context already set by getStudentDetails
  const result = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      courseName: courses.name,
      courseStartDate: bookings.courseStartDate,
      courseEndDate: bookings.courseEndDate,
      totalBookingEur: bookings.totalBookingEur,
      totalPaidEur: bookings.totalPaidEur,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(courses, eq(bookings.courseId, courses.id))
    .where(and(eq(bookings.studentId, studentId), eq(bookings.tenantId, tenantId)))
    .orderBy(desc(bookings.courseStartDate));

  return result.map(row => ({
    ...row,
    courseStartDate: row.courseStartDate.toString(),
    courseEndDate: row.courseEndDate.toString(),
    totalBookingEur: row.totalBookingEur || '0',
    totalPaidEur: row.totalPaidEur || '0',
  }));
}

async function getStudentPayments(studentId: string): Promise<PaymentRecord[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  // RLS context already set by getStudentDetails
  const result = await db
    .select({
      id: payments.id,
      paymentDate: payments.paymentDate,
      amountEur: payments.amountEur,
      paymentMethod: payments.paymentMethod,
      referenceNumber: payments.referenceNumber,
      bookingNumber: bookings.bookingNumber,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.studentId, studentId), eq(payments.tenantId, tenantId)))
    .orderBy(desc(payments.paymentDate));

  return result.map(row => ({
    ...row,
    paymentDate: row.paymentDate.toString(),
    amountEur: row.amountEur || '0',
  }));
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const [student, studentBookings, studentPayments] = await Promise.all([
    getStudentDetails(id),
    getStudentBookings(id),
    getStudentPayments(id),
  ]);

  if (!student) {
    notFound();
  }

  // Calculate total paid across all bookings
  const totalPaidAllTime = studentPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.amountEur),
    0
  );

  // Calculate total outstanding across all bookings
  const totalOutstanding = studentBookings.reduce((sum, booking) => {
    const total = parseFloat(booking.totalBookingEur);
    const paid = parseFloat(booking.totalPaidEur);
    return sum + (total - paid);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/students"
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to Students
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Student #{student.studentNumber || 'N/A'}</p>
        </div>
        <div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              student.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {student.status}
          </span>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">{student.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-900">{student.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date of Birth</p>
            <p className="text-sm font-medium text-gray-900">{student.dateOfBirth || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nationality</p>
            <p className="text-sm font-medium text-gray-900">{student.nationality || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Visa Information Card */}
      {student.isVisaStudent && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Visa Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Visa Type</p>
              <p className="text-sm font-medium text-gray-900">{student.visaType || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Visa Expiry Date</p>
              <p className="text-sm font-medium text-gray-900">{student.visaExpiryDate || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Contact Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Emergency Contact</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Contact Name</p>
            <p className="text-sm font-medium text-gray-900">
              {student.emergencyContactName || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Contact Phone</p>
            <p className="text-sm font-medium text-gray-900">
              {student.emergencyContactPhone || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Relationship</p>
            <p className="text-sm font-medium text-gray-900">
              {student.emergencyContactRelationship || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Medical & Dietary Information Card */}
      {(student.medicalConditions || student.dietaryRequirements) && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Medical & Dietary Information
          </h2>
          <div className="space-y-4">
            {student.medicalConditions && (
              <div>
                <p className="text-sm text-gray-500">Medical Conditions</p>
                <p className="text-sm font-medium text-gray-900">{student.medicalConditions}</p>
              </div>
            )}
            {student.dietaryRequirements && (
              <div>
                <p className="text-sm text-gray-500">Dietary Requirements</p>
                <p className="text-sm font-medium text-gray-900">{student.dietaryRequirements}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Summary Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Total Bookings</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              €
              {studentBookings
                .reduce((sum, booking) => sum + parseFloat(booking.totalBookingEur), 0)
                .toFixed(2)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Paid</p>
            <p className="text-2xl font-bold text-green-900 mt-1">€{totalPaidAllTime.toFixed(2)}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-amber-600 font-medium">Outstanding</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">€{totalOutstanding.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Bookings History Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bookings History</h2>
        {studentBookings.length === 0 ? (
          <p className="text-sm text-gray-500">No bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentBookings.map(booking => {
                  const balance =
                    parseFloat(booking.totalBookingEur) - parseFloat(booking.totalPaidEur);
                  return (
                    <tr key={booking.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.bookingNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.courseName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.courseStartDate}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.courseEndDate}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{parseFloat(booking.totalBookingEur).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{parseFloat(booking.totalPaidEur).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        €{balance.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="hover:text-blue-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment History Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h2>
        {studentPayments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentPayments.map(payment => (
                  <tr key={payment.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.paymentDate}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.bookingNumber}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{parseFloat(payment.amountEur).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.referenceNumber || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <div className="text-sm">
                  <span className="text-gray-500">Total Paid: </span>
                  <span className="font-bold text-gray-900">€{totalPaidAllTime.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
