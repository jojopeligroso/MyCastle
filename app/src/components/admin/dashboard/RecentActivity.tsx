interface AuditEvent {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  changes: unknown;
  timestamp: Date;
  actor_name: string | null;
  actor_email: string | null;
  actor_role: string | null;
}

interface RecentActivityProps {
  events: AuditEvent[];
}

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-700 bg-green-50',
  update: 'text-blue-700 bg-blue-50',
  delete: 'text-red-700 bg-red-50',
  login: 'text-purple-700 bg-purple-50',
  logout: 'text-gray-700 bg-gray-50',
};

export function RecentActivity({ events }: RecentActivityProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-medium text-gray-700">No recent activity</p>
          <p className="text-sm">Audit events will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <p className="mt-1 text-sm text-gray-500">Last 50 audit events</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Action
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Resource
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actor
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map(event => {
              const actionColor =
                ACTION_COLORS[event.action.toLowerCase()] || 'text-gray-700 bg-gray-50';

              return (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionColor}`}
                    >
                      {event.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.resource_type || '-'}</div>
                    {event.resource_id && (
                      <div className="text-xs text-gray-500 font-mono">
                        {event.resource_id.substring(0, 8)}...
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{event.actor_name || 'System'}</div>
                    <div className="text-xs text-gray-500">{event.actor_role || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
