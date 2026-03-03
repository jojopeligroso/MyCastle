/**
 * POST /api/student/verify/[id]/cancel
 * Cancel a pending verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth/utils';
import { cancelVerification } from '@/lib/verification';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['student']);
    const userId = await getUserId();
    const { id: verificationId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cancelled = await cancelVerification(userId, verificationId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Verification not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification cancelled',
    });
  } catch (error) {
    console.error('Error cancelling verification:', error);
    return NextResponse.json({ error: 'Failed to cancel verification' }, { status: 500 });
  }
}
