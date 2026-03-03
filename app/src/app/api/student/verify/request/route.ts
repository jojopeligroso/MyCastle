/**
 * POST /api/student/verify/request
 * Request a verification code for email or phone change
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getTenantId, getUserId } from '@/lib/auth/utils';
import { requestVerification, getVerificationCode, ContactType } from '@/lib/verification';
import { z } from 'zod';

const requestSchema = z.object({
  contactType: z.enum(['email', 'phone']),
  newValue: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Students can verify their own contact info
    await requireAuth(['student']);
    const tenantId = await getTenantId();
    const userId = await getUserId();

    if (!tenantId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { contactType, newValue } = parseResult.data;

    // Request verification
    const result = await requestVerification({
      userId,
      tenantId,
      contactType: contactType as ContactType,
      newValue,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          cooldownUntil: result.cooldownUntil?.toISOString(),
        },
        { status: 400 }
      );
    }

    // Get the code for sending
    const code = await getVerificationCode(result.verificationId!);

    // In production, send email/SMS here
    // For now, we'll include the code in the response for development
    // TODO: Integrate with email/SMS service
    const isDev = process.env.NODE_ENV === 'development';

    // Log for development
    if (isDev && code) {
      console.log(`[Verification] Code for ${contactType} ${newValue}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      verificationId: result.verificationId,
      expiresAt: result.expiresAt?.toISOString(),
      message: `Verification code sent to your ${contactType}`,
      // Include code in dev mode only
      ...(isDev && { devCode: code }),
    });
  } catch (error) {
    console.error('Error requesting verification:', error);
    return NextResponse.json(
      { error: 'Failed to request verification' },
      { status: 500 }
    );
  }
}
