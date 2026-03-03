/**
 * Teacher Students List Page
 * Shows all students enrolled in the teacher's classes
 */

import { requireAuth, getTenantId, getCurrentUser } from '@/lib/auth/utils';
import { db } from '@/db';
import { classes, enrollments, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import Link from 'next/link';

interface StudentWithEnrollments {
  id: string;
  name: string | null;
  email: string;
  currentLevel: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  enrollments: {
    classId: string;
    className: string;
    classLevel: string | null;
  }[];
}

async function getTeacherStudents(): Promise<{
  students: StudentWithEnrollments[];
  classes: { id: string; name: string; level: string | null }[];
}> {
  const user = await getCurrentUser();
  const tenantId = await getTenantId();

  if (!user || !tenantId) {
    return { students: [], classes: [] };
  }

  // Get all classes taught by this teacher
  const teacherClasses = await db
    .select({
      id: classes.id,
      name: classes.name,
      level: classes.level,
    })
    .from(classes)
    .where(
      and(
        eq(classes.teacherId, user.id),
        eq(classes.tenantId, tenantId),
        eq(classes.status, 'active')
      )
    );

  if (teacherClasses.length === 0) {
    return { students: [], classes: [] };
  }

  const teacherClassIds = teacherClasses.map(c => c.id);

  // Get all enrollments in those classes
  const studentEnrollments = await db
    .select({
      studentId: enrollments.studentId,
      classId: enrollments.classId,
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.tenantId, tenantId),
        eq(enrollments.status, 'active'),
        inArray(enrollments.classId, teacherClassIds)
      )
    );

  const studentIds = [...new Set(studentEnrollments.map(e => e.studentId))];

  if (studentIds.length === 0) {
    return { students: [], classes: teacherClasses };
  }

  // Get student details
  const studentRecords = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      currentLevel: users.currentLevel,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.role, 'student'), inArray(users.id, studentIds)));

  // Attach enrollment info
  const studentsWithEnrollments: StudentWithEnrollments[] = studentRecords.map(student => {
    const studentEnrollmentList = studentEnrollments
      .filter(e => e.studentId === student.id)
      .map(e => {
        const cls = teacherClasses.find(c => c.id === e.classId);
        return {
          classId: e.classId,
          className: cls?.name || 'Unknown',
          classLevel: cls?.level || null,
        };
      });

    return {
      ...student,
      enrollments: studentEnrollmentList,
    };
  });

  return { students: studentsWithEnrollments, classes: teacherClasses };
}

export default async function TeacherStudentsPage() {
  await requireAuth(['teacher']);
  const { students, classes: teacherClasses } = await getTeacherStudents();

  const getLevelBadgeColor = (level: string | null): string => {
    if (!level) return 'bg-gray-100 text-gray-800';
    if (level.startsWith('C')) return 'bg-purple-100 text-purple-800';
    if (level.startsWith('B2')) return 'bg-blue-100 text-blue-800';
    if (level.startsWith('B1')) return 'bg-green-100 text-green-800';
    if (level.startsWith('A2')) return 'bg-yellow-100 text-yellow-800';
    if (level.startsWith('A1')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="text-sm text-gray-500 mt-1">
            Students enrolled in your classes ({students.length} total)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m-3-6V9.5A2.5 2.5 0 0114.5 7a2.5 2.5 0 012.5 2.5V12"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">My Classes</p>
              <p className="text-2xl font-semibold text-gray-900">{teacherClasses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Students/Class</p>
              <p className="text-2xl font-semibold text-gray-900">
                {teacherClasses.length > 0
                  ? Math.round(students.length / teacherClasses.length)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No students yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Students will appear here once they are enrolled in your classes.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                        {student.name
                          ?.split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase() || '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeColor(student.currentLevel)}`}
                    >
                      {student.currentLevel || 'No level'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {student.enrollments.map((enrollment, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                        >
                          {enrollment.className}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {student.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/teacher/students/${student.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Profile
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
