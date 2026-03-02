# Student Profile Feature - Discovery Document

**Created:** 2026-03-02
**Status:** Discovery Complete
**Participants:** Eoin Malone, Claude Opus 4.5

---

## Executive Summary

This document captures the requirements discovered for the CEFR-based competency tracking system within the Student Profile feature. The system supports multi-tenant deployment with school-specific customization.

---

## 1. CEFR Descriptor Framework

### 1.1 Source Data (File A - Official CEFR)

Based on CEFR 2001/2020 Companion Volume by Roman Freinberger.

**Structure:**
| Column | Description | Example |
|--------|-------------|---------|
| Index | Unique identifier | 285, 286, 667 |
| Activity.Strategy.Competence | Top-level category | "Communicative Activities", "Communication Strategies", "Mediation Activities" |
| Competencies | Sub-category | "0", "Plurilingual" |
| Strategies | Activity type | "Interaction", "Mediation", "0" |
| Mode | Communication mode | "Spoken", "Mediating a text", "Plurilingual/pluricultural" |
| Skill focus | Traditional skill | "Speaking", "Mediation", "0" |
| Overall | Flag | "No" / "Yes" |
| Scale | Specific competency being assessed | "FORMAL DISCUSSION (MEETINGS)", "COOPERATING", "EXPRESSING A PERSONAL RESPONSE TO CREATIVE TEXTS" |
| Level | CEFR level | A0 (Pre-A1), A1, A2, A2+, B1, B1+, B2, B2+, C1, C2 |
| CEFR CV 2020 Descriptor | The actual descriptor text | "Can easily keep up with the debate..." |
| Young Learners (7-10) | YL variant or "None available" | Age-appropriate descriptor |
| Young Learners (11-15) | YL variant or "None available" | Age-appropriate descriptor |

**Key Insight:** The "Scale" column is the primary grouping for assessment. Scales like "FORMAL DISCUSSION", "COOPERATING", "OBTAINING GOODS & SERVICES" contain multiple level-specific descriptors.

**Descriptor Density:** Variable per scale. Example: "Obtaining goods & services" has 15 descriptors from A0-A2+ but only 1 at C level.

### 1.2 Coursebook Mappings (File B - Speakout/Others)

Teacher-facing, practical alignment to coursebook content.

**Structure:**
| Column | Description | Example |
|--------|-------------|---------|
| Skill focus | Traditional skill | Reading, Writing, Listening, Speaking |
| Book | Coursebook name (from worksheet) | "Speakout Intermediate 2nd Edition" |
| Unit | Unit number | 1, 2, 3 |
| Page | Page number(s) | "8", "12 13" |
| Level | CEFR level | B1, A2+, B2 |
| Lesson | Lesson name | "Me and my language", "Same or different" |
| Descriptor | Practical descriptor | "Can make simple inferences based on information given in a short article" |

**Multi-book Support:** File B contains multiple worksheets, one per coursebook. Each worksheet name becomes the book identifier.

### 1.3 School Customization

- Schools select a **subset** of File A descriptors for their syllabus
- LLM-assisted matching between File B (coursebook) and File A (CEFR) is optional, per-school decision
- Young Learner descriptors available for schools that need them (not Castleforbes)
- Castleforbes = adult learners only

---

## 2. Assessment Framework

### 2.1 Assessment Types

| Type | Frequency | Purpose | Scoring |
|------|-----------|---------|---------|
| **Formative (daily)** | Per session | Ongoing descriptor tracking | Progress scale |
| **Formative (weekly)** | Optional | Teacher-decided consolidation | Progress scale |
| **Summative** | School-defined schedule | Formal objective testing | Percentage (0-100%) |

### 2.2 Formative Assessment Model

**Class Session Structure:**
- Each session has **learning objectives** (descriptors)
- **Primary objectives:** 1-2 per session (required, must be graded)
- **Secondary objectives:** Up to 6 per session (must be graded if set)
- Minimum: 1 descriptor per session

**Descriptor Sourcing:**
1. Teacher starts from coursebook (File B)
2. Adapts/develops based on class needs
3. LLM suggests additional descriptors from File A
4. Filtered by level range (e.g., B1 class sees A2, A2+, B1, B1+ descriptors)

**Grading:**
| Field | Description |
|-------|-------------|
| Progress | Not yet → Emerging → Developing → Achieved |
| Demonstrated Level | Actual level shown (may differ from descriptor's level) |
| Notes/Feedback | Teacher comments |
| Is Complete | True when "Achieved" (takes precedence in history) |

**Reassessment:**
- Same descriptor can be assessed multiple times
- Full history tracked
- "Achieved/Complete" status takes precedence
- Feedback hidden from student by default

### 2.3 Summative Assessment Model

- Separate formal tests, school-defined
- Percentage scored (0-100%)
- "Unequivocally objective"
- Key evidence for promotion decisions

### 2.4 Visibility Rules

| Role | Access |
|------|--------|
| DoS | All assessments, all students |
| Teacher | All assessments for their class students |
| Student | Only assessments teacher explicitly shares |

**Rationale:** Prevents "feedback overload" for students. Teacher controls what students see.

---

## 3. Level Progression System

### 3.1 Promotion Workflow

```
1. System monitors descriptor achievement
   ↓
2. When threshold reached, system suggests promotion
   ↓
3. Teacher reviews, adds recommendation + justification
   ↓
4. DoS reviews evidence:
   - Teacher's written recommendation (primary)
   - Summative assessment scores
   - Summary stats (% achieved per skill/scale)
   - Option to view full history
   ↓
5. DoS approves or rejects with notes
   ↓
6. Student notified, level updated if approved
```

### 3.2 Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Promotion threshold | 90% | % of descriptors achieved before suggestion |
| Configurable | Yes | Each school sets their own threshold |

### 3.3 Diagnostic/Placement Tests

- **School-specific** - each school defines their own process
- System supports configurable multi-stage diagnostics
- Stages stored in tenant settings as JSON array

#### Default Template (Castleforbes)

```
Stage 1: Online MCQ (External)
├── 40 multiple-choice questions
├── Completed on school website (external system)
├── Score sent via webhook to MyCastle
├── Admin receives notification → forwards to DoS
└── Output: MCQ percentage score

Stage 2: Oral Diagnostic
├── 5-10 minute interview with DoS
├── Scheduling:
│   ├── DoS has assigned calendar blocks
│   ├── Email invitation sent first
│   └── WhatsApp for flexibility/rescheduling if needed
├── DoS assesses speaking ability
└── Output: Recommended CEFR level

Stage 3: Provisional Class Assignment
├── Student placed in class matching recommended level
├── Level status: "provisional"
└── Student begins attending classes

Stage 4: Teacher Confirmation
├── During first week of classes
├── Teacher observes student in class context
├── Teacher confirms or recommends adjustment
└── Level status: "provisional" → "confirmed"
```

#### MCQ Integration

| Approach | Description |
|----------|-------------|
| **MVP** | External MCQ (school website) + webhook receives score |
| **Future** | Optional in-house MCQ builder |
| **Webhook** | `POST /api/diagnostics/mcq-result` |

#### Diagnostic Session States

```
pending_mcq → mcq_completed → oral_scheduled → oral_completed →
level_advised → provisional_placement → confirmed
```

#### Data Model Additions

```sql
diagnostic_sessions:
  - current_stage TEXT           -- 'mcq', 'oral', 'provisional', 'confirmed'
  - mcq_score_percentage DECIMAL -- 40Q result (0-100)
  - mcq_completed_at TIMESTAMPTZ
  - oral_scheduled_at TIMESTAMPTZ
  - oral_completed_at TIMESTAMPTZ
  - oral_notes TEXT              -- DoS notes from interview
  - recommended_level VARCHAR(3) -- DoS recommendation after oral
  - actual_placement_level VARCHAR(3)
  - administered_by UUID         -- DoS who conducted oral
  - confirmed_by UUID            -- Teacher who confirmed
  - confirmed_at TIMESTAMPTZ
```

---

## 4. Data Model

### 4.1 CEFR Descriptors (Master Library)

```sql
CREATE TABLE cefr_descriptors (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),  -- NULL = global/shared
  source_index INTEGER,                    -- Original index from File A
  activity_strategy_competence TEXT NOT NULL,
  competencies TEXT,
  strategies TEXT,
  mode TEXT,
  skill_focus TEXT,
  is_overall BOOLEAN DEFAULT FALSE,
  scale TEXT NOT NULL,                     -- Key grouping field
  level VARCHAR(3) NOT NULL,               -- A0, A1, A2, A2+, B1, B1+, B2, B2+, C1, C2
  descriptor_text TEXT NOT NULL,
  young_learners_7_10 TEXT,
  young_learners_11_15 TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient filtering
CREATE INDEX idx_cefr_descriptors_scale_level ON cefr_descriptors(scale, level);
CREATE INDEX idx_cefr_descriptors_skill_focus ON cefr_descriptors(skill_focus);
```

### 4.2 Coursebooks

```sql
CREATE TABLE coursebooks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,                      -- From worksheet name
  publisher TEXT,
  edition TEXT,
  cefr_level_min VARCHAR(3),               -- Derived from content
  cefr_level_max VARCHAR(3),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);
```

### 4.3 Coursebook Descriptors

```sql
CREATE TABLE coursebook_descriptors (
  id UUID PRIMARY KEY,
  coursebook_id UUID NOT NULL REFERENCES coursebooks(id),
  skill_focus TEXT NOT NULL,               -- Reading, Writing, Listening, Speaking
  unit TEXT,
  page TEXT,
  level VARCHAR(3) NOT NULL,
  lesson TEXT,
  descriptor_text TEXT NOT NULL,
  linked_cefr_descriptor_id UUID REFERENCES cefr_descriptors(id),  -- LLM-assisted link
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for lesson planning
  INDEX idx_coursebook_desc_unit (coursebook_id, unit)
);
```

### 4.4 Classes (Updated)

```sql
ALTER TABLE classes ADD COLUMN primary_coursebook_id UUID REFERENCES coursebooks(id);
```

### 4.5 Session Learning Objectives

```sql
CREATE TABLE session_learning_objectives (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES class_sessions(id),
  descriptor_id UUID NOT NULL REFERENCES cefr_descriptors(id),
  coursebook_descriptor_id UUID REFERENCES coursebook_descriptors(id),  -- Source if from coursebook
  objective_type TEXT NOT NULL CHECK (objective_type IN ('primary', 'secondary')),
  source TEXT NOT NULL CHECK (source IN ('cefr', 'coursebook', 'custom')),
  custom_descriptor_text TEXT,             -- If source = 'custom'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, descriptor_id)
);

-- Enforce soft limits via application logic:
-- Max 2 primary per session
-- Max 6 secondary per session
```

### 4.6 Competency Assessments (Formative)

```sql
CREATE TABLE competency_assessments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  student_id UUID NOT NULL REFERENCES users(id),
  descriptor_id UUID NOT NULL REFERENCES cefr_descriptors(id),
  session_id UUID REFERENCES class_sessions(id),
  learning_objective_id UUID REFERENCES session_learning_objectives(id),
  assessor_id UUID NOT NULL REFERENCES users(id),

  -- Grading
  progress TEXT NOT NULL CHECK (progress IN ('not_yet', 'emerging', 'developing', 'achieved')),
  demonstrated_level VARCHAR(3),           -- May differ from descriptor level
  is_complete BOOLEAN DEFAULT FALSE,       -- True when achieved

  -- Feedback
  notes TEXT,
  is_shared_with_student BOOLEAN DEFAULT FALSE,

  -- Timestamps
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comp_assess_student ON competency_assessments(student_id, descriptor_id);
CREATE INDEX idx_comp_assess_session ON competency_assessments(session_id);
```

### 4.7 Summative Assessments

```sql
CREATE TABLE summative_assessments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  student_id UUID NOT NULL REFERENCES users(id),
  assessment_type_id UUID REFERENCES summative_assessment_types(id),
  assessor_id UUID NOT NULL REFERENCES users(id),

  score_percentage DECIMAL(5,2) NOT NULL CHECK (score_percentage >= 0 AND score_percentage <= 100),
  notes TEXT,

  assessment_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE summative_assessment_types (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,                      -- e.g., "End of Unit Test", "Mid-Term Exam"
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(tenant_id, name)
);
```

### 4.8 Tenant Settings (Updated)

```sql
ALTER TABLE tenants ADD COLUMN profile_settings JSONB DEFAULT '{
  "promotion_threshold_percentage": 90,
  "enable_llm_descriptor_matching": false,
  "diagnostic_stages": ["written_test", "speaking_interview"],
  "young_learners_enabled": false
}';
```

---

## 5. Implementation Impact

### 5.1 Schema Changes Required

The existing `competency_assessments` and `competency_progress` tables from FRESH_0027 need updating:

1. **Add new columns** to `competency_assessments`:
   - `demonstrated_level`
   - `is_complete`
   - `learning_objective_id`

2. **New tables** to create:
   - `coursebooks`
   - `coursebook_descriptors`
   - `session_learning_objectives`
   - `summative_assessments`
   - `summative_assessment_types`

3. **Update `cefr_descriptors`** table with full File A structure

4. **Update `classes`** table with `primary_coursebook_id`

### 5.2 API Changes

New endpoints needed:
- `/api/admin/coursebooks` - CRUD for coursebooks
- `/api/admin/coursebooks/[id]/descriptors` - Import/manage coursebook descriptors
- `/api/admin/sessions/[id]/objectives` - Manage learning objectives
- `/api/admin/students/[id]/summative-assessments` - Summative assessment CRUD
- `/api/admin/llm/match-descriptors` - LLM-assisted File B → File A matching

### 5.3 UI Components

New/updated components:
- `LearningObjectiveSelector` - Teacher picks descriptors for session
- `SummativeAssessmentForm` - Record formal test scores
- `PromotionEvidenceView` - DoS reviews recommendation + evidence
- `DescriptorImporter` - Admin imports File A/B spreadsheets

---

## 6. Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Scoring scale | Progress: Not yet → Emerging → Developing → Achieved |
| Descriptor structure | File A hierarchy with Scale as primary grouping |
| Young Learner support | Yes for other schools, not Castleforbes |
| Coursebook handling | Primary per class, teachers can supplement |
| Promotion trigger | Both system-suggested (90% default) + teacher confirmation |
| Summative vs formative | Separate: daily formative (progress) + periodic summative (%) |
| Student visibility | Teacher controls what student sees |

---

## 7. Next Steps

1. **Create migration** for schema updates (FRESH_0028)
2. **Import File A** - Seed CEFR descriptors from provided spreadsheet
3. **Build coursebook importer** - Parse File B worksheets
4. **Update assessment form** - Add demonstrated_level, is_complete
5. **Build learning objectives UI** - Teacher session planning
6. **Build summative assessment UI** - Formal test recording
7. **Update promotion workflow** - Include summative scores in evidence

---

## Appendix A: Sample Data

### File A Sample (CEFR Descriptors)
```
Index: 667
Activity.Strategy.Competence: Communication Strategies
Strategies: Interaction
Mode: Spoken
Skill focus: Speaking
Scale: COOPERATING
Level: A2
Descriptor: Can indicate when they are following.
Young Learners (7-10): "I can show that I'm following the speaker..."
Young Learners (11-15): "During a conversation, I can ask appropriate questions..."
```

### File B Sample (Coursebook Descriptor)
```
Skill focus: Speaking
Book: Speakout Intermediate 2nd Edition
Unit: 1
Page: 13
Level: B1
Lesson: Same or different
Descriptor: Can give simple reasons to justify a viewpoint on a familiar topic
```
