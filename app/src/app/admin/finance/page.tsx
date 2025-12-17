/**
 * Finance Dashboard - Overview of financial operations
 * MCP Resources: admin://invoices, admin://payments, admin://aging_report
 */

import { db } from '@/db';
import { invoices, payments, users } from '@/db/schema';
import { eq, and, gte, lt, desc, sum, count } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getFinanceStats(tenantId: string) {
  // Get all invoices
  const allInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenant_id, tenantId));

  // Get all payments
  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.tenant_id, tenantId));

  const totalRevenue = allPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount.toString()),
    0
  );

  const totalInvoiced = allInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount.toString()),
    0
  );

  const paidInvoices = allInvoices.filter(inv => inv.status === 'paid');
  const pendingInvoices = allInvoices.filter(inv => inv.status === 'pending');
  const overdueInvoices = allInvoices.filter(inv => inv.status === 'overdue');

  const outstanding = pendingInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount.toString()),
    0
  );

  const overdue = overdueInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.amount.toString()),
    0
  );

  // Get this month's stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthPayments = allPayments.filter(
    p => new Date(p.payment_date) >= startOfMonth
  );

  const thisMonthRevenue = thisMonthPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount.toString()),
    0
  );

  return {
    totalRevenue,
    totalInvoiced,
    outstanding,
    overdue,
    thisMonthRevenue,
    invoiceCount: allInvoices.length,
    paidCount: paidInvoices.length,
    pendingCount: pendingInvoices.length,
    overdueCount: overdueInvoices.length,
  };
}

async function getRecentTransactions(tenantId: string) {
  const recentPayments = await db
    .select({
      payment: payments,
      student: {
        name: users.name,
        email: users.email,
      },
      invoice: {
        invoice_number: invoices.invoice_number,
      },
    })
    .from(payments)
    .leftJoin(users, eq(payments.student_id, users.id))
    .leftJoin(invoices, eq(payments.invoice_id, invoices.id))
    .where(eq(payments.tenant_id, tenantId))
    .orderBy(desc(payments.created_at))
    .limit(10);

  return recentPayments;
}

export default async function FinancePage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const stats = await getFinanceStats(tenantId);
  const recentTransactions = await getRecentTransactions(tenantId);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage invoices, payments, and financial reports</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/finance/invoices/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            + Create Invoice
          </Link>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            ${stats.totalRevenue.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">All time</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">This Month</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            ${stats.thisMonthRevenue.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Outstanding</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">
            ${stats.outstanding.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">{stats.pendingCount} pending</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Overdue</div>
          <div className="mt-2 text-3xl font-bold text-red-600">
            ${stats.overdue.toFixed(2)}
          </div>
          <div className="mt-1 text-sm text-gray-500">{stats.overdueCount} overdue</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/admin/finance/invoices"
          className="bg-white rounded-lg shadow p-6 hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
              <p className="mt-1 text-sm text-gray-500">
                {stats.invoiceCount} total • {stats.paidCount} paid
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
          href="/admin/finance/payments"
          className="bg-white rounded-lg shadow p-6 hover:bg-gray-50 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Payments</h3>
              <p className="mt-1 text-sm text-gray-500">View payment history</p>
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
          <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
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
                  Invoice
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
                    No transactions yet
                  </td>
                </tr>
              ) : (
                recentTransactions.map(({ payment, student, invoice }) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student?.name}</div>
                      <div className="text-sm text-gray-500">{student?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice?.invoice_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {payment.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${parseFloat(payment.amount.toString()).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/admin/finance/payments/${payment.id}`}
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
