# MyCastle Development Roadmap

> **Version:** 1.0.0 | **Status:** Active | **Last Updated:** 2025-12-31
> **Purpose:** Granular task breakdown (20-30 minute tasks) with user stories for systematic completion

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Admin UI/UX Complete](#phase-1-admin-uiux-complete)
3. [Phase 2: ETL Loader](#phase-2-etl-loader)
4. [Phase 3: Teacher UI/UX Enhancements](#phase-3-teacher-uiux-enhancements)
5. [Phase 4: Student UI/UX](#phase-4-student-uiux)
6. [Progress Tracking](#progress-tracking)

---

## Overview

### Project Status Summary

**Completed:**
- ✅ Database schema (19 tables across 5 modules)
- ✅ Authentication & RLS policies (47 tests passing)
- ✅ Teacher: Attendance Register (with hash-chain verification)
- ✅ Teacher: AI Lesson Planner
- ✅ Teacher: Timetable View
- ✅ Admin: Dashboard (KPIs, alerts, work queue)
- ✅ Admin: User Management

**In Progress:**
- 🟡 Admin: Student Registry (components created, needs wiring)

**To Complete:**
- ❌ Admin: 19 remaining pages
- ❌ ETL Loader: Excel import with validation
- ❌ Teacher: Enhancements & quality improvements
- ❌ Student: All 4 pages

### Development Principles

1. **Stability First** - Use proven, stable solutions
2. **Non-Technical UX** - Abstract complexity, simple workflows
3. **Functionality Over Features** - Core operations must be rock-solid
4. **Minimal Maintenance** - Self-contained, well-tested code

---

## Phase 1: Admin UI/UX Complete

**Goal:** Complete all 19 remaining admin pages with full functionality
**Estimated Duration:** 8-12 weeks (based on 20-30 min tasks)
**Priority:** Highest - Foundation for all other work

### 1.1 Student Registry (Complete Wiring)

#### Task 1.1.1: Wire Student List to Student Registry Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I am an admin user viewing /admin/students
WHEN the page loads
THEN I see a complete list of students with filters
  AND the StudentRegistry component is properly wired
  AND data loads from the database via RLS-protected API
```
**Files:**
- `/admin/students/page.tsx` - Wire StudentRegistry component
- `/components/admin/students/StudentRegistry.tsx` - Verify props

**Acceptance:**
- [ ] Student list displays with real data
- [ ] Filters work (name, level, status, programme)
- [ ] Pagination works (25 per page)
- [ ] Loading states shown

#### Task 1.1.2: Implement Student Detail Drawer Data Fetching ✅
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I click on a student in the list
WHEN the detail drawer opens
THEN I see complete student information across all tabs
  AND data is fetched from v_students_with_metadata view
  AND RLS policies enforce admin access only
```
**Files:**
- `/components/admin/students/StudentDetailDrawer.tsx`
- Create `/api/admin/students/[id]/route.ts`

**Acceptance:**
- [x] Drawer opens with student data
- [x] All 6 tabs load correctly
- [x] API endpoint respects RLS

#### Task 1.1.3: Connect Personal Info Tab to Database
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I view a student's Personal Info tab
WHEN the tab loads
THEN I see name, DOB, contact details, emergency contact
  AND fields are read-only (edit in separate task)
  AND sensitive data is properly masked
```
**Files:**
- `/components/admin/students/tabs/PersonalInfoTab.tsx`

**Acceptance:**
- [ ] Display full name, email, phone
- [ ] Show DOB (formatted)
- [ ] Show emergency contact details
- [ ] Sensitive fields respect RLS

#### Task 1.1.4: Connect Course History Tab
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I view Course History tab
WHEN the tab loads
THEN I see all enrollments (past and present)
  AND each enrollment shows class, dates, status, level
  AND I can see amendments (extensions, reductions)
```
**Files:**
- `/components/admin/students/tabs/CourseHistoryTab.tsx`
- Query `enrollments` and `enrollmentAmendments` tables

**Acceptance:**
- [ ] List all enrollments
- [ ] Show enrollment status (active, completed, withdrawn)
- [ ] Display amendment history

#### Task 1.1.5: Connect Attendance Summary Tab
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I view Attendance Summary tab
WHEN the tab loads
THEN I see attendance percentage and session breakdown
  AND I can filter by date range or class
  AND visa students show compliance status
```
**Files:**
- `/components/admin/students/tabs/AttendanceSummaryTab.tsx`
- Query `attendance` table

**Acceptance:**
- [ ] Show attendance % (present/total)
- [ ] List recent sessions with status
- [ ] Highlight visa compliance issues

#### Task 1.1.6: Connect Assessments Tab
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I view Assessments tab
WHEN the tab loads
THEN I see all grades and submissions
  AND I can filter by assignment or date
  AND CEFR progress is visualized
```
**Files:**
- `/components/admin/students/tabs/AssessmentsTab.tsx`
- Query `grades` and `submissions` tables

**Acceptance:**
- [ ] List all grades
- [ ] Show assignment titles and scores
- [ ] Display submission status

#### Task 1.1.7: Connect Notes Tab
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I view Notes tab
WHEN the tab loads
THEN I see all administrative notes
  AND I can add a new note
  AND notes are timestamped with author
```
**Files:**
- `/components/admin/students/tabs/NotesTab.tsx`
- Create notes table or use audit log

**Acceptance:**
- [ ] Display existing notes
- [ ] Form to add new note
- [ ] Notes saved to database

#### Task 1.1.8: Connect Documents Tab
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I view Documents tab
WHEN the tab loads
THEN I see all uploaded documents (visa, ID, certificates)
  AND I can download documents via signed URLs
  AND URLs expire after 24 hours
```
**Files:**
- `/components/admin/students/tabs/DocumentsTab.tsx`
- Integrate with Supabase Storage

**Acceptance:**
- [ ] List all documents
- [ ] Generate signed URLs for download
- [ ] Document types categorized

#### Task 1.1.9: Implement Create Student Form Submission ✅
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I click "Create Student" button
WHEN I fill in the form and submit
THEN a new student record is created
  AND a user account is created if needed
  AND I'm redirected to the student detail page
```
**Files:**
- `/components/admin/students/CreateStudentForm.tsx`
- `/app/admin/students/create/page.tsx`
- `/api/admin/students/route.ts` (POST)

**Acceptance:**
- [x] Form validation works (Zod schema)
- [x] Student created in database
- [x] User account created if email provided
- [x] Success notification shown

#### Task 1.1.10: Implement Student Edit Functionality ✅
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click "Edit" on a student record
WHEN I modify fields and save
THEN the student record is updated
  AND changes are logged in audit trail
  AND I see a success notification
```
**Files:**
- Add edit mode to `StudentDetailDrawer.tsx`
- `/api/admin/students/[id]/route.ts` (PATCH)

**Acceptance:**
- [x] Edit button toggles edit mode
- [x] Save updates database
- [x] Audit log entry created
- [x] Validation prevents invalid data

---

### 1.2 Classes Management (Complete Implementation)

#### Task 1.2.1: Enhance Class List Page with Filters
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I am viewing /admin/classes
WHEN the page loads
THEN I see all classes with filters (teacher, level, status, dates)
  AND I can sort by start date or name
  AND pagination works
```
**Files:**
- `/app/admin/classes/page.tsx`
- `/components/admin/ClassList.tsx`

**Acceptance:**
- [ ] Filter by teacher (dropdown)
- [ ] Filter by CEFR level (A1-C2)
- [ ] Filter by status (scheduled, active, completed)
- [ ] Sorting works

#### Task 1.2.2: Complete Class Create Form
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I click "Create Class"
WHEN I fill in name, level, teacher, dates, capacity
THEN a new class is created
  AND sessions are automatically generated (optional)
  AND I'm redirected to class detail page
```
**Files:**
- `/components/admin/CreateClassForm.tsx`
- `/app/admin/classes/create/page.tsx`

**Acceptance:**
- [ ] Form fields: name, CEFR level, teacher (dropdown), start/end dates, capacity
- [ ] Validation: end > start, capacity > 0
- [ ] Class saved to database
- [ ] Teacher assignment recorded

#### Task 1.2.3: Implement Class Detail View
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click on a class name
WHEN the detail page loads
THEN I see class info, enrolled students, sessions, materials
  AND I can navigate to related pages (attendance, edit)
```
**Files:**
- `/app/admin/classes/[id]/page.tsx`

**Acceptance:**
- [ ] Display class metadata
- [ ] List enrolled students (with links)
- [ ] Show session schedule
- [ ] Link to attendance register

#### Task 1.2.4: Complete Class Edit Form
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click "Edit" on a class
WHEN I modify fields and save
THEN the class is updated
  AND changes are audited
  AND students/sessions are not affected (unless specified)
```
**Files:**
- `/components/admin/EditClassForm.tsx`
- `/app/admin/classes/[id]/edit/page.tsx`

**Acceptance:**
- [ ] Form pre-populated with current data
- [ ] Update class metadata
- [ ] Audit log entry created
- [ ] Validation prevents orphaning students

#### Task 1.2.5: Add Session Generation to Class Creation
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I create a class with start/end dates
WHEN I select "Generate Sessions" option
THEN sessions are auto-created based on schedule pattern
  AND I can specify days of week and times
  AND sessions appear in classSessions table
```
**Files:**
- Add to `CreateClassForm.tsx`
- Create session generation utility

**Acceptance:**
- [ ] User specifies pattern (e.g., Mon/Wed/Fri 10am-12pm)
- [ ] Sessions generated for date range
- [ ] Sessions saved to database

---

### 1.3 Enrollments Management

#### Task 1.3.1: Create Enrollment List Page ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/enrolments
WHEN the page loads
THEN I see all enrollments with student name, class, dates, status
  AND I can filter by student, class, status
  AND I can sort by start date
```
**Files:**
- `/app/admin/enrolments/page.tsx`
- Create `EnrollmentList.tsx` component

**Acceptance:**
- [x] API endpoint created (`/api/admin/enrollments`)
- [ ] List view with columns: student, class, start/end dates, status
- [ ] Filters work
- [ ] Pagination implemented

#### Task 1.3.2: Implement Enroll Student in Class Form ✅ (API Complete)
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I click "Enroll Student"
WHEN I select student, class, and dates
THEN an enrollment record is created
  AND student has access to class materials
  AND capacity check is enforced
```
**Files:**
- Create `EnrollStudentForm.tsx`
- `/api/admin/enrollments/route.ts`

**Acceptance:**
- [x] API endpoint with capacity validation
- [ ] Student dropdown (searchable)
- [ ] Class dropdown
- [ ] Start/end date pickers
- [x] Validation: class not at capacity
- [x] Enrollment created

#### Task 1.3.3: Implement Enrollment Amendments (Extensions) ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I view an enrollment
WHEN I click "Extend"
THEN I can specify new end date
  AND an amendment record is created
  AND enrollment end_date is updated
```
**Files:**
- Create `AmendEnrollmentForm.tsx`
- Use `enrollmentAmendments` table

**Acceptance:**
- [x] Amendment API endpoint created
- [ ] Extension form with new end date
- [x] Amendment type: EXTENSION
- [x] Update enrollment record
- [ ] Audit log entry

#### Task 1.3.4: Implement Enrollment Reductions
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I view an enrollment
WHEN I click "Reduce"
THEN I can specify new (earlier) end date
  AND an amendment record is created
  AND enrollment is updated
```
**Files:**
- Extend `AmendEnrollmentForm.tsx`

**Acceptance:**
- [ ] Reduction form
- [ ] Amendment type: REDUCTION
- [ ] Validation: new end >= start
- [ ] Update enrollment

#### Task 1.3.5: Implement Enrollment Level Changes
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN a student's level has changed
WHEN I click "Change Level"
THEN I can record the level change
  AND an amendment is created
  AND future class suggestions reflect new level
```
**Files:**
- Extend `AmendEnrollmentForm.tsx`

**Acceptance:**
- [ ] Level change form (A1-C2)
- [ ] Amendment type: LEVEL_CHANGE
- [ ] Store old and new levels
- [ ] Update metadata

#### Task 1.3.6: Implement Transfer Between Classes
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN a student needs to move to another class
WHEN I click "Transfer"
THEN I can select target class
  AND original enrollment is marked transferred
  AND new enrollment is created
  AND attendance history is preserved
```
**Files:**
- Create `TransferStudentForm.tsx`

**Acceptance:**
- [ ] Transfer form with target class
- [ ] Close original enrollment
- [ ] Create new enrollment
- [ ] Amendment type: TRANSFER
- [ ] Link records via transfer_id

---

### 1.4 Attendance Tracking (Admin View)

#### Task 1.4.1: Create Admin Attendance Overview Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/attendance
WHEN the page loads
THEN I see attendance statistics across all classes
  AND I can filter by date range, class, student
  AND I see compliance alerts (visa students)
```
**Files:**
- `/app/admin/attendance/page.tsx`
- Create `AttendanceOverview.tsx` component

**Acceptance:**
- [ ] Summary cards: total sessions, avg attendance %, alerts
- [ ] Recent sessions list
- [ ] Filter controls
- [ ] Link to session detail

#### Task 1.4.2: Create Session-Specific Attendance Sheet (Admin View)
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I click on a session
WHEN the attendance sheet loads
THEN I see the same register view as teachers
  AND I can view historical attendance
  AND hash-chain validation status is shown
```
**Files:**
- `/app/admin/attendance/[sessionId]/page.tsx`
- Reuse `AttendanceSheet.tsx` component

**Acceptance:**
- [ ] Display attendance register
- [ ] Show hash-chain status (valid/invalid)
- [ ] Read-only for completed sessions
- [ ] Edit requires admin override

#### Task 1.4.3: Implement Attendance Correction Flow
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN a teacher made an attendance error
WHEN I click "Request Correction"
THEN I can select session, student, correct status
  AND correction is submitted for admin approval
  AND audit trail shows original + correction
```
**Files:**
- Create `AttendanceCorrectionForm.tsx`
- Implement approval workflow

**Acceptance:**
- [ ] Correction request form
- [ ] Store correction in pending state
- [ ] Admin can approve/reject
- [ ] Hash-chain appends new entry

#### Task 1.4.4: Implement Bulk Attendance Export
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I need weekly attendance reports
WHEN I select date range and class
THEN I can export CSV or Excel
  AND export includes hash column for verification
  AND export completes in < 60s
```
**Files:**
- Enhance `/api/attendance/export`
- Add admin-specific export options

**Acceptance:**
- [ ] Date range picker
- [ ] Class filter (multi-select)
- [ ] Export format selector (CSV/XLSX)
- [ ] Hash column included
- [ ] Signed URL provided

---

### 1.5 Finance Management (Invoices & Payments)

#### Task 1.5.1: Create Invoice List Page ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/finance/invoices
WHEN the page loads
THEN I see all invoices with student, amount, status, due date
  AND I can filter by status (paid, pending, overdue)
  AND I can sort by date or amount
```
**Files:**
- `/app/admin/finance/invoices/page.tsx`
- Create `InvoiceList.tsx`

**Acceptance:**
- [x] API endpoint created (`/api/admin/finance/invoices`)
- [ ] List invoices from database
- [ ] Status badges (paid, pending, overdue)
- [ ] Filters work
- [ ] Pagination

#### Task 1.5.2: Implement Create Invoice Form ✅ (API Complete)
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I click "Create Invoice"
WHEN I fill in student, amount, due date, line items
THEN an invoice is generated
  AND PDF is created and stored
  AND student is notified (optional)
```
**Files:**
- `/components/admin/CreateInvoiceForm.tsx`
- `/app/admin/finance/invoices/create/page.tsx`

**Acceptance:**
- [x] API endpoint with validation
- [ ] Form fields: student, amount, due date, description
- [ ] Line items support (add/remove rows)
- [x] Invoice number auto-generated
- [ ] PDF generation (use library like pdf-lib or jsPDF)

#### Task 1.5.3: Create Invoice Detail View
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I click on an invoice
WHEN the detail page loads
THEN I see full invoice details and payment history
  AND I can download PDF
  AND I can record a payment
```
**Files:**
- `/app/admin/finance/invoices/[id]/page.tsx`

**Acceptance:**
- [ ] Display invoice metadata
- [ ] Show line items
- [ ] Payment history table
- [ ] Download PDF button
- [ ] Record payment button

#### Task 1.5.4: Implement Record Payment Form ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN an invoice is pending
WHEN I click "Record Payment"
THEN I can enter amount, date, method, reference
  AND payment is recorded
  AND invoice status updates if fully paid
```
**Files:**
- Create `RecordPaymentForm.tsx`
- `/api/admin/finance/payments/route.ts`

**Acceptance:**
- [x] API endpoint created
- [ ] Payment form: amount, date, method, reference
- [x] Validation: amount <= outstanding balance
- [x] Payment saved to `payments` table
- [x] Invoice status auto-updates

#### Task 1.5.5: Create Payments List Page ✅ (API Complete)
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/finance/payments
WHEN the page loads
THEN I see all payments with student, invoice, amount, date
  AND I can filter by date range or student
  AND I can export payment report
```
**Files:**
- `/app/admin/finance/payments/page.tsx`
- Create `PaymentList.tsx`

**Acceptance:**
- [x] API endpoint created
- [ ] List payments
- [ ] Link to related invoice
- [ ] Filter by date range
- [ ] Export button (CSV)

#### Task 1.5.6: Implement Invoice Refund Flow
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN a payment was made in error
WHEN I click "Refund"
THEN I can specify refund amount and reason
  AND a negative payment entry is created
  AND invoice balance is adjusted
```
**Files:**
- Create `RefundPaymentForm.tsx`

**Acceptance:**
- [ ] Refund form
- [ ] Validation: refund <= total payments
- [ ] Negative payment entry
- [ ] Audit log entry

---

### 1.6 Compliance & Visa Tracking

#### Task 1.6.1: Create Visa Compliance Dashboard
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/compliance/visa
WHEN the page loads
THEN I see all students on visa with attendance compliance status
  AND I see alerts for students below threshold (80%)
  AND I can export compliance report
```
**Files:**
- `/app/admin/compliance/visa/page.tsx`
- Create `VisaComplianceDashboard.tsx`

**Acceptance:**
- [ ] List visa students
- [ ] Show attendance % for each
- [ ] Highlight non-compliant students
- [ ] Export report button

#### Task 1.6.2: Implement Visa Status Tracking
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN a student has a visa
WHEN I view their profile
THEN I can see visa type, expiry date, conditions
  AND I can update visa details
  AND alerts trigger before expiry
```
**Files:**
- Add visa fields to student model
- Update `PersonalInfoTab.tsx`

**Acceptance:**
- [ ] Visa type field
- [ ] Expiry date field
- [ ] Conditions/notes field
- [ ] Alert when expiry < 30 days

#### Task 1.6.3: Create Regulatory Compliance Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/compliance/regulatory
WHEN the page loads
THEN I see compliance checklist (GDPR, ISO27001)
  AND I can view recent audits
  AND I can generate compliance pack
```
**Files:**
- `/app/admin/compliance/regulatory/page.tsx`

**Acceptance:**
- [ ] Checklist display
- [ ] Audit log integration
- [ ] Generate compliance pack button

---

### 1.7 Programmes & Courses

#### Task 1.7.1: Create Programmes List Page ✅ (API Complete)
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/programmes
WHEN the page loads
THEN I see all programmes (General English, Business English, etc.)
  AND I can view programme details
  AND I can create/edit programmes
```
**Files:**
- `/app/admin/programmes/page.tsx`
- Create `ProgrammeList.tsx`

**Acceptance:**
- [x] API endpoint created (`/api/admin/programmes`)
- [x] Includes course count per programme
- [ ] List programmes from database
- [ ] Display name, description, duration
- [ ] Create button
- [ ] Edit links

#### Task 1.7.2: Implement Create Programme Form ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click "Create Programme"
WHEN I fill in name, description, duration, levels
THEN a new programme is created
  AND it appears in programme list
```
**Files:**
- Create `CreateProgrammeForm.tsx`
- `/api/admin/programmes/route.ts`

**Acceptance:**
- [x] API endpoint with validation
- [x] Auto-generates programme code
- [ ] Form fields: name, description, duration, CEFR levels
- [x] Validation
- [x] Save to database

#### Task 1.7.3: Create Courses List Page ✅ (API Complete)
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/courses
WHEN the page loads
THEN I see all courses mapped to programmes
  AND I can filter by programme or level
  AND I can create/edit courses
```
**Files:**
- `/app/admin/courses/page.tsx`
- Create `CourseList.tsx`

**Acceptance:**
- [x] API endpoint created (`/api/admin/courses`)
- [x] Includes programme relationship
- [ ] List courses
- [ ] Show programme relationship
- [ ] CEFR level displayed
- [ ] Create/edit buttons

#### Task 1.7.4: Implement Create Course Form ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click "Create Course"
WHEN I fill in name, programme, level, objectives
THEN a new course is created
  AND CEFR descriptors can be linked
```
**Files:**
- Create `CreateCourseForm.tsx`
- `/api/admin/courses/route.ts`

**Acceptance:**
- [x] API endpoint with validation
- [x] Auto-generates course code
- [ ] Form fields: name, programme (dropdown), CEFR level, objectives
- [x] Descriptor linking (multi-select)
- [x] Save to database

---

### 1.8 Rooms Management

#### Task 1.8.1: Create Rooms List Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/rooms
WHEN the page loads
THEN I see all rooms with name, capacity, facilities
  AND I can create/edit rooms
```
**Files:**
- `/app/admin/rooms/page.tsx`
- Create `RoomList.tsx`

**Acceptance:**
- [ ] List rooms from database (or create table if needed)
- [ ] Display name, capacity, equipment
- [ ] Create/edit functionality

#### Task 1.8.2: Implement Create Room Form
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I click "Create Room"
WHEN I fill in name, capacity, facilities
THEN a new room is created
```
**Files:**
- Create `CreateRoomForm.tsx`

**Acceptance:**
- [ ] Form fields: name, capacity, equipment/facilities
- [ ] Save to database

#### Task 1.8.3: Implement Room Booking/Allocation View
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I view room allocations
WHEN I select a date
THEN I see which sessions are in which rooms
  AND I can reassign rooms if conflicts occur
```
**Files:**
- Create `RoomAllocationView.tsx`

**Acceptance:**
- [ ] Calendar/timeline view
- [ ] Show sessions per room
- [ ] Drag-drop reassignment (nice-to-have)
- [ ] Conflict detection

---

### 1.9 Communications

#### Task 1.9.1: Create Email Logs Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/communications/email-logs
WHEN the page loads
THEN I see all sent emails with recipient, subject, status, timestamp
  AND I can filter by date or recipient
```
**Files:**
- `/app/admin/communications/email-logs/page.tsx`
- Create `EmailLogsList.tsx`

**Acceptance:**
- [ ] List emails from logs
- [ ] Display recipient, subject, sent time, status
- [ ] Filter by date range

#### Task 1.9.2: Create Notifications Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/communications/notifications
WHEN the page loads
THEN I see all system notifications sent to users
  AND I can create manual notifications
```
**Files:**
- `/app/admin/communications/notifications/page.tsx`
- Create `NotificationsList.tsx`

**Acceptance:**
- [ ] List notifications
- [ ] Create notification button
- [ ] Send to user/role/all

---

### 1.10 Enquiries Management

#### Task 1.10.1: Create Enquiries List Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/enquiries
WHEN the page loads
THEN I see all enquiries with name, email, status, date
  AND I can filter by status (new, contacted, converted, rejected)
```
**Files:**
- `/app/admin/enquiries/page.tsx`
- Create `EnquiriesList.tsx`
- Create enquiries table if needed

**Acceptance:**
- [ ] List enquiries
- [ ] Status filtering
- [ ] Create enquiry form (for manual entry)

#### Task 1.10.2: Implement Enquiry Detail View
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I click on an enquiry
WHEN the detail view opens
THEN I see full enquiry details and communication history
  AND I can update status
  AND I can convert to student
```
**Files:**
- Create `EnquiryDetail.tsx`

**Acceptance:**
- [ ] Display enquiry fields
- [ ] Status update dropdown
- [ ] "Convert to Student" button
- [ ] Notes/communications log

---

### 1.11 Data Management (Bulk Upload & Exports)

#### Task 1.11.1: Create Data Management Dashboard
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/data
WHEN the page loads
THEN I see options for bulk upload and exports
  AND I see recent import/export jobs
```
**Files:**
- Create `/app/admin/data/page.tsx`

**Acceptance:**
- [ ] Links to bulk upload and exports pages
- [ ] Recent jobs list
- [ ] Status indicators

#### Task 1.11.2: Implement Bulk Upload Page (Placeholder)
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/data/bulk-upload
WHEN the page loads
THEN I see upload form and instructions
  AND I can select file type (students, classes, etc.)
```
**Files:**
- `/app/admin/data/bulk-upload/page.tsx`

**Acceptance:**
- [ ] File upload component
- [ ] Entity type selector
- [ ] Instructions panel
- [ ] (Full implementation in Phase 2)

#### Task 1.11.3: Create Exports Management Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/data/exports
WHEN the page loads
THEN I see all available export types
  AND I can view past exports
  AND I can download previous exports
```
**Files:**
- `/app/admin/data/exports/page.tsx`
- Create `ExportsList.tsx`

**Acceptance:**
- [ ] List export types (attendance, students, financial, etc.)
- [ ] Past exports table
- [ ] Download links (signed URLs)

---

### 1.12 Timetable Management (Admin View)

#### Task 1.12.1: Create Admin Timetable View
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/timetable
WHEN the page loads
THEN I see organization-wide timetable
  AND I can filter by teacher, room, class
  AND I can switch between week/month view
```
**Files:**
- `/app/admin/timetable/page.tsx`
- Create `AdminTimetableView.tsx`

**Acceptance:**
- [ ] Week/month calendar view
- [ ] Display all sessions
- [ ] Filter controls
- [ ] Click to view session detail

---

### 1.13 Teachers Management

#### Task 1.13.1: Create Teachers List Page ✅ (API Complete)
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/teachers
WHEN the page loads
THEN I see all teachers with name, email, assigned classes
  AND I can filter/search
```
**Files:**
- `/app/admin/teachers/page.tsx`
- Create `TeacherList.tsx`

**Acceptance:**
- [x] API endpoint created (`/api/admin/teachers`)
- [x] Includes assigned classes count
- [ ] List teachers
- [ ] Show assigned classes count
- [ ] Search/filter functionality

#### Task 1.13.2: Implement Teacher Detail View ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click on a teacher
WHEN the detail view loads
THEN I see teacher profile, qualifications, assigned classes, schedule
  AND I can edit teacher details
```
**Files:**
- Create `TeacherDetail.tsx`

**Acceptance:**
- [x] API endpoint created (`/api/admin/teachers/[id]`)
- [x] Fetches assigned classes
- [ ] Display teacher info
- [ ] List assigned classes
- [ ] Show timetable
- [ ] Edit button

---

### 1.14 Search Functionality

#### Task 1.14.1: Implement Global Search Page ✅ (API Complete)
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/search
WHEN I enter a search query
THEN I see results across students, teachers, classes
  AND results are categorized by type
  AND I can click to navigate to detail pages
```
**Files:**
- `/app/admin/search/page.tsx`
- Create `/api/admin/search/route.ts`

**Acceptance:**
- [x] API endpoint created (multi-entity search)
- [x] Searches students, teachers, classes
- [x] Returns categorized results
- [ ] Search input with debounce
- [ ] Multi-entity search (students, teachers, classes)
- [ ] Categorized results
- [ ] Click to navigate

---

### 1.15 Settings & Configuration

#### Task 1.15.1: Create Settings Page Structure
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/settings
WHEN the page loads
THEN I see tabs for different settings categories
  AND I can navigate between tabs
```
**Files:**
- `/app/admin/settings/page.tsx`

**Acceptance:**
- [ ] Tab navigation (General, Auth, Email, Billing, etc.)
- [ ] Settings organized by category

#### Task 1.15.2: Implement General Settings Tab
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I view General Settings
WHEN I update organization name, locale, timezone
THEN settings are saved to tenant configuration
```
**Files:**
- Create `GeneralSettingsTab.tsx`

**Acceptance:**
- [ ] Org name field
- [ ] Locale selector
- [ ] Timezone selector
- [ ] Save button

#### Task 1.15.3: Implement Email Settings Tab
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I view Email Settings
WHEN I configure SMTP settings or email templates
THEN email configuration is saved
```
**Files:**
- Create `EmailSettingsTab.tsx`

**Acceptance:**
- [ ] SMTP configuration fields
- [ ] Test email button
- [ ] Template editor (basic)

---

### 1.16 Audit Log Viewer

#### Task 1.16.1: Create Audit Log Page ✅ (API Complete)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/audit-log
WHEN the page loads
THEN I see all audit log entries with timestamp, actor, action, entity
  AND I can filter by date, user, action type
```
**Files:**
- `/app/admin/audit-log/page.tsx`
- Create `AuditLogViewer.tsx`

**Acceptance:**
- [x] API endpoint created (`/api/admin/audit-log`)
- [x] Includes user relationship
- [x] Supports all filters
- [x] Pagination implemented
- [ ] List audit logs from auditLogs table
- [ ] Display timestamp, user, action, entity
- [ ] Filters (date range, user, action)
- [ ] Pagination

#### Task 1.16.2: Implement Audit Log Detail View ✅ (API Complete)
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I click on an audit log entry
WHEN the detail view opens
THEN I see full context including before/after values
  AND I can see related entries
```
**Files:**
- Create `AuditLogDetail.tsx`

**Acceptance:**
- [x] API endpoint created (`/api/admin/audit-log/[id]`)
- [x] Fetches related logs for same entity
- [ ] Display diff JSON
- [ ] Show before/after comparison
- [ ] Related entries timeline

---

### 1.17 Progress Tracking

#### Task 1.17.1: Create Progress Dashboard
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/progress
WHEN the page loads
THEN I see progress metrics across all students
  AND I can filter by class or level
```
**Files:**
- `/app/admin/progress/page.tsx`

**Acceptance:**
- [ ] Aggregate progress statistics
- [ ] Charts/visualizations
- [ ] Filter by class/level

---

### 1.18 Bookings Management

#### Task 1.18.1: Create Bookings List Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/bookings
WHEN the page loads
THEN I see all course bookings with student, course, dates, status
```
**Files:**
- `/app/admin/bookings/page.tsx`
- Create `BookingsList.tsx`

**Acceptance:**
- [ ] List bookings
- [ ] Status filtering
- [ ] Create booking form

---

### 1.19 Help & Documentation

#### Task 1.19.1: Create Help Page
**Estimate:** 15 minutes
**User Story:**
```gherkin
GIVEN I visit /admin/help
WHEN the page loads
THEN I see FAQs and help documentation
```
**Files:**
- `/app/admin/help/page.tsx`

**Acceptance:**
- [ ] FAQ section
- [ ] Links to documentation
- [ ] Contact support option

---

## Phase 2: ETL Loader

**Goal:** Build robust Excel import system with validation and user confirmation
**Estimated Duration:** 4-6 weeks
**Priority:** High - Critical for data migration and bulk operations

### 2.1 ETL Architecture

#### Task 2.1.1: Design ETL Data Model
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I need to track import jobs
WHEN I design the data model
THEN I have tables for: import_jobs, import_rows, import_errors
  AND I can track status (pending, processing, completed, failed)
```
**Files:**
- Create migration for ETL tables
- `/db/schema/etl.ts`

**Acceptance:**
- [ ] import_jobs table (id, filename, type, status, created_at, created_by)
- [ ] import_rows table (job_id, row_number, data_json, status, error)
- [ ] import_errors table (row_id, field, error_message)

#### Task 2.1.2: Create Import Job Status Tracking
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN an import is in progress
WHEN I view the import status
THEN I see progress (rows processed / total)
  AND I see validation results
```
**Files:**
- `/api/admin/imports/[jobId]/status/route.ts`

**Acceptance:**
- [ ] API endpoint returns job status
- [ ] Progress percentage
- [ ] Error count
- [ ] Validation summary

---

### 2.2 Excel Parser

#### Task 2.2.1: Implement Excel File Upload
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit the bulk upload page
WHEN I select an Excel file (.xlsx)
THEN the file is uploaded to temporary storage
  AND file metadata is extracted
```
**Files:**
- `/components/admin/data/ExcelUploader.tsx`

**Acceptance:**
- [ ] File input accepts .xlsx, .xls
- [ ] File size validation (< 10MB)
- [ ] Upload to Supabase Storage or temp folder
- [ ] Return upload ID

#### Task 2.2.2: Implement Excel Parsing Utility
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN an uploaded Excel file
WHEN I parse the file
THEN I extract rows as JSON objects
  AND I detect column headers
  AND I return structured data
```
**Files:**
- `/lib/etl/excelParser.ts`
- Use library: `xlsx` or `exceljs`

**Acceptance:**
- [ ] Parse Excel to JSON
- [ ] Handle multiple sheets
- [ ] Detect headers from first row
- [ ] Return array of row objects

---

### 2.3 Data Validation

#### Task 2.3.1: Define Validation Schemas for Students
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I import student data
WHEN each row is validated
THEN I check: required fields, email format, DOB format, unique constraints
  AND validation errors are collected
```
**Files:**
- `/lib/etl/validators/studentValidator.ts`
- Use Zod for validation

**Acceptance:**
- [ ] Zod schema for student import
- [ ] Required fields: firstName, lastName, email
- [ ] Email validation
- [ ] DOB validation (format, age range)
- [ ] Unique email check

#### Task 2.3.2: Define Validation Schemas for Classes
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I import class data
WHEN each row is validated
THEN I check: required fields, date ranges, teacher exists, capacity
```
**Files:**
- `/lib/etl/validators/classValidator.ts`

**Acceptance:**
- [ ] Zod schema for class import
- [ ] Required fields: name, level, teacher_id, start_date
- [ ] Date validation (start < end)
- [ ] Teacher existence check

#### Task 2.3.3: Define Validation Schemas for Enrollments
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I import enrollment data
WHEN each row is validated
THEN I check: student exists, class exists, dates valid, capacity not exceeded
```
**Files:**
- `/lib/etl/validators/enrollmentValidator.ts`

**Acceptance:**
- [ ] Student existence check
- [ ] Class existence check
- [ ] Date range validation
- [ ] Capacity check

---

### 2.4 Change Detection

#### Task 2.4.1: Implement Diff Engine for Students
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN imported student data
WHEN I compare against existing records
THEN I detect: new students, updates, conflicts
  AND I show differences to user
```
**Files:**
- `/lib/etl/diffEngine.ts`

**Acceptance:**
- [ ] Match students by email
- [ ] Detect new records (no match)
- [ ] Detect updates (match + changes)
- [ ] Detect conflicts (duplicate emails)
- [ ] Generate diff report

#### Task 2.4.2: Implement Change Summary Report
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN a validated import
WHEN I view the change summary
THEN I see: X new, Y updates, Z errors
  AND I can drill down to see details
```
**Files:**
- Create `ImportSummary.tsx` component

**Acceptance:**
- [ ] Summary cards (new, updates, errors)
- [ ] Expandable sections for each category
- [ ] Row-level detail view

---

### 2.5 User Confirmation Workflow

#### Task 2.5.1: Create Import Preview Page
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN an import job has been validated
WHEN I view the preview page
THEN I see all changes categorized
  AND I can review each change
  AND I can exclude specific rows
```
**Files:**
- `/app/admin/data/imports/[jobId]/preview/page.tsx`
- Create `ImportPreview.tsx`

**Acceptance:**
- [ ] Display new records list
- [ ] Display updates list (with before/after)
- [ ] Display errors list
- [ ] Checkboxes to include/exclude rows
- [ ] "Confirm Import" button

#### Task 2.5.2: Implement Row-Level Review
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I'm reviewing an import
WHEN I click on a row
THEN I see detailed before/after comparison
  AND I can manually edit values
  AND I can mark row for exclusion
```
**Files:**
- Create `ImportRowDetail.tsx`

**Acceptance:**
- [ ] Before/after diff view
- [ ] Inline editing capability
- [ ] Exclude checkbox
- [ ] Save edited values

#### Task 2.5.3: Implement Bulk Approval
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I've reviewed all changes
WHEN I click "Approve All New" or "Approve All Updates"
THEN all rows in that category are marked approved
```
**Files:**
- Add bulk actions to `ImportPreview.tsx`

**Acceptance:**
- [ ] "Approve All New" button
- [ ] "Approve All Updates" button
- [ ] Bulk exclude errors button
- [ ] Confirmation dialog

---

### 2.6 Database Update Execution

#### Task 2.6.1: Implement Transactional Import Execution
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I confirm an import
WHEN execution starts
THEN all changes are applied in a single transaction
  AND if any error occurs, entire import is rolled back
  AND progress is tracked
```
**Files:**
- `/lib/etl/executor.ts`
- `/api/admin/imports/[jobId]/execute/route.ts`

**Acceptance:**
- [ ] Wrap all inserts/updates in transaction
- [ ] Rollback on error
- [ ] Progress tracking (rows completed)
- [ ] Success/failure status

#### Task 2.6.2: Implement Insert New Records
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN approved new records
WHEN import executes
THEN new students/classes/enrollments are inserted
  AND user accounts are created for students (if needed)
```
**Files:**
- Extend `/lib/etl/executor.ts`

**Acceptance:**
- [ ] Bulk insert approved new records
- [ ] Create user accounts for new students
- [ ] Maintain referential integrity

#### Task 2.6.3: Implement Update Existing Records
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN approved updates
WHEN import executes
THEN existing records are updated
  AND changes are logged in audit trail
```
**Files:**
- Extend `/lib/etl/executor.ts`

**Acceptance:**
- [ ] Bulk update approved records
- [ ] Audit log entries created
- [ ] Only changed fields updated

---

### 2.7 Error Handling & Rollback

#### Task 2.7.1: Implement Error Logging
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN an import execution fails
WHEN errors occur
THEN all errors are logged with row number and details
  AND user is notified
```
**Files:**
- Use `import_errors` table

**Acceptance:**
- [ ] Log all errors to database
- [ ] Include row number, field, error message
- [ ] Return error summary to UI

#### Task 2.7.2: Implement Rollback on Failure
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN import execution encounters critical error
WHEN rollback is triggered
THEN all changes are undone
  AND database returns to pre-import state
```
**Files:**
- Ensure transactional execution in executor

**Acceptance:**
- [ ] Transaction rollback on error
- [ ] No partial imports
- [ ] Error status recorded

---

### 2.8 Import History & Auditing

#### Task 2.8.1: Create Import History Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I visit import history
WHEN the page loads
THEN I see all past imports with filename, status, date, user
  AND I can view details of each import
```
**Files:**
- `/app/admin/data/imports/page.tsx`
- Create `ImportHistoryList.tsx`

**Acceptance:**
- [ ] List import jobs
- [ ] Status badges
- [ ] Click to view detail
- [ ] Filter by status/date

#### Task 2.8.2: Create Import Detail/Report Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I click on a past import
WHEN the detail page loads
THEN I see full report: rows processed, errors, changes made
  AND I can download error report
```
**Files:**
- `/app/admin/data/imports/[jobId]/page.tsx`

**Acceptance:**
- [ ] Display job metadata
- [ ] Summary statistics
- [ ] Error details
- [ ] Download error CSV

---

### 2.9 Template Generation

#### Task 2.9.1: Create Import Template Generator
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I want to import students
WHEN I click "Download Template"
THEN I get an Excel file with correct column headers
  AND example rows are included
```
**Files:**
- `/api/admin/imports/templates/[type]/route.ts`
- Use `exceljs` to generate templates

**Acceptance:**
- [ ] Generate template for students
- [ ] Generate template for classes
- [ ] Generate template for enrollments
- [ ] Include headers + example rows
- [ ] Include validation notes sheet

---

## Phase 3: Teacher UI/UX Enhancements

**Goal:** Improve existing teacher features and add missing functionality
**Estimated Duration:** 3-4 weeks
**Priority:** Medium - Builds on existing solid foundation

### 3.1 Attendance Register Enhancements

#### Task 3.1.1: Add Attendance Notes Field
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I'm marking a student as Absent or Late
WHEN I add a note
THEN the note is saved with the attendance record
  AND I can view notes in attendance history
```
**Files:**
- Update `AttendanceRegister.tsx`
- Ensure `notes` field is saved

**Acceptance:**
- [ ] Note text area appears on A/L status
- [ ] Note saved to database
- [ ] Note displayed in admin view

#### Task 3.1.2: Implement Attendance Correction Requests (Teacher Side)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I made an attendance error yesterday
WHEN I request a correction
THEN a correction request is submitted to admin
  AND I'm notified when it's approved/rejected
```
**Files:**
- Create `RequestCorrectionForm.tsx`
- `/api/teacher/attendance/corrections/route.ts`

**Acceptance:**
- [ ] Correction request form
- [ ] Admin notified
- [ ] Teacher sees request status

#### Task 3.1.3: Add Bulk Late Function
**Estimate:** 15 minutes
**User Story:**
```gherkin
GIVEN multiple students arrived late
WHEN I click "Mark All Late"
THEN all students are marked Late
  AND I can override individuals
```
**Files:**
- Update `AttendanceRegister.tsx`

**Acceptance:**
- [ ] "Mark All Late" button
- [ ] Bulk update function
- [ ] Individual overrides work

---

### 3.2 Lesson Planner Enhancements

#### Task 3.2.1: Add Lesson Plan History View
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I've generated lesson plans
WHEN I view my lesson plan history
THEN I see all past plans organized by date/class
  AND I can reuse or duplicate plans
```
**Files:**
- Create `LessonPlanHistory.tsx`
- `/teacher/lesson-planner/history/page.tsx`

**Acceptance:**
- [ ] List all plans created by teacher
- [ ] Filter by class/date
- [ ] "Duplicate" button
- [ ] View plan details

#### Task 3.2.2: Implement Plan Editing
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I generated a lesson plan
WHEN I click "Edit"
THEN I can modify objectives, activities, timings
  AND changes are saved as new version
```
**Files:**
- Create `EditLessonPlan.tsx`

**Acceptance:**
- [ ] Edit form pre-populated with plan
- [ ] Save as new version (preserve original)
- [ ] Update session link

#### Task 3.2.3: Add Plan Templates Library
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN there are common lesson types
WHEN I select a template
THEN a plan is pre-filled with that structure
  AND I can customize before saving
```
**Files:**
- Create templates table or config
- Add template selector to `LessonPlannerForm.tsx`

**Acceptance:**
- [ ] Template selector dropdown
- [ ] Templates loaded from database
- [ ] Plan pre-filled with template structure

---

### 3.3 Materials Management

#### Task 3.3.1: Create Materials Upload Interface
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I want to attach materials to a lesson
WHEN I upload files
THEN files are stored in Supabase Storage
  AND linked to lesson plan or session
```
**Files:**
- Create `MaterialsUploader.tsx`
- `/api/teacher/materials/route.ts`

**Acceptance:**
- [ ] File upload component
- [ ] Multiple file support
- [ ] Upload to Supabase Storage
- [ ] Link to lesson/session

#### Task 3.3.2: Implement Materials Library View
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I have uploaded materials
WHEN I view my materials library
THEN I see all materials organized by type/class
  AND I can search and reuse materials
```
**Files:**
- Create `MaterialsLibrary.tsx`
- `/teacher/materials/page.tsx`

**Acceptance:**
- [ ] List all materials
- [ ] Filter by type/class
- [ ] Search functionality
- [ ] Attach to new lesson button

---

### 3.4 Class Management (Teacher View)

#### Task 3.4.1: Create My Classes Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I'm assigned to classes
WHEN I view /teacher/classes
THEN I see all my assigned classes
  AND I can click to view class details
```
**Files:**
- Create `/teacher/classes/page.tsx`
- Create `MyClassesList.tsx`

**Acceptance:**
- [ ] List assigned classes
- [ ] Display class info (name, level, schedule)
- [ ] Link to class detail

#### Task 3.4.2: Create Class Detail Page (Teacher View)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click on a class
WHEN the detail page loads
THEN I see students, upcoming sessions, materials
  AND I can navigate to attendance or lesson planning
```
**Files:**
- Create `/teacher/classes/[id]/page.tsx`

**Acceptance:**
- [ ] Display class info
- [ ] List enrolled students
- [ ] Upcoming sessions
- [ ] Quick actions (attendance, plan lesson)

---

### 3.5 Grading & Submissions

#### Task 3.5.1: Create Assignments List (Teacher View)
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I've assigned homework
WHEN I view assignments
THEN I see all assignments with submission status
  AND I can click to grade submissions
```
**Files:**
- Create `/teacher/assignments/page.tsx`
- Create `AssignmentsList.tsx`

**Acceptance:**
- [ ] List assignments
- [ ] Show submission count
- [ ] Filter by class/date
- [ ] Link to grading page

#### Task 3.5.2: Implement Grading Interface
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN students have submitted assignments
WHEN I grade submissions
THEN I can enter scores, feedback, CEFR level
  AND grades are saved to database
```
**Files:**
- Create `/teacher/assignments/[id]/grade/page.tsx`
- Create `GradingInterface.tsx`

**Acceptance:**
- [ ] List submissions
- [ ] Input score field
- [ ] Feedback text area
- [ ] CEFR level selector
- [ ] Save grades to `grades` table

---

### 3.6 Progress Tracking (Teacher View)

#### Task 3.6.1: Create Student Progress View
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I want to see a student's progress
WHEN I view their progress page
THEN I see CEFR descriptors mastered, attendance %, grades
  AND I can add progress notes
```
**Files:**
- Create `/teacher/students/[id]/progress/page.tsx`

**Acceptance:**
- [ ] Display CEFR progress
- [ ] Attendance summary
- [ ] Grades overview
- [ ] Add note functionality

---

## Phase 4: Student UI/UX

**Goal:** Build complete student-facing interface
**Estimated Duration:** 4-5 weeks
**Priority:** Medium-High - Completes the application

### 4.1 Student Dashboard

#### Task 4.1.1: Create Student Dashboard Page
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I'm a logged-in student
WHEN I visit /student/dashboard
THEN I see my upcoming sessions, recent assignments, progress summary
  AND I can navigate to all student features
```
**Files:**
- Create `/student/dashboard/page.tsx`
- Create `StudentDashboard.tsx`

**Acceptance:**
- [ ] Upcoming sessions widget
- [ ] Assignments due widget
- [ ] Progress summary card
- [ ] Quick links to features

---

### 4.2 Student Timetable

#### Task 4.2.1: Create Student Timetable Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I want to see my schedule
WHEN I visit /student/timetable
THEN I see my enrolled classes in weekly view
  AND I can see session times and rooms
```
**Files:**
- Create `/student/timetable/page.tsx`
- Reuse `TimetableWeekView.tsx` with student filter

**Acceptance:**
- [ ] Week view calendar
- [ ] Show only enrolled classes
- [ ] Display time, room, teacher
- [ ] Link to session materials

---

### 4.3 Student Classes & Materials

#### Task 4.3.1: Create My Classes Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I'm enrolled in classes
WHEN I visit /student/classes
THEN I see all my classes
  AND I can view class details and materials
```
**Files:**
- Create `/student/classes/page.tsx`
- Create `StudentClassesList.tsx`

**Acceptance:**
- [ ] List enrolled classes
- [ ] Show class info
- [ ] Link to materials

#### Task 4.3.2: Create Class Materials Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I click on a class
WHEN I view class materials
THEN I see all available materials (PDFs, links, etc.)
  AND I can download via signed URLs
```
**Files:**
- Create `/student/classes/[id]/materials/page.tsx`

**Acceptance:**
- [ ] List materials for class
- [ ] Signed URLs for download
- [ ] Organized by lesson/date

---

### 4.4 Student Assignments

#### Task 4.4.1: Create Assignments Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I have assignments
WHEN I visit /student/assignments
THEN I see all assignments with due dates and status
  AND I can filter by class or status (todo, submitted, graded)
```
**Files:**
- Create `/student/assignments/page.tsx`
- Create `StudentAssignmentsList.tsx`

**Acceptance:**
- [ ] List assignments
- [ ] Show due dates
- [ ] Status badges (todo, submitted, graded)
- [ ] Filter controls

#### Task 4.4.2: Create Assignment Detail & Submission Page
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I click on an assignment
WHEN I view the detail page
THEN I see assignment instructions and submission form
  AND I can upload files or enter text
  AND I can submit
```
**Files:**
- Create `/student/assignments/[id]/page.tsx`
- Create `AssignmentSubmissionForm.tsx`

**Acceptance:**
- [ ] Display assignment details
- [ ] File upload or text editor
- [ ] Submit button
- [ ] Save to `submissions` table

#### Task 4.4.3: Implement Submission Confirmation
**Estimate:** 15 minutes
**User Story:**
```gherkin
GIVEN I submit an assignment
WHEN submission is successful
THEN I see confirmation message
  AND assignment status updates to "submitted"
```
**Files:**
- Update `AssignmentSubmissionForm.tsx`

**Acceptance:**
- [ ] Success notification
- [ ] Status update
- [ ] Submission timestamp displayed

---

### 4.5 Student Progress

#### Task 4.5.1: Create Progress Overview Page
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I want to see my learning progress
WHEN I visit /student/progress
THEN I see CEFR level, descriptors mastered, attendance %, grades
  AND I see progress visualizations
```
**Files:**
- Create `/student/progress/page.tsx`
- Create `StudentProgressDashboard.tsx`

**Acceptance:**
- [ ] Current CEFR level badge
- [ ] Progress chart/visualization
- [ ] Descriptors completed list
- [ ] Attendance percentage
- [ ] Average grade

#### Task 4.5.2: Implement CEFR Descriptor Progress View
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I want to see CEFR progress detail
WHEN I view descriptors
THEN I see all descriptors for my level
  AND completed descriptors are marked
  AND I can see evidence (lessons, assessments)
```
**Files:**
- Create `CEFRDescriptorProgress.tsx`

**Acceptance:**
- [ ] List descriptors by domain (Listening, Reading, Writing, Speaking)
- [ ] Checkmarks for completed
- [ ] Link to evidence (assignments, grades)

---

### 4.6 Student Attendance View

#### Task 4.6.1: Create My Attendance Page
**Estimate:** 20 minutes
**User Story:**
```gherkin
GIVEN I want to see my attendance
WHEN I visit /student/attendance
THEN I see all sessions with my attendance status
  AND I see attendance percentage
```
**Files:**
- Create `/student/attendance/page.tsx`
- Query `attendance` table for student

**Acceptance:**
- [ ] List sessions with status (P/A/L)
- [ ] Attendance % calculation
- [ ] Filter by date range or class

---

### 4.7 Student Profile

#### Task 4.7.1: Create Student Profile Page
**Estimate:** 25 minutes
**User Story:**
```gherkin
GIVEN I want to view/update my profile
WHEN I visit /student/profile
THEN I see my personal info
  AND I can update email, phone (with verification)
```
**Files:**
- Create `/student/profile/page.tsx`
- Create `StudentProfileForm.tsx`

**Acceptance:**
- [ ] Display name, email, phone, DOB (read-only)
- [ ] Edit email/phone with verification
- [ ] Change password link (if applicable)

#### Task 4.7.2: Implement Profile Update with Verification
**Estimate:** 30 minutes
**User Story:**
```gherkin
GIVEN I update my email
WHEN I save
THEN a verification code is sent
  AND I must verify before change is saved
```
**Files:**
- Implement verification flow
- Use Supabase Auth or custom OTP

**Acceptance:**
- [ ] Send verification code
- [ ] OTP input field
- [ ] Verify and update on success

---

## Progress Tracking

### Quick Status Checklist

#### Phase 1: Admin UI/UX (19 modules)
- [ ] 1.1 Student Registry (10 tasks)
- [ ] 1.2 Classes Management (5 tasks)
- [ ] 1.3 Enrollments Management (6 tasks)
- [ ] 1.4 Attendance Tracking (4 tasks)
- [ ] 1.5 Finance Management (6 tasks)
- [ ] 1.6 Compliance & Visa (3 tasks)
- [ ] 1.7 Programmes & Courses (4 tasks)
- [ ] 1.8 Rooms Management (3 tasks)
- [ ] 1.9 Communications (2 tasks)
- [ ] 1.10 Enquiries (2 tasks)
- [ ] 1.11 Data Management (3 tasks)
- [ ] 1.12 Timetable (1 task)
- [ ] 1.13 Teachers Management (2 tasks)
- [ ] 1.14 Search (1 task)
- [ ] 1.15 Settings (3 tasks)
- [ ] 1.16 Audit Log (2 tasks)
- [ ] 1.17 Progress (1 task)
- [ ] 1.18 Bookings (1 task)
- [ ] 1.19 Help (1 task)

**Total Phase 1 Tasks: 60**

#### Phase 2: ETL Loader (9 modules)
- [ ] 2.1 ETL Architecture (2 tasks)
- [ ] 2.2 Excel Parser (2 tasks)
- [ ] 2.3 Data Validation (3 tasks)
- [ ] 2.4 Change Detection (2 tasks)
- [ ] 2.5 User Confirmation (3 tasks)
- [ ] 2.6 Database Execution (3 tasks)
- [ ] 2.7 Error Handling (2 tasks)
- [ ] 2.8 Import History (2 tasks)
- [ ] 2.9 Template Generation (1 task)

**Total Phase 2 Tasks: 20**

#### Phase 3: Teacher Enhancements (6 modules)
- [ ] 3.1 Attendance Enhancements (3 tasks)
- [ ] 3.2 Lesson Planner Enhancements (3 tasks)
- [ ] 3.3 Materials Management (2 tasks)
- [ ] 3.4 Class Management (2 tasks)
- [ ] 3.5 Grading & Submissions (2 tasks)
- [ ] 3.6 Progress Tracking (1 task)

**Total Phase 3 Tasks: 13**

#### Phase 4: Student UI/UX (7 modules)
- [ ] 4.1 Dashboard (1 task)
- [ ] 4.2 Timetable (1 task)
- [ ] 4.3 Classes & Materials (2 tasks)
- [ ] 4.4 Assignments (3 tasks)
- [ ] 4.5 Progress (2 tasks)
- [ ] 4.6 Attendance (1 task)
- [ ] 4.7 Profile (2 tasks)

**Total Phase 4 Tasks: 12**

---

## **GRAND TOTAL: 105 Tasks**

**Estimated Completion Time:**
- Phase 1: 25-30 hours (60 tasks × 25 min avg)
- Phase 2: 8-10 hours (20 tasks × 25 min avg)
- Phase 3: 5-7 hours (13 tasks × 25 min avg)
- Phase 4: 5-6 hours (12 tasks × 25 min avg)

**Total: 43-53 hours of focused development**

---

## MyCastle Skill Integration

When you run the `/MyCastle` skill, I will:

1. **Check the roadmap** - Read this file and identify the next uncompleted task
2. **Review recent commits** - Use `git log` to see what was last completed
3. **Check specifications** - Read REQ.md, DESIGN.md, TASKS.md for context
4. **Suggest next step** - Propose the specific task to work on with:
   - Clear user story
   - Files to modify
   - Acceptance criteria
   - Estimated time

This ensures every MyCastle session is:
- ✅ **Focused** - One clear task at a time
- ✅ **Contextual** - Aware of project state
- ✅ **Efficient** - Minimal context/token usage
- ✅ **Progressive** - Systematic completion

---

## Notes on Implementation

### Code Quality Standards
- **TypeScript strict mode** - All files must pass type checking
- **Zod validation** - All forms and API inputs validated
- **Error boundaries** - All pages wrapped in error boundaries
- **Loading states** - Skeleton loaders for all async operations
- **Accessibility** - WCAG 2.2 AA compliance
- **RLS enforcement** - All database queries respect RLS policies

### Testing Requirements
- **Unit tests** - For utilities and validation logic
- **Integration tests** - For API routes
- **E2E tests** - For critical flows (optional for initial implementation)
- **Manual testing** - Required for all UI components

### Non-Technical UX Principles
- **Clear labels** - No technical jargon (use "Class" not "Entity")
- **Helpful errors** - User-friendly error messages
- **Confirmation dialogs** - For destructive actions
- **Success feedback** - Clear notifications for all actions
- **Progressive disclosure** - Advanced options hidden by default
- **Consistent patterns** - Same interactions across all pages

---

**Status**: ✅ Active Roadmap
**Maintained By**: Claude Code + Eoin Malone
**Last Updated**: 2025-12-31
