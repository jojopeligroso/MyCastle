# MyCastle MVP Sprint Plan (Teacher MVP)

> **Version:** 1.0.0 | **Created:** 2025-11-07 | **Target MVP:** 2025-01-13 to 2025-01-27

---

## Executive Summary

**MVP Goal**: Deliver Teacher MVP with core workflows (authentication, timetable, lesson planning, attendance)

**Duration**: 8-10 weeks (4-5 sprints × 2 weeks)

**Team Size**: 1 full-time developer (40h/week)

**Architecture**: v3.0 8-MCP domain-driven (starting with Teacher + Academic MCPs only)

**Target Date**: 2025-01-13 (conservative) to 2025-01-27 (with buffer)

---

## Sprint Overview

| Sprint | Dates | Focus | Tasks | Story Points | Deliverable |
|--------|-------|-------|-------|--------------|-------------|
| **Sprint 0** | Nov 11-22 | Foundation | T-001, T-002, T-003, T-010 | 21 | Auth + DB working |
| **Sprint 1** | Nov 25-Dec 6 | MCP Infrastructure | T-011, T-020, T-022, T-034 | 26 | Teacher MCP live |
| **Sprint 2** | Dec 9-20 | Lesson Planner | T-031, T-032, T-033 | 18 | AI lesson generation |
| **Sprint 3** | Jan 6-17 | Timetable & Register | T-044, T-050, T-051, T-052 | 24 | Full teacher workflows |
| **Sprint 4** | Jan 20-31 | Polish & UAT | Testing, fixes, deployment | 15 | Production-ready MVP |

**Total**: 104 story points over 10 weeks

---

## Story Point Scale

| Size | Points | Time Estimate | Examples |
|------|--------|---------------|----------|
| **XS** | 1-2 | < 4 hours | Config changes, simple UI |
| **S** | 3-5 | 4-8 hours | Small features, basic CRUD |
| **M** | 8-13 | 1-2 days | Medium features, API endpoints |
| **L** | 13-21 | 3-5 days | Large features, complex logic |
| **XL** | 21-34 | 1-2 weeks | Very large features, MCP servers |

---

## Sprint 0: Foundation (Nov 11-22, 2025)

**Goal**: Set up project infrastructure, database, and authentication

**Velocity Target**: 21 points

**Critical Path**: T-001 → T-002 → T-010

### Week 1 (Nov 11-14)

#### Day 1 (Monday): Project Initialization
**Tasks**: T-001 (Project init)
- [ ] Create Next.js 15 app with TypeScript
- [ ] Configure ESLint + Prettier
- [ ] Set up Tailwind CSS
- [ ] Configure Git + .gitignore
- [ ] Initialize Vercel project
- [ ] Create development environment

**Points**: 3 (S)
**Deliverable**: `npm run dev` works, localhost:3000 accessible

---

#### Day 2 (Tuesday): Database Schema
**Tasks**: T-002 (Database setup) - Part 1
- [ ] Create Supabase project
- [ ] Install Drizzle ORM
- [ ] Define core schema (Organisation, User, Teacher, Student)
- [ ] Define academic schema (Class, Session, Enrolment)
- [ ] Create migration files

**Points**: 5 (partial, continue next day)
**Deliverable**: Schema files created

---

#### Day 3 (Wednesday): Database Setup
**Tasks**: T-002 (Database setup) - Part 2
- [ ] Define attendance schema (RegisterEntry, AuditLog)
- [ ] Define curriculum schema (CEFRDescriptor, Plan, Material)
- [ ] Run first migration
- [ ] Test connection pool
- [ ] Seed test data

**Points**: 8 (M) - total for T-002
**Deliverable**: Database migrated, seedable

---

#### Day 4 (Thursday): CI/CD Pipeline
**Tasks**: T-003 (CI/CD)
- [ ] Set up GitHub Actions workflow
- [ ] Configure lint job
- [ ] Configure typecheck job
- [ ] Configure build job
- [ ] Set up Vercel preview deployments
- [ ] Add status badges to README

**Points**: 5 (S)
**Deliverable**: PR triggers CI, preview deploy works

---

### Week 2 (Nov 18-22)

#### Day 5-6 (Monday-Tuesday): Supabase Auth
**Tasks**: T-010 (Supabase Auth integration)
- [ ] Install Supabase Auth SDK
- [ ] Create auth provider component
- [ ] Build login page UI
- [ ] Implement email/password auth
- [ ] Add JWT session handling
- [ ] Create protected route middleware
- [ ] Build logout flow

**Points**: 8 (M)
**Deliverable**: Teachers can log in/out

---

#### Day 7-8 (Wednesday-Thursday): Sprint Buffer & Review
- [ ] Write unit tests for auth
- [ ] Fix any bugs from Week 1
- [ ] Code review cleanup
- [ ] Update documentation
- [ ] Sprint retrospective

**Points**: 2 (buffer)

---

#### Day 9-10 (Friday): Sprint Demo & Planning
- [ ] Demo auth flow to stakeholders
- [ ] Review sprint velocity (target: 21 points)
- [ ] Plan Sprint 1 tasks
- [ ] Groom backlog

---

### Sprint 0 Deliverables

**Must Have**:
- ✅ Next.js app running locally and deployed to Vercel
- ✅ Supabase database with core schema migrated
- ✅ Teachers can authenticate (login/logout)
- ✅ CI/CD pipeline working (lint, typecheck, build, preview)

**Acceptance Criteria**:
```gherkin
GIVEN a teacher user exists in database
WHEN teacher navigates to /login
  AND enters valid email/password
  AND clicks "Login"
THEN teacher is redirected to /dashboard
  AND JWT token is stored in httpOnly cookie
  AND teacher can access protected routes
```

**Risks**:
- ⚠️ Supabase RLS complexity (mitigated: defer complex policies to Sprint 1)
- ⚠️ First-time Next.js 15 setup issues (mitigated: follow official docs closely)

---

## Sprint 1: MCP Infrastructure (Nov 25-Dec 6, 2025)

**Goal**: Build MCP Host and Teacher MCP server

**Velocity Target**: 26 points

**Critical Path**: T-011 → T-020 → T-022

### Week 3 (Nov 25-29)

#### Day 11 (Monday): RLS Policies (Core)
**Tasks**: T-011 (RLS policies - teacher-only for MVP)
- [ ] Create RLS policies for Teacher table
- [ ] Create RLS policies for Class table (teacher sees assigned classes)
- [ ] Create RLS policies for Session table
- [ ] Write policy test suite
- [ ] Document policy decisions

**Points**: 13 (L)
**Deliverable**: Teacher-scoped RLS policies tested

---

#### Day 12-14 (Tuesday-Thursday): MCP Host Service
**Tasks**: T-020 (MCP Host) - Part 1
- [ ] Install @modelcontextprotocol/sdk
- [ ] Create MCP Host service structure
- [ ] Implement scope-based routing logic
- [ ] Build session management
- [ ] Add JWT verification in Host

**Points**: 13 (partial XL, continue next week)

---

### Week 4 (Dec 2-6)

#### Day 15-16 (Monday-Tuesday): MCP Host Service (cont.)
**Tasks**: T-020 (MCP Host) - Part 2
- [ ] Implement context aggregation
- [ ] Add error handling
- [ ] Write Host unit tests
- [ ] Test stdio transport (local dev)
- [ ] Document Host API

**Points**: 21 (XL) - total for T-020
**Deliverable**: MCP Host can route to MCPs

---

#### Day 17-19 (Wednesday-Friday): Teacher MCP Server
**Tasks**: T-022 (Teacher MCP)
- [ ] Create Teacher MCP server structure
- [ ] Define 10 tools (view_timetable, create_lesson_plan, etc.)
- [ ] Implement resource endpoints (timetable, plans, registers)
- [ ] Add prompt templates for teaching tasks
- [ ] Write tool unit tests
- [ ] Test MCP protocol integration with Host

**Points**: 21 (XL)
**Deliverable**: Teacher MCP responds to basic queries

---

#### Day 20 (Friday afternoon): Seed CEFR Descriptors
**Tasks**: T-034 (Seed CEFR descriptors)
- [ ] Download CEFR 2018 descriptor data
- [ ] Create seed script
- [ ] Populate cefr_descriptor table
- [ ] Verify via GET /api/lessons/descriptors

**Points**: 3 (S)
**Deliverable**: CEFR descriptors available in DB

---

### Sprint 1 Deliverables

**Must Have**:
- ✅ MCP Host service routing requests to Teacher MCP
- ✅ Teacher MCP responding with structured data
- ✅ RLS policies enforcing teacher-only access
- ✅ CEFR descriptors seeded in database

**Acceptance Criteria**:
```gherkin
GIVEN authenticated teacher
WHEN sending message "Show my timetable" to MCP Host
THEN Host routes to Teacher MCP (scope: teacher:*)
  AND Teacher MCP fetches timetable data (RLS-filtered)
  AND Host returns structured response
  AND response time < 2s
```

**Risks**:
- ⚠️ MCP protocol learning curve (mitigated: use SDK examples, Archon for testing)
- ⚠️ stdio vs HTTPS transport confusion (mitigated: start with stdio only for MVP)

---

## Sprint 2: Lesson Planner (AI-Assisted) (Dec 9-20, 2025)

**Goal**: Teachers can generate CEFR-aligned lesson plans with AI

**Velocity Target**: 18 points

**Critical Path**: T-031 → T-032 → T-033

### Week 5 (Dec 9-13)

#### Day 21-22 (Monday-Tuesday): Lesson Generation API
**Tasks**: T-031 (API POST /api/lessons/generate)
- [ ] Create API route `/api/lessons/generate`
- [ ] Implement input validation (Zod)
- [ ] Integrate OpenAI API with CEFR descriptors
- [ ] Build deterministic prompt from descriptor text
- [ ] Add retry logic (max 2 attempts) for schema failures
- [ ] Handle LLM timeout (4s max)

**Points**: 13 (M)
**Deliverable**: API generates lesson plans (uncached)

---

#### Day 23 (Wednesday): Plan JSON Schema
**Tasks**: T-032 (Zod schemas for Plan JSON)
- [ ] Define PlanSchema (objectives, activities, materials, timings, assessment)
- [ ] Write schema validation tests
- [ ] Add fuzz tests for malformed inputs
- [ ] Document schema in API docs

**Points**: 3 (S)
**Deliverable**: Plan JSON validated against schema

---

#### Day 24-25 (Thursday-Friday): Caching & UI
**Tasks**: T-033 (Cache plan generation)
- [ ] Implement cache key generation `sha256(level+descriptorId+topic)`
- [ ] Add in-memory LRU cache (or Redis if available)
- [ ] Set TTL to 30 days
- [ ] Track cache hit ratio in metrics
- [ ] Build lesson planner UI (form + results display)

**Points**: 5 (S)
**Deliverable**: Cached plans, planner UI working

---

### Week 6 (Dec 16-20)

#### Day 26-28 (Monday-Wednesday): UI Polish & Testing
- [ ] Add loading states to planner UI
- [ ] Implement error handling (LLM timeout, schema failure)
- [ ] Write E2E test for lesson generation (Playwright)
- [ ] Performance test (p95 < 5s)
- [ ] Add success/error toast notifications

---

#### Day 29-30 (Thursday-Friday): Sprint Buffer & Demo
- [ ] Fix bugs from testing
- [ ] Improve prompt engineering for better plans
- [ ] Code review
- [ ] Sprint demo to stakeholders

---

### Sprint 2 Deliverables

**Must Have**:
- ✅ Teachers can generate CEFR-aligned lesson plans via UI
- ✅ Plans generated in < 5s (p95)
- ✅ Plans validated against schema
- ✅ Plans cached for reuse (>80% hit ratio after warmup)

**Acceptance Criteria**:
```gherkin
GIVEN teacher selects CEFR level "B1" and descriptor "Listening—global comprehension"
  AND enters topic "Travel and Tourism"
WHEN clicking "Generate Plan"
THEN plan JSON returned in < 5s
  AND plan includes objectives, activities, materials, timings, assessment
  AND plan passes Zod schema validation
  AND plan stored in database with cache key
  AND UI displays plan with expandable sections
```

**Risks**:
- ⚠️ LLM nondeterminism (mitigated: strict schema, retry logic, seed plans if needed)
- ⚠️ OpenAI API costs (mitigated: cache aggressively, monitor usage)

---

## Sprint 3: Timetable & Attendance (Jan 6-17, 2025)

**Goal**: Teachers can view timetable and mark attendance

**Velocity Target**: 24 points

**Critical Path**: T-044, T-050 → T-051 → T-052

### Week 7 (Jan 6-10)

#### Day 31-32 (Monday-Tuesday): Timetable Optimization
**Tasks**: T-044 (Timetable query p95 < 200ms)
- [ ] Create compound indexes on (teacher_id, week_range)
- [ ] Optimize SQL query for teacher timetable
- [ ] Implement Next.js revalidateTag caching
- [ ] Run EXPLAIN ANALYZE and document results
- [ ] Write performance tests (p95 measurement)
- [ ] Build timetable UI (weekly view)

**Points**: 8 (M)
**Deliverable**: Timetable loads in < 200ms

---

#### Day 33-34 (Wednesday-Thursday): Register UI
**Tasks**: T-050 (Register UI bulk present + overrides)
- [ ] Build register UI with student roster
- [ ] Implement keyboard shortcuts (P=Present, A=Absent, L=Late)
- [ ] Add "Mark All Present" bulk button
- [ ] Enable per-row overrides (dropdown or keyboard)
- [ ] Implement optimistic UI updates
- [ ] Add success/error toasts

**Points**: 8 (M)
**Deliverable**: Register UI with keyboard flow

---

#### Day 35 (Friday): RLS for Register
**Tasks**: T-051 (RLS for RegisterEntry)
- [ ] Create RLS policies for RegisterEntry (teacher sees own sessions)
- [ ] Write positive policy tests (teacher can read/write own)
- [ ] Write negative policy tests (teacher cannot read others')
- [ ] Test rollback on policy misconfiguration

**Points**: 5 (S)
**Deliverable**: RLS policies protect register data

---

### Week 8 (Jan 13-17)

#### Day 36-37 (Monday-Tuesday): Hash-Chain Implementation
**Tasks**: T-052 (Hash-chain for RegisterEntry)
- [ ] Implement `hash = sha256(payload || hash_prev)` function
- [ ] Update RegisterEntry insert to compute hash
- [ ] Add hash validation on read
- [ ] Store previous hash in hash_prev column
- [ ] Write unit tests for hash computation
- [ ] Write integration test for chain validation
- [ ] Test tamper simulation (should fail insert)

**Points**: 8 (M)
**Deliverable**: Tamper-evident register with hash chain

---

#### Day 38-40 (Wednesday-Friday): Integration & Testing
- [ ] Integrate register UI with hash-chain backend
- [ ] Write E2E test for attendance marking flow
- [ ] Test bulk present + individual overrides
- [ ] Verify hash chain integrity after multiple edits
- [ ] Accessibility test (keyboard-only navigation)
- [ ] Performance test (mark 30 students in < 90s)

**Points**: 3 (buffer)

---

### Sprint 3 Deliverables

**Must Have**:
- ✅ Teachers can view weekly timetable (< 200ms p95)
- ✅ Teachers can mark attendance with keyboard shortcuts
- ✅ Bulk "Mark All Present" + individual overrides work
- ✅ Attendance records are hash-chained (tamper-evident)

**Acceptance Criteria**:
```gherkin
GIVEN teacher viewing session with 20 students
WHEN pressing "P" hotkey
THEN all 20 students marked Present
  AND UI shows success toast
  AND optimistic UI updates immediately

WHEN teacher overrides student #5 to "Absent"
THEN student #5 status updates to Absent
  AND hash chain recomputed
  AND total time < 90s for full flow
  AND hash_prev links to previous entry
```

**Risks**:
- ⚠️ Hash chain performance on large datasets (mitigated: index hash_prev, optimize query)
- ⚠️ RLS policy debugging (mitigated: comprehensive test suite)

---

## Sprint 4: Polish & User Acceptance Testing (Jan 20-31, 2025)

**Goal**: Production-ready MVP with bug fixes and deployment

**Velocity Target**: 15 points (intentionally lower for polish/testing)

### Week 9 (Jan 20-24)

#### Day 41-42 (Monday-Tuesday): E2E Testing
- [ ] Write comprehensive E2E test suite (Playwright)
  - [ ] Login flow
  - [ ] View timetable
  - [ ] Generate lesson plan
  - [ ] Mark attendance
  - [ ] Logout
- [ ] Run tests in CI pipeline
- [ ] Fix any E2E test failures

**Points**: 5

---

#### Day 43-44 (Wednesday-Thursday): Bug Fixes & Performance
- [ ] Fix bugs discovered in testing
- [ ] Optimize slow queries (if any)
- [ ] Improve error messages
- [ ] Add missing loading states
- [ ] Improve accessibility (WCAG 2.2 AA)

**Points**: 5

---

#### Day 45 (Friday): Documentation
- [ ] Write user guide for teachers
- [ ] Create API documentation
- [ ] Update README with deployment instructions
- [ ] Document known limitations
- [ ] Create troubleshooting guide

**Points**: 3

---

### Week 10 (Jan 27-31)

#### Day 46-47 (Monday-Tuesday): User Acceptance Testing
- [ ] Deploy to staging environment
- [ ] Onboard 2-3 beta teachers
- [ ] Conduct UAT sessions
- [ ] Collect feedback
- [ ] Prioritize feedback for post-MVP

**Points**: 5

---

#### Day 48-49 (Wednesday-Thursday): Production Deployment
- [ ] Create production Supabase project
- [ ] Run migrations on prod database
- [ ] Configure production environment variables
- [ ] Deploy to Vercel production
- [ ] Smoke test production deployment
- [ ] Set up monitoring/alerts

**Points**: 3

---

#### Day 50 (Friday): MVP Launch & Retrospective
- [ ] Announce MVP to teachers
- [ ] Monitor for issues
- [ ] Conduct team retrospective
- [ ] Plan post-MVP roadmap
- [ ] Celebrate! 🎉

---

### Sprint 4 Deliverables

**Must Have**:
- ✅ All E2E tests passing
- ✅ Deployed to production
- ✅ UAT completed with 2-3 beta teachers
- ✅ User documentation published
- ✅ Zero critical bugs

**Acceptance Criteria**:
```gherkin
GIVEN MVP deployed to production
WHEN beta teacher performs full workflow (login → view timetable → generate plan → mark attendance → logout)
THEN all features work as specified
  AND no critical bugs encountered
  AND p95 latencies meet targets (<200ms timetable, <5s plan, <300ms register)
  AND teacher satisfaction score ≥ 4/5
```

---

## Velocity Tracking

| Sprint | Planned Points | Completed Points | Variance | Notes |
|--------|----------------|------------------|----------|-------|
| Sprint 0 | 21 | TBD | - | Foundation |
| Sprint 1 | 26 | TBD | - | MCP Infrastructure |
| Sprint 2 | 18 | TBD | - | Lesson Planner |
| Sprint 3 | 24 | TBD | - | Timetable & Register |
| Sprint 4 | 15 | TBD | - | Polish & UAT |
| **Total** | **104** | **TBD** | - | - |

**Target Velocity**: 21-26 points per 2-week sprint (single developer)

---

## Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **LLM provider outage** | Low | High | Cache aggressively, add fallback templates | Developer |
| **RLS policy bugs** | Medium | Critical | Comprehensive test suite, peer review | Developer |
| **Performance regressions** | Medium | Medium | Performance tests in CI, p95 budgets | Developer |
| **Scope creep** | High | Medium | Strict MVP definition, defer post-MVP features | Product |
| **Developer unavailability** | Low | High | Document everything, clear handoff notes | Developer |

---

## Definition of Done (Sprint-Level)

Each sprint is considered "done" when:
- ✅ All planned tasks completed and tested
- ✅ Code reviewed (self-review + automated tools)
- ✅ Unit tests written and passing (>80% coverage for new code)
- ✅ Integration tests passing (if applicable)
- ✅ E2E tests passing (if applicable)
- ✅ Performance budgets met (p95 latencies)
- ✅ RLS policies tested (if applicable)
- ✅ Documentation updated (code comments, README, user docs)
- ✅ Deployed to staging and smoke tested
- ✅ Sprint demo completed
- ✅ Retrospective conducted

---

## Post-MVP Roadmap (Weeks 11+)

### Sprint 5-6: Admin Operations (Weeks 11-14)
**Tasks**: T-110 (Identity MCP), T-111 (Finance MCP), T-120 (Academic MCP), T-054 (CSV exports)
**Deliverable**: Admin can manage users, classes, and export registers

### Sprint 7-8: Student Portal (Weeks 15-18)
**Tasks**: T-023 (Student MCP), T-045 (Student timetable), T-141 (Optimize Student MCP to 10 tools)
**Deliverable**: Students can view timetable, materials, and track progress

### Sprint 9-10: Full Platform (Weeks 19-22)
**Tasks**: T-070 (Forum), T-080 (OTel), T-143 (Final E2E tests for 8-MCP)
**Deliverable**: Complete 8-MCP architecture with forum and observability

---

## Success Metrics

### MVP Success Criteria (End of Sprint 4)

**Technical Metrics**:
- ✅ p95 timetable load < 200ms
- ✅ p95 lesson generation < 5s
- ✅ p95 register write < 300ms
- ✅ Cache hit ratio > 80% (after warmup)
- ✅ Test coverage > 80% (new code)
- ✅ Zero critical bugs in production

**User Metrics** (after 2 weeks in production):
- ✅ Teacher satisfaction ≥ 4/5
- ✅ Daily active teachers ≥ 5
- ✅ Lesson plans generated ≥ 20/week
- ✅ Attendance marked for ≥ 90% of sessions
- ✅ Average session duration < 5 minutes (efficiency)

**Business Metrics**:
- ✅ 60% reduction in lesson planning time (user-reported)
- ✅ 50% reduction in attendance marking time (measured)
- ✅ Zero data leaks or security incidents

---

## Appendix A: Daily Standup Template

**What I did yesterday**:
- [Task completed]
- [Progress on ongoing task]

**What I'm doing today**:
- [Task planned]
- [Expected completion time]

**Blockers**:
- [Any blockers or risks]
- [Help needed]

**Velocity Update**:
- Points completed this sprint: X / Y
- On track? Yes / No / At risk

---

## Appendix B: Sprint Retrospective Template

**What went well?**
- [Successes]
- [Wins]

**What didn't go well?**
- [Challenges]
- [Failures]

**What can we improve?**
- [Action items for next sprint]
- [Process changes]

**Shout-outs**:
- [Recognition]

---

## Appendix C: Task Dependency Graph

```
T-001 (Project Init)
  └─→ T-002 (Database Setup)
       └─→ T-010 (Supabase Auth)
            └─→ T-011 (RLS Policies)
                 └─→ T-020 (MCP Host)
                      ├─→ T-022 (Teacher MCP)
                      │    └─→ T-031 (Lesson API)
                      │         └─→ T-032 (Zod Schemas)
                      │              └─→ T-033 (Caching)
                      │
                      └─→ T-034 (CEFR Seed)

T-011 (RLS Policies)
  └─→ T-044 (Timetable Optimization)
  └─→ T-050 (Register UI)
       └─→ T-051 (RLS for Register)
            └─→ T-052 (Hash-Chain)

T-003 (CI/CD) runs in parallel with T-002
```

---

**Sprint Plan Status**: ✅ Ready for execution
**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Next Review**: End of Sprint 0 (Nov 22, 2025)
