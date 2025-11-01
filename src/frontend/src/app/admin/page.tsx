export default function AdminDashboard() {
  const stats = [
    { name: 'Total Students', value: '248', change: '+12', trend: 'up' },
    { name: 'Active Classes', value: '16', change: '+2', trend: 'up' },
    { name: 'Teachers', value: '12', change: '0', trend: 'neutral' },
    { name: 'Attendance Rate', value: '94%', change: '+3%', trend: 'up' },
  ];

  const recentClasses = [
    { id: 1, name: 'Intermediate A2', level: 'A2', students: 18, teacher: 'Sarah Johnson', time: 'Mon/Wed 10:00-12:00' },
    { id: 2, name: 'Advanced B2', level: 'B2', students: 15, teacher: 'Michael Chen', time: 'Tue/Thu 14:00-16:00' },
    { id: 3, name: 'Beginner A1', level: 'A1', students: 20, teacher: 'Emma Williams', time: 'Mon/Wed/Fri 09:00-10:30' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Welcome to MyCastle admin dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6"
          >
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{stat.name}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                {stat.value}
              </p>
              <span
                className={`text-sm font-medium ${
                  stat.trend === 'up'
                    ? 'text-green-600'
                    : stat.trend === 'down'
                    ? 'text-red-600'
                    : 'text-zinc-500'
                }`}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Classes */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Classes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Schedule
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {recentClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {cls.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {cls.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                    {cls.students}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                    {cls.teacher}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                    {cls.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
