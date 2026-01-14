import { Suspense } from 'react';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { users, students } from '@/db/schema/core';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { StudentRegistry } from '@/components/admin/students/StudentRegistry';

interface StudentStats {
  total: number;
  active: number;
  visaExpiring: number;
  atRisk: number;
}

interface StudentWithDetails {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  avatar_url: string | null;
  status: string;
  created_at: Date;
  deleted_at: Date | null;
  student_id: string;
  student_number: string | null;
  is_visa_student: boolean | null;
  visa_type: string | null;
  visa_expiry_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  medical_conditions: string | null;
  dietary_requirements: string | null;
  // Legacy field mappings for component compatibility
  visa_expiry?: string | null;
  current_level?: string | null;
  attendance_rate?: number | null;
  active_enrollments?: number;
}

async function getStudents(): Promise<StudentWithDetails[]> {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      console.error('No tenant ID available');
      return [];
    }

    // Set RLS context (using service role bypass for now)
    // TODO: Set proper user context when auth is fully integrated
    await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
    await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

    // Query students table joined with users
    const result = await db
      .select({
        // User fields
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        date_of_birth: users.dateOfBirth,
        nationality: users.nationality,
        avatar_url: users.avatarUrl,
        status: users.status,
        created_at: users.createdAt,
        deleted_at: users.deletedAt,
        // Student fields
        student_id: students.id,
        student_number: students.studentNumber,
        is_visa_student: students.isVisaStudent,
        visa_type: students.visaType,
        visa_expiry_date: students.visaExpiryDate,
        emergency_contact_name: students.emergencyContactName,
        emergency_contact_phone: students.emergencyContactPhone,
        emergency_contact_relationship: students.emergencyContactRelationship,
        medical_conditions: students.medicalConditions,
        dietary_requirements: students.dietaryRequirements,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .where(
        and(
          eq(students.tenantId, tenantId),
          eq(students.status, 'active'),
          isNull(users.deletedAt)
        )
      )
      .orderBy(users.name);

    // Map to legacy format for component compatibility
    return result.map((row) => ({
      ...row,
      // Legacy field mappings
      visa_expiry: row.visa_expiry_date,
      current_level: null, // TODO: Fetch from latest booking/enrollment
      attendance_rate: null, // TODO: Calculate from attendance data
      active_enrollments: 0, // TODO: Count from bookings
    }));
  } catch (error) {
    console.error('Failed to fetch students:', error);
    return [];
  }
}

async function getStudentStats(students: StudentWithDetails[]): Promise<StudentStats> {
  const total = students.length;
  const active = students.filter((s) => s.status === 'active').length;

  // Count visa expiring soon (within 30 days)
  const visaExpiring = students.filter((s) => {
    if (!s.visa_expiry_date) return false;
    const expiryDate = new Date(s.visa_expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }).length;

  // Count at-risk students (attendance < 80%)
  // TODO: Calculate from attendance data when available
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
