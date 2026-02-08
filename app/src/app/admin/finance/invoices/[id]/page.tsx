/**
 * Invoice Detail Page - View individual invoice details and payments
 */

import { db } from '@/db';
import { invoices, invoicePayments, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getInvoice(invoiceId: string, tenantId: string) {
  const result = await db
    .select({
      invoice: invoices,
      student: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.studentId, users.id))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  return result[0] || null;
}

async function getInvoicePaymentsData(invoiceId: string) {
  const paymentsData = await db
    .select({
      payment: invoicePayments,
      recordedByUser: {
        id: users.id,
        name: users.name,
      },
    })
    .from(invoicePayments)
    .leftJoin(users, eq(invoicePayments.recordedBy, users.id))
    .where(eq(invoicePayments.invoiceId, invoiceId))
    .orderBy(invoicePayments.paymentDate);

  return paymentsData;
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const tenantId = await getTenantId();
  const { id } = await params;

  if (!tenantId) {
    notFound();
  }

  const result = await getInvoice(id, tenantId);

  if (!result) {
    notFound();
  }

  const { invoice, student } = result;
  const payments = await getInvoicePaymentsData(id);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.payment.amount), 0);

  const amountDue = Number(invoice.amount) - totalPaid;

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number | string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(Number(amount));
  };

  const lineItems = invoice.lineItems as Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }> | null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/admin/finance/invoices"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to Invoices
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Invoice {invoice.invoiceNumber}</h1>
          <p className="mt-2 text-gray-600">
            Issued to {student.name} on {new Date(invoice.issueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(
              invoice.status
            )}`}
          >
            {invoice.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.invoiceNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                      invoice.status
                    )}`}
                  >
                    {invoice.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Issue Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(invoice.issueDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Student</dt>
                <dd className="mt-1">
                  <Link
                    href={`/admin/users/${student.id}`}
                    className="text-sm text-purple-600 hover:text-purple-900"
                  >
                    {student.name}
                  </Link>
                  <div className="text-xs text-gray-500">{student.email}</div>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Currency</dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.currency}</dd>
              </div>
            </dl>

            {invoice.description && (
              <div className="mb-6">
                <dt className="text-sm font-medium text-gray-500 mb-1">Description</dt>
                <dd className="text-sm text-gray-900">{invoice.description}</dd>
              </div>
            )}

            {/* Line Items */}
            {lineItems && lineItems.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Line Items</h3>
                <div className="overflow-hidden border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Unit Price
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lineItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {formatCurrency(item.unit_price, invoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                            {formatCurrency(item.quantity * item.unit_price, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Amount Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Invoice Amount:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Total Paid:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(totalPaid, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Amount Due:</span>
                <span className={amountDue > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(amountDue, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payments Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Payment History ({payments.length})
            </h2>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No payments recorded yet</p>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Method
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Recorded By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map(({ payment, recordedByUser }) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {payment.paymentMethod.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {recordedByUser?.name || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/admin/finance/payments?invoice=${id}`}
                className="block w-full text-left px-3 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-md text-center"
              >
                Record Payment
              </Link>
              <Link
                href={`/admin/users/${student.id}`}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                View Student Profile
              </Link>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                Send Reminder Email
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md">
                Download PDF
              </button>
              {invoice.status !== 'cancelled' && (
                <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md">
                  Cancel Invoice
                </button>
              )}
            </div>
          </div>

          {/* Invoice Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Info</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(invoice.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
