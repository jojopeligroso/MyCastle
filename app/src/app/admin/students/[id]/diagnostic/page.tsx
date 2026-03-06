/**
 * Student Diagnostic Page - Record diagnostic test results for placement
 */

import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { db } from '@/db';
import { students, users, diagnosticSessions } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { DiagnosticInputForm } from '@/components/admin/students/DiagnosticInputForm';

interface StudentBasicInfo {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  studentNumber: string | null;
}

interface ExistingDiagnostic {
  id: string;
  status: string;
  stageResults: Record<string, unknown>;
  recommendedLevel: string | null;
  actualPlacementLevel: string | null;
  notes: string | null;
  startedAt: Date;
}

async function getStudentBasicInfo(studentId: string): Promise<StudentBasicInfo | null> {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Set RLS context
  await db.execute(sql.raw(`SET app.user_email = 'eoinmaleoin@gmail.com'`));
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const result = await db
    .select({
      id: students.id,
      userId: students.userId,
      name: users.name,
      email: users.email,
      studentNumber: students.studentNumber,
    })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(and(eq(students.id, studentId), eq(students.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0) return null;
  return result[0];
}

async function getLatestDiagnostic(studentUserId: string): Promise<ExistingDiagnostic | null> {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  // Check for in-progress or recent diagnostic sessions
  const result = await db
    .select({
      id: diagnosticSessions.id,
      status: diagnosticSessions.status,
      stageResults: diagnosticSessions.stageResults,
      recommendedLevel: diagnosticSessions.recommendedLevel,
      actualPlacementLevel: diagnosticSessions.actualPlacementLevel,
      notes: diagnosticSessions.notes,
      startedAt: diagnosticSessions.startedAt,
    })
    .from(diagnosticSessions)
    .where(
      and(
        eq(diagnosticSessions.studentId, studentUserId),
        eq(diagnosticSessions.tenantId, tenantId)
      )
    )
    .orderBy(desc(diagnosticSessions.startedAt))
    .limit(1);

  if (result.length === 0) return null;

  const diagnostic = result[0];

  // Only return if it's in progress (not completed/finalized)
  if (diagnostic.status === 'completed' || diagnostic.status === 'finalized') {
    return null;
  }

  return {
    ...diagnostic,
    stageResults: (diagnostic.stageResults as Record<string, unknown>) || {},
  };
}

export default async function DiagnosticPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth(['admin', 'dos']);
  const { id } = await params;

  const student = await getStudentBasicInfo(id);
  if (!student) {
    notFound();
  }

  const existingDiagnostic = await getLatestDiagnostic(student.userId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/students" className="hover:text-purple-600">
              Students
            </Link>
            <span>/</span>
            <Link href={`/admin/students/${id}`} className="hover:text-purple-600">
              {student.name || student.email}
            </Link>
            <span>/</span>
            <span className="text-gray-900">Diagnostic</span>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Diagnostic Assessment</h1>
              <p className="text-sm text-gray-500">
                {student.studentNumber || 'No student number'} - {student.name || 'Unnamed Student'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {existingDiagnostic && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Continuing existing diagnostic</span> - Started{' '}
                {new Date(existingDiagnostic.startedAt).toLocaleDateString()}. Status:{' '}
                <span className="capitalize">{existingDiagnostic.status.replace('_', ' ')}</span>
              </p>
            </div>
          </div>
        )}

        <DiagnosticInputForm
          studentId={student.userId}
          studentName={student.name || student.email}
          existingDiagnostic={
            existingDiagnostic
              ? {
                  id: existingDiagnostic.id,
                  status: existingDiagnostic.status,
                  stageResults: existingDiagnostic.stageResults as {
                    written?: { score: number; notes: string | null; completedAt: string };
                    oral?: { score: number; notes: string | null; completedAt: string };
                  },
                  recommendedLevel: existingDiagnostic.recommendedLevel,
                  actualPlacementLevel: existingDiagnostic.actualPlacementLevel,
                  notes: existingDiagnostic.notes,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
