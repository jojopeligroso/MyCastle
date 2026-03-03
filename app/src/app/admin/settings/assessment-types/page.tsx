/**
 * Summative Assessment Types Admin Page
 * Manage school-defined assessment types (End of Unit, Mid-Term, etc.)
 */

import { db } from '@/db';
import { summativeAssessmentTypes } from '@/db/schema/profile';
import { eq, sql, asc } from 'drizzle-orm';
import { requireAuth, getTenantId } from '@/lib/auth/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AssessmentTypesManager } from '@/components/admin/settings/AssessmentTypesManager';

async function getAssessmentTypes(tenantId: string) {
  await db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`));

  const types = await db
    .select({
      id: summativeAssessmentTypes.id,
      name: summativeAssessmentTypes.name,
      description: summativeAssessmentTypes.description,
      isActive: summativeAssessmentTypes.isActive,
      createdAt: summativeAssessmentTypes.createdAt,
    })
    .from(summativeAssessmentTypes)
    .where(eq(summativeAssessmentTypes.tenantId, tenantId))
    .orderBy(asc(summativeAssessmentTypes.name));

  return types;
}

export default async function AssessmentTypesPage() {
  await requireAuth(['admin', 'dos']);
  const tenantId = await getTenantId();

  if (!tenantId) {
    notFound();
  }

  const types = await getAssessmentTypes(tenantId);
  const activeTypes = types.filter(t => t.isActive);
  const inactiveTypes = types.filter(t => !t.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin" className="hover:text-purple-600">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/admin/settings" className="hover:text-purple-600">
              Settings
            </Link>
            <span>/</span>
            <span className="text-gray-900">Assessment Types</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900">Summative Assessment Types</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define the types of formal assessments used in your school (e.g., End of Unit Test,
            Mid-Term Exam)
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Total Types</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{types.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{activeTypes.length}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{inactiveTypes.length}</p>
        </div>
      </div>

      {/* Interactive Manager */}
      <AssessmentTypesManager initialTypes={types} />
    </div>
  );
}
