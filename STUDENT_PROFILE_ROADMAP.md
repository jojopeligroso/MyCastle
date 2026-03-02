# Student Profile Feature - Implementation Roadmap

**Created:** 2026-03-02
**Updated:** 2026-03-02
**Status:** Discovery Complete - Ready for Implementation
**Completed:** 11/23 tasks (48%)

**Reference:** See `STUDENT_PROFILE_DISCOVERY.md` for full requirements

---

## Current Status

### Completed Tasks (Phase 1)

| Task | Description | Commit |
|------|-------------|--------|
| #1 | Database schema extensions (6 tables, RLS policies) | 35ae915 |
| #2 | RLS policies for profile access control | 35ae915 |
| #3 | Admin/Owner profile view (full unrestricted) | 35ae915 |
| #7 | CEFR competency assessment system | 35ae915 |
| #11 | Competency assessment API routes (CRUD) | 35ae915 |
| #12 | Progress calculation API route | 35ae915 |
| #13 | Assessment entry form component | 35ae915 |
| #14 | Wire up CompetencyProgressTab | 35ae915 |
| #15 | Wire up LevelHistoryTab | 35ae915 |
| #16 | Wire up EnhancedNotesTab | 35ae915 |
| #17 | Wire up AuditTrailTab | 35ae915 |

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

---

## Remaining Tasks (12)

### Phase 2A: Schema & Data (Discovery-driven)

#### Task #18: Schema Updates (FRESH_0028)
**Estimate:** 1-2 hours | **Dependencies:** None | **Token budget:** ~30k
**Priority:** HIGH - Blocks #19, #20, #21

**Subtasks:**
1. Add new tables: `coursebooks`, `coursebook_descriptors`, `session_learning_objectives`, `summative_assessments`, `summative_assessment_types` (30 min)
2. Update `cefr_descriptors` with full File A structure (20 min)
3. Update `competency_assessments` with `demonstrated_level`, `is_complete`, `learning_objective_id` (15 min)
4. Update `classes` with `primary_coursebook_id` (10 min)
5. Add tenant profile settings JSONB column (10 min)
6. Create RLS policies for new tables (20 min)

**Acceptance Criteria:**
- [ ] All new tables created with proper constraints
- [ ] RLS policies enforce tenant isolation
- [ ] Migration runs without errors
- [ ] Drizzle schema updated and types generated

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

#### Task #21: Learning Objectives UI
**Estimate:** 2-3 hours | **Dependencies:** #18, #19, #20 | **Token budget:** ~45k

**Subtasks:**
1. Create `LearningObjectiveSelector` component (45 min)
2. Add to class session planning view (30 min)
3. Filter descriptors by class level range (20 min)
4. Support primary (max 2) and secondary (max 6) objectives (30 min)
5. Show coursebook suggestions based on class's primary book (30 min)

**Acceptance Criteria:**
- [ ] Teacher can select descriptors for each session
- [ ] Filtered by appropriate level range
- [ ] Primary/secondary distinction enforced
- [ ] Shows coursebook page references when available
- [ ] Soft limits enforced (2 primary, 6 secondary)

---

#### Task #22: Update Assessment Form
**Estimate:** 1-2 hours | **Dependencies:** #18 | **Token budget:** ~30k

**Subtasks:**
1. Add `demonstrated_level` dropdown (15 min)
2. Add `is_complete` checkbox/toggle (15 min)
3. Update progress scale to match discovery (Not yet/Emerging/Developing/Achieved) (20 min)
4. Link assessment to learning objective if in session context (20 min)
5. Add visibility toggle for sharing with student (15 min)

**Acceptance Criteria:**
- [ ] Can record demonstrated level different from descriptor level
- [ ] Can mark descriptor as complete (achieved)
- [ ] Progress scale matches requirements
- [ ] Assessment links to session objective when applicable

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

#### Task #4: Teacher Profile View
**Estimate:** 2-3 hours | **Dependencies:** #21, #22 | **Token budget:** ~40k

**Subtasks:**
1. Create TeacherStudentProfile component (45 min)
2. Create class-scope middleware/hook (30 min)
3. Create teacher-specific API routes (45 min)
4. Adapt existing tabs for teacher context (30 min)
5. Add teacher route/page (30 min)

**Acceptance Criteria:**
- [ ] Teachers see only students in their current classes
- [ ] No access to sensitive PII (contact, visa, address)
- [ ] Can view competency progress and skill gaps
- [ ] Can add notes (private or shareable)
- [ ] Cannot see audit trail

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

#### Task #6: DoS Hybrid View
**Estimate:** 2-3 hours | **Dependencies:** #4, #8 | **Token budget:** ~40k

**Subtasks:**
1. Create DoS dashboard component (45 min)
2. Create promotion review interface with evidence (45 min)
3. Create DoS-specific API routes (30 min)
4. Adapt existing tabs for DoS context (30 min)
5. Add Assistant DoS role support (30 min)

**Acceptance Criteria:**
- [ ] DoS can access ALL student profiles (org-wide)
- [ ] Can review and approve/reject promotions
- [ ] Can see accumulated assessment evidence + summative scores
- [ ] Has all teacher capabilities
- [ ] Pending promotions prominently visible

---

### Phase 2D: Student & Verification

#### Task #9: Contact Verification System
**Estimate:** 2-3 hours | **Dependencies:** None | **Token budget:** ~40k

**Subtasks:**
1. Create verification code generation (30 min)
2. Create email verification flow (45 min)
3. Create phone verification flow (45 min)
4. Create verification UI components (30 min)
5. Add expiry handling (30 min)

**Acceptance Criteria:**
- [ ] Email/phone changes require verification code
- [ ] Codes expire after 24 hours
- [ ] Student notified of expiry
- [ ] Pending changes show "awaiting verification" badge
- [ ] Audit log records verification attempts

---

#### Task #5: Student Self-View
**Estimate:** 3-4 hours | **Dependencies:** #9 | **Token budget:** ~50k

**Subtasks:**
1. Create StudentProfilePage component (1 hour)
2. Create self-service edit forms (45 min)
3. Create student-specific API routes (45 min)
4. Show only teacher-shared assessments/notes (30 min)
5. Add diagnostic history section (30 min)
6. Handle empty states (30 min)

**Acceptance Criteria:**
- [ ] Students can only view their own profile
- [ ] Can edit email/phone with verification flow
- [ ] Can see only explicitly shared notes/assessments
- [ ] Can see diagnostic history and level progression
- [ ] Mobile-first UI with proper touch targets

---

### Phase 2E: Future Hooks

#### Task #10: LLM Tutor Architecture Hooks
**Estimate:** 1-2 hours | **Dependencies:** None | **Token budget:** ~25k

**Subtasks:**
1. Add placeholder in student navigation (15 min)
2. Design Student MCP extensibility (30 min)
3. Create data model extension points (30 min)
4. Expose profile data for LLM consumption (30 min)

**Acceptance Criteria:**
- [ ] Student nav has placeholder for future tutor
- [ ] Database tables exist for exercise/vocab/tutor data
- [ ] Profile data accessible for LLM consumption
- [ ] No actual LLM integration (hooks only)

---

## Dependency Graph

```
Phase 2A: Schema & Data
#18 Schema Updates ──┬──▶ #19 CEFR Importer
                     ├──▶ #20 Coursebook Importer
                     ├──▶ #22 Update Assessment Form
                     └──▶ #23 Summative Assessment UI

Phase 2B: Teacher Workflow
#19, #20, #18 ──▶ #21 Learning Objectives UI

Phase 2C: Role Views
#21, #22 ──▶ #4 Teacher View ──┐
#23 ──────▶ #8 Promotion ──────┼──▶ #6 DoS View
                               │
Phase 2D: Student
#9 Verification ───────────────┴──▶ #5 Student Self-View

Phase 2E: Future (independent)
#10 LLM Hooks
```

---

## Recommended Implementation Order

| Order | Task | Estimate | Unblocks |
|-------|------|----------|----------|
| 1 | #18 Schema Updates | 1-2h | #19, #20, #21, #22, #23 |
| 2 | #19 CEFR Importer | 2-3h | #21 |
| 3 | #20 Coursebook Importer | 2h | #21 |
| 4 | #22 Update Assessment Form | 1-2h | #4 |
| 5 | #23 Summative Assessment UI | 2h | #8 |
| 6 | #21 Learning Objectives UI | 2-3h | #4 |
| 7 | #9 Contact Verification | 2-3h | #5 |
| 8 | #4 Teacher Profile View | 2-3h | #6 |
| 9 | #8 Promotion Workflow | 2-3h | #6 |
| 10 | #6 DoS Hybrid View | 2-3h | - |
| 11 | #5 Student Self-View | 3-4h | - |
| 12 | #10 LLM Tutor Hooks | 1-2h | - |

**Total Remaining:** ~24-32 hours

---

## Files Created This Sprint

```
app/
├── migrations/
│   └── FRESH_0027_student_profile_feature.sql
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
│   ├── components/admin/students/
│   │   ├── tabs/
│   │   │   ├── LevelHistoryTab.tsx
│   │   │   ├── CompetencyProgressTab.tsx
│   │   │   ├── EnhancedNotesTab.tsx
│   │   │   ├── AuditTrailTab.tsx
│   │   │   └── index.ts
│   │   └── AssessmentForm.tsx
│   ├── db/schema/
│   │   └── profile.ts
│   └── hooks/
│       └── useCompetencyAssessments.ts

Documentation/
├── STUDENT_PROFILE_ROADMAP.md (this file)
└── STUDENT_PROFILE_DISCOVERY.md (requirements)
```
