/**
 * Contact Verification Utilities
 * Handles email/phone verification code generation and validation
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #9
 */

import { db } from '@/db';
import { contactVerifications } from '@/db/schema/profile';
import { users } from '@/db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Constants
const CODE_LENGTH = 6;
const CODE_EXPIRY_HOURS = 24;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MINUTES = 2;

export type ContactType = 'email' | 'phone';

export interface VerificationRequest {
  userId: string;
  tenantId: string;
  contactType: ContactType;
  newValue: string;
  oldValue?: string;
}

export interface VerificationResult {
  success: boolean;
  verificationId?: string;
  expiresAt?: Date;
  error?: string;
  cooldownUntil?: Date;
}

export interface ConfirmationResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
}

/**
 * Generate a cryptographically secure verification code
 */
export function generateVerificationCode(): string {
  // Generate 6 random digits
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0);
  const code = (num % 1000000).toString().padStart(CODE_LENGTH, '0');
  return code;
}

/**
 * Check if user has a pending verification that's still in cooldown
 */
async function checkCooldown(
  userId: string,
  contactType: ContactType
): Promise<Date | null> {
  const cooldownTime = new Date();
  cooldownTime.setMinutes(cooldownTime.getMinutes() - RESEND_COOLDOWN_MINUTES);

  const [recent] = await db
    .select({ createdAt: contactVerifications.createdAt })
    .from(contactVerifications)
    .where(
      and(
        eq(contactVerifications.userId, userId),
        eq(contactVerifications.contactType, contactType),
        eq(contactVerifications.status, 'pending'),
        gt(contactVerifications.createdAt, cooldownTime)
      )
    )
    .orderBy(sql`${contactVerifications.createdAt} DESC`)
    .limit(1);

  if (recent) {
    const cooldownUntil = new Date(recent.createdAt);
    cooldownUntil.setMinutes(cooldownUntil.getMinutes() + RESEND_COOLDOWN_MINUTES);
    return cooldownUntil;
  }

  return null;
}

/**
 * Request a new verification code
 * Invalidates any existing pending verifications for the same contact type
 */
export async function requestVerification(
  request: VerificationRequest
): Promise<VerificationResult> {
  const { userId, tenantId, contactType, newValue, oldValue } = request;

  // Check cooldown
  const cooldownUntil = await checkCooldown(userId, contactType);
  if (cooldownUntil && cooldownUntil > new Date()) {
    return {
      success: false,
      error: 'Please wait before requesting another code',
      cooldownUntil,
    };
  }

  // Validate the new value format
  if (contactType === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newValue)) {
      return { success: false, error: 'Invalid email format' };
    }
  } else if (contactType === 'phone') {
    // Basic phone validation - at least 10 digits
    const phoneDigits = newValue.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return { success: false, error: 'Invalid phone number format' };
    }
  }

  // Cancel any existing pending verifications for this user and contact type
  await db
    .update(contactVerifications)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(contactVerifications.userId, userId),
        eq(contactVerifications.contactType, contactType),
        eq(contactVerifications.status, 'pending')
      )
    );

  // Generate new code and expiry
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CODE_EXPIRY_HOURS);

  // Create verification record
  const [verification] = await db
    .insert(contactVerifications)
    .values({
      tenantId,
      userId,
      contactType,
      newValue,
      oldValue: oldValue || null,
      verificationCode: code,
      codeExpiresAt: expiresAt,
      status: 'pending',
      attempts: 0,
    })
    .returning({ id: contactVerifications.id });

  return {
    success: true,
    verificationId: verification.id,
    expiresAt,
  };
}

/**
 * Get the verification code for sending (internal use only)
 * This should only be called by the email/SMS sending service
 */
export async function getVerificationCode(verificationId: string): Promise<string | null> {
  const [verification] = await db
    .select({ code: contactVerifications.verificationCode })
    .from(contactVerifications)
    .where(
      and(
        eq(contactVerifications.id, verificationId),
        eq(contactVerifications.status, 'pending')
      )
    )
    .limit(1);

  return verification?.code || null;
}

/**
 * Confirm a verification code
 */
export async function confirmVerification(
  userId: string,
  contactType: ContactType,
  code: string
): Promise<ConfirmationResult> {
  const now = new Date();

  // Find the pending verification
  const [verification] = await db
    .select()
    .from(contactVerifications)
    .where(
      and(
        eq(contactVerifications.userId, userId),
        eq(contactVerifications.contactType, contactType),
        eq(contactVerifications.status, 'pending'),
        gt(contactVerifications.codeExpiresAt, now)
      )
    )
    .orderBy(sql`${contactVerifications.createdAt} DESC`)
    .limit(1);

  if (!verification) {
    return {
      success: false,
      error: 'No pending verification found or code has expired',
    };
  }

  // Check max attempts
  if ((verification.attempts || 0) >= MAX_ATTEMPTS) {
    // Mark as failed
    await db
      .update(contactVerifications)
      .set({ status: 'failed' })
      .where(eq(contactVerifications.id, verification.id));

    return {
      success: false,
      error: 'Maximum verification attempts exceeded. Please request a new code.',
      attemptsRemaining: 0,
    };
  }

  // Increment attempts
  await db
    .update(contactVerifications)
    .set({
      attempts: (verification.attempts || 0) + 1,
      lastAttemptAt: now,
    })
    .where(eq(contactVerifications.id, verification.id));

  // Check code
  if (verification.verificationCode !== code) {
    const attemptsRemaining = MAX_ATTEMPTS - (verification.attempts || 0) - 1;
    return {
      success: false,
      error: `Invalid code. ${attemptsRemaining} attempts remaining.`,
      attemptsRemaining,
    };
  }

  // Code is correct - mark as verified and update user contact
  await db
    .update(contactVerifications)
    .set({
      status: 'verified',
      verifiedAt: now,
    })
    .where(eq(contactVerifications.id, verification.id));

  // Update the user's contact information
  if (contactType === 'email') {
    await db
      .update(users)
      .set({
        email: verification.newValue,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
  }
  // Note: Phone is stored in user metadata, handled by the calling code

  return { success: true };
}

/**
 * Get pending verifications for a user
 */
export async function getPendingVerifications(userId: string) {
  const now = new Date();

  const verifications = await db
    .select({
      id: contactVerifications.id,
      contactType: contactVerifications.contactType,
      newValue: contactVerifications.newValue,
      expiresAt: contactVerifications.codeExpiresAt,
      createdAt: contactVerifications.createdAt,
      attempts: contactVerifications.attempts,
    })
    .from(contactVerifications)
    .where(
      and(
        eq(contactVerifications.userId, userId),
        eq(contactVerifications.status, 'pending'),
        gt(contactVerifications.codeExpiresAt, now)
      )
    );

  return verifications.map(v => ({
    ...v,
    maskedValue: maskContactValue(v.contactType as ContactType, v.newValue),
    attemptsRemaining: MAX_ATTEMPTS - (v.attempts || 0),
  }));
}

/**
 * Cancel a pending verification
 */
export async function cancelVerification(
  userId: string,
  verificationId: string
): Promise<boolean> {
  const result = await db
    .update(contactVerifications)
    .set({ status: 'cancelled' })
    .where(
      and(
        eq(contactVerifications.id, verificationId),
        eq(contactVerifications.userId, userId),
        eq(contactVerifications.status, 'pending')
      )
    )
    .returning({ id: contactVerifications.id });

  return result.length > 0;
}

/**
 * Mask a contact value for display (e.g., "j***@example.com")
 */
export function maskContactValue(contactType: ContactType, value: string): string {
  if (contactType === 'email') {
    const [localPart, domain] = value.split('@');
    if (!domain) return '***';
    const maskedLocal = localPart.charAt(0) + '***';
    return `${maskedLocal}@${domain}`;
  } else {
    // Phone: show last 4 digits
    const digits = value.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    return `***${digits.slice(-4)}`;
  }
}

/**
 * Clean up expired verifications (for cron job)
 */
export async function cleanupExpiredVerifications(): Promise<number> {
  const now = new Date();

  const result = await db
    .update(contactVerifications)
    .set({ status: 'expired' })
    .where(
      and(
        eq(contactVerifications.status, 'pending'),
        sql`${contactVerifications.codeExpiresAt} < ${now}`
      )
    )
    .returning({ id: contactVerifications.id });

  return result.length;
}
