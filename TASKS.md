# TASKS.md — Task Specification (MyCastle)

> **Version:** 3.0.0 | **Status:** Living Document | **Last Updated:** 2025-11-07

---

## 1. Workflow Model (Kanban)

### 1.1 Definition of Ready (DoR)
Before a task enters the sprint backlog, it must have:
- ✅ Linked REQ ID(s)
- ✅ GIVEN–WHEN–THEN acceptance criteria
- ✅ Design reference (DESIGN §X)
- ✅ Data shape defined (if applicable)
- ✅ Performance/security notes
- ✅ Dependencies identified
- ✅ Estimate (T-shirt size or story points)

### 1.2 Definition of Done (DoD)
A task is complete when:
- ✅ Lint/type checks pass
- ✅ Unit tests written and passing
- ✅ Integration tests (if applicable) passing
- ✅ E2E tests (if applicable) passing
- ✅ Performance budget proven (if applicable)
- ✅ RLS policy tests pass (if applicable)
- ✅ Documentation updated
- ✅ Traceability links added (REQ/DESIGN references in code)
- ✅ PR reviewed and approved
- ✅ Deployed to staging and verified

---

## 2. Work Breakdown Structure (by Epic)

### Epics
- **EP-FOUNDATION**: Project setup, tooling, CI/CD
- **EP-AUTH**: Authentication and authorisation
- **EP-MCP**: MCP architecture and Host service
- **EP-PLANNER**: CEFR lesson planning (AI-assisted)
- **EP-TIMETABLE**: Timetable management
- **EP-REGISTER**: Attendance tracking and audit
- **EP-PROFILE**: Student profile management
- **EP-FORUM**: Class forum with moderation
- **EP-OBSERVABILITY**: Logging, tracing, metrics
- **EP-COMPLIANCE**: GDPR, DSRs, audit reports
- **EP-DEPLOY**: Deployment, backups, monitoring

---

## 3. Task Template

```markdown
### T-XXX: [Title]

**Epic**: [EP-XXX]
**Linked Requirements**: REQ-X-XXX
**Design Ref**: DESIGN §X
**Estimate**: [XS / S / M / L / XL]
**Dependencies**: [T-XXX, T-XXX]

**Description**:
[Brief description of what needs to be done]

**Acceptance Criteria**:
```gherkin
GIVEN [context]
WHEN [action]
THEN [expected outcome]
  AND [additional outcome]
```

**Tests Required**:
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] RLS policy tests
- [ ] Performance tests

**Risk/Notes**:
[Any risks, blockers, or special considerations]
```

---

## 4. Backlog (Prioritised)

### 4.1 Foundation (EP-FOUNDATION)

#### T-001: Project Initialisation
**Epic**: EP-FOUNDATION
**Linked Requirements**: -
**Design Ref**: DESIGN §2
**Estimate**: S
**Dependencies**: None

**Description**:
Initialise Next.js 15 project with TypeScript, ESLint, Prettier, and Tailwind CSS.

**Acceptance Criteria**:
```gherkin
GIVEN empty repository
WHEN running `npm create next-app@latest`
THEN Next.js 15 project created
  AND TypeScript configured
  AND ESLint + Prettier configured
  AND Tailwind CSS installed
  AND Git repository initialised
```

**Tests Required**:
- [ ] Linting passes
- [ ] Build succeeds

**Risk/Notes**:
None

---

#### T-002: Database Setup (Drizzle + Supabase)
**Epic**: EP-FOUNDATION
**Linked Requirements**: REQ §7
**Design Ref**: DESIGN §3, spec/08-database.md
**Estimate**: M
**Dependencies**: T-001

**Description**:
Set up Drizzle ORM with Supabase PostgreSQL, define core schema (Organisation, User, Teacher, Student, Class, Session, Enrolment).

**Acceptance Criteria**:
```gherkin
GIVEN Supabase project created
WHEN running `npm run db:migrate`
THEN all core tables created
  AND RLS policies enabled on all tables
  AND Foreign keys enforced
  AND Indexes created
```

**Tests Required**:
- [ ] Migration applies cleanly
- [ ] Schema matches ERD (DESIGN §3)
- [ ] Connection pool works

**Risk/Notes**:
Ensure Supabase project has RLS enabled by default.

---

#### T-003: CI/CD Pipeline (GitHub Actions)
**Epic**: EP-FOUNDATION
**Linked Requirements**: REQ §9
**Design Ref**: DESIGN §15.2
**Estimate**: M
**Dependencies**: T-001, T-002

**Description**:
Set up GitHub Actions pipeline: lint → typecheck → unit tests → integration tests → e2e tests → build → deploy preview.

**Acceptance Criteria**:
```gherkin
GIVEN PR opened on main branch
WHEN CI pipeline runs
THEN all checks pass
  AND preview deployment created (Vercel)
  AND preview URL provided in PR comment
```

**Tests Required**:
- [ ] Pipeline runs on PR
- [ ] Pipeline fails on lint errors
- [ ] Pipeline fails on test failures

**Risk/Notes**:
Requires Vercel token secret in GitHub repo.

---

### 4.2 Authentication (EP-AUTH)

#### T-010: Supabase Auth Integration
**Epic**: EP-AUTH
**Linked Requirements**: REQ-A-004, REQ-T-006, REQ-S-001
**Design Ref**: DESIGN §5.1
**Estimate**: M
**Dependencies**: T-002

**Description**:
Integrate Supabase Auth with JWT claims (org_id, role_scope). Set up login/logout flows.

**Acceptance Criteria**:
```gherkin
GIVEN user with email/password
WHEN user logs in
THEN JWT issued with claims: { sub, org_id, role_scope }
  AND JWT stored in httpOnly cookie
  AND User redirected to dashboard
```

**Tests Required**:
- [ ] Unit tests for JWT verification
- [ ] E2E test for login flow
- [ ] E2E test for logout flow

**Risk/Notes**:
Ensure JWT secrets are in environment variables only.

---

#### T-011: RLS Policies (Core)
**Epic**: EP-AUTH
**Linked Requirements**: REQ-A-004
**Design Ref**: DESIGN §5.2
**Estimate**: L
**Dependencies**: T-010

**Description**:
Implement RLS policies for tenant and role isolation (teachers see assigned classes, students see enrolled classes, admins see org-wide).

**Acceptance Criteria**:
```gherkin
GIVEN teacher Alice assigned to Class A
  AND teacher Bob assigned to Class B
WHEN Alice queries classes
THEN only Class A returned
  AND Class B not visible

GIVEN student enrolled in Class A
WHEN student queries classes
THEN only Class A returned

GIVEN admin in Org 1
WHEN admin queries classes
THEN all Org 1 classes returned
  AND Org 2 classes not visible
```

**Tests Required**:
- [ ] RLS policy tests (positive + negative)
- [ ] Rollback test (policy misconfiguration)

**Risk/Notes**:
CRITICAL: Policy test suite must pass before merging. Gate migrations on policy tests.

---

### 4.3 MCP Architecture (EP-MCP)

#### T-020: MCP Host Service
**Epic**: EP-MCP
**Linked Requirements**: All (cross-cutting)
**Design Ref**: DESIGN §1, spec/03-mcp.md
**Estimate**: XL
**Dependencies**: T-010

**Description**:
Implement MCP Host service that orchestrates role-based MCP servers. Includes session management, authorization, context aggregation, and LLM coordination.

**Acceptance Criteria**:
```gherkin
GIVEN authenticated teacher user
WHEN teacher sends message "Show my timetable"
THEN Host routes to Teacher MCP
  AND Teacher MCP fetches timetable data
  AND Host aggregates context
  AND LLM generates response
  AND Response returned to UI
```

**Tests Required**:
- [ ] Unit tests for routing logic
- [ ] Integration tests for MCP protocol
- [ ] E2E test for full conversation flow

**Risk/Notes**:
Complex orchestration logic. Consider incremental implementation (start with single MCP server).

---

#### T-021: Admin MCP Server
**Epic**: EP-MCP
**Linked Requirements**: REQ-A-001, REQ-A-002, REQ-A-003, REQ-A-005
**Design Ref**: spec/04-admin-mcp.md
**Estimate**: XL
**Dependencies**: T-020

**Description**:
Implement Admin MCP server with resources (users, classes, exports), tools (CRUD operations, reports), and prompts (admin tasks).

**Acceptance Criteria**:
```gherkin
GIVEN admin authenticated
WHEN admin asks "Export weekly register for Class B1"
THEN Admin MCP fetches register data
  AND CSV generated with hash column
  AND Signed URL returned
  AND Export completes in < 60s (p95)
```

**Tests Required**:
- [ ] Unit tests for all tools
- [ ] Integration tests for resources
- [ ] E2E test for export flow

**Risk/Notes**:
See spec/04-admin-mcp.md for complete tool/resource definitions.

---

#### T-022: Teacher MCP Server
**Epic**: EP-MCP
**Linked Requirements**: REQ-T-001, REQ-T-002, REQ-T-003, REQ-T-004, REQ-T-005, REQ-T-006
**Design Ref**: spec/05-teacher-mcp.md
**Estimate**: XL
**Dependencies**: T-020

**Description**:
Implement Teacher MCP server with resources (timetable, plans, registers), tools (plan generation, attendance marking), and prompts (teaching tasks).

**Acceptance Criteria**:
```gherkin
GIVEN teacher authenticated
WHEN teacher asks "Generate a B1 listening lesson"
THEN Teacher MCP calls LLM with CEFR descriptor
  AND Plan JSON validated against schema
  AND Plan stored with cache key
  AND Plan ID returned
  AND Generation completes in < 5s (p95)
```

**Tests Required**:
- [ ] Unit tests for all tools
- [ ] Integration tests for resources
- [ ] E2E test for lesson generation
- [ ] Performance test (p95 < 5s)

**Risk/Notes**:
LLM nondeterminism → strict schema, retries, cached templates.

---

#### T-023: Student MCP Server
**Epic**: EP-MCP
**Linked Requirements**: REQ-S-001, REQ-S-002, REQ-S-003, REQ-S-004, REQ-S-005
**Design Ref**: spec/06-student-mcp.md
**Estimate**: L
**Dependencies**: T-020

**Description**:
Implement Student MCP server with resources (timetable, materials, progress), tools (AI tutor, homework), and prompts (learning tasks).

**Acceptance Criteria**:
```gherkin
GIVEN student authenticated
WHEN student asks "Explain the difference between present perfect and past simple"
THEN Student MCP calls LLM with CEFR-adaptive prompt
  AND Response tailored to student's level (B1)
  AND Response includes examples
```

**Tests Required**:
- [ ] Unit tests for all tools
- [ ] Integration tests for resources
- [ ] E2E test for AI tutor

**Risk/Notes**:
AI tutor requires CEFR level adaptation in prompts.

---

### 4.3.1 MCP Architecture Migration (v3.0)

**Background**: Migrate from 3-MCP architecture (v2.0) to 8-MCP domain-driven architecture (v3.0) to meet ≤10 tools per MCP constraint.

**Migration Strategy**: 4-phase rollout over 8-12 weeks (see MCP-ARCHITECTURE-OPTIMIZATION.md)

---

#### T-110: Create Identity & Access MCP (Phase 1)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.1
**Design Ref**: DESIGN §1, MCP-ARCHITECTURE-OPTIMIZATION.md
**Estimate**: M
**Dependencies**: T-020 (MCP Host)

**Description**:
Create Identity & Access MCP with 6 tools for user authentication, authorization, and role management. Split from Admin MCP.

**Tools** (6):
1. create_user
2. update_user_role
3. set_permissions
4. revoke_session
5. rotate_api_key
6. audit_access

**Acceptance Criteria**:
```gherkin
GIVEN super-admin authenticated
WHEN calling create_user tool via Identity MCP
THEN new user created
  AND authorization scope = identity:write enforced
  AND audit log entry created
  AND tool call completes in < 500ms
```

**Tests Required**:
- [ ] Unit tests for all 6 tools
- [ ] Integration tests for scope-based routing
- [ ] RLS policy tests (super-admin only)
- [ ] E2E test for user creation flow

**Risk/Notes**:
Security-critical operations. Requires highest audit level.

---

#### T-111: Create Finance MCP (Phase 1)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.4
**Design Ref**: DESIGN §1, MCP-ARCHITECTURE-OPTIMIZATION.md
**Estimate**: L
**Dependencies**: T-020

**Description**:
Create Finance MCP with 9 tools for invoicing, payments, and reconciliation. Split from Admin MCP.

**Tools** (9):
1. create_booking
2. edit_booking
3. issue_invoice
4. apply_discount
5. refund_payment
6. reconcile_payouts
7. ledger_export
8. aging_report
9. confirm_intake

**Acceptance Criteria**:
```gherkin
GIVEN finance officer authenticated
WHEN calling issue_invoice tool via Finance MCP
THEN invoice generated
  AND authorization scope = finance:write enforced
  AND PCI compliance maintained
  AND audit trail includes all financial operations
```

**Tests Required**:
- [ ] Unit tests for all 9 tools
- [ ] Integration tests for payment flows
- [ ] PCI compliance tests
- [ ] E2E test for invoice creation

**Risk/Notes**:
PCI compliance critical. External payment integrations (Stripe).

---

#### T-112: Update Host Routing for Identity & Finance (Phase 1)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.9
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-110, T-111

**Description**:
Update MCP Host to route `identity:*` and `finance:*` scopes to new MCPs. Maintain backward compatibility during migration.

**Acceptance Criteria**:
```gherkin
GIVEN tool call with scope identity:write
WHEN Host receives request
THEN request routed to Identity MCP
  AND old Admin MCP not called
  AND routing completes in < 50ms
```

**Tests Required**:
- [ ] Unit tests for scope-based routing
- [ ] Integration tests for backward compatibility
- [ ] Performance tests (routing latency)

**Risk/Notes**:
Run both old and new MCPs in parallel during canary rollout.

---

#### T-113: Migrate Authorization Scopes (Phase 1)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.9
**Design Ref**: DESIGN §5
**Estimate**: M
**Dependencies**: T-112

**Description**:
Update authorization model to support fine-grained scopes. Existing `admin` role grants all new scopes during migration.

**Acceptance Criteria**:
```gherkin
GIVEN existing admin user with role=admin
WHEN user authenticates
THEN JWT includes scopes: identity:*, finance:*, academic:*, etc.
  AND all new scopes granted automatically
  AND backward compatibility maintained
```

**Tests Required**:
- [ ] Unit tests for scope assignment
- [ ] Integration tests for JWT claims
- [ ] E2E test for admin access

**Risk/Notes**:
New fine-grained roles (finance_officer, registrar) can be introduced after migration.

---

#### T-114: E2E Tests for Identity & Finance MCPs (Phase 1)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.1, §6.7.4
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-113

**Description**:
Create comprehensive E2E tests for Identity and Finance MCPs in isolation and integrated with Host.

**Acceptance Criteria**:
```gherkin
GIVEN Identity MCP deployed
WHEN running E2E test suite
THEN all 6 tools callable
  AND authorization enforced correctly
  AND audit logs captured
  AND no tools remain in old Admin MCP (identity domain)
```

**Tests Required**:
- [ ] E2E tests for all Identity tools
- [ ] E2E tests for all Finance tools
- [ ] Integration tests for Host routing
- [ ] Performance tests (p95 latency)

---

#### T-120: Create Academic Operations MCP (Phase 2)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.2
**Design Ref**: DESIGN §1
**Estimate**: L
**Dependencies**: T-114

**Description**:
Create Academic Operations MCP with 10 tools for programmes, courses, scheduling, and lesson planning.

**Tools** (10):
1. create_programme
2. create_course
3. map_cefr_level
4. schedule_class
5. assign_teacher
6. allocate_room
7. register_lesson_template
8. approve_lesson_plan
9. link_cefr_descriptor
10. publish_materials

**Acceptance Criteria**:
```gherkin
GIVEN registrar authenticated
WHEN calling schedule_class tool via Academic MCP
THEN class scheduled
  AND authorization scope = academic:write enforced
  AND shared data model (programmes → courses → classes) maintained
```

**Tests Required**:
- [ ] Unit tests for all 10 tools
- [ ] Integration tests for academic workflows
- [ ] E2E test for course scheduling

---

#### T-121: Create Attendance & Compliance MCP (Phase 2)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.3
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-114

**Description**:
Create Attendance & Compliance MCP with 8 tools for attendance tracking, visa compliance, and exports.

**Tools** (8):
1. prepare_register
2. record_attendance
3. correct_attendance
4. export_attendance
5. visa_compliance_report
6. compile_compliance_pack
7. anonymise_dataset
8. policy_check

**Acceptance Criteria**:
```gherkin
GIVEN attendance officer authenticated
WHEN calling export_attendance tool via Attendance MCP
THEN export generated
  AND visa compliance data included
  AND hash column for tamper evidence
  AND export completes in < 60s
```

**Tests Required**:
- [ ] Unit tests for all 8 tools
- [ ] Integration tests for visa compliance
- [ ] E2E test for register export

---

#### T-122: Update Host Routing for Academic & Attendance (Phase 2)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.9
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-120, T-121

**Description**:
Update MCP Host to route `academic:*`, `attendance:*`, and `compliance:*` scopes to new MCPs.

---

#### T-123: Migrate RLS Policies for Academic & Attendance (Phase 2)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.9
**Design Ref**: DESIGN §5
**Estimate**: M
**Dependencies**: T-122

**Description**:
Update RLS policies to support domain-specific MCP access. Simplify policies per MCP (easier to maintain).

---

#### T-124: E2E Tests for Academic & Attendance MCPs (Phase 2)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.2, §6.7.3
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-123

**Description**:
Create E2E tests for Academic and Attendance MCPs.

---

#### T-130: Create Student Services MCP (Phase 3)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.5
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-124

**Description**:
Create Student Services MCP with 9 tools for accommodation, letters, and certificates.

**Tools** (9):
1. register_host
2. allocate_accommodation
3. swap_accommodation
4. export_placements
5. issue_letter
6. approve_deferral
7. award_certificate
8. track_visa_status
9. record_pastoral_note

---

#### T-131: Create Operations & Quality MCP (Phase 3)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.6
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-124

**Description**:
Create Operations & Quality MCP with 8 tools for backups, quality assurance, and communications.

**Tools** (8):
1. backup_db
2. restore_snapshot
3. record_observation
4. assign_cpd
5. export_quality_report
6. bulk_email
7. notify_stakeholders
8. mail_merge_pdf

---

#### T-132: Update Host Routing for Student Services & Ops (Phase 3)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.9
**Design Ref**: DESIGN §1
**Estimate**: S
**Dependencies**: T-130, T-131

**Description**:
Update MCP Host to route `student_services:*`, `ops:*`, and `quality:*` scopes.

---

#### T-133: E2E Tests for Student Services & Ops MCPs (Phase 3)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.5, §6.7.6
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-132

**Description**:
Create E2E tests for Student Services and Operations MCPs.

---

#### T-140: Optimize Teacher MCP to 10 Tools (Phase 4)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.7
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-133

**Description**:
Reduce Teacher MCP from 12 → 10 tools by merging `request_room_swap` into Academic MCP and merging `quick_register_scan` into `mark_attendance`.

**Acceptance Criteria**:
```gherkin
GIVEN Teacher MCP deployed
WHEN counting tools
THEN exactly 10 tools present
  AND request_room_swap moved to Academic MCP
  AND quick_register_scan merged into mark_attendance with optional "scan" mode
```

**Tests Required**:
- [ ] Unit tests for merged tools
- [ ] E2E test for attendance marking (scan mode)

---

#### T-141: Optimize Student MCP to 10 Tools (Phase 4)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.8
**Design Ref**: DESIGN §1
**Estimate**: M
**Dependencies**: T-133

**Description**:
Reduce Student MCP from 14 → 10 tools by merging AI tutor tools (explain_concept, practice_exercise into ask_tutor), merging invoice tools, and moving profile updates to Student Services MCP.

**Acceptance Criteria**:
```gherkin
GIVEN Student MCP deployed
WHEN counting tools
THEN exactly 10 tools present
  AND ask_tutor handles all AI tutor queries (explain, practice)
  AND view_invoice includes installments
  AND profile updates callable via Student Services MCP
```

**Tests Required**:
- [ ] Unit tests for merged tools
- [ ] E2E test for AI tutor (all query types)

---

#### T-142: Update Host Routing for Optimized Teacher & Student (Phase 4)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7.9
**Design Ref**: DESIGN §1
**Estimate**: S
**Dependencies**: T-140, T-141

**Description**:
Update MCP Host routing for optimized Teacher and Student MCPs. Remove old tool mappings.

---

#### T-143: Final E2E Tests for 8-MCP Architecture (Phase 4)
**Epic**: EP-MCP
**Linked Requirements**: REQ §6.7
**Design Ref**: DESIGN §1
**Estimate**: L
**Dependencies**: T-142

**Description**:
Comprehensive E2E testing of full 8-MCP architecture. Validate all tools callable, routing correct, authorization enforced, performance budgets met.

**Acceptance Criteria**:
```gherkin
GIVEN all 8 MCPs deployed
WHEN running full E2E test suite
THEN all 70 tools callable across 8 MCPs
  AND all MCPs ≤10 tools
  AND performance budgets met (p95 latencies)
  AND authorization scopes enforced correctly
  AND cache hit ratio > 80%
  AND no security vulnerabilities detected
```

**Tests Required**:
- [ ] E2E tests for all 70 tools
- [ ] Performance tests (p95 < targets)
- [ ] Security tests (authorization, RLS)
- [ ] Load tests (distributed load across 8 MCPs)

**Risk/Notes**:
Final validation before decommissioning old 3-MCP architecture.

---

### 4.4 Lesson Planner (EP-PLANNER)

#### T-031: API POST /api/lessons/generate
**Epic**: EP-PLANNER
**Linked Requirements**: REQ-T-001, REQ-T-002
**Design Ref**: DESIGN §6
**Estimate**: M
**Dependencies**: T-022

**Description**:
Create API route for lesson plan generation. Validates input (Zod), checks cache, calls Teacher MCP, returns plan JSON.

**Acceptance Criteria**:
```gherkin
GIVEN valid input { cefrLevel: "B1", descriptorId: "uuid", topic: "Travel" }
WHEN POST /api/lessons/generate
THEN plan JSON returned
  AND plan passes Zod schema validation
  AND response time p95 < 5s
```

**Tests Required**:
- [ ] Unit tests for validation
- [ ] Integration test for API route
- [ ] Performance test (p95 < 5s)
- [ ] Contract test (schema validation)

**Risk/Notes**:
Retry on schema failure (max 2 attempts).

---

#### T-032: Zod Schemas for Plan JSON
**Epic**: EP-PLANNER
**Linked Requirements**: REQ-T-002
**Design Ref**: DESIGN §6.2
**Estimate**: S
**Dependencies**: T-031

**Description**:
Define Zod schemas for lesson plan structure (objectives, activities, materials, timings, assessment).

**Acceptance Criteria**:
```gherkin
GIVEN plan JSON from LLM
WHEN validated against PlanSchema
THEN valid plan passes
  AND invalid plan rejected with clear error messages
```

**Tests Required**:
- [ ] Unit tests for schema validation
- [ ] Fuzz tests with malformed inputs

**Risk/Notes**:
Schema must match LLM prompt instructions exactly.

---

#### T-033: Cache Plan Generation (Deterministic Key)
**Epic**: EP-PLANNER
**Linked Requirements**: REQ-T-002
**Design Ref**: DESIGN §6.5
**Estimate**: S
**Dependencies**: T-031, T-032

**Description**:
Implement caching layer for lesson plans. Cache key: `sha256(cefrLevel + descriptorId + topic)`. TTL: 30 days.

**Acceptance Criteria**:
```gherkin
GIVEN plan already generated for B1 + descriptor123 + "Travel"
WHEN same request made
THEN plan returned from cache
  AND no LLM call made
  AND response time < 100ms
  AND cache hit ratio > 80%
```

**Tests Required**:
- [ ] Unit tests for cache key generation
- [ ] Integration test for cache hit/miss
- [ ] Cache hit ratio monitoring

**Risk/Notes**:
Use Redis or in-memory LRU cache. Invalidate on descriptor updates.

---

#### T-034: Seed CEFR Descriptors
**Epic**: EP-PLANNER
**Linked Requirements**: REQ-T-001
**Design Ref**: DESIGN §6, spec/08-database.md
**Estimate**: S
**Dependencies**: T-002

**Description**:
Seed `cefr_descriptor` table with official CEFR 2018 descriptors (all levels, all domains).

**Acceptance Criteria**:
```gherkin
GIVEN empty cefr_descriptor table
WHEN running seed script
THEN all CEFR 2018 descriptors inserted
  AND accessible via GET /api/lessons/descriptors
```

**Tests Required**:
- [ ] Seed integrity test
- [ ] API endpoint test

**Risk/Notes**:
Source: https://www.coe.int/en/web/common-european-framework-reference-languages

---

### 4.5 Timetable (EP-TIMETABLE)

#### T-044: Timetable Query Optimisation (p95 < 200ms)
**Epic**: EP-TIMETABLE
**Linked Requirements**: REQ-T-006, REQ-S-001
**Design Ref**: DESIGN §7.1
**Estimate**: M
**Dependencies**: T-011

**Description**:
Optimise timetable queries with compound indexes. Prove p95 < 200ms via EXPLAIN ANALYZE.

**Acceptance Criteria**:
```gherkin
GIVEN teacher with 20 classes
WHEN querying timetable for week
THEN query completes in < 200ms (p95)
  AND EXPLAIN ANALYZE shows index usage
  AND cache hit ratio > 80%
```

**Tests Required**:
- [ ] Performance test (p95 measurement)
- [ ] EXPLAIN ANALYZE output in PR

**Risk/Notes**:
Add indexes on (teacher_id, week_range) and (student_id, week_range).

---

#### T-045: Student Timetable/Materials View
**Epic**: EP-TIMETABLE
**Linked Requirements**: REQ-S-001, REQ-T-005
**Design Ref**: DESIGN §7, §8
**Estimate**: M
**Dependencies**: T-044

**Description**:
Create student timetable view with materials access (signed URLs).

**Acceptance Criteria**:
```gherkin
GIVEN student enrolled in Class A
WHEN viewing timetable
THEN only Class A sessions shown
  AND materials accessible via signed URLs
  AND URLs expire in 24h
  AND RLS enforces enrolment check
```

**Tests Required**:
- [ ] RLS policy test (positive + negative)
- [ ] E2E test for timetable view
- [ ] Signed URL expiry test

**Risk/Notes**:
Materials served from Supabase Storage.

---

### 4.6 Register (Attendance) (EP-REGISTER)

#### T-050: Register UI (Bulk Present + Overrides)
**Epic**: EP-REGISTER
**Linked Requirements**: REQ-T-003, REQ-T-004
**Design Ref**: DESIGN §7.2
**Estimate**: M
**Dependencies**: T-011

**Description**:
Create register UI with keyboard shortcuts (P=Present, A=Absent, L=Late). Bulk present button + per-row overrides.

**Acceptance Criteria**:
```gherkin
GIVEN session with 20 students
WHEN pressing "P" hotkey
THEN all students marked Present
  AND UI shows success toast
  AND individual overrides persist on blur
  AND total time < 90s
```

**Tests Required**:
- [ ] E2E test for keyboard flow
- [ ] E2E test for bulk present
- [ ] Accessibility test (keyboard-only navigation)

**Risk/Notes**:
Optimistic UI with server reconciliation.

---

#### T-051: RLS Policies for RegisterEntry
**Epic**: EP-REGISTER
**Linked Requirements**: REQ-A-004, REQ-T-003
**Design Ref**: DESIGN §5.2, §7.2
**Estimate**: M
**Dependencies**: T-011

**Description**:
Implement RLS policies for register entries (teachers see own sessions, students see own records, admins see all in org).

**Acceptance Criteria**:
```gherkin
GIVEN teacher Alice owns Session 1
  AND teacher Bob owns Session 2
WHEN Alice queries register entries
THEN only Session 1 entries visible
  AND Session 2 entries not visible

GIVEN student enrolled in Session 1
WHEN student queries own attendance
THEN only own records visible
```

**Tests Required**:
- [ ] RLS policy tests (positive + negative)
- [ ] Rollback test

**Risk/Notes**:
CRITICAL: Test before deploying to production.

---

#### T-052: Hash-Chain Implementation for RegisterEntry
**Epic**: EP-REGISTER
**Linked Requirements**: REQ-A-002
**Design Ref**: DESIGN §7.2
**Estimate**: M
**Dependencies**: T-051

**Description**:
Implement hash-chained register entries for tamper evidence. `hash = sha256(payload || hash_prev)`.

**Acceptance Criteria**:
```gherkin
GIVEN previous entry with hash "abc123"
WHEN creating new entry
THEN new hash = sha256(payload + "abc123")
  AND new hash stored
  AND hash_prev = "abc123"
  AND tamper simulation fails insert
```

**Tests Required**:
- [ ] Unit test for hash computation
- [ ] Integration test for chain validation
- [ ] Tamper simulation test

**Risk/Notes**:
All edits must append new entries (immutable log).

---

#### T-053: Register Edit Window Policy
**Epic**: EP-REGISTER
**Linked Requirements**: REQ-T-003, REQ-A-002
**Design Ref**: DESIGN §7.2
**Estimate**: S
**Dependencies**: T-052

**Description**:
Enforce edit window policy: teachers can edit same-day, later edits require admin approval.

**Acceptance Criteria**:
```gherkin
GIVEN teacher marks attendance today
WHEN teacher edits same day
THEN edit allowed
  AND edit logged in AuditLog

GIVEN teacher marks attendance yesterday
WHEN teacher tries to edit
THEN edit blocked
  AND "Admin approval required" message shown
```

**Tests Required**:
- [ ] Unit test for edit policy
- [ ] E2E test for edit flow

**Risk/Notes**:
Policy configurable per org (future enhancement).

---

#### T-054: Weekly CSV Export with Audit Hash
**Epic**: EP-REGISTER
**Linked Requirements**: REQ-A-001
**Design Ref**: DESIGN §7, §15
**Estimate**: M
**Dependencies**: T-052

**Description**:
Implement weekly register export (CSV) with audit hash column. Signed URL with 24h expiry.

**Acceptance Criteria**:
```gherkin
GIVEN week range "2025-11-01 to 2025-11-07"
WHEN admin clicks "Export Register"
THEN CSV generated with columns: date, student, status, hash
  AND signed URL provided
  AND URL expires in < 24h
  AND export completes in < 60s (p95)
```

**Tests Required**:
- [ ] Integration test for export
- [ ] Performance test (p95 < 60s)
- [ ] URL expiry test

**Risk/Notes**:
Use ExcelJS for XLSX format (optional enhancement).

---

### 4.7 Student Profile (EP-PROFILE)

#### T-060: Profile Split Tables + RLS
**Epic**: EP-PROFILE
**Linked Requirements**: REQ-S-003
**Design Ref**: DESIGN §8
**Estimate**: M
**Dependencies**: T-011

**Description**:
Split student profile into `student_public` and `student_sensitive` with RLS policies.

**Acceptance Criteria**:
```gherkin
GIVEN student user
WHEN accessing own profile
THEN public + sensitive data visible

GIVEN teacher user
WHEN accessing student profile
THEN only public data visible
  AND sensitive data not returned

GIVEN admin user
WHEN accessing student profile
THEN public + sensitive data visible
```

**Tests Required**:
- [ ] RLS policy tests (positive + negative)
- [ ] E2E test for profile view

**Risk/Notes**:
Column-level encryption for DoB, emergency contacts.

---

#### T-061: Field Verification (Email/Phone)
**Epic**: EP-PROFILE
**Linked Requirements**: REQ-S-003
**Design Ref**: DESIGN §8.3
**Estimate**: M
**Dependencies**: T-060

**Description**:
Implement verification flow for email/phone updates. Send challenge code, verify, then update.

**Acceptance Criteria**:
```gherkin
GIVEN student updates email to "new@example.com"
WHEN clicking "Save"
THEN verification code sent to new email
  AND change logged in AuditLog
  AND email not updated until verified

GIVEN verification code "ABC123"
WHEN student enters code
THEN email updated
  AND AuditLog entry added
```

**Tests Required**:
- [ ] Unit test for verification logic
- [ ] Integration test for email sending
- [ ] E2E test for full flow

**Risk/Notes**:
Use Supabase Auth for email sending or Postmark/SendGrid.

---

### 4.8 Forum (EP-FORUM)

#### T-070: Forum Posts + Rate Limiter
**Epic**: EP-FORUM
**Linked Requirements**: REQ-S-004
**Design Ref**: DESIGN §9.1
**Estimate**: M
**Dependencies**: T-011

**Description**:
Implement forum posts with token bucket rate limiter (10 posts/10 min per user per class).

**Acceptance Criteria**:
```gherkin
GIVEN student in Class A
WHEN posting 10 messages in 1 minute
THEN all 10 succeed
  AND 11th post returns 429 RATE_LIMIT_EXCEEDED

GIVEN rate limit exceeded
WHEN waiting 10 minutes
THEN bucket refilled
  AND new posts allowed
```

**Tests Required**:
- [ ] Unit test for token bucket
- [ ] Integration test for rate limit enforcement
- [ ] E2E test for forum post flow

**Risk/Notes**:
Use in-memory token bucket or Redis for distributed rate limiting.

---

#### T-071: Moderation Queue + Flagging
**Epic**: EP-FORUM
**Linked Requirements**: REQ-S-004
**Design Ref**: DESIGN §9.2
**Estimate**: M
**Dependencies**: T-070

**Description**:
Implement moderation queue. Auto-hide posts after 3 flags. Teacher/admin can review and restore.

**Acceptance Criteria**:
```gherkin
GIVEN post flagged by 3 users
WHEN viewing forum
THEN post hidden for non-moderators
  AND post visible in moderation queue for teachers/admins

GIVEN teacher reviews flagged post
WHEN clicking "Restore"
THEN post unhidden
  AND flags cleared
```

**Tests Required**:
- [ ] Unit test for auto-hide trigger
- [ ] E2E test for flagging flow
- [ ] E2E test for moderation flow

**Risk/Notes**:
Profanity filter (best-effort, not stored in telemetry).

---

### 4.9 Observability (EP-OBSERVABILITY)

#### T-080: OpenTelemetry Integration
**Epic**: EP-OBSERVABILITY
**Linked Requirements**: REQ §9
**Design Ref**: DESIGN §10
**Estimate**: M
**Dependencies**: T-003

**Description**:
Integrate OpenTelemetry SDK for traces, metrics, logs. Export to Honeycomb or Grafana Cloud.

**Acceptance Criteria**:
```gherkin
GIVEN API route /api/lessons/generate
WHEN request made
THEN span created with name "POST /api/lessons/generate"
  AND span includes duration, status code
  AND span exported to OTEL_EXPORTER_ENDPOINT
```

**Tests Required**:
- [ ] Unit test for tracer setup
- [ ] Integration test for span creation

**Risk/Notes**:
Requires OTEL_EXPORTER_ENDPOINT in env vars.

---

#### T-081: PII Scrubbing in Telemetry
**Epic**: EP-OBSERVABILITY
**Linked Requirements**: REQ-A-005
**Design Ref**: DESIGN §10.2
**Estimate**: S
**Dependencies**: T-080

**Description**:
Implement PII scrubbing processor to redact emails, phones, names from spans/logs.

**Acceptance Criteria**:
```gherkin
GIVEN span with attribute "email=user@example.com"
WHEN span processed
THEN attribute value = "[REDACTED]"
  AND original value not exported
```

**Tests Required**:
- [ ] Unit test for scrubbing patterns
- [ ] Integration test for processor

**Risk/Notes**:
Never log JWTs, plan text, or raw PII.

---

### 4.10 Compliance (EP-COMPLIANCE)

#### T-090: DSR Export (Data Subject Request)
**Epic**: EP-COMPLIANCE
**Linked Requirements**: REQ-A-005, REQ-S-005
**Design Ref**: DESIGN §8, §15
**Estimate**: M
**Dependencies**: T-060

**Description**:
Implement DSR export endpoint. Returns JSON with all user data (profile, attendance, posts, audit logs).

**Acceptance Criteria**:
```gherkin
GIVEN student requests data export
WHEN admin approves
THEN JSON file generated with all user data
  AND signed URL provided
  AND URL expires in 30 days
  AND export includes: profile, attendance, forum posts, audit logs
```

**Tests Required**:
- [ ] Integration test for export completeness
- [ ] E2E test for DSR flow

**Risk/Notes**:
Must complete within 30 days per GDPR.

---

#### T-091: Retention Policy Job
**Epic**: EP-COMPLIANCE
**Linked Requirements**: REQ §7.3
**Design Ref**: DESIGN §8, REQ §7.3
**Estimate**: M
**Dependencies**: T-090

**Description**:
Implement scheduled job to delete data past retention periods (forum posts 24 months, access logs 12 months).

**Acceptance Criteria**:
```gherkin
GIVEN forum post created 25 months ago
WHEN retention job runs
THEN post deleted
  AND deletion logged in AuditLog

GIVEN attendance record created 5 years ago
WHEN retention job runs
THEN record retained (7-year retention)
```

**Tests Required**:
- [ ] Unit test for retention logic
- [ ] Integration test for job execution

**Risk/Notes**:
Honour "legal hold" flag (do not delete).

---

### 4.11 Deployment (EP-DEPLOY)

#### T-100: Production Deployment (Vercel + Supabase)
**Epic**: EP-DEPLOY
**Linked Requirements**: REQ §9
**Design Ref**: DESIGN §15
**Estimate**: M
**Dependencies**: T-003, T-080

**Description**:
Deploy to Vercel (frontend + API routes) and Supabase (database + storage). Configure environments (dev/staging/prod).

**Acceptance Criteria**:
```gherkin
GIVEN production environment
WHEN deploying to Vercel
THEN app accessible at https://mycastle.app
  AND database connected to Supabase prod
  AND all environment variables set
  AND HTTPS enforced
```

**Tests Required**:
- [ ] Smoke test on production
- [ ] Health check endpoint

**Risk/Notes**:
Separate Supabase projects for staging/prod.

---

#### T-101: Backup Strategy (Nightly + WAL)
**Epic**: EP-DEPLOY
**Linked Requirements**: REQ §15
**Design Ref**: DESIGN §15.3
**Estimate**: S
**Dependencies**: T-100

**Description**:
Configure nightly automated backups (Supabase) + WAL archiving. Recovery drills quarterly.

**Acceptance Criteria**:
```gherkin
GIVEN backup job scheduled
WHEN job runs nightly
THEN full backup created
  AND WAL archived
  AND backup retention = 30 days
  AND recovery drill documented
```

**Tests Required**:
- [ ] Restore test from backup

**Risk/Notes**:
RTO: 4 hours, RPO: 24 hours.

---

#### T-102: Monitoring & Alerting
**Epic**: EP-DEPLOY
**Linked Requirements**: REQ §9
**Design Ref**: DESIGN §10
**Estimate**: M
**Dependencies**: T-080, T-100

**Description**:
Set up monitoring dashboards (Grafana or Honeycomb) and alerting (PagerDuty or Slack).

**Acceptance Criteria**:
```gherkin
GIVEN production environment
WHEN p95 latency exceeds 2s
THEN alert triggered
  AND team notified via Slack

GIVEN database connection pool exhausted
WHEN connections >= 90% capacity
THEN alert triggered
```

**Tests Required**:
- [ ] Alert simulation test

**Risk/Notes**:
Define SLOs: p95 latency, error rate, uptime.

---

#### T-103: Traceability Dashboard
**Epic**: EP-DEPLOY
**Linked Requirements**: REQ §15
**Design Ref**: REQ §15, TASKS §10
**Estimate**: S
**Dependencies**: T-001

**Description**:
Generate traceability dashboard (HTML page) showing REQ ↔ DESIGN ↔ TASK mappings.

**Acceptance Criteria**:
```gherkin
GIVEN all docs in repo
WHEN running `npm run traceability`
THEN HTML page generated
  AND all REQ IDs linked to DESIGN sections
  AND all DESIGN sections linked to TASKS
  AND broken links highlighted
```

**Tests Required**:
- [ ] Script test (links not broken)

**Risk/Notes**:
Embed in README as "Status" badge.

---

## 5. Testing Strategy

### 5.1 Test Pyramid
```
         /\
        /E2E\       (10% — Critical user flows)
       /------\
      /  INT   \    (30% — API contracts, RLS policies)
     /----------\
    /    UNIT    \  (60% — Logic, schemas, utils)
   /--------------\
```

### 5.2 Test Types

#### Unit Tests (Jest)
- Zod schemas
- Utility functions
- Hash chain logic
- Token bucket
- Cache key generation

#### Integration Tests (Jest + Testcontainers)
- RLS policies (SQL tests)
- API contracts
- Database queries
- MCP protocol

#### E2E Tests (Playwright)
- Login/logout flow
- Lesson plan generation
- Register marking (keyboard flow)
- Weekly export
- Forum post flow

#### Performance Tests (k6 or Playwright)
- Timetable query (p95 < 200ms)
- Plan generation (p95 < 5s)
- Register write (p95 < 300ms)
- Export job (p95 < 60s)

#### RLS Policy Tests (SQL)
- Positive cases (authorized access works)
- Negative cases (unauthorized access blocked)
- Rollback test (misconfigured policy rejected)

### 5.3 Fixtures
- Seed minimal org/class/session/enrolments
- CEFR descriptor seed
- Test users (admin, teacher, student)

---

## 6. CI/CD Pipeline Tasks

```
┌─────────┐   ┌──────────┐   ┌──────┐   ┌──────────┐   ┌──────┐   ┌────────┐   ┌────────┐   ┌────────┐
│  Lint   │──▶│ Typecheck│──▶│ Unit │──▶│Integration│──▶│ E2E  │──▶│ Build  │──▶│Migrate │──▶│ Deploy │
└─────────┘   └──────────┘   └──────┘   └──────────┘   └──────┘   └────────┘   └────────┘   └────────┘
```

**Gates**:
- Fail on uncovered RLS tables
- Fail on performance budget violations (T-044)
- Fail on missing traceability links (T-103)

---

## 7. Code Ownership & Review Checklist

### 7.1 Owners
| Domain | Owner | Backup |
|--------|-------|--------|
| **Auth/RLS** | Senior Backend | Platform |
| **Planner/LLM** | Full-stack | AI/ML |
| **Register/Timetable** | Full-stack | Backend |
| **Observability/Compliance** | Platform | DevOps |

### 7.2 Review Checklist
Before approving PR:
- [ ] Traceability links present (REQ/DESIGN comments in code)
- [ ] RLS tests added/updated
- [ ] Schema changes have migrations
- [ ] Accessibility notes (if UI change)
- [ ] OTel spans added (if new API route)
- [ ] Secrets not leaked
- [ ] Performance budget proven (if applicable)
- [ ] DoD checklist complete

---

## 8. Milestones & Releases

### 8.1 Milestone 1: Teacher MVP (Weeks 1-4)
**Goal**: Core teacher workflows operational
**Tasks**: T-001→T-023, T-031→T-034, T-044, T-050→T-053
**Deliverables**:
- ✅ Lesson planner (AI-assisted)
- ✅ Timetable (cached, p95 < 200ms)
- ✅ Register UI (keyboard-first)
- ✅ RLS core policies

**Exit Criteria**:
- All p95 budgets met
- RLS tests pass
- E2E tests green

---

### 8.2 Milestone 2: Admin Ops (Weeks 5-8)
**Goal**: Admin workflows for compliance and reporting
**Tasks**: T-054, T-021, T-090→T-091
**Deliverables**:
- ✅ Weekly exports (CSV with hash)
- ✅ Audit trail view
- ✅ DSR export
- ✅ Admin MCP server

**Exit Criteria**:
- Export uptime 99.9%
- Audit hash validation passes
- DSR completes < 30 days

---

### 8.3 Milestone 3: Student View + Forum (Weeks 9-12)
**Goal**: Student self-service and engagement
**Tasks**: T-060→T-061, T-045, T-070→T-071, T-023
**Deliverables**:
- ✅ Student profile (split tables)
- ✅ Timetable view (materials access)
- ✅ Forum (rate limits + moderation)
- ✅ Student MCP server

**Exit Criteria**:
- Profile verification works
- Forum rate limits enforced
- Moderation queue functional

---

### 8.4 Milestone 4: Hardening & Observability (Weeks 13-16)
**Goal**: Production-ready with observability
**Tasks**: T-080→T-081, T-090, T-100→T-103
**Deliverables**:
- ✅ OTel integration (PII scrubbed)
- ✅ Threat model doc
- ✅ Traceability dashboard
- ✅ Production deployment
- ✅ Monitoring/alerting

**Exit Criteria**:
- No PII in telemetry
- All SLOs defined and tracked
- Backups tested
- Traceability 100%

---

## 9. Risk Log & Blockers (Rolling)

| Risk | Impact | Likelihood | Mitigation | Owner | Status |
|------|--------|------------|------------|-------|--------|
| **LLM provider latency spikes** | High | Medium | Fallback cache, lower model size, queue requests | AI/ML | 🟡 Monitoring |
| **RLS complexity** | Critical | Medium | Dedicate policy tests, peer review on migrations | Backend | 🟢 Mitigated |
| **Spec drift** | Medium | High | Weekly spec review, dashboard (T-103) | Product | 🟡 In Progress |
| **PII leakage in telemetry** | Critical | Low | PII scrubbing processor (T-081) | Platform | 🟢 Mitigated |
| **DB performance degradation** | High | Medium | Query budgets, EXPLAIN ANALYZE in PR (T-044) | Backend | 🟢 Mitigated |

---

## 10. Traceability Dashboard (Mechanics)

### 10.1 Implementation
```bash
# Script: scripts/generate-traceability.sh
#!/bin/bash

# 1. Scan REQ.md for REQ-* IDs
grep -oP 'REQ-[A-Z]-\d{3}' REQ.md | sort | uniq > /tmp/req-ids.txt

# 2. Scan DESIGN.md for DESIGN §X references
grep -oP 'DESIGN §\d+' DESIGN.md | sort | uniq > /tmp/design-refs.txt

# 3. Scan TASKS.md for T-XXX IDs
grep -oP 'T-\d{3}' TASKS.md | sort | uniq > /tmp/task-ids.txt

# 4. Generate HTML matrix
# (Implementation: Node.js script to cross-reference and output HTML)

# 5. Embed in README
# [![Traceability](./traceability.html)](./traceability.html)
```

### 10.2 Dashboard Features
- Filter by REQ/DESIGN/TASK
- Highlight broken links (missing references)
- Progress bars per Epic
- Export to JSON for CI validation

---

## 11. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.0.0 | 2025-11-07 | Eoin Malone + Claude Code | Added 34 migration tasks (T-110 to T-143) for 8-MCP v3.0 architecture, 4-phase rollout plan |
| 2.1.0 | 2025-11-07 | Eoin Malone + Claude Code | Integrated TASKS structure with MCP architecture |
| 2.0.0 | 2025-10-31 | Eoin Malone + Claude Code | Complete MCP architecture restructure |
| 1.0.0 | 2025-10-30 | Eoin Malone | Initial task breakdown |

---

## 12. Summary Statistics

| Metric | Count | Status |
|--------|-------|--------|
| **Total Tasks** | 76 (42 core + 34 migration) | ✅ Defined |
| **Migration Tasks** | 34 (T-110 to T-143) | ✅ Defined |
| **Epics** | 11 | ✅ Defined |
| **Milestones** | 4 core + 4 migration phases | ✅ Defined |
| **Test Types** | 5 | ✅ Defined |
| **Traceability Links** | 100% | ✅ Complete |
| **MCP Architecture** | v3.0 (8 MCPs, all ≤10 tools) | ✅ Specified |

---

**Status**: ✅ Complete and aligned with REQ.md and DESIGN.md
**Next Review**: 2025-11-14 (weekly sprint planning)
**Sign-off**: Pending product and engineering review
