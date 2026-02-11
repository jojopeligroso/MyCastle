'use client';

import { type User } from '@/db/schema/core';

// Extended student data type with CEFR level and visa information
interface StudentData extends User {
  currentLevel?: string | null;
  initialLevel?: string | null;
  levelStatus?: 'confirmed' | 'provisional' | 'pending_approval' | null;
  visaType?: string | null;
  visaExpiry?: string | Date | null;
}

interface PersonalInfoTabProps {
  student: StudentData;
  onApproveLevel?: () => void;
  isApproving?: boolean;
  canApproveLevel?: boolean;
}

export function PersonalInfoTab({
  student,
  onApproveLevel,
  isApproving = false,
  canApproveLevel = false,
}: PersonalInfoTabProps) {
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  };

  const getLevelBadgeColor = (level: string | null): string => {
    if (!level) return 'bg-gray-100 text-gray-800';

    const colors: Record<string, string> = {
      A1: 'bg-green-100 text-green-800',
      A2: 'bg-green-200 text-green-900',
      B1: 'bg-blue-100 text-blue-800',
      B2: 'bg-blue-200 text-blue-900',
      C1: 'bg-purple-100 text-purple-800',
      C2: 'bg-purple-200 text-purple-900',
    };

    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getLevelStatusBadge = () => {
    const status = student.levelStatus;

    if (!status || status === 'confirmed') {
      return (
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
      );
    }

    if (status === 'provisional') {
      return (
        <div className="flex items-center gap-2">
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
          {canApproveLevel && onApproveLevel && (
            <button
              onClick={onApproveLevel}
              disabled={isApproving}
              className="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isApproving ? 'Approving...' : 'Approve Level'}
            </button>
          )}
        </div>
      );
    }

    if (status === 'pending_approval') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Pending Approval
        </span>
      );
    }

    return null;
  };

  const getVisaStatusBadge = () => {
    if (!student.visaExpiry) return null;

    const expiryDate = new Date(student.visaExpiry);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          Expired
        </span>
      );
    }

    if (daysUntilExpiry <= 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Expiring Soon ({daysUntilExpiry} days)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Valid ({daysUntilExpiry} days remaining)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-500">Full Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{student.name}</dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <a href={`mailto:${student.email}`} className="text-purple-600 hover:text-purple-700">
                {student.email}
              </a>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {student.phone ? (
                <a href={`tel:${student.phone}`} className="text-purple-600 hover:text-purple-700">
                  {student.phone}
                </a>
              ) : (
                <span className="text-gray-400">Not provided</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                  student.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : student.status === 'suspended'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {student.status?.charAt(0).toUpperCase() + student.status?.slice(1)}
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium text-gray-500">Joined</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(student.createdAt)}</dd>
          </div>

          {student.lastLogin && (
            <div>
              <dt className="text-xs font-medium text-gray-500">Last Login</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(student.lastLogin)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* CEFR Level Information */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Language Level (CEFR)</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-500">Current Level</dt>
            <dd className="mt-1 flex items-center gap-2">
              {student.currentLevel ? (
                <>
                  <span
                    className={`inline-flex px-2 py-1 text-sm font-semibold rounded ${getLevelBadgeColor(student.currentLevel)}`}
                  >
                    {student.currentLevel}
                  </span>
                  {getLevelStatusBadge()}
                </>
              ) : (
                <span className="text-sm text-gray-400">Not assessed</span>
              )}
            </dd>
          </div>

          {student.initialLevel && (
            <div>
              <dt className="text-xs font-medium text-gray-500">Initial Level</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-sm font-semibold rounded ${getLevelBadgeColor(student.initialLevel)}`}
                >
                  {student.initialLevel}
                </span>
              </dd>
            </div>
          )}
        </dl>

        {student.levelStatus === 'provisional' && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> This student current level was assigned based on a diagnostic
              test result and requires approval from a Director of Studies or Administrator.
            </p>
          </div>
        )}
      </section>

      {/* Visa Information */}
      {(student.visaType || student.visaExpiry) && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Visa Information</h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {student.visaType && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Visa Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{student.visaType}</dd>
              </div>
            )}

            {student.visaExpiry && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Visa Expiry</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-gray-900">{formatDate(student.visaExpiry)}</span>
                  {getVisaStatusBadge()}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Additional Metadata */}
      {student.metadata && Object.keys(student.metadata).length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Information</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
              {JSON.stringify(student.metadata, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}
