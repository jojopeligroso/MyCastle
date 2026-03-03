/**
 * GET /api/student/verify/pending
 * Get pending verifications for the current user
 */

import { NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth/utils';
import { getPendingVerifications } from '@/lib/verification';

export async function GET() {
  try {
    await requireAuth(['student']);
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verifications = await getPendingVerifications(userId);

    return NextResponse.json({
      verifications: verifications.map(v => ({
        id: v.id,
        contactType: v.contactType,
        maskedValue: v.maskedValue,
        expiresAt: v.expiresAt.toISOString(),
        attemptsRemaining: v.attemptsRemaining,
      })),
    });
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    return NextResponse.json({ error: 'Failed to fetch pending verifications' }, { status: 500 });
  }
}
