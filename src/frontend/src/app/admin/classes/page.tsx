'use client';

import { useState } from 'react';

export default function ClassesPage() {
  const [classes] = useState([
    {
      id: 1,
      name: 'Intermediate A2',
      level: 'A2',
      teacher: 'Sarah Johnson',
      students: 18,
      capacity: 20,
      schedule: 'Mon/Wed 10:00-12:00',
      startDate: '2025-01-15',
      status: 'active',
    },
    {
      id: 2,
      name: 'Advanced B2',
      level: 'B2',
      teacher: 'Michael Chen',
      students: 15,
      capacity: 18,
      schedule: 'Tue/Thu 14:00-16:00',
      startDate: '2025-01-16',
      status: 'active',
    },
    {
      id: 3,
      name: 'Beginner A1',
      level: 'A1',
      teacher: 'Emma Williams',
      students: 20,
      capacity: 20,
      schedule: 'Mon/Wed/Fri 09:00-10:30',
      startDate: '2025-01-15',
      status: 'active',
    },
  ]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Classes</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage class schedules and assignments
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          + Create Class
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
          <option>All Levels</option>
          <option>A1 - Beginner</option>
          <option>A2 - Elementary</option>
          <option>B1 - Intermediate</option>
          <option>B2 - Upper Intermediate</option>
          <option>C1 - Advanced</option>
        </select>
        <select className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
          <option>All Teachers</option>
          <option>Sarah Johnson</option>
          <option>Michael Chen</option>
          <option>Emma Williams</option>
        </select>
        <input
          type="text"
          placeholder="Search classes..."
          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {cls.name}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-2">
                  {cls.level}
                </span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {cls.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span>👨‍🏫</span>
                <span>{cls.teacher}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>
                  {cls.students}/{cls.capacity} students
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>🕐</span>
                <span>{cls.schedule}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>Starts {cls.startDate}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
              <button className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors">
                View Details
              </button>
              <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
