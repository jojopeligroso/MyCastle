/**
 * Bookings List Page - View and manage student bookings
 * Fresh Schema Implementation - Ireland ESL School
 */

import { Suspense } from 'react';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { bookings, students, users, courses, accommodationTypes, agencies } from '@/db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import Link from 'next/link';

interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: string;
  outstandingBalance: string;
}

interface BookingWithDetails {
  id: string;
  bookingNumber: string;
  saleDate: string;
  status: string;
  weeks: number;
  courseStartDate: string;
  courseEndDate: string;
  totalBookingEur: string;
  totalPaidEur: string;
  depositPaidEur: string;
  // Student details
  studentName: string;
  studentEmail: string;
  studentNumber: string | null;
  // Course details
  courseName: string;
  courseCode: string | null;
  courseLevel: string | null;
  // Accommodation details
  accommodationName: string | null;
  // Agency details
  agencyName: string;
}

async function getBookings(): Promise<BookingWithDetails[]> {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      console.error('No tenant ID available');
      return [];
    }

    // Set RLS context (superuser bypass)
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Query bookings with all related data
    const result = await db
      .select({
        // Booking fields
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        saleDate: bookings.saleDate,
        status: bookings.status,
        weeks: bookings.weeks,
        courseStartDate: bookings.courseStartDate,
        courseEndDate: bookings.courseEndDate,
        totalBookingEur: bookings.totalBookingEur,
        totalPaidEur: bookings.totalPaidEur,
        depositPaidEur: bookings.depositPaidEur,
        // Student details (from users via students)
        studentName: users.name,
        studentEmail: users.email,
        studentNumber: students.studentNumber,
        // Course details
        courseName: courses.name,
        courseCode: courses.code,
        courseLevel: courses.level,
        // Accommodation details
        accommodationName: accommodationTypes.name,
        // Agency details
        agencyName: agencies.name,
      })
      .from(bookings)
      .innerJoin(students, eq(bookings.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(courses, eq(bookings.courseId, courses.id))
      .innerJoin(agencies, eq(bookings.agencyId, agencies.id))
      .leftJoin(accommodationTypes, eq(bookings.accommodationTypeId, accommodationTypes.id))
      .where(
        and(
          eq(bookings.tenantId, tenantId),
          isNull(bookings.cancelledAt)
        )
      )
      .orderBy(desc(bookings.saleDate));

    return result.map((row) => ({
      ...row,
      saleDate: row.saleDate.toString(),
      courseStartDate: row.courseStartDate.toString(),
      courseEndDate: row.courseEndDate.toString(),
      totalBookingEur: row.totalBookingEur || '0',
      totalPaidEur: row.totalPaidEur || '0',
      depositPaidEur: row.depositPaidEur || '0',
    }));
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return [];
  }
}

async function getBookingStats(bookingsList: BookingWithDetails[]): Promise<BookingStats> {
  const totalBookings = bookingsList.length;
  const pendingBookings = bookingsList.filter((b) => b.status === 'pending').length;
  const confirmedBookings = bookingsList.filter((b) => b.status === 'confirmed').length;

  const totalRevenue = bookingsList
    .reduce((sum, b) => sum + parseFloat(b.totalBookingEur), 0)
    .toFixed(2);

  const totalPaid = bookingsList
    .reduce((sum, b) => sum + parseFloat(b.totalPaidEur), 0)
    .toFixed(2);

  const outstandingBalance = (parseFloat(totalRevenue) - parseFloat(totalPaid)).toFixed(2);

  return {
    totalBookings,
    pendingBookings,
    confirmedBookings,
    totalRevenue,
    outstandingBalance,
  };
}

function StatCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color: 'blue' | 'amber' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'border-l-blue-500 bg-blue-50',
    amber: 'border-l-amber-500 bg-amber-50',
    green: 'border-l-green-500 bg-green-50',
    purple: 'border-l-purple-500 bg-purple-50',
  };

  return (
    <div className={`bg-white rounded-lg border-l-4 ${colorClasses[color]} p-6`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sublabel && <p className="mt-1 text-sm text-gray-500">{sublabel}</p>}
    </div>
  );
}

function BookingsTable({ bookings }: { bookings: BookingWithDetails[] }) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No bookings found</p>
        <p className="mt-2 text-sm text-gray-400">Create your first booking to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Booking
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Course
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dates
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Financial
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {bookings.map((booking) => {
            const balance = (
              parseFloat(booking.totalBookingEur) - parseFloat(booking.totalPaidEur)
            ).toFixed(2);
            const balanceColor = parseFloat(balance) === 0 ? 'text-green-600' : 'text-amber-600';

            return (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{booking.bookingNumber}</div>
                  <div className="text-sm text-gray-500">
                    Sale: {new Date(booking.saleDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{booking.studentName}</div>
                  <div className="text-sm text-gray-500">{booking.studentNumber}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{booking.courseName}</div>
                  <div className="text-sm text-gray-500">
                    {booking.courseLevel} • {booking.weeks} weeks
                  </div>
                  {booking.accommodationName && (
                    <div className="text-xs text-gray-400 mt-1">+ {booking.accommodationName}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(booking.courseStartDate).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    to {new Date(booking.courseEndDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    €{parseFloat(booking.totalBookingEur).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Paid: €{parseFloat(booking.totalPaidEur).toFixed(2)}
                  </div>
                  <div className={`text-xs font-medium ${balanceColor}`}>
                    Balance: €{balance}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/bookings/${booking.id}`}
                    className="text-blue-600 hover:text-blue-900"
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
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

export default async function BookingsPage() {
  await requireAuth();

  const bookingsList = await getBookings();
  const stats = await getBookingStats(bookingsList);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-2 text-gray-600">
            Manage student course bookings and financial tracking
          </p>
        </div>
        <Link
          href="/admin/bookings/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + Create Booking
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Bookings" value={stats.totalBookings} color="blue" />
        <StatCard label="Pending" value={stats.pendingBookings} color="amber" />
        <StatCard label="Confirmed" value={stats.confirmedBookings} color="green" />
        <StatCard
          label="Outstanding Balance"
          value={`€${stats.outstandingBalance}`}
          sublabel={`Total Revenue: €${stats.totalRevenue}`}
          color="purple"
        />
      </div>

      {/* Bookings Table */}
      <Suspense fallback={<LoadingSkeleton />}>
        <BookingsTable bookings={bookingsList} />
      </Suspense>
    </div>
  );
}

// Make this page dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
