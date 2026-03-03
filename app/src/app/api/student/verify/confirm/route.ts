/**
 * POST /api/student/verify/confirm
 * Confirm a verification code
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/lib/auth/utils';
import { confirmVerification, ContactType } from '@/lib/verification';
import { z } from 'zod';

const confirmSchema = z.object({
  contactType: z.enum(['email', 'phone']),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['student']);
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = confirmSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { contactType, code } = parseResult.data;

    // Confirm verification
    const result = await confirmVerification(userId, contactType as ContactType, code);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          attemptsRemaining: result.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Your ${contactType} has been verified and updated`,
    });
  } catch (error) {
    console.error('Error confirming verification:', error);
    return NextResponse.json(
      { error: 'Failed to confirm verification' },
      { status: 500 }
    );
  }
}
