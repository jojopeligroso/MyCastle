import Link from 'next/link';

export type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  sent_at: Date | string;
  status: string;
  body_preview?: string | null;
  provider?: string | null;
  error_message?: string | null;
};

type EmailLogsListProps = {
  logs: EmailLog[];
  filters: {
    search?: string;
    from?: string;
    to?: string;
    status?: string;
  };
};

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};

const getStatusLabel = (status: string) => {
  if (!status) return 'unknown';
  return status.replace(/_/g, ' ');
};

const formatSentAt = (sentAt: Date | string) => {
  const date = sentAt instanceof Date ? sentAt : new Date(sentAt);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export function EmailLogsList({ logs, filters }: EmailLogsListProps) {
  const statusStyle = (status: string) => STATUS_STYLES[status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email Delivery Logs</h2>
            <p className="text-sm text-gray-500">Track recent outbound email activity</p>
          </div>
          <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Recipient or subject
              </label>
              <input
                type="text"
                name="search"
                defaultValue={filters.search || ''}
                placeholder="student@example.com"
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">From</label>
              <input
                type="date"
                name="from"
                defaultValue={filters.from || ''}
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">To</label>
              <input
                type="date"
                name="to"
                defaultValue={filters.to || ''}
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Status</label>
              <select
                name="status"
                defaultValue={filters.status || ''}
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                Filter
              </button>
              <Link
                href="/admin/communications/email-logs"
                className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear
              </Link>
            </div>
          </form>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No email logs match your filters yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium text-gray-900">{log.recipient}</div>
                    {log.provider ? (
                      <div className="text-xs text-gray-500">{log.provider}</div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="font-medium text-gray-900">{log.subject}</div>
                    {log.error_message ? (
                      <div className="text-xs text-red-500">{log.error_message}</div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatSentAt(log.sent_at)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(
                        log.status
                      )}`}
                    >
                      {getStatusLabel(log.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.body_preview ? log.body_preview : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/admin/communications/email-logs/${log.id}`}
                      className="text-purple-600 hover:text-purple-900"
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
  );
}
