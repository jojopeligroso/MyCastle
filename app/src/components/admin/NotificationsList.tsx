import Link from 'next/link';

export type NotificationSummary = {
  id: string;
  title: string;
  body: string;
  severity: string;
  status: string;
  type: string;
  target_scope: string;
  created_at: Date | string;
  scheduled_at?: Date | string | null;
  sent_at?: Date | string | null;
  read_count: number;
  unread_count: number;
  recipient_count: number;
};

type NotificationsListProps = {
  notifications: NotificationSummary[];
  filters: {
    status?: string;
    type?: string;
    scope?: string;
  };
  createAction: (formData: FormData) => void | Promise<void>;
};

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-gray-100 text-gray-800',
};

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

const SCOPE_LABELS: Record<string, string> = {
  all: 'All users',
  role: 'By role',
  user: 'Specific users',
};

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const getLabel = (value: string) => {
  if (!value) return 'unknown';
  return value.replace(/_/g, ' ');
};

export function NotificationsList({
  notifications,
  filters,
  createAction,
}: NotificationsListProps) {
  const statusStyle = (status: string) => STATUS_STYLES[status] || 'bg-gray-100 text-gray-800';
  const severityStyle = (severity: string) =>
    SEVERITY_STYLES[severity] || 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Notifications</h2>
              <p className="text-sm text-gray-500">
                Review recent notifications and their delivery status
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Status</label>
                  <select
                    name="status"
                    defaultValue={filters.status || ''}
                    className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">All</option>
                    <option value="sent">Sent</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Type</label>
                  <select
                    name="type"
                    defaultValue={filters.type || ''}
                    className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">All</option>
                    <option value="system">System</option>
                    <option value="announcement">Announcement</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Audience</label>
                  <select
                    name="scope"
                    defaultValue={filters.scope || ''}
                    className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">All</option>
                    <option value="all">All users</option>
                    <option value="role">Role</option>
                    <option value="user">User</option>
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
                    href="/admin/communications/notifications"
                    className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Clear
                  </Link>
                </div>
              </form>
              <Link
                href="#create-notification"
                className="inline-flex items-center rounded-md border border-purple-600 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50"
              >
                Create Notification
              </Link>
            </div>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No notifications match your filters yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Audience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Read Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications.map(notification => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium text-gray-900">{notification.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{notification.body}</div>
                      <div className="mt-1 text-xs text-gray-400">
                        {getLabel(notification.type)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${severityStyle(
                          notification.severity
                        )}`}
                      >
                        {getLabel(notification.severity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-medium text-gray-900">
                        {SCOPE_LABELS[notification.target_scope] ||
                          getLabel(notification.target_scope)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {notification.recipient_count} recipients
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDateTime(
                        notification.sent_at || notification.scheduled_at || notification.created_at
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500">
                          Unread: {notification.unread_count}
                        </span>
                        <span className="text-xs text-gray-500">
                          Read: {notification.read_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(
                          notification.status
                        )}`}
                      >
                        {getLabel(notification.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div id="create-notification" className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Notification</h3>
          <p className="text-sm text-gray-500">
            Draft a manual notification to send to a user, a role, or everyone.
          </p>
        </div>
        <form className="px-6 py-5 space-y-4" action={createAction}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500">Title</label>
              <input
                type="text"
                name="title"
                placeholder="Upcoming holiday schedule"
                required
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Severity</label>
              <select
                name="severity"
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Message</label>
            <textarea
              name="body"
              rows={4}
              placeholder="Write the notification message..."
              required
              className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-500">Audience</label>
              <select
                name="target_scope"
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="all">All users</option>
                <option value="role">Role</option>
                <option value="user">Specific user</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                User ID (if targeting a user)
              </label>
              <input
                type="text"
                name="user_id"
                placeholder="user-uuid"
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                Role (if targeting a role)
              </label>
              <input
                type="text"
                name="recipient_role"
                placeholder="teacher, admin"
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500">Type</label>
              <select
                name="type"
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="system">System</option>
                <option value="announcement">Announcement</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Schedule (optional)</label>
              <input
                type="datetime-local"
                name="scheduled_at"
                className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
            >
              Send Notification
            </button>
            <p className="text-xs text-gray-500">
              Notifications are saved immediately; delivery channels will be wired up separately.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
