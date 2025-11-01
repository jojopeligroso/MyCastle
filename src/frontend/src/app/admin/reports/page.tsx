export default function ReportsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Reports</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Generate and view administrative reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Attendance Report', description: 'Student attendance summary by class and date range', icon: '📊' },
          { name: 'Enrollment Report', description: 'Current enrollment statistics and trends', icon: '📈' },
          { name: 'Teacher Report', description: 'Teacher performance and class load', icon: '👨‍🏫' },
          { name: 'Financial Report', description: 'Revenue and payment status overview', icon: '💰' },
          { name: 'Student Progress', description: 'Individual student performance metrics', icon: '📚' },
          { name: 'Compliance Report', description: 'Visa compliance and regulatory reports', icon: '📋' },
        ].map((report) => (
          <div
            key={report.name}
            className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="text-4xl mb-4">{report.icon}</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {report.name}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              {report.description}
            </p>
            <button className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Generate Report
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
