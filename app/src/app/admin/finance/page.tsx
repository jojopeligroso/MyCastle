/**
 * Finance Dashboard - Overview of financial operations
 * MCP Resources: admin://bookings, admin://payments, admin://financial_reports
 */

import { db } from '@/db';
import { bookings, payments, students, users } from '@/db/schema';
import { eq, and, gte, lt, desc, sum, count, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getFinanceStats(tenantId: string) {
  // Set RLS context first
  await db.execute(
    sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`
  );

  // Get all bookings
  const allBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.tenantId, tenantId));

  // Get all payments
  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.tenantId, tenantId));

  const totalRevenue = allBookings.reduce(
    (sum, b) => sum + parseFloat(b.totalBookingEur?.toString() || '0'),
    0
  );

  const totalPaid = allBookings.reduce(
    (sum, b) => sum + parseFloat(b.totalPaidEur?.toString() || '0'),
    0
  );

  const outstanding = allBookings.reduce(
    (sum, b) => {
      const total = parseFloat(b.totalBookingEur?.toString() || '0');
      const paid = parseFloat(b.totalPaidEur?.toString() || '0');
      const balance = total - paid;
      return balance > 0 ? sum + balance : sum;
    },
    0
  );

  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');
  const pendingBookings = allBookings.filter(b => b.status === 'pending');
  const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');

  // Calculate overdue (bookings with outstanding balance and past course start date)
  const now = new Date();
  const overdueBookings = allBookings.filter(b => {
    const total = parseFloat(b.totalBookingEur?.toString() || '0');
    const paid = parseFloat(b.totalPaidEur?.toString() || '0');
    const balance = total - paid;
    const startDate = b.courseStartDate ? new Date(b.courseStartDate) : null;
    return balance > 0 && startDate && startDate < now;
  });

  const overdue = overdueBookings.reduce(
    (sum, b) => {
      const total = parseFloat(b.totalBookingEur?.toString() || '0');
      const paid = parseFloat(b.totalPaidEur?.toString() || '0');
      return sum + (total - paid);
    },
    0
  );

  // Get this month's payment revenue
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthPayments = allPayments.filter(
    p => p.paymentDate && new Date(p.paymentDate) >= startOfMonth
  );

  const thisMonthRevenue = thisMonthPayments.reduce(
    (sum, p) => sum + parseFloat(p.amountEur?.toString() || '0'),
    0
  );

  return {
    totalRevenue,
    totalPaid,
    outstanding,
    overdue,
    thisMonthRevenue,
    bookingCount: allBookings.length,
    confirmedCount: confirmedBookings.length,
    pendingCount: pendingBookings.length,
    overdueCount: overdueBookings.length,
  };
}

async function getRecentTransactions(tenantId: string) {
  // Set RLS context first
  await db.execute(
    sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`
  );

  const recentPayments = await db
    .select({
      payment: payments,
      booking: {
        bookingNumber: bookings.bookingNumber,
      },
      student: {
        id: students.id,
        fullName: students.fullName,
      },
      user: {
        email: users.email,
      },
    })
    .from(payments)
    .leftJoin(bookings, eq(payments.bookingId, bookings.id))
    .leftJoin(students, eq(bookings.studentId, students.id))
    .leftJoin(users, eq(students.userId, users.id))
    .where(eq(payments.tenantId, tenantId))
    .orderBy(desc(payments.createdAt))
    .limit(10);

  return recentPayments;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

async function getMonthlyRevenue(tenantId: string): Promise<MonthlyRevenue[]> {
  // Set RLS context first
  await db.execute(
    sql`SELECT set_config('app.tenant_id', ${tenantId}, false)`
  );

  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.tenantId, tenantId))
    .orderBy(payments.paymentDate);

  // Group by month
  const monthlyData: Record<string, number> = {};

  allPayments.forEach(payment => {
    if (payment.paymentDate) {
      const date = new Date(payment.paymentDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(payment.amountEur?.toString() || '0');
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
    }
  });

  // Convert to array and sort
  return Object.entries(monthlyData)
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export default async function FinancePage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const stats = await getFinanceStats(tenantId);
  const recentTransactions = await getRecentTransactions(tenantId);
  const monthlyRevenue = await getMonthlyRevenue(tenantId);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="mt-2 text-gray-600">Revenue overview, outstanding balances, and payment tracking</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/bookings/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            + Create Booking
          </Link>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            €{stats.totalRevenue.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">{stats.bookingCount} bookings</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Paid</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            €{stats.totalPaid.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Outstanding</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            €{stats.outstanding.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">{stats.pendingCount} pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Overdue</div>
          <div className="mt-2 text-3xl font-bold text-red-600">
            €{stats.overdue.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">{stats.overdueCount} overdue</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h2>
        {monthlyRevenue.length > 0 ? (
          <div className="space-y-3">
            {monthlyRevenue.slice(-6).map(({ month, revenue }) => {
              const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue));
              const percentage = (revenue / maxRevenue) * 100;
              const date = new Date(month + '-01');
              const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

              return (
                <div key={month} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">{monthLabel}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ width: `${Math.max(percentage, 10)}%` }}
                    >
                      <span className="text-white text-sm font-medium">€{revenue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No payment data available yet</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/admin/bookings"
          className="bg-white rounded-lg shadow p-6 hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Bookings</h3>
              <p className="mt-1 text-sm text-gray-500">
                {stats.bookingCount} total • {stats.confirmedCount} confirmed
              </p>
            </div>
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </Link>

        <Link
          href="/admin/students"
          className="bg-white rounded-lg shadow p-6 hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Students</h3>
              <p className="mt-1 text-sm text-gray-500">Manage student records</p>
            </div>
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Reports</h3>
              <p className="mt-1 text-sm text-gray-500">Coming soon</p>
            </div>
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No payments yet
                  </td>
                </tr>
              ) : (
                recentTransactions.map(({ payment, booking, student, user }) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student?.fullName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{user?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking?.bookingNumber ? (
                        <Link
                          href={`/admin/bookings/${payment.bookingId}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          {booking.bookingNumber}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      €{parseFloat(payment.amountEur?.toString() || '0').toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/bookings/${payment.bookingId}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
