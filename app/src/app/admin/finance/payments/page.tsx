/**
 * Payments List Page - View all payment records
 */

import { db } from '@/db';
import { payments, invoices, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getPayments(tenantId: string) {
  const allPayments = await db
    .select({
      payment: payments,
      invoice: {
        id: invoices.id,
        invoice_number: invoices.invoice_number,
      },
      student: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoice_id, invoices.id))
    .innerJoin(users, eq(payments.student_id, users.id))
    .where(eq(payments.tenant_id, tenantId))
    .orderBy(desc(payments.payment_date));

  return allPayments;
}

async function getPaymentStats(tenantId: string) {
  const allPayments = await db
    .select({
      amount: payments.amount,
      payment_method: payments.payment_method,
      payment_date: payments.payment_date,
    })
    .from(payments)
    .where(eq(payments.tenant_id, tenantId));

  const totalPayments = allPayments.length;
  const totalAmount = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Payments by method
  const stripeCount = allPayments.filter(p => p.payment_method === 'stripe').length;
  const cashCount = allPayments.filter(p => p.payment_method === 'cash').length;
  const bankTransferCount = allPayments.filter(
    p => p.payment_method === 'bank_transfer'
  ).length;

  // This month's payments
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthPayments = allPayments.filter(
    p => new Date(p.payment_date) >= firstDayOfMonth
  );
  const thisMonthAmount = thisMonthPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  return {
    totalPayments,
    totalAmount,
    stripeCount,
    cashCount,
    bankTransferCount,
    thisMonthAmount,
  };
}

export default async function PaymentsPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const paymentsList = await getPayments(tenantId);
  const stats = await getPaymentStats(tenantId);

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(Number(amount));
  };

  const getMethodBadge = (method: string) => {
    const styles = {
      stripe: 'bg-purple-100 text-purple-800',
      cash: 'bg-green-100 text-green-800',
      bank_transfer: 'bg-blue-100 text-blue-800',
    };
    return styles[method as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="mt-2 text-gray-600">View all payment records and transactions</p>
        </div>
        <Link
          href="/admin/finance/invoices"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          View Invoices
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Payments</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalPayments}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Amount</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            ${stats.totalAmount.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">This Month</div>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            ${stats.thisMonthAmount.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Stripe</div>
          <div className="mt-2 text-3xl font-bold text-purple-600">{stats.stripeCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Cash</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.cashCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Bank Transfer</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {stats.bankTransferCount}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Payments</h2>
        </div>

        {paymentsList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No payments recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentsList.map(({ payment, invoice, student }) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/finance/invoices/${invoice.id}`}
                        className="text-sm font-medium text-purple-600 hover:text-purple-900"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getMethodBadge(
                          payment.payment_method
                        )}`}
                      >
                        {payment.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.transaction_id ? (
                        <span className="font-mono text-xs">{payment.transaction_id}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/finance/invoices/${invoice.id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        View Invoice
                      </Link>
                      {payment.receipt_url && (
                        <>
                          {' • '}
                          <a
                            href={payment.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Receipt
                          </a>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Method Breakdown */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Payment Methods Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Stripe</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.stripeCount} payments
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cash</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.cashCount} payments
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bank Transfer</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.bankTransferCount} payments
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
