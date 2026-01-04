# Admin Pages Gap Analysis

**Generated:** 2025-12-17
**Purpose:** Map existing admin pages to MCP spec user stories and identify gaps

---

## Existing Admin Pages

### ✅ Identity & Access Management
- `/admin/users` - User roster/list
- `/admin/users/create` - Create new user
- `/admin/users/[id]` - View user details
- `/admin/users/[id]/edit` - Edit user
- `/admin/teachers` - Teacher list
- `/admin/students` - Student list

**MCP Coverage:**
- ✅ View user directory (`admin://users`)
- ✅ Create user accounts
- ✅ View user details
- ⚠️ **PARTIAL** - Role assignment (may be in edit page)
- ❌ Grant granular permissions
- ❌ Force logout sessions
- ❌ Rotate API keys
- ❌ View active sessions (`admin://sessions`)
- ❌ View roles matrix (`admin://roles`)

---

### ⚠️ Academic Programme Management
**Existing:** NONE FOUND

**Missing Pages:**
- ❌ `/admin/programmes` - View & manage programmes (`admin://programmes`)
- ❌ `/admin/programmes/create` - Create programme
- ❌ `/admin/programmes/[id]` - View programme details
- ❌ `/admin/programmes/[id]/edit` - Edit programme
- ❌ `/admin/courses` - Course catalogue (`admin://courses`)
- ❌ `/admin/courses/create` - Create course
- ❌ `/admin/courses/[id]` - View course details
- ❌ `/admin/courses/[id]/edit` - Edit course with CEFR mapping
- ❌ `/admin/courses/[id]/syllabus` - Publish syllabus
- ❌ `/admin/lesson-templates` - Lesson templates (`admin://lesson_templates`)
- ❌ `/admin/lesson-templates/create` - Create template
- ❌ `/admin/lesson-plans/pending` - Approve lesson plans
- ❌ `/admin/materials` - Learning materials library
- ❌ `/admin/cefr` - CEFR descriptors (`admin://cefr_descriptors`)

---

### ⚠️ Scheduling & Timetabling
- ✅ `/admin/timetable` - Master timetable
- ✅ `/admin/classes` - Class list
- ✅ `/admin/classes/create` - Create class
- ✅ `/admin/classes/[id]` - View class details
- ✅ `/admin/classes/[id]/edit` - Edit class

**MCP Coverage:**
- ✅ View master timetable (`admin://timetable`)
- ✅ View class list (`admin://classes`)
- ✅ Create class schedules
- ⚠️ **PARTIAL** - Teacher assignment (likely in class edit)
- ❌ View room inventory (`admin://rooms`)
- ❌ `/admin/rooms` - Room management
- ❌ `/admin/rooms/create` - Create room
- ❌ `/admin/timetable/conflicts` - Resolve scheduling conflicts
- ❌ `/admin/integrations/calendar-sync` - External calendar sync

---

### ⚠️ Attendance & Compliance
- ✅ `/admin/attendance` - Attendance overview
- ✅ `/admin/attendance/[sessionId]` - Session attendance
- ✅ `/admin/compliance/visa` - Visa compliance
- ✅ `/admin/compliance/regulatory` - Regulatory compliance

**MCP Coverage:**
- ✅ View attendance overview (`admin://attendance_overview`)
- ✅ Record attendance
- ✅ View visa risk (`admin://visa_risk`)
- ❌ `/admin/attendance/bulk-record` - Bulk attendance entry
- ❌ `/admin/attendance/corrections` - Admin corrections with audit
- ❌ `/admin/attendance/export` - Export attendance data
- ❌ `/admin/compliance/visa/reports` - Generate visa compliance reports

---

### ❌ Admissions & Bookings
**Existing:** NONE FOUND

**Missing Pages:**
- ❌ `/admin/enquiries` - Prospective enquiries (`admin://enquiries`)
- ❌ `/admin/enquiries/[id]` - View enquiry details
- ❌ `/admin/bookings` - Student bookings (`admin://bookings`)
- ❌ `/admin/bookings/create` - Create booking
- ❌ `/admin/bookings/[id]` - View booking details
- ❌ `/admin/bookings/[id]/edit` - Edit booking
- ❌ `/admin/intake` - Confirm intake to cohorts
- ❌ `/admin/intake/[cohortId]` - Cohort intake management

---

### ❌ Finance & Invoicing
**Existing:** NONE FOUND

**Missing Pages:**
- ❌ `/admin/finance` - Finance dashboard
- ❌ `/admin/invoices` - Invoice register (`admin://invoices`)
- ❌ `/admin/invoices/create` - Create invoice
- ❌ `/admin/invoices/[id]` - View invoice
- ❌ `/admin/invoices/[id]/edit` - Edit invoice
- ❌ `/admin/payments` - Payment log (`admin://payments`)
- ❌ `/admin/payments/[id]` - Payment details
- ❌ `/admin/payments/reconcile` - Reconcile payouts
- ❌ `/admin/reports/aging` - Aging report (`admin://aging_report`)
- ❌ `/admin/reports/ledger` - Financial ledger export

---

### ❌ Student Lifecycle
**Existing:** PARTIAL (students list only)

**Missing Pages:**
- ✅ `/admin/students` - Student list
- ❌ `/admin/enrolments` - Active enrolments (`admin://enrolments`)
- ❌ `/admin/students/[id]` - Student profile
- ❌ `/admin/students/[id]/letters` - Issue letters
- ❌ `/admin/students/[id]/letters/create` - Generate letter
- ❌ `/admin/students/[id]/deferrals` - Approve deferrals
- ❌ `/admin/certificates` - Certificate management
- ❌ `/admin/certificates/award` - Award certificate
- ❌ `/admin/students/[id]/progression` - Track CEFR progression

---

### ❌ Accommodation Management
**Existing:** NONE FOUND

**Missing Pages:**
- ❌ `/admin/accommodation` - Accommodation dashboard
- ❌ `/admin/accommodation/hosts` - Host families (`admin://hosts`)
- ❌ `/admin/accommodation/hosts/create` - Register host
- ❌ `/admin/accommodation/hosts/[id]` - Host details
- ❌ `/admin/accommodation/placements` - Placements (`admin://placements`)
- ❌ `/admin/accommodation/placements/create` - Allocate student
- ❌ `/admin/accommodation/placements/[id]/swap` - Swap accommodation
- ❌ `/admin/accommodation/export` - Export placements

---

### ❌ Quality & CPD
**Existing:** NONE FOUND

**Missing Pages:**
- ❌ `/admin/quality` - Quality dashboard
- ❌ `/admin/observations` - Teacher observations (`admin://observations`)
- ❌ `/admin/observations/create` - Record observation
- ❌ `/admin/observations/[id]` - View observation
- ❌ `/admin/cpd` - CPD activities
- ❌ `/admin/cpd/assign` - Assign CPD activity
- ❌ `/admin/reports/quality` - Quality assurance report

---

### ⚠️ Compliance & Governance
- ✅ `/admin/audit-log` - System audit trail
- ✅ `/admin/policies` - Policy library
- ✅ `/admin/compliance/visa` - Visa compliance
- ✅ `/admin/compliance/regulatory` - Regulatory compliance

**MCP Coverage:**
- ✅ View audit log (`admin://audit_log`)
- ✅ View policies (`admin://policies`)
- ❌ `/admin/compliance/packs` - Compile evidence packs
- ❌ `/admin/compliance/packs/create` - Create compliance pack
- ❌ `/admin/data/anonymise` - Anonymise datasets
- ❌ `/admin/backups` - Database backups
- ❌ `/admin/backups/create` - Create backup
- ❌ `/admin/backups/restore` - Restore from backup
- ❌ `/admin/security/rls-check` - RLS policy checker

---

### ⚠️ Communications
- ✅ `/admin/communications/email-logs` - Email logs
- ✅ `/admin/communications/notifications` - Notifications

**MCP Coverage:**
- ✅ View email logs
- ✅ View notifications
- ❌ `/admin/communications/bulk-email` - Send bulk email
- ❌ `/admin/communications/templates` - Email templates
- ❌ `/admin/communications/templates/create` - Create template
- ❌ `/admin/communications/mail-merge` - Mail merge PDFs

---

### ⚠️ Reporting & Data
- ✅ `/admin/data/exports` - Data exports
- ✅ `/admin/data/bulk-upload` - Bulk data upload

**MCP Coverage:**
- ✅ Generate exports
- ✅ Bulk upload
- ❌ `/admin/reports` - Reports dashboard
- ❌ `/admin/reports/templates` - Export templates
- ❌ `/admin/reports/schedule` - Schedule automated reports

---

### ✅ Other Pages
- ✅ `/admin` - Admin dashboard
- ✅ `/admin/profile` - Admin profile
- ✅ `/admin/settings` - System settings
- ✅ `/admin/help` - Help/documentation
- ✅ `/admin/search` - Global search
- ✅ `/admin/progress` - Progress tracking
- ✅ `/admin/integrations` - Integrations

---

## Summary Statistics

### Coverage by Domain

| Domain | Pages Exist | Pages Missing | Coverage % |
|--------|-------------|---------------|------------|
| Identity & Access | 6 | 4 | 60% |
| Academic Programmes | 0 | 14 | 0% |
| Scheduling & Timetabling | 5 | 4 | 56% |
| Attendance & Compliance | 4 | 4 | 50% |
| Admissions & Bookings | 0 | 8 | 0% |
| Finance & Invoicing | 0 | 10 | 0% |
| Student Lifecycle | 1 | 8 | 11% |
| Accommodation | 0 | 8 | 0% |
| Quality & CPD | 0 | 7 | 0% |
| Compliance & Governance | 4 | 7 | 36% |
| Communications | 2 | 4 | 33% |
| Reporting & Data | 2 | 3 | 40% |

### Overall Coverage
- **Total Pages Required:** ~105
- **Total Pages Exist:** 27
- **Overall Coverage:** 26%

---

## Priority Missing Pages (MVP Critical)

Based on MCP spec priorities, these pages are critical for MVP:

### HIGH PRIORITY (Phase 1)
1. ❌ `/admin/programmes` - Cannot manage academic structure
2. ❌ `/admin/courses` - Cannot define course offerings
3. ❌ `/admin/rooms` - Cannot allocate physical resources
4. ❌ `/admin/enrolments` - Cannot manage student enrolments
5. ❌ `/admin/bookings` - Cannot handle student bookings
6. ❌ `/admin/finance/invoices` - Cannot manage finances
7. ❌ `/admin/finance/payments` - Cannot track payments

### MEDIUM PRIORITY (Phase 2)
8. ❌ `/admin/enquiries` - Cannot track prospects
9. ❌ `/admin/accommodation/hosts` - Cannot manage accommodation
10. ❌ `/admin/certificates` - Cannot award certificates
11. ❌ `/admin/observations` - Cannot track teaching quality
12. ❌ `/admin/lesson-templates` - Cannot standardize lessons
13. ❌ `/admin/materials` - Cannot manage learning resources

### LOWER PRIORITY (Phase 3)
14. ❌ `/admin/cpd` - CPD tracking
15. ❌ `/admin/compliance/packs` - Evidence compilation
16. ❌ `/admin/backups` - Manual backup management
17. ❌ `/admin/communications/templates` - Email template management

---

## Recommended Implementation Order

### Sprint 1: Academic Foundation
- `/admin/programmes` (CRUD)
- `/admin/courses` (CRUD)
- `/admin/rooms` (CRUD)

### Sprint 2: Student Operations
- `/admin/enrolments` (list, view, manage)
- `/admin/bookings` (CRUD)
- `/admin/enquiries` (list, view, manage)

### Sprint 3: Finance
- `/admin/finance` (dashboard)
- `/admin/invoices` (CRUD)
- `/admin/payments` (list, record, reconcile)
- `/admin/reports/aging`

### Sprint 4: Student Lifecycle
- `/admin/students/[id]` (detailed profile)
- `/admin/students/[id]/letters` (issue letters)
- `/admin/certificates` (award, manage)

### Sprint 5: Accommodation
- `/admin/accommodation` (dashboard)
- `/admin/accommodation/hosts` (CRUD)
- `/admin/accommodation/placements` (CRUD)

### Sprint 6: Quality & Compliance
- `/admin/observations` (CRUD)
- `/admin/cpd` (assign, track)
- `/admin/compliance/packs` (generate)

### Sprint 7: Enhanced Features
- `/admin/lesson-templates` (CRUD)
- `/admin/materials` (library)
- `/admin/communications/bulk-email`
- `/admin/backups` (manual management)

---

## Next Steps

1. **Review with stakeholders** - Confirm priority order
2. **Database schema validation** - Ensure tables exist for new pages
3. **API endpoint creation** - Build required endpoints for each page
4. **Component library** - Standardize form/table components
5. **Navigation updates** - Update admin sidebar with new pages
6. **Role-based access** - Implement RLS policies for new pages
7. **Testing strategy** - Plan E2E tests for critical flows

---

## Notes

- Some functionality may exist in existing pages but not be obvious (e.g., teacher assignment in class edit)
- Many "view" resources from MCP spec are currently missing (hosts, placements, observations, etc.)
- Financial management is completely absent
- Academic programme structure is completely absent
- Student lifecycle beyond basic list is completely absent

