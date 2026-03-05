# Student Documents System - Complete Task Breakdown

**Status:** Week 2 (Backend API) ✅ COMPLETED
**Last Updated:** 2026-03-05
**Commit:** df9dbc3

---

## Overview

This document provides a complete, actionable breakdown of all remaining work to implement the Student Documents System. Each task includes subtasks, acceptance criteria, and estimated time.

**Total Estimated Time:** 3-4 weeks (15-20 days)

---

## Phase 1: Database Setup & Verification ⏸️ PENDING

**Estimated Time:** 1-2 hours
**Priority:** 🔴 CRITICAL - Must complete before backend APIs work

### Task 1.1: Verify/Run SQL Migration
**Owner:** Developer
**Estimated Time:** 15 minutes

#### Subtasks:
- [ ] **1.1.1** Open Supabase Dashboard → Table Editor
- [ ] **1.1.2** Check if these 6 tables exist:
  - `document_types`
  - `student_documents`
  - `emergency_contacts`
  - `notification_rules`
  - `letter_templates`
  - `generated_letters`
- [ ] **1.1.3** If tables missing: Open Supabase SQL Editor
- [ ] **1.1.4** Copy contents of `app/migrations/FRESH_0033_student_documents_system.sql`
- [ ] **1.1.5** Paste into SQL Editor and execute
- [ ] **1.1.6** Verify success message in console
- [ ] **1.1.7** Confirm all 6 tables appear in Table Editor

**Acceptance Criteria:**
- ✅ All 6 tables exist in Supabase
- ✅ Tables have correct columns and indexes
- ✅ RLS policies are enabled
- ✅ No SQL errors in console

**Files:**
- `app/migrations/FRESH_0033_student_documents_system.sql`

---

### Task 1.2: Set Up Supabase Storage Bucket
**Owner:** Developer
**Estimated Time:** 20 minutes

#### Subtasks:
- [ ] **1.2.1** Open Supabase Dashboard → Storage → Buckets
- [ ] **1.2.2** Click "New Bucket"
- [ ] **1.2.3** Configure bucket:
  - Name: `student-documents`
  - Public: **No** (private bucket)
  - File size limit: 25MB (26214400 bytes)
  - Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/jpeg`, `image/png`, `image/gif`
- [ ] **1.2.4** Create bucket
- [ ] **1.2.5** Open `app/migrations/FRESH_0033_supabase_storage_setup.md`
- [ ] **1.2.6** Copy each RLS policy from the guide
- [ ] **1.2.7** Apply policies in Storage → Policies section
- [ ] **1.2.8** Test upload/download with presigned URL

**Acceptance Criteria:**
- ✅ `student-documents` bucket exists
- ✅ Bucket is private (not public)
- ✅ All 5 RLS policies applied
- ✅ Test file can be uploaded
- ✅ Presigned URL can be generated and accessed

**Files:**
- `app/migrations/FRESH_0033_supabase_storage_setup.md`

**RLS Policies to Apply:**
1. Admin/DoS/Super Admin - Full Access
2. Teachers - Read-only for students in their classes
3. Students - Read-only for own shared documents
4. Students - Upload to own folder if permitted
5. Tenant Isolation (all roles)

---

### Task 1.3: Migrate Emergency Contact Data
**Owner:** Developer
**Estimated Time:** 10 minutes

#### Subtasks:
- [ ] **1.3.1** Check if students have emergency contact data in `users.metadata`
- [ ] **1.3.2** Open Supabase SQL Editor
- [ ] **1.3.3** Copy contents of `app/migrations/FRESH_0033_migrate_emergency_contacts.sql`
- [ ] **1.3.4** Execute migration script
- [ ] **1.3.5** Verify success messages in console
- [ ] **1.3.6** Run verification query:
  ```sql
  SELECT COUNT(*) FROM emergency_contacts;
  SELECT * FROM emergency_contacts LIMIT 10;
  ```
- [ ] **1.3.7** Confirm contacts migrated correctly

**Acceptance Criteria:**
- ✅ Migration script executes without errors
- ✅ Emergency contacts extracted from `users.metadata`
- ✅ Primary contacts have `priority = 1` and `is_primary = true`
- ✅ Helper view `v_student_primary_contact` created
- ✅ Helper function `get_student_emergency_contacts()` created

**Files:**
- `app/migrations/FRESH_0033_migrate_emergency_contacts.sql`

**Note:** This is a one-time migration. Safe to run multiple times (idempotent).

---

### Task 1.4: Seed Default Document Types
**Owner:** Developer
**Estimated Time:** 5 minutes

#### Subtasks:
- [ ] **1.4.1** Open terminal and navigate to app directory:
  ```bash
  cd ~/work/MyCastle/app
  ```
- [ ] **1.4.2** Run seed script:
  ```bash
  npx tsx scripts/seed-document-types.ts
  ```
- [ ] **1.4.3** Verify output shows 21 document types created
- [ ] **1.4.4** Check Supabase Table Editor → `document_types`
- [ ] **1.4.5** Confirm 21 rows exist with correct categories

**Acceptance Criteria:**
- ✅ Script runs without errors
- ✅ 21 document types created (or skipped if already exist)
- ✅ Types distributed across 5 categories:
  - Identity: 3 types (Passport, National ID, Birth Certificate)
  - Visa: 3 types (Visa Copy, IRP/GNIB, Visa Renewal)
  - Medical: 3 types (Medical Certificate, Vaccination, Insurance)
  - Academic: 5 types (Diagnostic Test, Unit Tests, Progress Report, Certificate, External Exam)
  - Correspondence: 4 types (Parent Consent, Withdrawal, Reference, Official Letter)
  - Other: 1 type
- ✅ Required documents marked correctly (Passport, Visa)
- ✅ Expiry alerts configured for time-sensitive documents

**Files:**
- `app/scripts/seed-document-types.ts`

**Expected Output:**
```
🌱 Seeding document types...
Found 1 active tenant(s)

📁 Seeding document types for tenant: [Your School Name]
   ✅ Created: Passport Copy
   ✅ Created: Visa Copy
   ... (21 total)

✅ Document type seeding complete!
   Created: 21
   Skipped: 0
```

---

### Task 1.5: Regenerate TypeScript Types
**Owner:** Developer
**Estimated Time:** 2 minutes

#### Subtasks:
- [ ] **1.5.1** Navigate to app directory:
  ```bash
  cd ~/work/MyCastle/app
  ```
- [ ] **1.5.2** Run Drizzle generate:
  ```bash
  npm run db:generate
  ```
- [ ] **1.5.3** Verify no TypeScript errors:
  ```bash
  npx tsc --noEmit
  ```
- [ ] **1.5.4** Check that new schema types are available in IDE

**Acceptance Criteria:**
- ✅ Generate completes without errors
- ✅ TypeScript compilation succeeds
- ✅ New types available: `DocumentType`, `StudentDocument`, `EmergencyContact`, etc.
- ✅ IDE autocomplete works for new schema

**Commands:**
```bash
cd ~/work/MyCastle/app
npm run db:generate
npx tsc --noEmit
```

---

### Task 1.6: Verify Backend APIs
**Owner:** Developer
**Estimated Time:** 10 minutes

#### Subtasks:
- [ ] **1.6.1** Start development server:
  ```bash
  npm run dev
  ```
- [ ] **1.6.2** Test Document Types API:
  ```bash
  curl http://localhost:3000/api/admin/settings/document-types
  ```
- [ ] **1.6.3** Verify response contains 21 document types
- [ ] **1.6.4** Test with authentication (use browser/Postman with auth token)
- [ ] **1.6.5** Create a test document type via POST
- [ ] **1.6.6** Verify it appears in database
- [ ] **1.6.7** Test other endpoints (emergency contacts, timeline)

**Acceptance Criteria:**
- ✅ All 16 API endpoints respond without 500 errors
- ✅ RLS policies enforce tenant isolation
- ✅ Authentication required for protected routes
- ✅ Data CRUD operations work correctly

**Endpoints to Test:**
- GET `/api/admin/settings/document-types` - Should return 21 types
- GET `/api/admin/students/[id]/documents` - Should return empty array initially
- GET `/api/admin/students/[id]/emergency-contacts` - Should return migrated contacts
- GET `/api/admin/students/[id]/timeline` - Should return empty or existing data

---

## Phase 2: Frontend UI - Week 3 (Core Components)

**Estimated Time:** 5-7 days
**Priority:** 🟡 HIGH

### Task 2.1: Refactor Student Profile Tabs
**Owner:** Frontend Developer
**Estimated Time:** 4 hours

#### Subtasks:
- [ ] **2.1.1** Review current student profile structure
- [ ] **2.1.2** Create new tab structure:
  - Overview (existing)
  - Documents (new)
  - Timeline (new)
  - Assessments (existing)
  - Attendance (existing)
  - Emergency Contacts (refactor)
- [ ] **2.1.3** Update tab navigation component
- [ ] **2.1.4** Add routing for new tabs
- [ ] **2.1.5** Update breadcrumbs
- [ ] **2.1.6** Test navigation between tabs

**Acceptance Criteria:**
- ✅ "Documents" tab appears in student profile
- ✅ "Timeline" tab appears in student profile
- ✅ Tab navigation works smoothly
- ✅ Active tab highlighted correctly
- ✅ URL updates with tab changes
- ✅ Mobile responsive tabs

**Files to Create/Update:**
- `app/src/app/admin/students/[id]/layout.tsx` (update tabs)
- `app/src/app/admin/students/[id]/documents/page.tsx` (new)
- `app/src/app/admin/students/[id]/timeline/page.tsx` (new)

---

### Task 2.2: Build DocumentsManager Component
**Owner:** Frontend Developer
**Estimated Time:** 8 hours

#### Subtasks:
- [ ] **2.2.1** Create component structure:
  ```
  components/admin/students/
  ├── DocumentsManager.tsx
  ├── DocumentCard.tsx
  ├── DocumentUploadModal.tsx
  ├── DocumentChecklistCard.tsx
  └── DocumentFilters.tsx
  ```
- [ ] **2.2.2** Implement DocumentsManager main layout
- [ ] **2.2.3** Add category-based grouping (identity, visa, medical, academic, correspondence)
- [ ] **2.2.4** Implement filters:
  - Category filter
  - Status filter (current, superseded, pending)
  - Approval status filter
  - Expiry date filter
- [ ] **2.2.5** Add statistics cards:
  - Total documents
  - Pending approval
  - Expiring soon (30 days)
  - Expired
- [ ] **2.2.6** Implement sorting (date, name, type)
- [ ] **2.2.7** Add search functionality
- [ ] **2.2.8** Connect to API endpoints
- [ ] **2.2.9** Implement loading states
- [ ] **2.2.10** Add error handling
- [ ] **2.2.11** Test with real data

**Acceptance Criteria:**
- ✅ Documents load from API
- ✅ Documents grouped by category
- ✅ Statistics cards show correct counts
- ✅ Filters work correctly
- ✅ Search filters documents in real-time
- ✅ Sorting works (newest, oldest, alphabetical)
- ✅ Loading skeletons during fetch
- ✅ Error messages display appropriately
- ✅ Mobile responsive layout
- ✅ Empty state when no documents

**API Integration:**
- GET `/api/admin/students/[id]/documents`

---

### Task 2.3: Build DocumentCard Component
**Owner:** Frontend Developer
**Estimated Time:** 4 hours

#### Subtasks:
- [ ] **2.3.1** Design card layout (Figma/sketch)
- [ ] **2.3.2** Implement card UI with:
  - Document type badge
  - File name
  - Upload date
  - Expiry date (if applicable)
  - Status indicator (current, superseded, pending, approved, rejected)
  - File size
  - Uploaded by (user name)
- [ ] **2.3.3** Add action menu:
  - Download
  - View details
  - Edit metadata
  - Delete/supersede
  - Approve (if pending)
  - Reject (if pending)
  - Share with student (toggle)
- [ ] **2.3.4** Implement status colors:
  - Pending: Yellow/warning
  - Approved: Green/success
  - Rejected: Red/error
  - Expiring soon: Orange
  - Expired: Red
- [ ] **2.3.5** Add hover states and animations
- [ ] **2.3.6** Implement download via presigned URL
- [ ] **2.3.7** Add confirmation dialogs for destructive actions
- [ ] **2.3.8** Test all actions

**Acceptance Criteria:**
- ✅ Card displays all metadata correctly
- ✅ Status badges color-coded
- ✅ Expiry date shows "X days until expiry" for active documents
- ✅ Action menu opens on click
- ✅ Download triggers presigned URL generation
- ✅ Edit opens metadata modal
- ✅ Delete requires confirmation
- ✅ Approve/reject actions work (for pending documents)
- ✅ Share toggle persists to database
- ✅ Mobile responsive card layout

**API Integration:**
- GET `/api/admin/students/[id]/documents/[docId]/download`
- PATCH `/api/admin/students/[id]/documents/[docId]`
- DELETE `/api/admin/students/[id]/documents/[docId]`
- POST `/api/admin/students/[id]/documents/[docId]/approve`
- POST `/api/admin/students/[id]/documents/[docId]/reject`

---

### Task 2.4: Build DocumentUploadModal Component
**Owner:** Frontend Developer
**Estimated Time:** 6 hours

#### Subtasks:
- [ ] **2.4.1** Create modal component with form
- [ ] **2.4.2** Add file input with drag-and-drop
- [ ] **2.4.3** Implement file validation:
  - Max size: 25MB
  - Allowed types: PDF, Word, Excel, Images
  - Display error messages
- [ ] **2.4.4** Add file preview (thumbnails for images, icons for docs)
- [ ] **2.4.5** Create form fields:
  - Document type (dropdown, grouped by category)
  - Document date (optional)
  - Expiry date (required if document type requires it)
  - Notes (optional)
  - Share with student (checkbox)
- [ ] **2.4.6** Implement upload flow:
  - Upload file to Supabase Storage first
  - Get file URL
  - Submit metadata to API
- [ ] **2.4.7** Add progress indicator during upload
- [ ] **2.4.8** Handle upload errors
- [ ] **2.4.9** Show success message
- [ ] **2.4.10** Refresh document list after upload
- [ ] **2.4.11** Test with various file types and sizes

**Acceptance Criteria:**
- ✅ Modal opens/closes smoothly
- ✅ Drag-and-drop works
- ✅ File validation prevents invalid uploads
- ✅ Progress bar shows upload status
- ✅ All form fields validated
- ✅ Expiry date required for passport/visa types
- ✅ File uploads to Supabase Storage
- ✅ Metadata saved to database via API
- ✅ Document appears in list immediately after upload
- ✅ Error messages clear and actionable
- ✅ Mobile responsive modal

**API Integration:**
- Supabase Storage: Upload to `student-documents` bucket
- POST `/api/admin/students/[id]/documents`

**Form Validation:**
- Document type: Required
- File: Required, max 25MB, valid MIME type
- Document date: Optional, must be valid date
- Expiry date: Required if `documentType.requiresExpiry === true`
- Notes: Optional, max 500 characters

---

### Task 2.5: Build DocumentChecklistCard Component
**Owner:** Frontend Developer
**Estimated Time:** 3 hours

#### Subtasks:
- [ ] **2.5.1** Create checklist card component
- [ ] **2.5.2** Fetch required document types from API
- [ ] **2.5.3** Display checklist with status:
  - ✅ Complete (green)
  - ⏳ Pending (yellow)
  - ❌ Missing (red)
- [ ] **2.5.4** Add "Upload" button for each missing document
- [ ] **2.5.5** Link to upload modal with pre-selected document type
- [ ] **2.5.6** Show overall completion percentage
- [ ] **2.5.7** Highlight overdue required documents

**Acceptance Criteria:**
- ✅ Shows all required document types
- ✅ Correctly identifies which are uploaded
- ✅ Completion percentage accurate
- ✅ Click to upload opens modal with pre-filled type
- ✅ Updates in real-time after document upload
- ✅ Mobile responsive

**API Integration:**
- GET `/api/admin/settings/document-types` (filter where `is_required = true`)
- GET `/api/admin/students/[id]/documents`

---

### Task 2.6: Build StudentHistoryTimeline Component
**Owner:** Frontend Developer
**Estimated Time:** 8 hours

#### Subtasks:
- [ ] **2.6.1** Create timeline component structure
- [ ] **2.6.2** Design timeline UI:
  - Vertical timeline with date markers
  - Event cards with type-specific icons
  - Color coding by event type
- [ ] **2.6.3** Implement event types:
  - Document upload (blue)
  - Document approval (green)
  - Document rejection (red)
  - Class enrollment (purple)
  - Letter generated (orange)
  - Assessment (teal)
- [ ] **2.6.4** Add filters:
  - Date range picker
  - Event type multi-select
  - Detail level toggle (summary/detailed)
- [ ] **2.6.5** Implement pagination/infinite scroll
- [ ] **2.6.6** Add event details modal (click to expand)
- [ ] **2.6.7** Format dates consistently
- [ ] **2.6.8** Add "Export timeline" button (PDF)
- [ ] **2.6.9** Connect to API
- [ ] **2.6.10** Add loading skeletons
- [ ] **2.6.11** Handle empty state

**Acceptance Criteria:**
- ✅ Timeline displays chronologically (newest first)
- ✅ Events grouped by day/week/month (configurable)
- ✅ Filters work correctly
- ✅ Date range picker functional
- ✅ Detail level toggle shows/hides extra info
- ✅ Pagination or infinite scroll works smoothly
- ✅ Click event to see full details
- ✅ Icons match event types
- ✅ Loading states during fetch
- ✅ Empty state when no events
- ✅ Mobile responsive timeline

**API Integration:**
- GET `/api/admin/students/[id]/timeline?from=DATE&to=DATE&eventTypes=TYPE1,TYPE2&detailLevel=summary|detailed&limit=100&offset=0`

**Query Parameters:**
- `from`: ISO 8601 date (optional)
- `to`: ISO 8601 date (optional)
- `eventTypes`: Comma-separated (optional)
- `detailLevel`: "summary" or "detailed" (default: summary)
- `limit`: Number of events per page (default: 100)
- `offset`: Pagination offset (default: 0)

---

### Task 2.7: Build/Update EmergencyContactsCard Component
**Owner:** Frontend Developer
**Estimated Time:** 5 hours

#### Subtasks:
- [ ] **2.7.1** Update existing emergency contact section or create new component
- [ ] **2.7.2** Display up to 2 contacts:
  - Primary contact (priority 1)
  - Secondary contact (priority 2)
- [ ] **2.7.3** Show contact information:
  - Name
  - Relationship
  - Phone (with click-to-call)
  - Email (with click-to-email)
  - Address (if provided)
  - Legal guardian indicator
- [ ] **2.7.4** Add "Add Contact" button (if < 2 contacts)
- [ ] **2.7.5** Add "Edit" button for each contact
- [ ] **2.7.6** Add "Delete" button with confirmation
- [ ] **2.7.7** Implement priority indicators (Primary/Secondary badges)
- [ ] **2.7.8** Create contact form modal (add/edit)
- [ ] **2.7.9** Validate form:
  - Name required
  - Relationship required
  - Phone required
  - Email format validation (if provided)
  - Priority auto-assigned
- [ ] **2.7.10** Handle max 2 contacts limitation
- [ ] **2.7.11** Connect to API
- [ ] **2.7.12** Test CRUD operations

**Acceptance Criteria:**
- ✅ Displays both contacts if available
- ✅ Shows empty state if no contacts
- ✅ "Add Contact" disabled when 2 contacts exist
- ✅ Priority badges display correctly
- ✅ Phone numbers formatted nicely
- ✅ Email links work
- ✅ Form validation prevents invalid data
- ✅ CRUD operations persist to database
- ✅ Error handling for max contacts exceeded
- ✅ Mobile responsive cards

**API Integration:**
- GET `/api/admin/students/[id]/emergency-contacts`
- POST `/api/admin/students/[id]/emergency-contacts`
- PATCH `/api/admin/students/[id]/emergency-contacts/[contactId]`
- DELETE `/api/admin/students/[id]/emergency-contacts/[contactId]`

**Validation:**
- Max 2 contacts per student
- Unique priority per student (1 or 2)
- Phone format validation
- Email format validation

---

## Phase 3: Frontend UI - Week 4 (Settings Pages & Advanced Features)

**Estimated Time:** 5-7 days
**Priority:** 🟢 MEDIUM

### Task 3.1: Create Document Types Settings Page
**Owner:** Frontend Developer
**Estimated Time:** 6 hours

#### Subtasks:
- [ ] **3.1.1** Create page: `app/src/app/admin/settings/document-types/page.tsx`
- [ ] **3.1.2** Design settings page layout:
  - Header with "Add Document Type" button
  - Statistics cards (total, active, required, with expiry)
  - Grouped list by category
  - Search/filter bar
- [ ] **3.1.3** Create document type table/cards with:
  - Name
  - Category badge
  - Permissions indicators (admin/student upload, requires approval)
  - Visibility setting
  - Expiry settings
  - Active/inactive toggle
  - Actions (edit, deactivate/activate, delete)
- [ ] **3.1.4** Build "Add/Edit Document Type" modal
- [ ] **3.1.5** Implement form fields:
  - Name (text, required)
  - Category (dropdown, required)
  - Description (textarea, optional)
  - Admin can upload (checkbox)
  - Student can upload (checkbox)
  - Requires approval (checkbox, auto-checked if student can upload)
  - Default visibility (dropdown: admin_only, staff_only, student_can_view)
  - Requires expiry (checkbox)
  - Expiry alert days (multi-number input, required if expiry enabled)
  - Is required (checkbox)
  - Display order (number)
  - Is active (toggle)
- [ ] **3.1.6** Add form validation
- [ ] **3.1.7** Connect to API
- [ ] **3.1.8** Implement CRUD operations
- [ ] **3.1.9** Add bulk actions (activate/deactivate multiple)
- [ ] **3.1.10** Test all functionality

**Acceptance Criteria:**
- ✅ Page loads all document types from API
- ✅ Types grouped by category with collapsible sections
- ✅ Statistics cards show accurate counts
- ✅ Search filters types in real-time
- ✅ Add/Edit modal validates all fields
- ✅ Business logic enforced (student upload → requires approval)
- ✅ CRUD operations work correctly
- ✅ Active/inactive toggle persists
- ✅ Delete prompts confirmation and checks for existing documents
- ✅ Mobile responsive layout

**API Integration:**
- GET `/api/admin/settings/document-types`
- POST `/api/admin/settings/document-types`
- GET `/api/admin/settings/document-types/[typeId]`
- PATCH `/api/admin/settings/document-types/[typeId]`
- DELETE `/api/admin/settings/document-types/[typeId]`

**Validation Rules:**
- If `studentCanUpload = true`, then `requiresApproval` must be true
- If `requiresExpiry = true`, then `expiryAlertDays` must have at least one value
- Name must be unique per tenant

---

### Task 3.2: Create Letter Templates Settings Page
**Owner:** Frontend Developer
**Estimated Time:** 8 hours

#### Subtasks:
- [ ] **3.2.1** Create page: `app/src/app/admin/settings/letter-templates/page.tsx`
- [ ] **3.2.2** Design settings page layout:
  - Header with "Add Template" button
  - Template list/cards with preview
  - Category filters
  - Format filters (PDF, DOCX, both)
- [ ] **3.2.3** Build "Add/Edit Template" modal/page
- [ ] **3.2.4** Implement rich text editor for template content
- [ ] **3.2.5** Add placeholder autocomplete:
  - Show available placeholders in sidebar
  - Click to insert into content
  - Syntax highlighting for {{placeholders}}
- [ ] **3.2.6** Create form fields:
  - Name (text, required)
  - Category (dropdown: correspondence, certificate, official, other)
  - Description (textarea, optional)
  - Content (rich text editor, required)
  - Custom placeholders (add/remove dynamic inputs)
  - Output format (radio: PDF, DOCX, HTML)
  - Is active (toggle)
- [ ] **3.2.7** Add "Preview Template" button:
  - Fill placeholders with sample data
  - Show rendered preview
- [ ] **3.2.8** Implement template validation:
  - Check all placeholders are defined
  - Warn about undefined placeholders
- [ ] **3.2.9** Connect to API
- [ ] **3.2.10** Implement CRUD operations
- [ ] **3.2.11** Add "Duplicate Template" action
- [ ] **3.2.12** Add usage statistics (how many letters generated)
- [ ] **3.2.13** Test with sample data

**Acceptance Criteria:**
- ✅ Page loads all templates from API
- ✅ Templates grouped by category
- ✅ Rich text editor works smoothly
- ✅ Placeholder autocomplete functional
- ✅ Common placeholders pre-populated
- ✅ Preview shows rendered template with sample data
- ✅ Validation prevents undefined placeholders
- ✅ CRUD operations work correctly
- ✅ Duplicate creates copy with "(Copy)" suffix
- ✅ Delete checks if template has been used (soft delete if used)
- ✅ Mobile responsive (editor may need special handling)

**API Integration:**
- GET `/api/admin/settings/letter-templates`
- POST `/api/admin/settings/letter-templates`
- GET `/api/admin/settings/letter-templates/[templateId]`
- PATCH `/api/admin/settings/letter-templates/[templateId]`
- DELETE `/api/admin/settings/letter-templates/[templateId]`

**Common Placeholders:**
- `{{student_name}}`, `{{student_first_name}}`, `{{student_last_name}}`
- `{{student_number}}`, `{{student_email}}`, `{{student_nationality}}`
- `{{student_dob}}`, `{{class_name}}`, `{{class_level}}`
- `{{class_start_date}}`, `{{class_end_date}}`, `{{teacher_name}}`
- `{{school_name}}`, `{{school_address}}`, `{{school_phone}}`
- `{{school_email}}`, `{{current_date}}`, `{{current_year}}`
- `{{emergency_contact_name}}`, `{{emergency_contact_phone}}`

---

### Task 3.3: Create Notification Rules Settings Page
**Owner:** Frontend Developer
**Estimated Time:** 8 hours

#### Subtasks:
- [ ] **3.3.1** Create page: `app/src/app/admin/settings/notification-rules/page.tsx`
- [ ] **3.3.2** Design settings page layout:
  - Header with "Add Rule" button
  - Rules list grouped by event type
  - Active/inactive filter
  - Priority filter
- [ ] **3.3.3** Create rule card/row with:
  - Rule name
  - Event type badge
  - Trigger timing (X days before)
  - Recipients (role badges)
  - Priority indicator
  - Active/inactive toggle
  - Actions (edit, delete, test)
- [ ] **3.3.4** Build "Add/Edit Rule" modal
- [ ] **3.3.5** Implement form fields:
  - Name (text, required)
  - Description (textarea, optional)
  - Event type (dropdown: document_expiry, document_pending_approval, assessment_due, course_end, attendance_threshold, visa_expiry, custom)
  - Document type (dropdown, shown if event_type = document_expiry)
  - Trigger days before (number, optional)
  - Recipient roles (multi-select: admin, dos, teacher, student)
  - Notification type (radio: email, sms, in_app)
  - Email subject (text, required if email)
  - Email body (textarea with placeholder support, required if email)
  - Priority (dropdown: low, medium, high, urgent)
  - Is active (toggle)
- [ ] **3.3.6** Add placeholder support in email body
- [ ] **3.3.7** Add "Test Notification" button (sends to current user)
- [ ] **3.3.8** Implement validation
- [ ] **3.3.9** Connect to API
- [ ] **3.3.10** Implement CRUD operations
- [ ] **3.3.11** Add bulk enable/disable
- [ ] **3.3.12** Test all functionality

**Acceptance Criteria:**
- ✅ Page loads all rules from API
- ✅ Rules grouped by event type
- ✅ Form validates all required fields
- ✅ Document type dropdown shows only when event_type = document_expiry
- ✅ Email fields required when notification_type = email
- ✅ Recipient roles multi-select works
- ✅ Placeholder autocomplete in email body
- ✅ Test notification sends successfully
- ✅ CRUD operations work correctly
- ✅ Active/inactive toggle persists
- ✅ Mobile responsive layout

**API Integration:**
- GET `/api/admin/settings/notification-rules`
- POST `/api/admin/settings/notification-rules`
- GET `/api/admin/settings/notification-rules/[ruleId]`
- PATCH `/api/admin/settings/notification-rules/[ruleId]`
- DELETE `/api/admin/settings/notification-rules/[ruleId]`

**Validation Rules:**
- If `notificationType = 'email'`, then `emailSubject` and `emailBody` required
- If `eventType = 'document_expiry'`, then `documentTypeId` should be selected
- At least one recipient role required

---

### Task 3.4: Build Pending Documents Queue
**Owner:** Frontend Developer
**Estimated Time:** 4 hours

#### Subtasks:
- [ ] **3.4.1** Create dashboard card/widget for admin dashboard
- [ ] **3.4.2** Fetch pending documents from API
- [ ] **3.4.3** Display count of pending documents
- [ ] **3.4.4** Show list of pending documents with:
  - Student name
  - Document type
  - Upload date
  - Quick actions (approve, reject, view)
- [ ] **3.4.5** Implement quick approve/reject
- [ ] **3.4.6** Add "View All Pending" link to dedicated page
- [ ] **3.4.7** Create full pending documents page with filters
- [ ] **3.4.8** Add bulk approve/reject
- [ ] **3.4.9** Connect to API
- [ ] **3.4.10** Test approval workflow

**Acceptance Criteria:**
- ✅ Dashboard widget shows pending count
- ✅ Widget shows latest 5 pending documents
- ✅ Quick actions work from widget
- ✅ Full page shows all pending documents
- ✅ Filters work (student, document type, date range)
- ✅ Bulk actions functional
- ✅ Real-time updates after approval/rejection
- ✅ Mobile responsive

**API Integration:**
- GET `/api/admin/students/[id]/documents?approvalStatus=pending`

---

### Task 3.5: Build Letter Generation UI
**Owner:** Frontend Developer
**Estimated Time:** 6 hours

#### Subtasks:
- [ ] **3.5.1** Create "Generate Letter" button in student profile
- [ ] **3.5.2** Build letter generation modal
- [ ] **3.5.3** Implement template selection dropdown (grouped by category)
- [ ] **3.5.4** Show template preview with placeholders filled
- [ ] **3.5.5** Add output format selection (if template supports both)
- [ ] **3.5.6** Implement generation flow:
  - Merge template with student data
  - Generate PDF/DOCX
  - Save to Supabase Storage
  - Create record in generated_letters table
  - Show in student's documents
- [ ] **3.5.7** Add "Download Generated Letter" button
- [ ] **3.5.8** Show history of generated letters
- [ ] **3.5.9** Add "Regenerate" option
- [ ] **3.5.10** Connect to API (to be created)
- [ ] **3.5.11** Test with multiple templates

**Acceptance Criteria:**
- ✅ Modal opens with template selection
- ✅ Preview shows real student data
- ✅ Generation creates PDF/DOCX correctly
- ✅ Generated letter saved to Storage
- ✅ Letter appears in student's timeline
- ✅ Download works
- ✅ History shows all previously generated letters
- ✅ Mobile responsive modal

**API Integration (needs to be created in Phase 5):**
- POST `/api/admin/students/[id]/letters/generate`
- GET `/api/admin/students/[id]/letters`

---

### Task 3.6: Build Document Expiry Alerts Widget
**Owner:** Frontend Developer
**Estimated Time:** 3 hours

#### Subtasks:
- [ ] **3.6.1** Create dashboard widget for admin dashboard
- [ ] **3.6.2** Fetch documents expiring soon (within 30 days)
- [ ] **3.6.3** Display count by urgency:
  - Critical: < 7 days
  - Warning: 7-30 days
  - Upcoming: 30-60 days
- [ ] **3.6.4** Show list of expiring documents with:
  - Student name
  - Document type
  - Expiry date
  - Days remaining
  - Quick action (view student)
- [ ] **3.6.5** Color code by urgency
- [ ] **3.6.6** Add "View All Expiring" link
- [ ] **3.6.7** Create full expiring documents page
- [ ] **3.6.8** Connect to API
- [ ] **3.6.9** Test with various expiry dates

**Acceptance Criteria:**
- ✅ Widget shows expiring count
- ✅ Color-coded by urgency
- ✅ Click to view student profile
- ✅ Full page shows all expiring documents
- ✅ Filters work (urgency, document type)
- ✅ Sorted by expiry date (soonest first)
- ✅ Mobile responsive

**API Integration:**
- GET `/api/admin/students/[id]/documents?expiryWithin=30`

---

## Phase 4: Testing & Polish - Week 5

**Estimated Time:** 5-7 days
**Priority:** 🔴 CRITICAL

### Task 4.1: Unit Testing
**Owner:** Developer
**Estimated Time:** 2 days

#### Subtasks:
- [ ] **4.1.1** Write unit tests for API endpoints (Jest)
  - Document CRUD operations
  - Emergency contacts CRUD
  - Timeline aggregation
  - Settings APIs
- [ ] **4.1.2** Test RLS policies
- [ ] **4.1.3** Test validation schemas
- [ ] **4.1.4** Test error handling
- [ ] **4.1.5** Test edge cases:
  - Max 2 emergency contacts
  - Soft delete versioning
  - Approval workflow
  - Placeholder validation
- [ ] **4.1.6** Achieve 80%+ code coverage
- [ ] **4.1.7** Run tests:
  ```bash
  npm test -- --coverage
  ```

**Acceptance Criteria:**
- ✅ All API endpoints have unit tests
- ✅ All edge cases covered
- ✅ 80%+ code coverage
- ✅ All tests pass
- ✅ No flaky tests

**Files to Test:**
- All routes in `app/src/app/api/admin/students/[id]/`
- All routes in `app/src/app/api/admin/settings/`
- Schema validation in `app/src/db/schema/documents.ts`

---

### Task 4.2: E2E Testing (Playwright)
**Owner:** Developer
**Estimated Time:** 2 days

#### Subtasks:
- [ ] **4.2.1** Write E2E test: Document upload workflow
  - Login as admin
  - Navigate to student profile → Documents tab
  - Click "Upload Document"
  - Fill form and upload file
  - Verify document appears in list
- [ ] **4.2.2** Write E2E test: Document approval workflow
  - Login as admin
  - Navigate to pending documents queue
  - Approve a document
  - Verify status changes
  - Check student can see approved document
- [ ] **4.2.3** Write E2E test: Emergency contacts CRUD
  - Add primary contact
  - Add secondary contact
  - Edit contact
  - Delete contact
  - Verify max 2 enforcement
- [ ] **4.2.4** Write E2E test: Timeline view
  - Navigate to student timeline
  - Filter by date range
  - Filter by event type
  - Verify events display correctly
- [ ] **4.2.5** Write E2E test: Document types settings
  - Create new document type
  - Edit document type
  - Deactivate document type
  - Verify in document upload modal
- [ ] **4.2.6** Run tests in all browsers:
  ```bash
  npm run test:e2e
  ```

**Acceptance Criteria:**
- ✅ All critical workflows have E2E tests
- ✅ Tests pass in all 5 browsers (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)
- ✅ Tests are stable (no flakiness)
- ✅ Screenshots captured on failure

**Test Files to Create:**
- `app/e2e/student-documents-upload.spec.ts`
- `app/e2e/student-documents-approval.spec.ts`
- `app/e2e/emergency-contacts.spec.ts`
- `app/e2e/student-timeline.spec.ts`
- `app/e2e/settings-document-types.spec.ts`

---

### Task 4.3: Mobile Responsiveness Testing
**Owner:** Frontend Developer
**Estimated Time:** 1 day

#### Subtasks:
- [ ] **4.3.1** Test on mobile devices (iOS & Android)
- [ ] **4.3.2** Test on tablets (iPad, Android tablet)
- [ ] **4.3.3** Test all breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- [ ] **4.3.4** Fix layout issues:
  - Document cards
  - Timeline
  - Modals
  - Forms
  - Tables/lists
- [ ] **4.3.5** Test touch interactions
- [ ] **4.3.6** Test file upload on mobile
- [ ] **4.3.7** Test image preview on mobile
- [ ] **4.3.8** Verify fonts and spacing

**Acceptance Criteria:**
- ✅ All components responsive
- ✅ No horizontal scroll on mobile
- ✅ Touch targets minimum 44x44px
- ✅ Forms easy to fill on mobile
- ✅ Modals don't overflow viewport
- ✅ Tables scroll horizontally or stack
- ✅ File upload works on mobile
- ✅ Images scale properly

**Devices to Test:**
- iPhone 12/13/14 (iOS Safari)
- Samsung Galaxy S21/S22 (Chrome)
- iPad (Safari)
- Android tablet (Chrome)

---

### Task 4.4: Accessibility Audit (WCAG 2.1 AA)
**Owner:** Frontend Developer
**Estimated Time:** 1 day

#### Subtasks:
- [ ] **4.4.1** Run automated accessibility tests:
  ```bash
  npm run test:a11y
  ```
- [ ] **4.4.2** Check color contrast ratios (minimum 4.5:1)
- [ ] **4.4.3** Test keyboard navigation:
  - Tab through all interactive elements
  - Ensure focus visible
  - Test modals (trap focus, Esc to close)
  - Test dropdowns and menus
- [ ] **4.4.4** Add ARIA labels where needed
- [ ] **4.4.5** Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] **4.4.6** Check semantic HTML
- [ ] **4.4.7** Add alt text to all images
- [ ] **4.4.8** Test form error announcements
- [ ] **4.4.9** Fix all violations
- [ ] **4.4.10** Document remaining issues (if any)

**Acceptance Criteria:**
- ✅ No automated violations (axe-core)
- ✅ All interactive elements keyboard accessible
- ✅ Focus visible and logical order
- ✅ All images have alt text
- ✅ Form errors announced to screen readers
- ✅ Color contrast meets WCAG AA standards
- ✅ Modals properly announce and trap focus
- ✅ Headings in logical order

**Tools:**
- axe DevTools browser extension
- Lighthouse accessibility audit
- NVDA screen reader (Windows)
- VoiceOver (Mac/iOS)
- WAVE browser extension

---

### Task 4.5: Performance Optimization
**Owner:** Frontend Developer
**Estimated Time:** 1 day

#### Subtasks:
- [ ] **4.5.1** Run Lighthouse performance audit
- [ ] **4.5.2** Optimize images:
  - Compress images
  - Use next/image for automatic optimization
  - Add lazy loading
- [ ] **4.5.3** Implement code splitting:
  - Dynamic imports for modals
  - Route-based code splitting
- [ ] **4.5.4** Add pagination for long lists:
  - Document list
  - Timeline events
  - Settings tables
- [ ] **4.5.5** Implement infinite scroll (timeline)
- [ ] **4.5.6** Add loading skeletons
- [ ] **4.5.7** Optimize API calls:
  - Add caching where appropriate
  - Debounce search inputs
  - Use React Query for data fetching
- [ ] **4.5.8** Reduce bundle size:
  - Tree-shake unused code
  - Analyze bundle with webpack-bundle-analyzer
- [ ] **4.5.9** Test performance on slow 3G
- [ ] **4.5.10** Aim for Lighthouse score > 90

**Acceptance Criteria:**
- ✅ Lighthouse Performance score > 90
- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3.5s
- ✅ No layout shifts (CLS < 0.1)
- ✅ Images optimized and lazy loaded
- ✅ Code splitting implemented
- ✅ Pagination/infinite scroll works
- ✅ No unnecessary re-renders

**Tools:**
- Chrome DevTools Lighthouse
- React DevTools Profiler
- webpack-bundle-analyzer
- Chrome DevTools Performance tab

---

### Task 4.6: Error Handling & User Feedback
**Owner:** Frontend Developer
**Estimated Time:** 1 day

#### Subtasks:
- [ ] **4.6.1** Implement toast notifications library (e.g., react-hot-toast)
- [ ] **4.6.2** Add success messages for all actions:
  - Document uploaded
  - Document approved/rejected
  - Contact added/updated/deleted
  - Settings saved
- [ ] **4.6.3** Add error messages for failures:
  - Upload failed
  - API error
  - Validation error
  - Network error
- [ ] **4.6.4** Implement error boundaries
- [ ] **4.6.5** Add retry logic for failed API calls
- [ ] **4.6.6** Show loading states consistently
- [ ] **4.6.7** Add confirmation dialogs for destructive actions
- [ ] **4.6.8** Test all error scenarios
- [ ] **4.6.9** Add fallback UI for errors
- [ ] **4.6.10** Log errors to error tracking service (optional)

**Acceptance Criteria:**
- ✅ All actions show success/error feedback
- ✅ Toast notifications clear and actionable
- ✅ Error boundaries catch React errors
- ✅ Retry logic works for network errors
- ✅ Loading states prevent duplicate actions
- ✅ Confirmation required for delete/destructive actions
- ✅ Error messages help user fix the problem
- ✅ Fallback UI shown when components error

**Components:**
- Toast notification system
- Error boundary component
- Confirmation dialog component
- Loading spinner/skeleton components

---

## Phase 5: Post-MVP Enhancements (Optional/Future)

**Estimated Time:** 2-3 weeks
**Priority:** 🔵 LOW (Nice to have)

### Task 5.1: Letter Generation Backend API
**Estimated Time:** 2 days

#### Subtasks:
- [ ] Create POST `/api/admin/students/[id]/letters/generate` endpoint
- [ ] Implement placeholder merging logic
- [ ] Integrate PDF generation library (e.g., PDFKit, Puppeteer)
- [ ] Integrate DOCX generation library (e.g., docx)
- [ ] Upload generated file to Supabase Storage
- [ ] Create record in `generated_letters` table
- [ ] Return download URL
- [ ] Add to timeline

---

### Task 5.2: Notification System Implementation
**Estimated Time:** 1 week

#### Subtasks:
- [ ] Create cron job/scheduled function to check notification rules
- [ ] Implement email sending (e.g., SendGrid, Resend)
- [ ] Create email templates
- [ ] Implement placeholder replacement in emails
- [ ] Create `notifications_sent` table (tracking)
- [ ] Add notification history view
- [ ] Test notification triggers

---

### Task 5.3: LLM Document Processing
**Estimated Time:** 1 week

#### Subtasks:
- [ ] Research LLM providers (OpenAI, Anthropic, Google)
- [ ] Implement OCR for scanned documents
- [ ] Extract test scores from images
- [ ] Extract dates and metadata
- [ ] Auto-populate document fields
- [ ] Add confidence scores
- [ ] Manual override option
- [ ] Test with various document types

---

### Task 5.4: Advanced Timeline Features
**Estimated Time:** 3 days

#### Subtasks:
- [ ] Add attendance events to timeline (requires integration)
- [ ] Add notes/comments to timeline events
- [ ] Add attachments to timeline events
- [ ] Implement timeline export (PDF report)
- [ ] Add print-friendly view
- [ ] Add timeline sharing (link)

---

### Task 5.5: Bulk Operations
**Estimated Time:** 2 days

#### Subtasks:
- [ ] Bulk document upload (multiple files at once)
- [ ] Bulk document approval/rejection
- [ ] Bulk document download (ZIP)
- [ ] Bulk notification send
- [ ] Progress bars for bulk operations

---

### Task 5.6: Document Versioning UI
**Estimated Time:** 2 days

#### Subtasks:
- [ ] Show version history for documents
- [ ] Compare versions side-by-side
- [ ] Restore previous version
- [ ] View audit trail

---

### Task 5.7: Advanced Search & Filters
**Estimated Time:** 2 days

#### Subtasks:
- [ ] Full-text search across all documents
- [ ] Advanced filter builder
- [ ] Saved filters/views
- [ ] Search across all students

---

## Summary

### Critical Path (Must Complete Before Launch)
1. **Phase 1:** Database Setup (1-2 hours)
2. **Phase 2:** Core UI Components (1-2 weeks)
3. **Phase 4:** Testing & Polish (1 week)

### Optional (Post-MVP)
- **Phase 3:** Some advanced features can be deferred
- **Phase 5:** All enhancements are optional

### Total Estimated Time
- **Minimum (Critical Path):** 2-3 weeks
- **Complete (All Phases 1-4):** 4-5 weeks
- **Full (Including Phase 5):** 6-8 weeks

---

## Progress Tracking

Use this checklist format in STATUS.md:

```markdown
## Student Documents System Progress

### Phase 1: Database Setup ⏸️ 0/6 tasks
- [ ] 1.1 Verify/Run SQL Migration
- [ ] 1.2 Set Up Supabase Storage Bucket
- [ ] 1.3 Migrate Emergency Contact Data
- [ ] 1.4 Seed Default Document Types
- [ ] 1.5 Regenerate TypeScript Types
- [ ] 1.6 Verify Backend APIs

### Phase 2: Core UI (Week 3) ⏸️ 0/7 tasks
- [ ] 2.1 Refactor Student Profile Tabs
- [ ] 2.2 Build DocumentsManager Component
- [ ] 2.3 Build DocumentCard Component
- [ ] 2.4 Build DocumentUploadModal Component
- [ ] 2.5 Build DocumentChecklistCard Component
- [ ] 2.6 Build StudentHistoryTimeline Component
- [ ] 2.7 Build/Update EmergencyContactsCard Component

### Phase 3: Settings & Advanced (Week 4) ⏸️ 0/6 tasks
- [ ] 3.1 Create Document Types Settings Page
- [ ] 3.2 Create Letter Templates Settings Page
- [ ] 3.3 Create Notification Rules Settings Page
- [ ] 3.4 Build Pending Documents Queue
- [ ] 3.5 Build Letter Generation UI
- [ ] 3.6 Build Document Expiry Alerts Widget

### Phase 4: Testing & Polish (Week 5) ⏸️ 0/6 tasks
- [ ] 4.1 Unit Testing
- [ ] 4.2 E2E Testing
- [ ] 4.3 Mobile Responsiveness Testing
- [ ] 4.4 Accessibility Audit
- [ ] 4.5 Performance Optimization
- [ ] 4.6 Error Handling & User Feedback

### Phase 5: Post-MVP (Optional) ⏸️ 0/7 tasks
- [ ] 5.1 Letter Generation Backend API
- [ ] 5.2 Notification System Implementation
- [ ] 5.3 LLM Document Processing
- [ ] 5.4 Advanced Timeline Features
- [ ] 5.5 Bulk Operations
- [ ] 5.6 Document Versioning UI
- [ ] 5.7 Advanced Search & Filters
```

---

## Quick Start Checklist (Next 24 Hours)

**If you want to get started immediately, do these tasks first:**

1. ✅ **Verify Migration** (10 min) - Check if tables exist in Supabase
2. ✅ **Set Up Storage** (20 min) - Create bucket and apply RLS policies
3. ✅ **Migrate Emergency Contacts** (10 min) - Run migration script
4. ✅ **Seed Document Types** (5 min) - Run seed script
5. ✅ **Regenerate Types** (2 min) - Run `npm run db:generate`
6. ✅ **Test API** (10 min) - Verify endpoints work

**Total Time:** ~1 hour

After this, you'll have a fully functional backend and can start building the UI!

---

## Questions or Blockers?

If you encounter any issues:
1. Check `MIGRATION_STATUS.md` for troubleshooting
2. Review `STUDENT_DOCUMENTS_NEXT_STEPS.md` for detailed guides
3. Check API documentation in code comments
4. Review RLS policies in `app/migrations/FRESH_0033_student_documents_system.sql`

**Need help?** All documentation is in the repository:
- Migration guides in `app/migrations/`
- API routes in `app/src/app/api/admin/`
- Schema in `app/src/db/schema/documents.ts`
