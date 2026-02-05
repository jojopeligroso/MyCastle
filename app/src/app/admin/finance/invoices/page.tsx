/**
 * Invoices List Page - View and manage all invoices
 */

import { db } from '@/db';
import { invoices, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';

async function getInvoices(tenantId: string) {
  const allInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      studentId: invoices.studentId,
      studentName: users.name,
      studentEmail: users.email,
      amount: invoices.amount,
      currency: invoices.currency,
      description: invoices.description,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.studentId, users.id))
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.createdAt));

  return allInvoices;
}

async function getInvoiceStats(tenantId: string) {
  const allInvoices = await db
    .select({
      status: invoices.status,
      amount: invoices.amount,
    })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId));

  const totalInvoices = allInvoices.length;
  const pendingCount = allInvoices.filter(i => i.status === 'pending').length;
  const paidCount = allInvoices.filter(i => i.status === 'paid').length;
  const overdueCount = allInvoices.filter(i => i.status === 'overdue').length;

  const totalRevenue = allInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const pendingRevenue = allInvoices
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return {
    totalInvoices,
    pendingCount,
    paidCount,
    overdueCount,
    totalRevenue,
    pendingRevenue,
  };
}

export default async function InvoicesPage() {
  await requireAuth();
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const invoicesList = await getInvoices(tenantId);
  const stats = await getInvoiceStats(tenantId);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(Number(amount));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-gray-600">Manage student invoices and billing</p>
        </div>
        <Link
          href="/admin/finance/invoices/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
        >
          + Create Invoice
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Invoices</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalInvoices}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.pendingCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Paid</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{stats.paidCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Overdue</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{stats.overdueCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            ${stats.totalRevenue.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Pending Revenue</div>
          <div className="mt-2 text-2xl font-bold text-yellow-600">
            ${stats.pendingRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Invoices</h2>
        </div>

        {invoicesList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No invoices found</p>
            <Link
              href="/admin/finance/invoices/create"
              className="mt-4 inline-flex items-center text-purple-600 hover:text-purple-700"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoicesList.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/finance/invoices/${invoice.id}`}
                        className="text-sm font-medium text-purple-600 hover:text-purple-900"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.studentName}
                      </div>
                      <div className="text-sm text-gray-500">{invoice.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={`/admin/finance/invoices/${invoice.id}`}
                        className="text-purple-600 hover:text-purple-900 mr-4"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
