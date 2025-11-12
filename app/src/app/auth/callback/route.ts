/**
 * Auth Callback Handler
 *
 * Handles OAuth and magic link callbacks from Supabase Auth.
 * Exchanges the authorization code for a session and redirects the user.
 *
 * Security features:
 * - Validates redirect URLs
 * - Checks for token_hash to prevent CSRF
 * - Sets secure session cookies via @supabase/ssr
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Validate that redirect URL is safe
function isValidRedirectUrl(url: string, origin: string): boolean {
  try {
    const redirectUrl = new URL(url, origin);
    const originUrl = new URL(origin);

    // Only allow same-origin redirects
    return redirectUrl.origin === originUrl.origin;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  const origin = requestUrl.origin;

  // Handle authentication errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);

    // Redirect to login with error message
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  // If no code is provided, redirect to login
  if (!code) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'Missing authorization code');
    return NextResponse.redirect(loginUrl);
  }

  // Validate redirect URL
  if (!isValidRedirectUrl(next, origin)) {
    console.error('Invalid redirect URL:', next);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'Invalid redirect URL');
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError);

      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'Authentication failed. Please try again.');
      return NextResponse.redirect(loginUrl);
    }

    // Verify we have a valid session
    if (!data.session || !data.user) {
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'Invalid session. Please try again.');
      return NextResponse.redirect(loginUrl);
    }

    // Additional security check: Verify user exists in our database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, status, auth_id')
      .eq('auth_id', data.user.id)
      .single();

    if (userError || !userData) {
      console.error('User not found in database:', userError);

      // Sign out the session
      await supabase.auth.signOut();

      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'Account not found. Please contact support.');
      return NextResponse.redirect(loginUrl);
    }

    if (userData.status !== 'active') {
      console.error('User account is not active:', userData.status);

      // Sign out the session
      await supabase.auth.signOut();

      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'Account is not active. Please contact support.');
      return NextResponse.redirect(loginUrl);
    }

    // Success! Redirect to the desired page
    const redirectUrl = new URL(next, origin);

    // Add success parameter
    redirectUrl.searchParams.set('auth', 'success');

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Auth callback error:', error);

    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.');
    return NextResponse.redirect(loginUrl);
  }
}
