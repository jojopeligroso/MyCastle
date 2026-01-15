/**
 * Booking Reports Page - Revenue, agency, and payment analytics
 * MCP Resources: admin://bookings, admin://payments, admin://financial_reports
 */

import { db } from '@/db';
import { bookings, payments, students, courses, agencies } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface BookingReportData {
  // Summary stats
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalPaid: number;
  outstandingBalance: number;
  averageBookingValue: number;

  // Revenue by course level
  revenueByLevel: Array<{ level: string; count: number; revenue: number }>;

  // Bookings by agency
  bookingsByAgency: Array<{
    agencyName: string;
    bookingCount: number;
    totalRevenue: number;
    commissionRate: string | null;
    estimatedCommission: number;
  }>;

  // Payment method breakdown
  paymentsByMethod: Array<{ method: string; count: number; total: number }>;

  // Outstanding balances by student
  outstandingByStudent: Array<{
    studentId: string;
    studentName: string;
    studentNumber: string | null;
    outstandingAmount: number;
    bookingCount: number;
  }>;
}

async function getBookingReportData(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  status?: string
): Promise<BookingReportData> {
  // Set RLS context
  await db.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`);

  // Build filters
  const filters = [eq(bookings.tenantId, tenantId)];
  if (startDate) {
    filters.push(gte(bookings.saleDate, startDate));
  }
  if (endDate) {
    filters.push(lte(bookings.saleDate, endDate));
  }
  if (status && status !== 'all') {
    filters.push(eq(bookings.status, status));
  }

  // Get all bookings with related data
  const allBookings = await db
    .select({
      booking: bookings,
      course: courses,
      agency: agencies,
      student: students,
    })
    .from(bookings)
    .innerJoin(courses, eq(bookings.courseId, courses.id))
    .innerJoin(agencies, eq(bookings.agencyId, agencies.id))
    .innerJoin(students, eq(bookings.studentId, students.id))
    .where(and(...filters));

  // Get all payments
  const allPayments = await db.select().from(payments).where(eq(payments.tenantId, tenantId));

  // Calculate summary stats
  const totalBookings = allBookings.length;
  const confirmedBookings = allBookings.filter(b => b.booking.status === 'confirmed').length;
  const pendingBookings = allBookings.filter(b => b.booking.status === 'pending').length;
  const cancelledBookings = allBookings.filter(b => b.booking.status === 'cancelled').length;

  const totalRevenue = allBookings.reduce(
    (sum, b) => sum + parseFloat(b.booking.totalBookingEur?.toString() || '0'),
    0
  );

  const totalPaid = allBookings.reduce(
    (sum, b) => sum + parseFloat(b.booking.totalPaidEur?.toString() || '0'),
    0
  );

  const outstandingBalance = allBookings.reduce((sum, b) => {
    const total = parseFloat(b.booking.totalBookingEur?.toString() || '0');
    const paid = parseFloat(b.booking.totalPaidEur?.toString() || '0');
    return sum + Math.max(0, total - paid);
  }, 0);

  const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Revenue by course level
  const revenueByLevelMap = new Map<string, { count: number; revenue: number }>();
  allBookings.forEach(b => {
    const level = b.course.level || 'General';
    const revenue = parseFloat(b.booking.totalBookingEur?.toString() || '0');
    const current = revenueByLevelMap.get(level) || { count: 0, revenue: 0 };
    revenueByLevelMap.set(level, {
      count: current.count + 1,
      revenue: current.revenue + revenue,
    });
  });
  const revenueByLevel = Array.from(revenueByLevelMap.entries())
    .map(([level, data]) => ({ level, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  // Bookings by agency
  const bookingsByAgencyMap = new Map<
    string,
    {
      agencyName: string;
      bookingCount: number;
      totalRevenue: number;
      commissionRate: string | null;
    }
  >();
  allBookings.forEach(b => {
    const agencyId = b.agency.id;
    const agencyName = b.agency.name;
    const revenue = parseFloat(b.booking.totalBookingEur?.toString() || '0');
    const current = bookingsByAgencyMap.get(agencyId) || {
      agencyName,
      bookingCount: 0,
      totalRevenue: 0,
      commissionRate: b.agency.commissionRate,
    };
    bookingsByAgencyMap.set(agencyId, {
      ...current,
      bookingCount: current.bookingCount + 1,
      totalRevenue: current.totalRevenue + revenue,
    });
  });
  const bookingsByAgency = Array.from(bookingsByAgencyMap.values())
    .map(a => ({
      ...a,
      estimatedCommission:
        a.commissionRate && a.totalRevenue
          ? (parseFloat(a.commissionRate) / 100) * a.totalRevenue
          : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Payment method breakdown
  const paymentsByMethodMap = new Map<string, { count: number; total: number }>();
  allPayments.forEach(p => {
    const method = p.paymentMethod || 'Unknown';
    const amount = parseFloat(p.amountEur?.toString() || '0');
    const current = paymentsByMethodMap.get(method) || { count: 0, total: 0 };
    paymentsByMethodMap.set(method, {
      count: current.count + 1,
      total: current.total + amount,
    });
  });
  const paymentsByMethod = Array.from(paymentsByMethodMap.entries())
    .map(([method, data]) => ({ method, ...data }))
    .sort((a, b) => b.total - a.total);

  // Outstanding balances by student
  const outstandingByStudentMap = new Map<
    string,
    {
      studentName: string;
      studentNumber: string | null;
      outstandingAmount: number;
      bookingCount: number;
    }
  >();
  allBookings.forEach(b => {
    const studentId = b.student.id;
    const total = parseFloat(b.booking.totalBookingEur?.toString() || '0');
    const paid = parseFloat(b.booking.totalPaidEur?.toString() || '0');
    const outstanding = Math.max(0, total - paid);

    if (outstanding > 0) {
      const current = outstandingByStudentMap.get(studentId) || {
        studentName: b.student.fullName || 'Unknown',
        studentNumber: b.student.studentNumber,
        outstandingAmount: 0,
        bookingCount: 0,
      };
      outstandingByStudentMap.set(studentId, {
        ...current,
        outstandingAmount: current.outstandingAmount + outstanding,
        bookingCount: current.bookingCount + 1,
      });
    }
  });
  const outstandingByStudent = Array.from(outstandingByStudentMap.entries())
    .map(([studentId, data]) => ({ studentId, ...data }))
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
    .slice(0, 10); // Top 10

  return {
    totalBookings,
    confirmedBookings,
    pendingBookings,
    cancelledBookings,
    totalRevenue,
    totalPaid,
    outstandingBalance,
    averageBookingValue,
    revenueByLevel,
    bookingsByAgency,
    paymentsByMethod,
    outstandingByStudent,
  };
}

interface SearchParams {
  start_date?: string;
  end_date?: string;
  status?: string;
}

export default async function BookingReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAuth();
  const tenantId = await getTenantId();
  if (!tenantId) {
    notFound();
  }

  const params = await searchParams;
  const { start_date, end_date, status } = params;

  const reportData = await getBookingReportData(tenantId, start_date, end_date, status);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Reports</h1>
            <p className="mt-2 text-gray-600">
              Revenue analytics, agency performance, and payment tracking
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            onClick={() => alert('CSV export coming soon!')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export to CSV
          </button>
        </div>

        {/* Filters */}
        <form method="get" className="mt-6 flex flex-wrap gap-4">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              defaultValue={start_date}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              defaultValue={end_date}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={status || 'all'}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Bookings</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{reportData.totalBookings}</div>
          <div className="mt-1 text-sm text-gray-500">
            {reportData.confirmedBookings} confirmed • {reportData.pendingBookings} pending
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            €{reportData.totalRevenue.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Avg: €{reportData.averageBookingValue.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Paid</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            €{reportData.totalPaid.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {reportData.totalRevenue > 0
              ? ((reportData.totalPaid / reportData.totalRevenue) * 100).toFixed(1)
              : 0}
            % collected
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Outstanding</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            €{reportData.outstandingBalance.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {reportData.outstandingByStudent.length} students
          </div>
        </div>
      </div>

      {/* Revenue by Course Level */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue by Course Level</h2>
        {reportData.revenueByLevel.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Course Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg per Booking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.revenueByLevel.map(level => (
                  <tr key={level.level}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {level.level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {level.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      €{level.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      €{(level.revenue / level.count).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {reportData.totalRevenue > 0
                        ? ((level.revenue / reportData.totalRevenue) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No data available</p>
        )}
      </div>

      {/* Bookings by Agency */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Bookings by Agency</h2>
        {reportData.bookingsByAgency.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Agency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Commission Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Est. Commission
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.bookingsByAgency.map(agency => (
                  <tr key={agency.agencyName}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {agency.agencyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agency.bookingCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      €{agency.totalRevenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agency.commissionRate ? `${agency.commissionRate}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                      {agency.estimatedCommission > 0
                        ? `€${agency.estimatedCommission.toFixed(2)}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No data available</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Payments by Method</h2>
          {reportData.paymentsByMethod.length > 0 ? (
            <div className="space-y-4">
              {reportData.paymentsByMethod.map(method => (
                <div key={method.method}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{method.method}</span>
                    <span className="text-sm text-gray-500">
                      {method.count} payment{method.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(
                            (method.total /
                              Math.max(...reportData.paymentsByMethod.map(m => m.total))) *
                              100,
                            10
                          )}%`,
                        }}
                      >
                        <span className="text-white text-xs font-medium">
                          €{method.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No payment data</p>
          )}
        </div>

        {/* Outstanding Balances by Student */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top 10 Outstanding Balances</h2>
          {reportData.outstandingByStudent.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Bookings
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.outstandingByStudent.map(student => (
                    <tr key={student.studentId}>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/admin/students/${student.studentId}`}
                          className="font-medium text-purple-600 hover:text-purple-900"
                        >
                          {student.studentName}
                        </Link>
                        {student.studentNumber && (
                          <div className="text-xs text-gray-500">{student.studentNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {student.bookingCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-orange-600">
                        €{student.outstandingAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No outstanding balances</p>
          )}
        </div>
      </div>

      {/* Back to Finance */}
      <div className="mt-8">
        <Link
          href="/admin/finance"
          className="inline-flex items-center text-sm text-purple-600 hover:text-purple-900"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Finance Dashboard
        </Link>
      </div>
    </div>
  );
}
