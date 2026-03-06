# Student Profile Feature - Implementation Roadmap

**Created:** 2026-03-02
**Updated:** 2026-03-06
**Status:** IN_PROGRESS
**Completed:** 25/26 tasks (96%) - Phase 3 nearly complete

**Reference:** See `STUDENT_PROFILE_DISCOVERY.md` for full requirements

---

## Current Status

### Completed Tasks (Phase 1)

| Task | Description                                         | Commit  |
| ---- | --------------------------------------------------- | ------- |
| #1   | Database schema extensions (6 tables, RLS policies) | 35ae915 |
| #2   | RLS policies for profile access control             | 35ae915 |
| #3   | Admin/Owner profile view (full unrestricted)        | 35ae915 |
| #7   | CEFR competency assessment system                   | 35ae915 |
| #11  | Competency assessment API routes (CRUD)             | 35ae915 |
| #12  | Progress calculation API route                      | 35ae915 |
| #13  | Assessment entry form component                     | 35ae915 |
| #14  | Wire up CompetencyProgressTab                       | 35ae915 |
| #15  | Wire up LevelHistoryTab                             | 35ae915 |
| #16  | Wire up EnhancedNotesTab                            | 35ae915 |
| #17  | Wire up AuditTrailTab                               | 35ae915 |
| #18  | Schema Updates (FRESH_0028) - Phase 2A              | 7482ce7 |
| #19  | CEFR Descriptor Importer (File A + B)               | 7482ce7 |
| #21  | Learning Objectives UI (Phase 2B)                   | 28688cd |
| #22  | Update Assessment Form (Phase 2B)                   | 874ca45 |
| #23  | Summative Assessment UI (Phase 2B)                  | 463b679 |
| #4   | Teacher Profile View (Phase 2C)                     | d25394a |
| #6   | DoS Hybrid View (Phase 2C)                          | b85f4be |
| #8   | Level Promotion Workflow (Phase 2C)                 | 463b679 |
| #9   | Contact Verification System (Phase 2D)              | 463b679 |
| #5   | Student Self-View (Phase 2D)                        | 463b679 |
| #10  | LLM Tutor Architecture Hooks (Phase 2E)             | pending |

### What's Built

**Database Layer:**

- `student_profile_sensitive` - PII storage (contact, visa, address)
- `student_notes` - Teacher notes with visibility controls
- `level_promotions` - Promotion request workflow
- `diagnostic_sessions` - Placement test tracking
- `competency_assessments` - Individual CEFR assessments
- `competency_progress` - Denormalized progress aggregation

**API Routes (8 endpoints):**

- `/api/admin/students/[id]/assessments` - CRUD for assessments
- `/api/admin/students/[id]/progress` - Aggregated skill progress
- `/api/admin/students/[id]/notes` - Notes CRUD
- `/api/admin/students/[id]/notes/[noteId]/share` - Share with student
- `/api/admin/students/[id]/level-history` - Promotion history
- `/api/admin/students/[id]/diagnostics` - Diagnostic sessions
- `/api/admin/students/[id]/audit` - Full audit trail

**Components:**

- `LevelHistoryTab` - Current level, promotions, diagnostics
- `CompetencyProgressTab` - Skill progress with gaps by category
- `EnhancedNotesTab` - Notes with visibility, create/share
- `AuditTrailTab` - Timeline of profile changes
- `AssessmentForm` - Record CEFR assessments
- `LearningObjectiveSelector` - Session learning objectives (CEFR/textbook/custom)
- `TeacherStudentProfile` - Teacher-specific student profile view
- `DoSStudentProfile` - DoS-specific student profile with promotion approval
- `PromotionReviewList` - Promotion review interface with evidence display

**API Routes (16 endpoints):**

- `/api/admin/sessions/[sessionId]/objectives` - Session learning objectives CRUD
- `/api/teacher/students` - List students in teacher's classes
- `/api/teacher/students/[id]` - Teacher student profile
- `/api/dos/students` - List all students (org-wide for DoS)
- `/api/dos/students/[id]` - DoS student profile with promotion data
- `/api/student/profile` - Student's own profile (GET)
- `/api/student/profile/update` - Update profile (name/avatar)
- `/api/student/assessments` - Shared assessments (GET)
- `/api/student/notes` - Shared notes (GET)

**Student Components:**

- `StudentProfilePage` - Mobile-first student profile with tabs
- `VerificationCodeInput` - 6-digit code input
- `ContactChangeForm` - Email/phone verification flow
- `PendingVerificationBadge` - Verification status badges

---

## Remaining Tasks (1)

### Phase 2A: Schema & Data (Discovery-driven) ✅ COMPLETE

#### Task #18: Schema Updates (FRESH_0028) ✅ COMPLETE

**Estimate:** 1-2 hours | **Dependencies:** None | **Token budget:** ~30k
**Priority:** HIGH - Blocks #19, #20, #21
**Completed:** 2026-03-02

**What was done:**

1. Created FRESH_0028_student_profile_phase2.sql migration
2. Added 5 new tables: `coursebooks`, `coursebook_descriptors`, `session_learning_objectives`, `summative_assessments`, `summative_assessment_types`
3. Updated `cefr_descriptors` with 10 new File A columns (source_index, activity_strategy_competence, competencies, strategies, mode, skill_focus, is_overall, scale, young_learners_7_10, young_learners_11_15)
4. Updated `competency_assessments` with 6 new columns (progress, demonstrated_level, is_complete, learning_objective_id, session_id, is_shared_with_student)
5. Updated `classes` with `primary_coursebook_id`
6. Updated `tenants` with `profile_settings` JSONB
7. Created RLS policies for all 5 new tables
8. Updated Drizzle schemas (curriculum.ts, profile.ts, academic.ts, core.ts)
9. All tests passing, TypeScript clean

**Acceptance Criteria:**

- [x] All new tables created with proper constraints
- [x] RLS policies enforce tenant isolation
- [x] Migration file created (FRESH_0028)
- [x] Drizzle schema updated and types generated

---

#### Task #19: CEFR Descriptor Importer (File A)

**Estimate:** 2-3 hours | **Dependencies:** #18 | **Token budget:** ~40k

**Subtasks:**

1. Create spreadsheet parser for File A format (45 min)
2. Create admin UI for uploading CEFR spreadsheet (30 min)
3. Create API endpoint for import processing (30 min)
4. Add validation for required columns (20 min)
5. Create seed script for Castleforbes CEFR data (30 min)

**Acceptance Criteria:**

- [ ] Can upload Excel/CSV with File A structure
- [ ] Validates all required columns present
- [ ] Creates/updates cefr_descriptors records
- [ ] Shows import summary (rows processed, errors)
- [ ] Handles duplicate detection (by source_index)

---

#### Task #20: Coursebook Importer (File B)

**Estimate:** 2 hours | **Dependencies:** #18 | **Token budget:** ~35k

**Subtasks:**

1. Create spreadsheet parser for File B format (30 min)
2. Handle multi-worksheet files (one sheet per book) (30 min)
3. Create admin UI for coursebook upload (30 min)
4. Create/update coursebook + descriptors in transaction (20 min)
5. Optional: LLM-assisted matching to CEFR descriptors (30 min)

**Acceptance Criteria:**

- [ ] Can upload multi-worksheet Excel file
- [ ] Each worksheet creates a coursebook record
- [ ] All rows become coursebook_descriptors
- [ ] Can re-import to update existing coursebook
- [ ] LLM matching is configurable (off by default)

---

### Phase 2B: Teacher Workflow

#### Task #21: Learning Objectives UI ✅ COMPLETE

**Estimate:** 2-3 hours | **Dependencies:** #18, #19, #20 | **Token budget:** ~45k
**Completed:** 2026-03-03

**What was done:**

1. ✅ Created `LearningObjectiveSelector` component with 3 tabs (CEFR, Textbook, Custom)
2. ✅ Created session planning page at `/admin/classes/[id]/sessions/[sessionId]`
3. ✅ Level filtering (current ± 1 adjacent levels), skill filtering, search
4. ✅ Primary (max 2) and secondary (max 6) objectives with soft limits
5. ✅ Page references shown for textbook descriptors
6. ✅ API route: GET/PUT `/api/admin/sessions/[sessionId]/objectives`
7. ✅ Updated class detail page with "Upcoming Sessions" section

**Acceptance Criteria:**

- [x] Teacher can select descriptors for each session
- [x] Filtered by appropriate level range
- [x] Primary/secondary distinction enforced
- [x] Shows coursebook page references when available
- [x] Soft limits enforced (2 primary, 6 secondary)

---

#### Task #22: Update Assessment Form ✅ COMPLETE

**Estimate:** 1-2 hours | **Dependencies:** #18 | **Token budget:** ~30k
**Completed:** 2026-03-03

**What was done:**

1. ✅ Added `demonstratedLevel` dropdown (CEFR A1-C2)
2. ✅ Added `isComplete` checkbox (auto-checks on "Achieved")
3. ✅ Updated progress scale: Not Yet / Emerging / Developing / Achieved
4. ✅ Added `sessionId` prop for learning objective context
5. ✅ Added `isSharedWithStudent` visibility toggle
6. ✅ Updated API route to accept/return all new fields
7. ✅ Added validation for progress values and CEFR levels

**Acceptance Criteria:**

- [x] Can record demonstrated level different from descriptor level
- [x] Can mark descriptor as complete (achieved)
- [x] Progress scale matches requirements
- [x] Assessment links to session objective when applicable

---

#### Task #23: Summative Assessment UI

**Estimate:** 2 hours | **Dependencies:** #18 | **Token budget:** ~35k

**Subtasks:**

1. Create summative assessment types admin page (30 min)
2. Create `SummativeAssessmentForm` component (30 min)
3. Add summative assessments tab to student profile (30 min)
4. Create API routes for summative CRUD (30 min)

**Acceptance Criteria:**

- [ ] Schools can define assessment types (End of Unit, Mid-Term, etc.)
- [ ] Can record percentage scores per student
- [ ] Summative scores visible in student profile
- [ ] Scores included in promotion evidence

---

### Phase 2C: Role-Specific Views

#### Task #4: Teacher Profile View ✅ COMPLETE

**Estimate:** 2-3 hours | **Dependencies:** #21 ✅, #22 ✅ | **Token budget:** ~40k
**Completed:** 2026-03-03

**What was done:**

1. ✅ Created TeacherStudentProfile component with tabs (Overview, Progress, Notes, Attendance, Level History)
2. ✅ Created class-scope utilities: `canTeacherAccessStudent()`, `getAccessibleStudentIds()`, `getSharedClasses()`
3. ✅ Created teacher API routes: `/api/teacher/students/[id]/{route, notes, progress, assessments}`
4. ✅ Adapted existing tabs with `isTeacher=true` and `canViewSensitiveNotes=false` props
5. ✅ Created `/teacher/students` list page and `/teacher/students/[id]` detail page

**Acceptance Criteria:**

- [x] Teachers see only students in their current classes
- [x] No access to sensitive PII (contact, visa, address)
- [x] Can view competency progress and skill gaps
- [x] Can add notes (general, academic, behavioral - not medical/pastoral)
- [x] Cannot see audit trail

---

#### Task #8: Level Promotion Workflow

**Estimate:** 2-3 hours | **Dependencies:** #23 | **Token budget:** ~40k

**Subtasks:**

1. Create promotion request form with evidence summary (45 min)
2. Create promotion request API (30 min)
3. Create promotion review API with summative scores (30 min)
4. Create notification triggers (30 min)
5. Add promotion history to LevelHistoryTab (30 min)

**Acceptance Criteria:**

- [ ] Teachers can request promotions with minimal friction
- [ ] System auto-suggests when threshold reached (configurable, default 90%)
- [ ] DoS sees: recommendation + summative scores + stats
- [ ] DoS can approve/reject with notes
- [ ] Student level updates on approval

---

#### Task #6: DoS Hybrid View ✅ COMPLETE

**Estimate:** 2-3 hours | **Dependencies:** #4 ✅, #8 | **Token budget:** ~40k
**Completed:** 2026-03-03

**What was done:**

1. ✅ Added 'dos' and 'assistant_dos' to UserRole type (`lib/auth/types.ts`)
2. ✅ Created DoS students API routes (`/api/dos/students`, `/api/dos/students/[id]`)
3. ✅ Created DoS dashboard page (`/dos/dashboard`) with promotion stats, student breakdown
4. ✅ Created DoS students list page (`/dos/students`) with filtering and promotion status
5. ✅ Created DoSStudentProfile component with promotion approval inline
6. ✅ Created DoS student detail page (`/dos/students/[id]`)
7. ✅ PromotionReviewList component already existed with full functionality

**Acceptance Criteria:**

- [x] DoS can access ALL student profiles (org-wide)
- [x] Can review and approve/reject promotions
- [x] Can see accumulated assessment evidence + summative scores
- [x] Has all teacher capabilities
- [x] Pending promotions prominently visible

---

### Phase 2D: Student & Verification

#### Task #9: Contact Verification System ✅ COMPLETE

**Estimate:** 2-3 hours | **Dependencies:** None | **Token budget:** ~40k
**Completed:** 2026-03-03

**What was done:**

1. ✅ Created verification utility library (`lib/verification/index.ts`)
   - 6-digit secure code generation
   - 24-hour expiry with automatic cleanup
   - Max 5 attempts per code
   - 2-minute cooldown between requests
2. ✅ Created API routes (`/api/student/verify/`)
   - POST /request - Request verification code
   - POST /confirm - Verify code and update contact
   - GET /pending - List pending verifications
   - POST /[id]/cancel - Cancel pending verification
3. ✅ Created UI components (`components/student/`)
   - VerificationCodeInput - 6-digit input with paste support
   - ContactChangeForm - Full verification flow UI
   - PendingVerificationBadge - "Awaiting verification" badges

**Acceptance Criteria:**

- [x] Email/phone changes require verification code
- [x] Codes expire after 24 hours
- [x] Student notified of expiry (countdown in UI)
- [x] Pending changes show "awaiting verification" badge
- [x] Audit log records verification attempts (attempts column)

---

#### Task #5: Student Self-View ✅ COMPLETE

**Estimate:** 3-4 hours | **Dependencies:** #9 ✅ | **Token budget:** ~50k
**Completed:** 2026-03-03

**What was done:**

1. ✅ Created student profile API routes (`/api/student/profile`, `/api/student/profile/update`)
2. ✅ Created student assessments API (`/api/student/assessments`) - only shared assessments
3. ✅ Created student notes API (`/api/student/notes`) - only shared notes
4. ✅ Created StudentProfilePage component with mobile-first tabs (Overview, Progress, Assessments, Notes, History)
5. ✅ Integrated ContactChangeForm for email/phone verification flow
6. ✅ Created student profile page at `/student/profile`
7. ✅ Level journey timeline visualization with diagnostic history

**Acceptance Criteria:**

- [x] Students can only view their own profile
- [x] Can edit email/phone with verification flow
- [x] Can see only explicitly shared notes/assessments
- [x] Can see diagnostic history and level progression
- [x] Mobile-first UI with proper touch targets

---

### Phase 2E: Future Hooks ✅ COMPLETE

#### Task #10: LLM Tutor Architecture Hooks ✅ COMPLETE

**Estimate:** 1-2 hours | **Dependencies:** None | **Token budget:** ~25k
**Completed:** 2026-03-03

**What was done:**

1. ✅ AI Tutor tab already existed in StudentProfilePage with "Coming Soon" UI (lines 741-847)
2. ✅ Created `spec/STUDENT_MCP_SPEC.md` documenting future MCP design (10 tool signatures)
3. ✅ Database tables already existed in FRESH_0027 and FRESH_0032 migrations:
   - `exercise_attempts`, `vocab_lists`, `tutor_interactions` (FRESH_0027)
   - `tutor_sessions`, `tutor_messages`, `student_vocabulary`, `exercise_templates` (FRESH_0032)
4. ✅ Created `/api/student/tutor-context` API endpoint exposing:
   - Student profile (name, levels, member since)
   - Current class info
   - Competency progress and skill breakdown
   - Recent assessments and gaps
   - Vocabulary stats
   - Current learning objectives

**Acceptance Criteria:**

- [x] Student nav has placeholder for future tutor
- [x] Database tables exist for exercise/vocab/tutor data
- [x] Profile data accessible for LLM consumption
- [x] No actual LLM integration (hooks only)

---

### Phase 3: Discovery Session Tasks (2026-03-05)

These tasks were identified during the discovery session to clarify remaining blockers.

#### Task #24: Diagnostic Test Input Form ✅ COMPLETE

**Estimate:** 2-3 hours | **Dependencies:** None | **Token budget:** ~35k
**Priority:** HIGH - Core placement workflow
**Completed:** 2026-03-06

**What was done:**
1. ✅ Created `/admin/students/[id]/diagnostic` page with RLS context setup
2. ✅ Created DiagnosticInputForm component with 4 sections (Written Test, Oral Test, Level Recommendation, Provisional Placement)
3. ✅ Extended API route with POST (create) and PUT (update) handlers
4. ✅ Provisional enrollment created via `expectedEndDate` set to 1 week
5. ✅ Added "New Diagnostic" button to LevelHistoryTab in student profile

**Acceptance Criteria:**
- [x] Admin can input written test results
- [x] DoS can add oral test results and level recommendation
- [x] Provisional enrollment created in recommended class
- [x] Diagnostic history visible on student profile
- [x] DoS can finalize placement after first week

---

#### Task #25: Textbook Selection for Tenants ✅ COMPLETE

**Estimate:** 1-2 hours | **Dependencies:** None | **Token budget:** ~25k
**Priority:** MEDIUM - Affects descriptor filtering
**Completed:** 2026-03-06

**What was done:**
1. ✅ Created FRESH_0034_textbook_selection.sql migration adding `active_textbooks` JSONB column
2. ✅ Updated Drizzle schema in core.ts with `activeTextbooks` field
3. ✅ Created `/api/admin/settings/curriculum` API route (GET/PUT)
4. ✅ Created TextbookSelector component with grid of toggleable textbook cards
5. ✅ Created curriculum settings page at `/admin/settings/curriculum`
6. ✅ Updated `/api/admin/curriculum/textbook` with `filterByTenant=true` query param
7. ✅ Updated LearningObjectiveSelector to use tenant-filtered textbooks

**Acceptance Criteria:**
- [x] Admin can select active textbook series in settings
- [x] Learning Objectives selector only shows descriptors from active textbooks
- [x] CEFR Browser textbook tab filters by active selection
- [x] Changes persist and apply immediately
- [x] Default behavior unchanged for existing tenants (NULL = all active)

---

#### Task #26: Custom Descriptors for Schools

**Estimate:** 2-3 hours | **Dependencies:** #25 | **Token budget:** ~40k
**Priority:** MEDIUM - School-specific learning objectives

**Implementation:**
- Create `custom_descriptors` table (tenant-scoped)
- RLS policies: tenant isolation, admin CRUD, teachers read-only
- Create `/admin/settings/custom-descriptors` page
- Update Learning Objectives selector to include custom descriptors

**Database Migration:**
- FRESH_0034_custom_descriptors.sql
- Table: id, tenant_id, cefr_level, skill, descriptor_text, created_by, created_at, is_active
- RLS policies for multi-tenant security

**Subtasks:**
1. Create FRESH_0034 migration with table + RLS (30 min)
2. Update Drizzle schema (15 min)
3. Create CustomDescriptorManager component (45 min)
4. Create settings page at `/admin/settings/custom-descriptors` (30 min)
5. Update Learning Objectives selector with custom tab (30 min)

**Acceptance Criteria:**
- [ ] Admin can create custom learning objectives
- [ ] Custom descriptors appear in Learning Objectives selector
- [ ] Custom descriptors visually distinguished from official CEFR
- [ ] Teachers can use custom descriptors in assessments
- [ ] Custom descriptors scoped to tenant (not visible to other schools)
- [ ] Official CEFR descriptors remain read-only

---

## Dependency Graph

```
Phase 2A: Schema & Data ✅ COMPLETE
#18 Schema Updates ──┬──▶ #19 CEFR Importer
                     ├──▶ #20 Coursebook Importer
                     ├──▶ #22 Update Assessment Form
                     └──▶ #23 Summative Assessment UI

Phase 2B: Teacher Workflow ✅ COMPLETE
#19, #20, #18 ──▶ #21 Learning Objectives UI

Phase 2C: Role Views ✅ COMPLETE
#21, #22 ──▶ #4 Teacher View ──┐
#23 ──────▶ #8 Promotion ──────┼──▶ #6 DoS View
                               │
Phase 2D: Student ✅ COMPLETE
#9 Verification ───────────────┴──▶ #5 Student Self-View

Phase 2E: Future (independent) ✅ COMPLETE
#10 LLM Hooks

Phase 3: Discovery Session Tasks (NEW)
#24 Diagnostic Input ──▶ (independent)
#25 Textbook Selection ──▶ #26 Custom Descriptors
```

---

## Recommended Implementation Order

### Phase 1-2 (COMPLETE)

| Order | Task                        | Estimate | Status      |
| ----- | --------------------------- | -------- | ----------- |
| 1     | #18 Schema Updates          | 1-2h     | ✅ Complete |
| 2     | #19 CEFR Importer           | 2-3h     | ✅ Complete |
| 3     | #20 Coursebook Importer     | 2h       | ✅ Complete |
| 4     | #22 Update Assessment Form  | 1-2h     | ✅ Complete |
| 5     | #23 Summative Assessment UI | 2h       | ✅ Complete |
| 6     | #21 Learning Objectives UI  | 2-3h     | ✅ Complete |
| 7     | #9 Contact Verification     | 2-3h     | ✅ Complete |
| 8     | #4 Teacher Profile View     | 2-3h     | ✅ Complete |
| 9     | #8 Promotion Workflow       | 2-3h     | ✅ Complete |
| 10    | #6 DoS Hybrid View          | 2-3h     | ✅ Complete |
| 11    | #5 Student Self-View        | 3-4h     | ✅ Complete |
| 12    | #10 LLM Tutor Hooks         | 1-2h     | ✅ Complete |

### Phase 3 (Discovery Session - NEW)

| Order | Task                       | Estimate | Status      |
| ----- | -------------------------- | -------- | ----------- |
| 13    | #24 Diagnostic Input Form  | 2-3h     | ✅ Complete |
| 14    | #25 Textbook Selection     | 1-2h     | ✅ Complete |
| 15    | #26 Custom Descriptors     | 2-3h     | Pending     |

**Total Remaining:** ~2-3 hours (1 task)

---

## Files Created This Sprint

```
app/
├── migrations/
│   ├── FRESH_0027_student_profile_feature.sql
│   └── FRESH_0028_student_profile_phase2.sql  # NEW - Phase 2A schema
├── src/
│   ├── app/api/admin/students/[id]/
│   │   ├── assessments/
│   │   │   ├── route.ts
│   │   │   └── [assessmentId]/route.ts
│   │   ├── progress/route.ts
│   │   ├── notes/
│   │   │   ├── route.ts
│   │   │   └── [noteId]/share/route.ts
│   │   ├── level-history/route.ts
│   │   ├── diagnostics/route.ts
│   │   └── audit/route.ts
│   ├── app/api/dos/students/
│   │   ├── route.ts                  # NEW - DoS student list (org-wide)
│   │   └── [id]/route.ts             # NEW - DoS student detail
│   ├── app/api/teacher/students/
│   │   ├── route.ts                  # NEW - Teacher student list (class-scoped)
│   │   └── [id]/
│   │       ├── route.ts              # NEW - Teacher student detail
│   │       ├── notes/route.ts        # NEW - Teacher notes
│   │       ├── progress/route.ts     # NEW - Teacher progress view
│   │       └── assessments/route.ts  # NEW - Teacher assessments
│   ├── app/dos/
│   │   ├── dashboard/page.tsx        # NEW - DoS dashboard
│   │   └── students/
│   │       ├── page.tsx              # NEW - DoS students list
│   │       └── [id]/page.tsx         # NEW - DoS student detail page
│   ├── app/teacher/students/
│   │   ├── page.tsx                  # NEW - Teacher students list
│   │   └── [id]/page.tsx             # NEW - Teacher student detail page
│   ├── app/student/profile/
│   │   └── page.tsx                  # NEW - Student self-view page
│   ├── app/api/student/
│   │   ├── profile/
│   │   │   ├── route.ts              # NEW - Student profile GET
│   │   │   └── update/route.ts       # NEW - Student profile update
│   │   ├── assessments/route.ts      # NEW - Shared assessments
│   │   ├── notes/route.ts            # NEW - Shared notes
│   │   └── verify/
│   │       ├── request/route.ts      # NEW - Request verification
│   │       ├── confirm/route.ts      # NEW - Confirm verification
│   │       ├── pending/route.ts      # NEW - List pending
│   │       └── [id]/cancel/route.ts  # NEW - Cancel verification
│   ├── components/admin/students/
│   │   ├── tabs/
│   │   │   ├── LevelHistoryTab.tsx
│   │   │   ├── CompetencyProgressTab.tsx
│   │   │   ├── EnhancedNotesTab.tsx
│   │   │   ├── AuditTrailTab.tsx
│   │   │   └── index.ts
│   │   ├── AssessmentForm.tsx
│   │   └── promotions/
│   │       └── PromotionReviewList.tsx
│   ├── components/teacher/
│   │   ├── TeacherStudentProfile.tsx # NEW - Teacher profile component
│   │   └── index.ts
│   ├── components/dos/
│   │   ├── DoSStudentProfile.tsx     # NEW - DoS profile component
│   │   └── index.ts
│   ├── components/student/
│   │   ├── StudentProfilePage.tsx    # NEW - Student self-view component
│   │   ├── VerificationCodeInput.tsx # NEW - 6-digit code input
│   │   ├── ContactChangeForm.tsx     # NEW - Email/phone verification
│   │   ├── PendingVerificationBadge.tsx # NEW - Verification badges
│   │   └── index.ts
│   ├── lib/verification/
│   │   └── index.ts                  # NEW - Verification utilities
│   ├── lib/teachers/
│   │   ├── canAccessStudent.ts       # NEW - Teacher access control utilities
│   │   └── index.ts
│   ├── db/schema/
│   │   ├── profile.ts     # UPDATED - Added coursebooks, summative assessments, session objectives
│   │   ├── curriculum.ts  # UPDATED - Added File A columns to cefr_descriptors
│   │   ├── academic.ts    # UPDATED - Added primaryCoursebookId to classes
│   │   └── core.ts        # UPDATED - Added profileSettings to tenants
│   └── hooks/
│       └── useCompetencyAssessments.ts

Documentation/
├── STUDENT_PROFILE_ROADMAP.md (this file)
└── STUDENT_PROFILE_DISCOVERY.md (requirements)
```
