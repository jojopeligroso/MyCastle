# ESL Learning Platform - Quick Start Guide

Get your ESL admin dashboard running in 5 minutes!

---

## Option 1: Quick Demo (No Database Required)

Perfect for testing the UI and seeing the dashboard in action.

### Step 1: Start the Frontend

```bash
cd src/frontend
npm install
npm run dev
```

Visit http://localhost:3000

**What You'll See:**
- ✅ Modern admin dashboard with sidebar navigation
- ✅ Dashboard home with statistics
- ✅ Users management page
- ✅ Classes management page (grid layout)
- ✅ Attendance tracking page
- ✅ Reports page
- ⚠️ All data is currently mock/hardcoded

**Note:** The Admin MCP server isn't running, so create/update actions won't work yet, but you can browse the UI.

---

## Option 2: Full Stack (With Admin MCP)

Run both the frontend and Admin MCP server.

### Step 1: Start Admin MCP Server

```bash
cd admin-mcp

# Create .env file (minimal for testing)
cat > .env << 'EOF'
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_ROLE_KEY=placeholder-key
JWKS_URI=https://placeholder.supabase.co/.well-known/jwks.json
JWT_AUDIENCE=admin-mcp
JWT_ISSUER=https://placeholder.supabase.co/auth/v1
MCP_TRANSPORT=http
PORT=3001
EOF

npm install
npm run dev:http
```

Server will start on http://localhost:3001

### Step 2: Start Frontend

```bash
cd src/frontend

# Create .env.local file
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
NEXT_PUBLIC_ADMIN_MCP_URL=http://localhost:3001
EOF

npm install
npm run dev
```

Frontend will start on http://localhost:3000

### Step 3: Test MCP Tools

Open http://localhost:3000 and try the UI. The frontend can now call Admin MCP tools (though they'll fail without a database).

**Test MCP Connection:**
```bash
# In a new terminal
curl http://localhost:3001/health
```

---

## Option 3: Production Setup (With Supabase)

Full setup with database and authentication.

### Prerequisites:
- Supabase account (free tier works)
- Node.js 18+
- npm

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and API keys

### Step 2: Run Database Migrations

In your Supabase SQL Editor, run these files in order:

```sql
-- Copy and paste contents from each file:
1. /docs/database/001_create_tables.sql
2. /docs/database/002_create_indexes.sql
3. /docs/database/003_enable_rls.sql
4. /docs/database/004_create_policies.sql
5. /docs/database/005_create_functions.sql
6. /docs/database/006_seed_data.sql
```

### Step 3: Configure Environment Variables

**Admin MCP** (`/admin-mcp/.env`):
```env
JWKS_URI=https://YOUR-PROJECT-REF.supabase.co/.well-known/jwks.json
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_AUDIENCE=admin-mcp
JWT_ISSUER=https://YOUR-PROJECT-REF.supabase.co/auth/v1
MCP_TRANSPORT=http
PORT=3001
```

**Frontend** (`/src/frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADMIN_MCP_URL=http://localhost:3001
```

Replace:
- `YOUR-PROJECT-REF` with your Supabase project reference
- `your-service-role-key` with your service role key (Settings > API)
- `your-anon-key` with your anon public key (Settings > API)

### Step 4: Start Services

**Terminal 1:**
```bash
cd admin-mcp
npm install
npm run dev:http
```

**Terminal 2:**
```bash
cd src/frontend
npm install
npm run dev
```

### Step 5: Create First Admin User

In Supabase SQL Editor:
```sql
INSERT INTO users (email, role, full_name, is_active)
VALUES ('admin@mycastle.com', 'admin', 'Admin User', true);
```

### Step 6: Test Everything

1. Visit http://localhost:3000
2. Browse the dashboard
3. Try creating a user (should work now!)
4. Try creating a class
5. Try recording attendance

---

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Admin MCP Won't Start

- Check `.env` file exists in `/admin-mcp`
- Verify Supabase URL and keys
- Check logs for errors:
  ```bash
  cd admin-mcp
  npm run dev:http 2>&1 | tee mcp.log
  ```

### Frontend Shows "Failed to Fetch"

- Ensure Admin MCP is running on port 3001
- Check `NEXT_PUBLIC_ADMIN_MCP_URL` in `.env.local`
- Verify CORS is enabled (should be by default in Admin MCP HTTP mode)

### Database Errors

- Verify all migrations ran successfully
- Check Supabase service role key is correct
- Ensure RLS policies are applied
- Check Supabase logs in dashboard

### TypeScript Errors in Admin MCP

These are known and don't prevent the server from running:
```bash
cd admin-mcp
npm run dev:http  # Runs despite TS errors
```

To fix (optional):
```bash
# Generate types from Supabase
npx supabase gen types typescript --project-id YOUR-PROJECT-REF > src/types/database.ts
```

---

## What Works Right Now

### ✅ Fully Functional:
- Admin MCP Server (HTTP mode)
- Frontend UI (all pages render)
- Navigation
- Mock data display
- API route structure

### ⚠️ Partially Working:
- Create operations (work if database is set up)
- List operations (currently return mock data)
- Authentication (middleware configured but needs Supabase Auth)

### ❌ Not Implemented:
- Edit operations (buttons present but not wired)
- Delete operations (buttons present but not wired)
- Search/filtering (UI present but not functional)
- File uploads
- Email notifications
- Real-time updates

---

## Next Steps After QuickStart

See `INTEGRATION_SUMMARY.md` for detailed next steps, including:
- Replacing mock data with real API calls
- Implementing edit/delete operations
- Adding authentication flow
- Testing end-to-end
- Production deployment

---

## Useful Commands

### Development:
```bash
# Frontend dev server
cd src/frontend && npm run dev

# Admin MCP dev server (HTTP)
cd admin-mcp && npm run dev:http

# Admin MCP dev server (STDIO)
cd admin-mcp && npm run dev:stdio
```

### Building:
```bash
# Frontend production build
cd src/frontend && npm run build

# Admin MCP production build
cd admin-mcp && npm run build
```

### Testing:
```bash
# Test Admin MCP tools
cd admin-mcp && npm test

# Test MCP HTTP endpoint
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

---

## Support

- **Specification:** `/esl-mcp-spec/spec/`
- **Status:** `/admin-mcp/IMPLEMENTATION_STATUS.md`
- **Summary:** `/INTEGRATION_SUMMARY.md`
- **Main README:** `/README.md`

---

**Happy coding!** 🚀
