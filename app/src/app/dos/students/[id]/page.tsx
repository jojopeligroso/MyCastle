/**
 * DoS Student Detail Page
 * Full student profile view for Director of Studies
 */

import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { DoSStudentProfile } from '@/components/dos';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DoSStudentDetailPage({ params }: PageProps) {
  await requireAuth(['admin', 'dos', 'assistant_dos']);
  const tenantId = await getTenantId();
  const dosUserId = await getUserId();
  const { id: studentId } = await params;

  if (!tenantId || !dosUserId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          <h3 className="font-medium">Authentication Error</h3>
          <p className="text-sm mt-1">
            Unable to verify your session. Please try logging in again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DoSStudentProfile studentId={studentId} dosUserId={dosUserId} />
    </div>
  );
}

export const dynamic = 'force-dynamic';
