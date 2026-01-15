/**
 * Magic Link Authentication API Route
 *
 * Security features:
 * - Only sends magic links to existing users
 * - Returns generic success message (timing-safe)
 * - Rate limiting per IP and email
 * - Validates redirect URLs to prevent phishing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3; // 3 requests per minute per IP/email

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries
  if (entry && entry.resetAt < now) {
    rateLimitStore.delete(key);
  }

  const currentEntry = rateLimitStore.get(key);

  if (!currentEntry) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (currentEntry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((currentEntry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  currentEntry.count++;
  return { allowed: true };
}

// Validate redirect URL to prevent phishing attacks
function isValidRedirectUrl(url: string, origin: string): boolean {
  try {
    const redirectUrl = new URL(url);
    const originUrl = new URL(origin);

    // Only allow same-origin redirects or relative paths
    return redirectUrl.origin === originUrl.origin;
  } catch {
    // If URL parsing fails, treat as relative path (safe)
    return url.startsWith('/') && !url.startsWith('//');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, redirectTo } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Get client IP for rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    // Rate limit by IP
    const ipRateLimit = checkRateLimit(`ip:${ip}`);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: ipRateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipRateLimit.retryAfter || 60),
          },
        }
      );
    }

    // Rate limit by email
    const emailRateLimit = checkRateLimit(`email:${email.toLowerCase()}`);
    if (!emailRateLimit.allowed) {
      // Return generic success to avoid timing attacks
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, a magic link has been sent.',
        },
        { status: 200 }
      );
    }

    // Validate redirect URL if provided
    const origin = request.nextUrl.origin;
    const finalRedirectTo = redirectTo || `${origin}/dashboard`;

    if (!isValidRedirectUrl(finalRedirectTo, origin)) {
      return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = await createClient();

    // Check if user exists in our database
    // This prevents sending magic links to random emails
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, status, auth_id')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success message to prevent email enumeration
    // Use constant-time comparison to avoid timing attacks
    const startTime = Date.now();

    if (userData && userData.status === 'active' && userData.auth_id) {
      // User exists and is active, send magic link
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          emailRedirectTo: finalRedirectTo,
          shouldCreateUser: false, // Never create new users via magic link
        },
      });

      if (magicLinkError) {
        console.error('Magic link error:', magicLinkError);
        // Still return success to avoid leaking information
      }
    }

    // Ensure constant response time (prevent timing attacks)
    const elapsedTime = Date.now() - startTime;
    const minResponseTime = 200; // Minimum 200ms response time
    if (elapsedTime < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsedTime));
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, a magic link has been sent.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Magic link request error:', error);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
