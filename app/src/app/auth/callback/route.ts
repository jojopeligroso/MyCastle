/**
 * Auth Callback Handler
 *
 * Handles OAuth and OTP callbacks from Supabase Auth.
 * Auto-provisions users from allowed email domains.
 *
 * Security features:
 * - Validates redirect URLs
 * - Auto-provisions only for configured tenant domains
 * - Sets secure session cookies via @supabase/ssr
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Validate that redirect URL is safe
function isValidRedirectUrl(url: string, origin: string): boolean {
  try {
    const redirectUrl = new URL(url, origin);
    const originUrl = new URL(origin);
    return redirectUrl.origin === originUrl.origin;
  } catch {
    return false;
  }
}

// Extract domain from email
function getEmailDomain(email: string): string | null {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
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

    const authUser = data.user;
    const userEmail = authUser.email?.toLowerCase();

    if (!userEmail) {
      await supabase.auth.signOut();
      const loginUrl = new URL('/login', origin);
      loginUrl.searchParams.set('error', 'No email associated with this account.');
      return NextResponse.redirect(loginUrl);
    }

    // Check if user exists in our database (by auth_id first, then by email for pre-provisioned users)
    let existingUser = null;

    const { data: userByAuthId } = await supabase
      .from('users')
      .select('id, status, auth_id')
      .eq('auth_id', authUser.id)
      .single();

    if (userByAuthId) {
      existingUser = userByAuthId;
    } else {
      // Check for pre-provisioned user (has email but no auth_id yet)
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, status, auth_id')
        .eq('email', userEmail)
        .single();

      if (userByEmail) {
        // Link the auth_id to this pre-provisioned user
        await supabase
          .from('users')
          .update({ auth_id: authUser.id })
          .eq('id', userByEmail.id);

        existingUser = userByEmail;
        console.log(`Linked auth_id to pre-provisioned user ${userEmail}`);
      }
    }

    if (existingUser) {
      // User exists - check status
      if (existingUser.status !== 'active') {
        console.error('User account is not active:', existingUser.status);
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set('error', 'Account is not active. Please contact support.');
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // User doesn't exist - try to auto-provision based on email domain
      const emailDomain = getEmailDomain(userEmail);

      if (!emailDomain) {
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set('error', 'Invalid email address.');
        return NextResponse.redirect(loginUrl);
      }

      // Find tenant that allows this email domain
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, default_role, allowed_email_domains')
        .eq('status', 'active');

      const matchingTenant = tenants?.find(tenant => {
        const domains = tenant.allowed_email_domains as string[] | null;
        return domains?.some(d => d.toLowerCase() === emailDomain);
      });

      if (!matchingTenant) {
        console.error('No tenant allows domain:', emailDomain);
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set('error', 'Your email domain is not authorized. Please contact support.');
        return NextResponse.redirect(loginUrl);
      }

      // Auto-provision user
      const userName = authUser.user_metadata?.full_name ||
                       authUser.user_metadata?.name ||
                       userEmail.split('@')[0];

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          tenant_id: matchingTenant.id,
          auth_id: authUser.id,
          email: userEmail,
          name: userName,
          primary_role: matchingTenant.default_role || 'teacher',
          status: 'active',
        });

      if (insertError) {
        console.error('Failed to create user:', insertError);
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set('error', 'Failed to create account. Please try again.');
        return NextResponse.redirect(loginUrl);
      }

      console.log(`Auto-provisioned user ${userEmail} to tenant ${matchingTenant.name}`);
    }

    // Success! Redirect to the desired page
    const redirectUrl = new URL(next, origin);
    redirectUrl.searchParams.set('auth', 'success');
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('Auth callback error:', error);
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'An unexpected error occurred. Please try again.');
    return NextResponse.redirect(loginUrl);
  }
}
