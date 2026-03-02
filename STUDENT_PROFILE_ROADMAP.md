# Student Profile Feature - Implementation Roadmap

**Created:** 2026-03-02
**Status:** Discovery Phase - Paused for requirements clarification
**Completed:** 11/17 tasks (65%)

---

## Current Status

### Completed Tasks

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

## Remaining Tasks (6)

### Task #4: Teacher Profile View
**Estimate:** 2-3 hours | **Dependencies:** None | **Token budget:** ~40k

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

### Task #8: Level Promotion Workflow
**Estimate:** 2-3 hours | **Dependencies:** None | **Token budget:** ~40k

**Subtasks:**
1. Create promotion request form (45 min)
2. Create promotion request API (30 min)
3. Create promotion review API (30 min)
4. Create notification triggers (30 min)
5. Add promotion history to LevelHistoryTab (30 min)

**Acceptance Criteria:**
- [ ] Teachers can request promotions with minimal friction
- [ ] DoS receives notification of pending requests
- [ ] DoS can approve/reject with notes
- [ ] Student level updates on approval
- [ ] Full audit trail of decisions

---

### Task #9: Contact Verification System
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

### Task #5: Student Self-View
**Estimate:** 3-4 hours | **Dependencies:** #9 | **Token budget:** ~50k

**Subtasks:**
1. Create StudentProfilePage component (1 hour)
2. Create self-service edit forms (45 min)
3. Create student-specific API routes (45 min)
4. Integrate shared notes view (30 min)
5. Add diagnostic history section (30 min)
6. Handle empty states (30 min)

**Acceptance Criteria:**
- [ ] Students can only view their own profile
- [ ] Can edit email/phone with verification flow
- [ ] Can see shared notes from teachers
- [ ] Can see diagnostic history and level progression
- [ ] Mobile-first UI with proper touch targets

---

### Task #6: DoS Hybrid View
**Estimate:** 2-3 hours | **Dependencies:** #4, #8 | **Token budget:** ~40k

**Subtasks:**
1. Create DoS dashboard component (45 min)
2. Create promotion review interface (45 min)
3. Create DoS-specific API routes (30 min)
4. Adapt existing tabs for DoS context (30 min)
5. Add Assistant DoS role support (30 min)

**Acceptance Criteria:**
- [ ] DoS can access ALL student profiles (org-wide)
- [ ] Can review and approve/reject promotions
- [ ] Can see accumulated assessment evidence
- [ ] Has all teacher capabilities
- [ ] Pending promotions prominently visible

---

### Task #10: LLM Tutor Architecture Hooks
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
#4 Teacher View ─────────────────┐
                                 ├──▶ #6 DoS View
#8 Promotion Workflow ───────────┘

#9 Contact Verification ─────────────▶ #5 Student Self-View

#10 LLM Hooks (independent)
```

**Recommended Order:**
1. #4 Teacher View (unblocks #6)
2. #8 Promotion Workflow (unblocks #6)
3. #9 Contact Verification (unblocks #5)
4. #6 DoS Hybrid View
5. #5 Student Self-View
6. #10 LLM Tutor Hooks

---

## Discovery Items (BLOCKER)

Before continuing implementation, these items need clarification:

### 1. CEFR Descriptor Structure
**Status:** Missing
**Required:** Castleforbes CEFR descriptor spreadsheet(s)

**Questions:**
- What columns/structure does the spreadsheet use?
- How are descriptors grouped beyond R/W/L/S?
- Are there level-specific descriptors (A1 vs B2)?
- Which descriptors are mandatory vs optional?

### 2. Scoring System
**Status:** Assumed 1-4 scale
**Required:** Confirmation of scoring rubric

**Questions:**
- Is 1-4 scale correct? (1=Not demonstrated, 4=Competent)
- What score threshold = competent? (assumed 3.5)
- Does threshold vary by level or descriptor?
- Are scores weighted differently?

### 3. Diagnostic Test
**Status:** Missing
**Required:** Diagnostic test structure and scoring rubric

**Questions:**
- What stages does the diagnostic have?
- How is each stage scored?
- How does scoring map to CEFR level recommendation?
- Is speaking assessment separate from written?

### 4. Promotion Criteria
**Status:** Assumed accumulation of weekly assessments
**Required:** Actual promotion requirements

**Questions:**
- What evidence is needed to recommend promotion?
- Minimum number of assessments required?
- Are there specific descriptor thresholds?
- Is there a waiting period between promotions?

### 5. Customization Model
**Status:** Unknown
**Required:** How schools customize descriptors

**Questions:**
- Can schools add custom descriptors?
- Can schools modify official descriptor text?
- Can schools select a subset of official descriptors?
- Are customizations per-level or global?

---

## Next Steps

1. **Discovery Session** - Review documents with stakeholder
2. **Update Schema** - Adjust tables based on actual descriptor structure
3. **Resume Task #4** - Teacher profile view (no blockers)
4. **Resume Task #8** - Promotion workflow (depends on criteria clarity)

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
```
