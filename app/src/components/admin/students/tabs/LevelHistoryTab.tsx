'use client';

import useSWR from 'swr';

interface LevelChange {
  id: string;
  fromLevel: string;
  toLevel: string;
  changeType: 'promotion' | 'diagnostic' | 'manual_adjustment';
  status: 'approved' | 'pending' | 'rejected';
  recommendedBy: { name: string; role: string } | null;
  reviewedBy: { name: string; role: string } | null;
  reason: string | null;
  reviewNotes: string | null;
  recommendedAt: string;
  reviewedAt: string | null;
  appliedAt: string | null;
}

interface DiagnosticSession {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  currentStage: string | null;
  recommendedLevel: string | null;
  actualPlacementLevel: string | null;
  administeredBy: { name: string } | null;
}

interface LevelHistoryTabProps {
  studentId: string;
  currentLevel: string | null;
  initialLevel: string | null;
  levelStatus: 'confirmed' | 'provisional' | 'pending_approval' | null;
  isAdmin?: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function LevelHistoryTab({
  studentId,
  currentLevel,
  initialLevel,
  levelStatus,
  isAdmin = false,
}: LevelHistoryTabProps) {
  // Fetch level history
  const {
    data: levelData,
    isLoading: levelLoading,
    error: levelError,
  } = useSWR<{
    promotions: LevelChange[];
  }>(studentId ? `/api/admin/students/${studentId}/level-history` : null, fetcher);

  // Fetch diagnostics
  const {
    data: diagnosticData,
    isLoading: diagnosticLoading,
    error: diagnosticError,
  } = useSWR<{
    diagnostics: DiagnosticSession[];
  }>(studentId ? `/api/admin/students/${studentId}/diagnostics` : null, fetcher);

  const promotions = levelData?.promotions || [];
  const diagnostics = diagnosticData?.diagnostics || [];
  const isLoading = levelLoading || diagnosticLoading;
  const hasError = levelError || diagnosticError;

  const getLevelBadgeColor = (level: string | null): string => {
    if (!level) return 'bg-gray-100 text-gray-800';

    const colors: Record<string, string> = {
      A0: 'bg-slate-100 text-slate-800',
      A1: 'bg-green-100 text-green-800',
      A2: 'bg-green-200 text-green-900',
      B1: 'bg-blue-100 text-blue-800',
      'B1+': 'bg-blue-200 text-blue-900',
      B2: 'bg-indigo-100 text-indigo-800',
      'B2+': 'bg-indigo-200 text-indigo-900',
      C1: 'bg-purple-100 text-purple-800',
      C2: 'bg-purple-200 text-purple-900',
    };

    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-amber-100 text-amber-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="bg-red-50 rounded-lg p-4 text-center">
        <p className="text-sm text-red-600">Failed to load level history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Level Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Level Status</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Current Level</p>
                {currentLevel ? (
                  <span
                    className={`inline-flex px-3 py-1.5 text-lg font-bold rounded ${getLevelBadgeColor(currentLevel)}`}
                  >
                    {currentLevel}
                  </span>
                ) : (
                  <span className="text-gray-400">Not assessed</span>
                )}
              </div>
              {initialLevel && initialLevel !== currentLevel && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Initial Level</p>
                  <span
                    className={`inline-flex px-2 py-1 text-sm font-medium rounded ${getLevelBadgeColor(initialLevel)}`}
                  >
                    {initialLevel}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              {levelStatus === 'confirmed' && (
                <span className="inline-flex items-center gap-1 text-sm text-green-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Confirmed
                </span>
              )}
              {levelStatus === 'provisional' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Provisional
                </span>
              )}
              {levelStatus === 'pending_approval' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  Pending Approval
                </span>
              )}
              {!levelStatus && <span className="text-sm text-gray-400">Unknown</span>}
            </div>
          </div>
          {currentLevel && initialLevel && currentLevel !== initialLevel && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Progress: <span className="font-medium text-gray-700">{initialLevel}</span>
                <span className="mx-2">→</span>
                <span className="font-medium text-gray-700">{currentLevel}</span> (
                {getLevelProgression(initialLevel, currentLevel)} level
                {getLevelProgression(initialLevel, currentLevel) > 1 ? 's' : ''})
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Level Promotion History */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Level Change History</h3>
          {isAdmin && (
            <button className="px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-300 rounded hover:bg-purple-50 transition-colors">
              Manual Level Adjustment
            </button>
          )}
        </div>

        {promotions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">No level changes recorded</p>
            <p className="mt-1 text-xs text-gray-500">
              Level changes will appear here when promotions are approved
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promotions.map((promo: LevelChange) => (
                  <tr key={promo.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(promo.appliedAt || promo.recommendedAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getLevelBadgeColor(promo.fromLevel)}`}
                        >
                          {promo.fromLevel}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getLevelBadgeColor(promo.toLevel)}`}
                        >
                          {promo.toLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                      {promo.changeType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(promo.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {promo.reviewedBy?.name || promo.recommendedBy?.name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Diagnostic History */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Diagnostic History</h3>

        {diagnostics.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">No diagnostic tests recorded</p>
            <p className="mt-1 text-xs text-gray-500">
              Placement tests and diagnostic sessions will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {diagnostics.map((session: DiagnosticSession) => (
              <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Diagnostic Test - {new Date(session.startedAt).toLocaleDateString('en-GB')}
                    </p>
                    {session.currentStage && session.status === 'in_progress' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Current stage: <span className="font-medium">{session.currentStage}</span>
                      </p>
                    )}
                  </div>
                  {getStatusBadge(session.status)}
                </div>
                {session.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-6">
                    <div>
                      <p className="text-xs text-gray-500">Recommended</p>
                      <span
                        className={`inline-flex px-2 py-0.5 text-sm font-medium rounded ${getLevelBadgeColor(session.recommendedLevel)}`}
                      >
                        {session.recommendedLevel || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Placed In</p>
                      <span
                        className={`inline-flex px-2 py-0.5 text-sm font-medium rounded ${getLevelBadgeColor(session.actualPlacementLevel)}`}
                      >
                        {session.actualPlacementLevel || 'N/A'}
                      </span>
                    </div>
                    {session.administeredBy && (
                      <div>
                        <p className="text-xs text-gray-500">Administered By</p>
                        <p className="text-sm text-gray-700">{session.administeredBy.name}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Helper function to calculate level progression
function getLevelProgression(from: string, to: string): number {
  const levels = ['A0', 'A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];
  const fromIndex = levels.indexOf(from);
  const toIndex = levels.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return 0;
  return Math.abs(toIndex - fromIndex);
}
