# MyCastle Setup Guide

This guide walks you through setting up your development environment for MyCastle.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or Supabase)
- OpenAI API key (for lesson planning)

## Step 1: Environment Configuration

### 1.1 Get Your Supabase Credentials

If using Supabase:

1. Go to https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbG...`)
   - **service_role key** (starts with `eyJhbG...`) - **Keep this secret!**

5. Navigate to **Settings** → **Database**
6. Copy the **Connection string** (Transaction mode)
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### 1.2 Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy it immediately (you can't see it again)

### 1.3 Configure .env.local

Copy the example file and fill in your values:

```bash
cd app
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Database Configuration
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

**⚠️ Important**: Never commit `.env.local` to git! It's already in `.gitignore`.

## Step 2: Test Database Connection

Run the connection test script:

```bash
cd app
npm run test:db
```

Expected output:
```
🔍 Testing database connection...
📡 Connecting to database...
✅ Connection established!
✅ Database connection successful!
📊 Connection Details:
   Database: postgres
   User: postgres
   Version: PostgreSQL 15.x
✅ All checks passed!
```

## Step 3: Push Database Schema

If tables don't exist yet, push the schema:

```bash
npm run db:push
```

This will create all tables defined in `src/db/schema/`:
- `tenants`, `users`, `sessions` (Core)
- `classes`, `enrollments`, `class_sessions`, `attendance` (Academic)
- `cefr_descriptors`, `lesson_plans` (Curriculum)
- `audit_log`, `feedback` (System)

## Step 4: Verify Schema

Run the connection test again:

```bash
npm run test:db
```

You should now see tables listed.

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Run Development Server

```bash
npm run dev
```

Navigate to http://localhost:3000

## Troubleshooting

### Connection Refused
- Check if PostgreSQL is running
- Verify the host/port in DATABASE_URL
- Check firewall rules

### Authentication Failed
- Verify username/password in DATABASE_URL
- For Supabase: check if database password is correct in connection string

### SSL Issues
If you get SSL errors, add `?sslmode=require` to DATABASE_URL:
```
DATABASE_URL=postgresql://...?sslmode=require
```

### Tables Not Found
Run the schema push:
```bash
npm run db:push
```

## Next Steps

Once your environment is configured:

1. **T-011: RLS Policies** - Implement row-level security
2. **T-034: Seed CEFR Descriptors** - Load CEFR reference data
3. **Backend Integration** - Connect UI to real data

See `TASKS.md` for detailed task specifications.

## Scripts Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:push          # Push schema changes
npm run db:studio        # Open Drizzle Studio
npm run test:db          # Test database connection

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # Run TypeScript checks
```

## Security Notes

1. **Never commit secrets** - All keys should be in `.env.local`
2. **Use service_role key carefully** - Only in server-side code
3. **RLS is critical** - Implement and test thoroughly before production
4. **Rotate keys regularly** - Especially if compromised

## Support

- Documentation: See `/spec` and `/docs` directories
- Issues: Check TASKS.md for known blockers
- Architecture: See DESIGN.md and MCP specs
