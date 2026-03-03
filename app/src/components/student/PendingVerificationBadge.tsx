'use client';

/**
 * PendingVerificationBadge Component
 * Shows "awaiting verification" status for pending contact changes
 */

import React from 'react';
import useSWR from 'swr';

interface PendingVerification {
  id: string;
  contactType: 'email' | 'phone';
  maskedValue: string;
  expiresAt: string;
  attemptsRemaining: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function PendingVerificationBadge() {
  const { data } = useSWR<{ verifications: PendingVerification[] }>(
    '/api/student/verify/pending',
    fetcher,
    { refreshInterval: 60000 }
  );

  if (!data?.verifications?.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {data.verifications.map(v => (
        <div
          key={v.id}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm"
        >
          <svg
            className="w-4 h-4 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-amber-800">
            {v.contactType === 'email' ? 'Email' : 'Phone'} change to{' '}
            <span className="font-medium">{v.maskedValue}</span> awaiting verification
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Inline badge for use in forms/lists
 */
export function PendingVerificationInlineBadge({
  contactType,
}: {
  contactType: 'email' | 'phone';
}) {
  const { data } = useSWR<{ verifications: PendingVerification[] }>(
    '/api/student/verify/pending',
    fetcher
  );

  const pending = data?.verifications?.find(v => v.contactType === contactType);

  if (!pending) {
    return null;
  }

  const expiresAt = new Date(pending.expiresAt);
  const now = new Date();
  const minutesRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 60000));

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Pending ({minutesRemaining}m)
    </span>
  );
}

export default PendingVerificationBadge;
