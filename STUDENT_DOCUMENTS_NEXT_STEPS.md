# Student Documents System - Next Steps

**Status:** Week 2 (Backend API) ✅ COMPLETED
**Last Updated:** 2026-03-05
**Commit:** df9dbc3

---

## ✅ What's Complete (Week 2)

- [x] Database schema TypeScript definitions (`documents.ts`)
- [x] SQL migration file (`FRESH_0033_student_documents_system.sql`)
- [x] All 16 Backend API endpoints
- [x] Emergency contact migration script
- [x] Document types seed script
- [x] Supabase Storage setup guide

---

## ⚠️ CRITICAL: Database Setup Required

The following steps **MUST** be completed before the API endpoints will work:

### 1. Run SQL Migration in Supabase

**File:** `app/migrations/FRESH_0033_student_documents_system.sql`

**Steps:**
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy the entire contents of `FRESH_0033_student_documents_system.sql`
3. Paste and execute in SQL Editor
4. Verify success (should create 6 new tables)

**Tables Created:**
- `document_types` - Customizable document categories
- `student_documents` - Document metadata with soft delete
- `emergency_contacts` - Max 2 contacts per student
- `notification_rules` - Configurable alert rules
- `letter_templates` - Mail merge templates
- `generated_letters` - Letter generation history

### 2. Set Up Supabase Storage Bucket

**Guide:** `app/migrations/FRESH_0033_supabase_storage_setup.md`

**Steps:**
1. Go to Supabase Storage: https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets
2. Create new bucket: `student-documents` (private)
3. Set max file size: 25MB
4. Copy RLS policies from guide and apply them
5. Test upload/download with presigned URLs

**Critical:** Without this, document upload/download will fail!

### 3. Migrate Emergency Contact Data

**Script:** `app/migrations/FRESH_0033_migrate_emergency_contacts.sql`

**Purpose:** Migrates existing emergency contact data from `users.metadata` JSONB field to dedicated `emergency_contacts` table

**Steps:**
1. Open Supabase SQL Editor
2. Copy contents of `FRESH_0033_migrate_emergency_contacts.sql`
3. Execute the script
4. Verify: `SELECT * FROM emergency_contacts LIMIT 10;`

**Note:** This is a one-time migration. Safe to run multiple times (idempotent).

### 4. Seed Default Document Types

**Script:** `app/scripts/seed-document-types.ts`

**Purpose:** Seeds 21 default document types across 5 categories

**Steps:**
```bash
cd ~/work/MyCastle/app
npx tsx scripts/seed-document-types.ts
```

**Expected Output:**
```
🌱 Seeding document types...
Found X active tenant(s)

📁 Seeding document types for tenant: [Name]
   ✅ Created: Passport Copy
   ✅ Created: Visa Copy
   ... (21 total)

✅ Document type seeding complete!
   Created: 21
   Skipped: 0
```

### 5. Regenerate TypeScript Types

**After migration:**
```bash
cd ~/work/MyCastle/app
npm run db:generate
```

This updates TypeScript types based on the new database schema.

### 6. Verify Setup

**Test checklist:**
```bash
# 1. Check tables exist
psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%document%' OR table_name = 'emergency_contacts';"

# 2. Check document types seeded
psql -c "SELECT COUNT(*) FROM document_types;"

# 3. Check emergency contacts migrated
psql -c "SELECT COUNT(*) FROM emergency_contacts;"

# 4. Test API endpoint (requires dev server running)
curl http://localhost:3000/api/admin/settings/document-types
```

---

## 📋 Remaining Work (Weeks 3-5)

### Week 3: Core UI Components

**Priority:** Build React components to consume the API

#### Documents Manager
- [ ] DocumentsManager component (`components/admin/students/DocumentsManager.tsx`)
- [ ] DocumentUploadModal component
- [ ] DocumentCard component (shows status, expiry, approval state)
- [ ] DocumentChecklistCard (required documents tracking)
- [ ] DocumentApprovalQueue (pending documents for admin)

#### Student History Timeline
- [ ] StudentHistoryTimeline component
- [ ] TimelineEvent component (document uploads, enrollments, letters)
- [ ] TimelineFilters (date range, event type)
- [ ] Summary/Detailed view toggle

#### Emergency Contacts
- [ ] EmergencyContactsCard component
- [ ] EmergencyContactForm (add/edit)
- [ ] Validation: max 2 contacts, priority enforcement

#### Student Profile Integration
- [ ] Refactor student profile tabs to include "Documents" tab
- [ ] Add "Timeline" tab
- [ ] Update EmergencyContact section to use new API

### Week 4: Settings Pages & Advanced Features

#### Settings Pages
- [ ] `/admin/settings/document-types` page
  - List all document types grouped by category
  - Create/edit/deactivate document types
  - Configure expiry alerts per type

- [ ] `/admin/settings/letter-templates` page
  - Template editor with {{placeholder}} autocomplete
  - Preview letter with sample data
  - Test mail merge

- [ ] `/admin/settings/notification-rules` page
  - Configure alert rules per event type
  - Email template editor
  - Recipient role selection

#### Advanced Features
- [ ] Pending Documents Queue dashboard card
- [ ] Letter generation UI (select template, student, generate)
- [ ] Document expiry alerts dashboard widget
- [ ] Bulk document approval (select multiple pending docs)

### Week 5: Testing & Polish

#### Testing
- [ ] Unit tests for API endpoints (Jest)
- [ ] E2E tests for document upload workflow (Playwright)
- [ ] E2E tests for approval workflow
- [ ] Mobile responsive testing (5 browsers)
- [ ] Test emergency contact max 2 enforcement
- [ ] Test soft delete versioning

#### Polish
- [ ] Error handling improvements
- [ ] Loading states and skeletons
- [ ] Toast notifications for success/error
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (lazy loading, pagination)

---

## 🔍 Quick Reference

### API Endpoints Available

**Documents:**
- `GET /api/admin/students/[id]/documents` - List all documents
- `POST /api/admin/students/[id]/documents` - Upload new document
- `GET /api/admin/students/[id]/documents/[docId]` - Get document details
- `PATCH /api/admin/students/[id]/documents/[docId]` - Update metadata
- `DELETE /api/admin/students/[id]/documents/[docId]` - Soft delete
- `POST /api/admin/students/[id]/documents/[docId]/approve` - Approve
- `POST /api/admin/students/[id]/documents/[docId]/reject` - Reject
- `GET /api/admin/students/[id]/documents/[docId]/download` - Get presigned URL

**Emergency Contacts:**
- `GET /api/admin/students/[id]/emergency-contacts` - List contacts
- `POST /api/admin/students/[id]/emergency-contacts` - Add contact
- `PATCH /api/admin/students/[id]/emergency-contacts/[contactId]` - Update
- `DELETE /api/admin/students/[id]/emergency-contacts/[contactId]` - Delete

**Timeline:**
- `GET /api/admin/students/[id]/timeline` - Get student history

**Settings:**
- `GET/POST /api/admin/settings/document-types` - Document types CRUD
- `GET/POST /api/admin/settings/letter-templates` - Templates CRUD
- `GET/POST /api/admin/settings/notification-rules` - Rules CRUD

### Environment Variables Required

```env
# Already in .env (verify values):
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For presigned URLs
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # For migrations
```

### File Locations

```
app/
├── migrations/
│   ├── FRESH_0033_student_documents_system.sql       # Main migration
│   ├── FRESH_0033_migrate_emergency_contacts.sql     # Data migration
│   └── FRESH_0033_supabase_storage_setup.md          # Storage guide
├── scripts/
│   └── seed-document-types.ts                        # Seed script
├── src/
│   ├── db/schema/
│   │   └── documents.ts                              # Schema definitions
│   └── app/api/admin/
│       ├── students/[id]/
│       │   ├── documents/                            # 5 endpoints
│       │   ├── emergency-contacts/                   # 2 endpoints
│       │   └── timeline/                             # 1 endpoint
│       └── settings/
│           ├── document-types/                       # 2 endpoints
│           ├── letter-templates/                     # 2 endpoints
│           └── notification-rules/                   # 2 endpoints
```

---

## 🚨 Common Issues & Solutions

### "Table does not exist"
**Solution:** Run the SQL migration (Step 1 above)

### "Storage bucket not found"
**Solution:** Create the Supabase Storage bucket (Step 2 above)

### "No document types available"
**Solution:** Run the seed script (Step 4 above)

### "Presigned URL generation failed"
**Solution:** Check `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`

### TypeScript errors after migration
**Solution:** Run `npm run db:generate` to regenerate types

---

## 📞 Need Help?

- Migration guide: `app/migrations/README.md`
- RLS policies: `app/docs/RLS-POLICIES.md`
- CLAUDE.md workflow: Section "Database Migrations (ORDER MATTERS!)"

---

**Next Immediate Action:** Run SQL migration in Supabase SQL Editor to create the tables.
