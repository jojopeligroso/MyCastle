# Development Authentication Bypass

## Overview

MyCastle includes a development-only authentication bypass that allows developers to skip the login UX during development while maintaining all production security boundaries.

**Key Principle:** Authentication remains part of the system design; only the login step is bypassed in development.

## How It Works

The bypass injects the real admin user identity (`eoinmaleoin@gmail.com`) at the authentication boundary when activated. This identity:

- Goes through the exact same auth/authz paths as real users
- Obeys all RLS policies and database security
- Has admin privileges for testing the admin interface
- Cannot be overridden or influenced by client code

## Activation Requirements

The bypass **only** activates when **BOTH** conditions are met:

1. `NODE_ENV === "development"`
2. `DEV_AUTH_BYPASS === "true"`

### Safety Guarantees

If `DEV_AUTH_BYPASS === "true"` in any non-development environment (staging, preview, production), the application **crashes immediately** with a hard failure. This is enforced mechanically through `validateDevBypassConfig()` which runs on module load.

## Usage

### Enable Bypass

Add to your `.env.local`:

```bash
NODE_ENV=development
DEV_AUTH_BYPASS=true
```

Restart the development server:

```bash
npm run dev
```

You'll see this message in the console when bypass is active:

```
🔓 DEV AUTH BYPASS ACTIVE - Logged in as admin: eoinmaleoin@gmail.com
```

### Disable Bypass

Remove `DEV_AUTH_BYPASS` from `.env.local` or set it to any value other than `"true"`:

```bash
# Bypass disabled (default)
# DEV_AUTH_BYPASS=true

# OR explicitly disable
DEV_AUTH_BYPASS=false
```

Restart the development server. Normal authentication flow will be restored with **zero refactoring required**.

## Dev User Identity

The injected dev user uses the real admin account from the database:

```typescript
{
  id: '00000000-0000-0000-0000-000000000010',  // Real user ID
  email: 'eoinmaleoin@gmail.com',
  role: 'authenticated',
  user_metadata: {
    role: 'admin',  // Admin privileges
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Eoin Malone'
  }
}
```

### Important Notes

- **Real User:** Uses the actual admin account that exists in the database (from seed data)
- **Server-Side Only:** The identity is injected server-side in the Supabase client, never exposed to the client
- **Admin Privileges:** The dev user has full `admin` role for testing the admin interface
- **RLS Enforced:** All Row-Level Security policies and database constraints apply normally

## What's Not Bypassed

The following remain **fully active and enforced**:

- ✅ Middleware auth checks
- ✅ Route guards and protected routes
- ✅ Server actions auth boundary
- ✅ API handler auth checks
- ✅ Database RLS policies
- ✅ Tenant scoping and isolation
- ✅ Role-based authorization
- ✅ All `requireAuth()` and `requireRole()` checks

The **only** thing bypassed is the login UX (magic link email, password entry, etc.).

## Architecture

### Implementation Points

The bypass is implemented at the **authentication boundary** in two locations:

1. **`lib/supabase/server.ts`** - Server Components and Route Handlers
   - Wraps `supabase.auth.getUser()` and `supabase.auth.getSession()`
   - Returns dev identity when bypass active

2. **`middleware.ts`** - Next.js Middleware
   - Wraps `supabase.auth.getUser()` at the middleware layer
   - Returns dev identity when bypass active

### Safety Module

**`lib/auth/dev-bypass-guard.ts`** contains:

- `validateDevBypassConfig()` - Crashes app if misconfigured (runs on module load)
- `isDevBypassActive()` - Checks if bypass conditions are met
- `DEV_USER_IDENTITY` - Fixed dev user identity constant
- `getDevUserIdentity()` - Returns dev user if bypass active, null otherwise

### No Scattered Conditionals

The bypass logic is **centralized** in exactly two auth boundary points. There are no scattered `if (process.env.DEV_AUTH_BYPASS)` checks throughout the codebase.

## Testing RLS and Authorization

Even with bypass active, you can test RLS policies and authorization:

### Test Different Roles

The bypass defaults to `admin` role for full access. To test other roles, edit `lib/auth/dev-bypass-guard.ts`:

```typescript
user_metadata: {
  role: 'teacher',  // Change to 'teacher' or 'student' for testing
  tenant_id: '00000000-0000-0000-0000-000000000001',
  name: 'Eoin Malone'
}
```

Restart the dev server to apply changes.

### Test Multi-Tenancy

The dev user includes the default `tenant_id` for proper isolation:

1. All RLS policies will enforce tenant scoping automatically
2. The dev user belongs to tenant: `00000000-0000-0000-0000-000000000001` (MyCastle Default)
3. Queries are automatically scoped to this tenant via RLS policies
4. To test different tenants, change the `tenant_id` in dev user metadata and restart

### Verify Auth Checks

All `requireAuth()` and `requireRole()` calls work normally:

```typescript
// In a Server Component or Route Handler
import { requireAuth, requireRole } from '@/lib/auth/utils';

// This works - dev user is authenticated
const user = await requireAuth();

// This works - dev user has 'admin' role
await requireRole(['admin']);

// This would throw if you changed the role to 'student'
await requireRole(['teacher']);
```

## Production Safety Checklist

Before deploying to production, ensure:

- [ ] `DEV_AUTH_BYPASS` is **not set** in production environment variables
- [ ] `NODE_ENV=production` in production environment
- [ ] Deployment platform doesn't copy `.env.local` to production
- [ ] Secrets management doesn't include `DEV_AUTH_BYPASS` variable
- [ ] CI/CD pipeline doesn't set `DEV_AUTH_BYPASS=true`

**Remember:** If misconfigured, the app will crash immediately on startup with a clear error message. This is by design.

## Troubleshooting

### "Cannot find module '@/lib/auth/dev-bypass-guard'"

This is a path resolution issue during build. The module exists and is correctly imported. This error may appear in the build output but doesn't affect functionality.

### Bypass not working

1. Check `.env.local` has both:
   ```
   NODE_ENV=development
   DEV_AUTH_BYPASS=true
   ```
2. Restart the dev server after changing env vars
3. Look for console message: `🔓 DEV AUTH BYPASS ACTIVE`
4. Check for typos (must be exactly `"true"` as string)

### Still being redirected to login

1. Ensure middleware is loading the bypass (check console for message)
2. Clear browser cookies and try again
3. Check that `NODE_ENV` is exactly `"development"` (not `"dev"`)

### Want to test real auth flow in development

Simply remove `DEV_AUTH_BYPASS` from `.env.local` and restart. The bypass is completely removable with zero refactoring.

## Removal

To permanently remove the bypass feature from the codebase:

1. Delete `lib/auth/dev-bypass-guard.ts`
2. Remove imports from `lib/supabase/server.ts` and `middleware.ts`
3. Remove bypass wrapper logic from both files
4. Remove `DEV_AUTH_BYPASS` documentation from `.env.local.example`

The auth system will function identically to before the bypass was added.

## References

- **Implementation:** `lib/auth/dev-bypass-guard.ts`
- **Auth Boundary:** `lib/supabase/server.ts`, `middleware.ts`
- **Auth Utils:** `lib/auth/utils.ts` (unchanged - all checks still run)
- **Environment Example:** `.env.local.example`
