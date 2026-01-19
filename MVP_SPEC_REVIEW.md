# MyCastle MVP Specification Review

**Date:** 2026-01-16
**Status:** PRE-SHIPMENT REVIEW
**Target:** Admin-only MVP for managing student enrollments and teachers/staff
**Deadline:** End of day

---

## Executive Summary

**Current State:** 48% complete (29/60 tasks)
**MVP Focus:** Admin can manage day-to-day school operations (student population, enrollments, teachers/staff)
**Critical Gaps:** Teachers page, Attendance reports, Enrollment reports, Schema consistency fix

---

## Domain Model Clarification (CORRECTED 2026-01-16)

### Financial System (WORKING ✅)
- **Courses** (business.courses): Products students BUY (e.g., "Morning General English", "Intensive+IELTS")
  - Fixed duration for visa students, variable for non-visa
  - Pricing: pricePerWeekEur, hoursPerWeek
- **Bookings** (bookings table): Financial tracking of what student paid for
  - Start/end dates, total cost, payments received
  - Extensions and amendments tracked
- **Payments** (payments table): Payment history linked to bookings

### Academic System (PARTIAL ⚠️)
- **Classes** (academic.classes): Teaching groups led by teachers
  - Students placed based on assessments
  - Dynamic - students move week-to-week as they progress
  - Contains: teacher_id, schedule, capacity, level
- **Enrollments** (enrollments table): Student→class assignments
  - Tracks which class a student is currently in
  - Changes as students progress through levels
  - Performance tracking: attendance_rate, current_grade
- **Attendance** (attendance table): Per-session tracking
  - Status: present, absent, late, excused
  - Hash-chain verification for tamper detection

**KEY INSIGHT:** Bookings track FINANCIAL commitment, Enrollments track ACADEMIC placement.

---

## What's Built and Working

### Core Foundation ✅
| Feature | Status | UI | API | Database | Notes |
|---------|--------|----|----|----------|-------|
| Students | ✅ Complete | List, Create, Detail | Full CRUD | users + students tables | Working with visa tracking |
| Bookings | ✅ Complete | List, Create, View | Full CRUD | bookings table | Financial tracking complete |
| Payments | ✅ Complete | Record, View | POST | payments table | Triggers auto-calculate totals |
| Finance Dashboard | ✅ Complete | Dashboard, Reports | GET | Joins bookings+payments | Revenue charts, outstanding balances |
| Visa Tracking | ✅ Complete | Dashboard | GET | students.visa_expiry_date | Status badges, expiry monitoring |

### Academic Foundation ⚠️ PARTIAL
| Feature | Status | UI | API | Database | Notes |
|---------|--------|----|----|----------|-------|
| Classes | ✅ Built | List, Create, Edit, Detail | Full CRUD | academic.classes | Teacher assignments working |
| Enrollments | ✅ Built | List with stats | GET, POST | enrollments table | Student→class assignments |
| Attendance Marking | ✅ Built | List sessions, Mark attendance | GET, POST | attendance + class_sessions | Hash-chain verification |
| Teachers | ❌ Placeholder | Stub only | GET | users (role='teacher') | **BLOCKER** |
| Attendance Reports | ❌ Missing | None | None | attendance aggregations | **BLOCKER** |
| Enrollment Reports | ❌ Missing | None | None | enrollment aggregations | **BLOCKER** |

---

## MVP User Stories (Critical Path)

### Story 1: Manage Teachers ⚠️ INCOMPLETE
**As an** administrator
**I want to** view all teachers and their assigned classes
**So that** I can manage teaching assignments

**Acceptance Criteria:**
- [ ] View list of all teachers with contact info
- [ ] See count of assigned classes per teacher
- [ ] View which specific classes each teacher is assigned to
- [ ] Assign a teacher to a class
- [ ] Reassign a teacher (change classes.teacher_id)

**Current State:** Stub page at `/admin/teachers/page.tsx`
**Blocker:** No functional UI, API exists but unused

---

### Story 2: Track Class Attendance ✅ BUILT (Marking), ❌ MISSING (Reports)
**As an** administrator
**I want to** mark attendance and generate attendance reports
**So that** I can monitor student participation and compliance

**Acceptance Criteria:**
- [x] Mark attendance for a class session (present/absent/late/excused)
- [x] View list of class sessions with reporting status
- [ ] Generate class attendance summary report (aggregate stats)
- [ ] Generate student attendance report (individual rates)
- [ ] Filter reports by date range
- [ ] Identify at-risk students (<80% attendance)

**Current State:** Marking UI complete, reports missing
**Blocker:** No aggregated attendance reports for decision-making

---

### Story 3: Track Student Enrollments ✅ BUILT (List), ❌ MISSING (Reports)
**As an** administrator
**I want to** view class rosters and enrollment capacity
**So that** I can manage class sizes and student placements

**Acceptance Criteria:**
- [x] View list of all enrollments (student→class mappings)
- [ ] View class roster report (who's in each class)
- [ ] Track class capacity utilization
- [ ] View enrollment trends over time
- [ ] Identify classes at capacity
- [ ] See student enrollment history

**Current State:** Basic enrollment list exists, detailed reports missing
**Blocker:** Cannot easily answer "Who's in Class A2-Morning?" without manual inspection

---

## Critical Gaps Analysis

### Gap 1: Teachers Page (HIGH PRIORITY)
**Impact:** Cannot manage teacher assignments efficiently
**Effort:** 30-45 minutes
**Dependencies:** None - API already exists
**Risk:** Low - straightforward CRUD interface

**Requirements:**
1. List teachers with assigned class count
2. View assigned classes per teacher
3. Assign/reassign teacher to class dialog
4. Stats cards: Total Teachers, Active, Assigned, Unassigned

---

### Gap 2: Attendance Reports (HIGH PRIORITY)
**Impact:** Cannot monitor compliance or identify at-risk students
**Effort:** 30 minutes
**Dependencies:** Attendance data exists, need aggregation queries
**Risk:** Medium - complex SQL aggregations with JOINs

**Requirements:**
1. **Class Attendance Summary:**
   - Stats: Total Sessions, Avg Attendance Rate, Classes At Risk
   - Table: Class Name, Total Sessions, Present/Absent counts, Rate %
   - Date range filter (default: last 30 days)

2. **Student Attendance Report:**
   - Table: Student Name, Class, Sessions Scheduled/Attended/Missed, Rate %
   - Status badges: Good (>90%), At Risk (70-90%), Critical (<70%)
   - Filter by class and date range

---

### Gap 3: Enrollment Reports (HIGH PRIORITY)
**Impact:** Cannot manage class rosters or track capacity
**Effort:** 30 minutes
**Dependencies:** Enrollment data exists, need aggregation queries
**Risk:** Medium - complex SQL with ARRAY_AGG for rosters

**Requirements:**
1. **Class Roster Report:**
   - Stats: Total Classes, Total Enrolled, Avg Class Size, Classes at Capacity
   - Expandable rows: Click class → show full student roster
   - Table: Class Name, Level, Teacher, Enrolled/Capacity, Status

2. **Enrollment Capacity Tracking:**
   - Bar chart: Classes by capacity utilization %
   - Color coding: Red (>90%), Amber (75-90%), Green (<75%)

3. **Enrollment Trends:**
   - Line chart: Enrollments per week (last 12 weeks)
   - Stats: Total this month, completion rate, drop rate

---

### Gap 4: Schema Consistency (CRITICAL - BLOCKS EVERYTHING)
**Impact:** TypeScript errors prevent all development
**Effort:** 30-60 minutes
**Dependencies:** None
**Risk:** HIGH - Breaking change affects all code

**Problem:** Schema naming inconsistency:
- `core.ts` / `business.ts`: camelCase (tenantId, createdAt)
- `academic.ts`: snake_case (tenant_id, created_at)

**Solution Options:**
1. **Option A:** Convert academic.ts to camelCase (RECOMMENDED)
   - Pro: Matches existing codebase convention
   - Con: Must update database schema migration
   - Effort: 30-60 minutes

2. **Option B:** Convert all to snake_case
   - Pro: Matches SQL convention
   - Con: Breaks all existing code (students, bookings, finance)
   - Effort: 3-4 hours (NOT VIABLE)

3. **Option C:** Keep academic.ts commented out, import directly
   - Pro: No changes needed
   - Con: Dangerous anti-pattern, inconsistent imports
   - Effort: 0 minutes (CURRENT STATE)

**Recommendation:** Option A - Convert academic.ts to camelCase

---

## Remaining Tasks to MVP

### Phase 1: Fix Schema Consistency (30-60 minutes)
1. Convert academic.ts schema from snake_case to camelCase
2. Update database migration to match
3. Verify TypeScript compilation
4. Test existing pages (classes, enrollments, attendance)

### Phase 2: Build Teachers Page (30-45 minutes)
1. Teacher list query with assigned class count
2. Teacher list UI with stats cards
3. View assigned classes component
4. Assign teacher to class dialog

### Phase 3: Build Attendance Reports (30 minutes)
1. Class attendance summary report
2. Student attendance report
3. Date range filtering
4. Status badges and at-risk identification

### Phase 4: Build Enrollment Reports (30 minutes)
1. Class roster report with expandable rows
2. Enrollment capacity tracking visual
3. Enrollment trends chart

### Phase 5: Update Navigation & Docs (10 minutes)
1. Add report links to finance dashboard
2. Update STATUS.md with completed tasks
3. Verify all inter-page links work

### Phase 6: Quality Checks (15 minutes)
1. Format, lint, test, type-check, build
2. End-to-end testing of user flows
3. RLS context verification

**Total Estimated Time:** 2.5-3 hours

---

## Post-MVP Deferred Features

Items explicitly OUT OF SCOPE for today's MVP:
- ❌ Programmes/academic courses UI (curriculum structure)
- ❌ Teacher credentials/qualifications tracking
- ❌ Enrollment amendments UI
- ❌ Automated visa alerts (shelved - see tidy.md)
- ❌ Payment reports page
- ❌ Export to CSV functionality (placeholders OK)
- ❌ Student portal
- ❌ Teacher portal enhancements
- ❌ ETL loader for bulk data import

---

## Success Criteria for MVP Ship

### Functional Requirements (Must Have)
- [x] Admin can manage students (list, create, view details)
- [x] Admin can manage bookings (financial tracking)
- [x] Admin can record payments
- [x] Admin can track visa expiry
- [ ] Admin can view all teachers and their assigned classes
- [ ] Admin can assign/reassign teachers to classes
- [x] Admin can mark attendance for class sessions
- [ ] Admin can generate attendance reports (class + student level)
- [x] Admin can view enrollment list
- [ ] Admin can generate enrollment reports (roster + capacity)
- [ ] All reports support date range filtering

### Technical Requirements (Must Have)
- [ ] Schema exports fixed (academic.ts camelCase consistent)
- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings
- [ ] Code formatted with Prettier
- [ ] RLS context set for all database queries
- [ ] Build succeeds (`npm run build`)

### Documentation Requirements (Must Have)
- [ ] STATUS.md updated with completed tasks
- [ ] Progress percentage updated (29/60 → 33/60 = 55%)
- [ ] Recent wins section updated
- [ ] Navigation structure verified

---

## Risk Assessment

### High Risks
1. **Schema conversion breaks existing pages** (Mitigation: Test thoroughly after conversion)
2. **Complex SQL aggregations have performance issues** (Mitigation: Add indexes if needed)
3. **Time constraint - 3 hours for 2.5-3 hour estimate** (Mitigation: Defer quality polish if needed)

### Medium Risks
1. **RLS context not set correctly in new reports** (Mitigation: Copy pattern from existing pages)
2. **Date range filters don't work correctly** (Mitigation: Test with multiple date ranges)

### Low Risks
1. **Teachers page straightforward CRUD** (API already exists)
2. **Navigation links straightforward** (Copy existing patterns)

---

## Next Steps

1. **DECISION REQUIRED:** Proceed with schema conversion (Option A) or keep current direct import pattern (Option C)?
2. If Option A: Convert academic.ts to camelCase, update migration
3. If Option C: Skip schema fix, proceed with teachers/reports using direct imports
4. Build teachers page
5. Build attendance reports
6. Build enrollment reports
7. Update navigation and STATUS.md
8. Quality checks and ship

**Estimated completion:** 3 hours from now (ETA: ~4-5pm depending on start time)

---

## Appendix: Database Schema Status

### Active Tables (Exported from schema/index.ts)
- ✅ users (core.ts) - camelCase
- ✅ students (core.ts) - camelCase
- ✅ bookings (business.ts) - camelCase
- ✅ payments (business.ts) - camelCase
- ✅ courses (business.ts) - camelCase
- ✅ agencies (business.ts) - camelCase

### Academic Tables (COMMENTED OUT - direct imports used)
- ⚠️ classes (academic.ts) - snake_case
- ⚠️ enrollments (academic.ts) - snake_case
- ⚠️ attendance (academic.ts) - snake_case
- ⚠️ classSessions (academic.ts) - snake_case

### Missing Exports (Breaking MCP servers)
- ❌ invoices - Not defined anywhere
- ❌ auditLogs - Not defined in exported schemas
- ❌ lessonPlans - Not defined anywhere

**Critical Issue:** MCP servers expect snake_case and tables that don't exist in current schema.
