# Magic Link Authentication

This document describes the magic link authentication implementation for MyCastle using Supabase Auth and Next.js App Router.

## Overview

Magic link authentication provides a passwordless login option alongside the traditional email/password authentication. Users receive a secure, time-limited link via email that allows them to sign in without entering a password.

## Security Features

### 1. User Verification

- **Existing Users Only**: Magic links are sent only to email addresses that exist in the `users` table
- **Status Check**: Only active users with valid `auth_id` can receive magic links
- **Safe Failure Mode**: Returns generic success message regardless of whether user exists (prevents email enumeration)

### 2. Rate Limiting

- **Per-IP Limiting**: Maximum 5 requests per minute per IP address
- **Per-Email Limiting**: Maximum 3 requests per minute per email address
- **429 Response**: Returns appropriate HTTP status with `Retry-After` header when limit exceeded

### 3. Timing Attack Prevention

- **Constant Response Time**: Enforces minimum 200ms response time to prevent timing-based user enumeration
- **Consistent Messages**: Always returns the same success message regardless of user existence

### 4. Redirect URL Validation

- **Same-Origin Only**: Only allows redirects to the same origin as the application
- **Protocol Validation**: Blocks dangerous protocols (javascript:, data:, etc.)
- **Relative Path Support**: Safely handles relative paths starting with `/`

### 5. Token Security

- **Single-Use Tokens**: Each magic link token can only be used once
- **Time-Limited**: Tokens expire after 1 hour (configurable in Supabase)
- **Code Exchange**: Uses PKCE-style code exchange for session creation

### 6. Session Management

- **Secure Cookies**: Session cookies set via `@supabase/ssr` with secure flags
- **RLS Integration**: Maintains Row-Level Security policies after authentication
- **User Context**: Sets proper `app.current_user_id`, `app.current_tenant_id`, and `app.current_user_role`

## Architecture

### Flow Diagram

```
User → /login/magic-link → Request Magic Link
                                ↓
                        POST /api/auth/magic-link
                                ↓
                        Check User Exists (DB)
                                ↓
                        Send Magic Link (Supabase Auth)
                                ↓
                        User Receives Email
                                ↓
                        Click Link in Email
                                ↓
                        GET /auth/callback?code=...
                                ↓
                        Exchange Code for Session
                                ↓
                        Verify User Status
                                ↓
                        Redirect to Dashboard
```

### Components

#### 1. Magic Link Request API (`/api/auth/magic-link/route.ts`)

- Accepts POST requests with email and optional redirectTo
- Validates email format
- Checks rate limits (IP and email)
- Verifies user exists and is active
- Calls `supabase.auth.signInWithOtp()` with `shouldCreateUser: false`
- Returns generic success message

#### 2. Auth Callback Handler (`/auth/callback/route.ts`)

- Handles GET requests from Supabase Auth
- Extracts authorization code from URL
- Exchanges code for session via `exchangeCodeForSession()`
- Verifies user exists in database
- Checks user status is 'active'
- Redirects to requested page or dashboard

#### 3. Magic Link UI (`/login/magic-link/page.tsx`)

- Client component with email input form
- Success state showing instructions
- Error handling with user-friendly messages
- Link back to password login
- Educational content about magic links

#### 4. Main Login Page (`/login/page.tsx`)

- Enhanced with magic link option
- Clear separation between auth methods
- Consistent UI/UX

## Configuration

### Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Auth Settings

In your Supabase project dashboard:

1. **Enable Email Auth**: Authentication > Providers > Email
2. **Disable "Confirm Email"**: For magic links, confirmation is implicit
3. **Set Token Expiry**: Default is 1 hour (3600 seconds)
4. **Configure Email Templates**: Customize the magic link email template
5. **Set Site URL**: Add your production domain to allowed redirect URLs

### Email Template Customization

Recommended magic link email template:

```html
<h2>Sign in to MyCastle</h2>
<p>Click the button below to sign in securely:</p>
<a href="{{ .ConfirmationURL }}">Sign in to MyCastle</a>
<p>This link expires in 1 hour and can only be used once.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

## Database Schema

The implementation relies on the existing `users` table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  auth_id UUID UNIQUE,  -- Links to Supabase auth.users
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  -- ... other fields
);
```

**Key Fields**:

- `auth_id`: Must be set and must match Supabase auth user ID
- `email`: Must match the email in Supabase auth
- `status`: Must be 'active' to receive magic links

## Usage

### For End Users

1. Navigate to `/login/magic-link`
2. Enter your registered email address
3. Click "Send magic link"
4. Check your email inbox (and spam folder)
5. Click the link in the email
6. You'll be signed in and redirected to the dashboard

### For Developers

**Triggering Magic Link Programmatically**:

```typescript
const response = await fetch('/api/auth/magic-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    redirectTo: '/specific-page',
  }),
});

const data = await response.json();
if (response.ok) {
  // Show success message
} else {
  // Handle error
}
```

**Using Rate Limiter in Other Routes**:

```typescript
import { ipRateLimiter } from '@/lib/security/rate-limiter';

const result = ipRateLimiter.check(ipAddress);
if (!result.allowed) {
  return Response.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
  );
}
```

## Security Considerations

### Production Deployment

1. **Use Redis for Rate Limiting**: Replace in-memory rate limiter with Redis

   ```typescript
   import { RateLimiterRedis } from 'rate-limiter-flexible';
   ```

2. **Configure SMTP**: Set up transactional email service (SendGrid, AWS SES, etc.)

3. **Enable Email Verification**: Consider requiring email verification for new users

4. **Monitor Abuse**: Set up alerts for unusual patterns (many requests from one IP)

5. **Implement CAPTCHA**: Add CAPTCHA for public-facing magic link forms

6. **Use Content Security Policy**: Prevent XSS attacks
   ```typescript
   headers: {
     'Content-Security-Policy': "default-src 'self';"
   }
   ```

### Common Attacks and Mitigations

| Attack            | Mitigation                                      |
| ----------------- | ----------------------------------------------- |
| Email Enumeration | Generic success messages, constant timing       |
| Rate Limit Bypass | IP + Email combined limits, distributed limiter |
| Open Redirect     | Same-origin validation, protocol whitelist      |
| Token Reuse       | Single-use tokens enforced by Supabase          |
| Phishing          | Display destination domain in email template    |
| Session Hijacking | Secure cookies, HTTPOnly flags                  |
| CSRF              | State parameter in OAuth flow                   |

## Testing

### Manual Testing

1. **Happy Path**:
   - Request magic link for existing user
   - Click link from email
   - Verify redirect to dashboard
   - Verify session is active

2. **Non-Existent User**:
   - Request magic link for non-existent email
   - Verify generic success message
   - Verify no email sent
   - Verify timing is consistent

3. **Rate Limiting**:
   - Send 4+ requests in 1 minute
   - Verify 429 response
   - Wait for rate limit reset
   - Verify requests work again

4. **Invalid User**:
   - Request magic link for inactive user
   - Verify generic success message
   - Click link (if sent)
   - Verify error on callback

### Automated Testing

```typescript
// Example test
describe('Magic Link Authentication', () => {
  it('should send magic link to existing active user', async () => {
    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      message: expect.stringContaining('magic link'),
    });
  });

  it('should not reveal non-existent emails', async () => {
    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      message: expect.stringContaining('If an account exists'),
    });
  });
});
```

## Troubleshooting

### Magic Link Not Received

1. Check spam/junk folder
2. Verify email exists in `users` table with `status='active'`
3. Verify `auth_id` is set and valid
4. Check Supabase Auth logs for errors
5. Verify SMTP configuration in Supabase

### "Account not found" Error

- User exists in `auth.users` but not in `users` table
- Or `auth_id` doesn't match
- Solution: Ensure user record exists with correct `auth_id`

### Rate Limit Issues

- Multiple users behind same NAT/proxy
- Solution: Implement per-user rate limiting after authentication

### Redirect Failures

- Invalid redirect URL
- Solution: Ensure URLs are same-origin or relative paths

## Migration from Password-Only Auth

Existing password users can use magic links immediately:

1. User navigates to `/login/magic-link`
2. Enters existing email
3. Receives magic link
4. Signs in without password
5. Both methods remain available

No database migration required.

## Future Enhancements

- [ ] Add WebAuthn/passkey support
- [ ] Implement "Remember this device" functionality
- [ ] Add SMS-based magic links as alternative
- [ ] Integrate with Redis for distributed rate limiting
- [ ] Add admin dashboard for monitoring auth attempts
- [ ] Implement progressive delays for repeated failures
- [ ] Add support for custom email templates per tenant
- [ ] Enable magic link-only mode (disable passwords)

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [@supabase/ssr Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
