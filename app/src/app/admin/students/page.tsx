import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth/utils';
import { db } from '@/db';
import { users } from '@/db/schema/core';
import { eq, and, isNull } from 'drizzle-orm';
import { StudentRegistry } from '@/components/admin/students/StudentRegistry';

interface StudentStats {
  total: number;
  active: number;
  visaExpiring: number;
  atRisk: number;
}

async function getStudents() {
  try {
    // Fetch students from the database
    const students = await db
      .select()
      .from(users)
      .where(and(eq(users.role, 'student'), isNull(users.deleted_at)))
      .orderBy(users.name);

    return students;
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return [];
  }
}

async function getStudentStats(students: any[]): Promise<StudentStats> {
  const total = students.length;
  const active = students.filter((s) => s.status === 'active').length;

  // Count visa expiring soon (within 30 days)
  const visaExpiring = students.filter((s) => {
    if (!s.visa_expiry) return false;
    const expiryDate = new Date(s.visa_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }).length;

  // Count at-risk students (attendance < 80%)
  // This will be calculated from view once migrations are run
  const atRisk = 0;

  return { total, active, visaExpiring, atRisk };
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      <div className="h-96 bg-gray-200 rounded-lg"></div>
    </div>
  );
}

export default async function Page() {
  await requireAuth();

  const students = await getStudents();
  const stats = await getStudentStats(students);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Total Students" value={stats.total} icon="👥" color="blue" />
        <StatCard label="Active Students" value={stats.active} icon="✅" color="green" />
        <StatCard label="Visa Expiring" value={stats.visaExpiring} icon="⚠️" color="amber" />
        <StatCard label="At Risk" value={stats.atRisk} icon="🚨" color="red" />
      </div>

      {/* Student Registry */}
      <Suspense fallback={<LoadingSkeleton />}>
        <StudentRegistry students={students} />
      </Suspense>
    </div>
  );
}

// Make this page dynamic to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
