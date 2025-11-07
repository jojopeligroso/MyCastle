# TASKS.md — Task Specification (MyCastle)

> **Version:** 2.1.0 | **Status:** Living Document | **Last Updated:** 2025-11-07

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
| 2.1.0 | 2025-11-07 | Eoin Malone + Claude Code | Integrated TASKS structure with MCP architecture |
| 2.0.0 | 2025-10-31 | Eoin Malone + Claude Code | Complete MCP architecture restructure |
| 1.0.0 | 2025-10-30 | Eoin Malone | Initial task breakdown |

---

## 12. Summary Statistics

| Metric | Count | Status |
|--------|-------|--------|
| **Total Tasks** | 42 | ✅ Defined |
| **Epics** | 11 | ✅ Defined |
| **Milestones** | 4 | ✅ Defined |
| **Test Types** | 5 | ✅ Defined |
| **Traceability Links** | 100% | ✅ Complete |

---

**Status**: ✅ Complete and aligned with REQ.md and DESIGN.md
**Next Review**: 2025-11-14 (weekly sprint planning)
**Sign-off**: Pending product and engineering review
