/**
 * View Booking Page - View booking details and manage payments
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { bookings, students, users, courses, accommodationTypes, agencies, payments } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AddPaymentForm } from './AddPaymentForm';

interface BookingDetails {
  // Booking
  id: string;
  bookingNumber: string;
  saleDate: string;
  status: string;
  weeks: number;
  courseStartDate: string;
  courseEndDate: string;
  // Student
  studentName: string;
  studentEmail: string;
  studentNumber: string | null;
  // Course
  courseName: string;
  courseCode: string | null;
  courseLevel: string | null;
  // Accommodation
  accommodationName: string | null;
  // Agency
  agencyName: string;
  // Financials
  courseFeeEur: string;
  accommodationFeeEur: string;
  registrationFeeEur: string;
  learnerProtectionFeeEur: string;
  medicalInsuranceFeeEur: string;
  totalBookingEur: string;
  depositPaidEur: string;
  totalPaidEur: string;
}

interface Payment {
  id: string;
  paymentDate: string;
  amountEur: string;
  paymentMethod: string;
  referenceNumber: string | null;
}

async function getBookingDetails(bookingId: string): Promise<BookingDetails | null> {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      saleDate: bookings.saleDate,
      status: bookings.status,
      weeks: bookings.weeks,
      courseStartDate: bookings.courseStartDate,
      courseEndDate: bookings.courseEndDate,
      studentName: users.name,
      studentEmail: users.email,
      studentNumber: students.studentNumber,
      courseName: courses.name,
      courseCode: courses.code,
      courseLevel: courses.level,
      accommodationName: accommodationTypes.name,
      agencyName: agencies.name,
      courseFeeEur: bookings.courseFeeEur,
      accommodationFeeEur: bookings.accommodationFeeEur,
      registrationFeeEur: bookings.registrationFeeEur,
      learnerProtectionFeeEur: bookings.learnerProtectionFeeEur,
      medicalInsuranceFeeEur: bookings.medicalInsuranceFeeEur,
      totalBookingEur: bookings.totalBookingEur,
      depositPaidEur: bookings.depositPaidEur,
      totalPaidEur: bookings.totalPaidEur,
    })
    .from(bookings)
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(users, eq(students.userId, users.id))
    .innerJoin(courses, eq(bookings.courseId, courses.id))
    .innerJoin(agencies, eq(bookings.agencyId, agencies.id))
    .leftJoin(accommodationTypes, eq(bookings.accommodationTypeId, accommodationTypes.id))
    .where(and(eq(bookings.id, bookingId), eq(bookings.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0) return null;

  return {
    ...result[0],
    saleDate: result[0].saleDate.toString(),
    courseStartDate: result[0].courseStartDate.toString(),
    courseEndDate: result[0].courseEndDate.toString(),
    courseFeeEur: result[0].courseFeeEur || '0',
    accommodationFeeEur: result[0].accommodationFeeEur || '0',
    registrationFeeEur: result[0].registrationFeeEur || '0',
    learnerProtectionFeeEur: result[0].learnerProtectionFeeEur || '0',
    medicalInsuranceFeeEur: result[0].medicalInsuranceFeeEur || '0',
    totalBookingEur: result[0].totalBookingEur || '0',
    depositPaidEur: result[0].depositPaidEur || '0',
    totalPaidEur: result[0].totalPaidEur || '0',
  };
}

async function getPaymentHistory(bookingId: string): Promise<Payment[]> {
  const tenantId = await getTenantId();
  if (!tenantId) return [];

  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      id: payments.id,
      paymentDate: payments.paymentDate,
      amountEur: payments.amountEur,
      paymentMethod: payments.paymentMethod,
      referenceNumber: payments.referenceNumber,
    })
    .from(payments)
    .where(and(eq(payments.bookingId, bookingId), eq(payments.tenantId, tenantId)))
    .orderBy(payments.paymentDate);

  return result.map((p) => ({
    ...p,
    paymentDate: p.paymentDate.toString(),
    amountEur: p.amountEur || '0',
  }));
}

export default async function ViewBookingPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const booking = await getBookingDetails(params.id);
  if (!booking) {
    notFound();
  }

  const paymentHistory = await getPaymentHistory(params.id);

  const balance = (
    parseFloat(booking.totalBookingEur) - parseFloat(booking.totalPaidEur)
  ).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <Link
            href="/admin/bookings"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Bookings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{booking.bookingNumber}</h1>
          <p className="mt-2 text-gray-600">
            Booking for {booking.studentName} ({booking.studentNumber})
          </p>
        </div>
        <span
          className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
            booking.status === 'confirmed'
              ? 'bg-green-100 text-green-800'
              : booking.status === 'pending'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {booking.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student & Course Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Course Details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Course</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {booking.courseName} ({booking.courseLevel})
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Duration</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.weeks} weeks</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(booking.courseStartDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">End Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(booking.courseEndDate).toLocaleDateString()}
                </dd>
              </div>
              {booking.accommodationName && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Accommodation</dt>
                  <dd className="mt-1 text-sm text-gray-900">{booking.accommodationName}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Agency</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.agencyName}</dd>
              </div>
            </dl>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Breakdown</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Course Fee</dt>
                <dd className="text-gray-900 font-medium">€{parseFloat(booking.courseFeeEur).toFixed(2)}</dd>
              </div>
              {parseFloat(booking.accommodationFeeEur) > 0 && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Accommodation Fee</dt>
                  <dd className="text-gray-900 font-medium">
                    €{parseFloat(booking.accommodationFeeEur).toFixed(2)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Registration Fee</dt>
                <dd className="text-gray-900 font-medium">
                  €{parseFloat(booking.registrationFeeEur).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Learner Protection Fee</dt>
                <dd className="text-gray-900 font-medium">
                  €{parseFloat(booking.learnerProtectionFeeEur).toFixed(2)}
                </dd>
              </div>
              {parseFloat(booking.medicalInsuranceFeeEur) > 0 && (
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Medical Insurance</dt>
                  <dd className="text-gray-900 font-medium">
                    €{parseFloat(booking.medicalInsuranceFeeEur).toFixed(2)}
                  </dd>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <dt className="text-base font-medium text-gray-900">Total Booking</dt>
                <dd className="text-base font-bold text-gray-900">
                  €{parseFloat(booking.totalBookingEur).toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Total Paid</dt>
                <dd className="text-green-600 font-medium">
                  €{parseFloat(booking.totalPaidEur).toFixed(2)}
                </dd>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <dt className="text-base font-medium text-gray-900">Balance Due</dt>
                <dd
                  className={`text-base font-bold ${
                    parseFloat(balance) === 0 ? 'text-green-600' : 'text-amber-600'
                  }`}
                >
                  €{balance}
                </dd>
              </div>
            </dl>
          </div>

          {/* Payment History */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payment History</h2>
            {paymentHistory.length === 0 ? (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.paymentMethod}
                        {payment.referenceNumber && ` • ${payment.referenceNumber}`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      €{parseFloat(payment.amountEur).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Add Payment */}
        <div className="lg:col-span-1">
          <AddPaymentForm bookingId={params.id} balance={balance} />
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
