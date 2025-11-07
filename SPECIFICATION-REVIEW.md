# MyCastle Specification Review

> **Review Date:** 2025-11-07 | **Reviewer:** Claude Code | **Version Reviewed:** 2.1.0

---

## Executive Summary

✅ **Overall Status**: Specifications are complete, well-structured, and traceable
⚠️ **Critical Finding**: MCP architecture requires optimization (50 tools → 8 MCPs ≤10 tools each)
📊 **Scope**: 4,023 lines of specification across 5 documents

---

## 1. Document Completeness Review

### 1.1 REQ.md — Requirements Specification ✅

**Score**: 9.5/10

**Strengths**:
- ✅ Comprehensive user stories (15 total: 6 teacher, 5 admin, 5 student)
- ✅ All stories use GIVEN-WHEN-THEN format
- ✅ MoSCoW prioritization clearly defined
- ✅ Performance SLAs quantified (p95 latencies, availability targets)
- ✅ GDPR and ISO 27001 compliance integrated
- ✅ Traceability matrix links REQ → DESIGN → TASKS
- ✅ Acceptance criteria for all major features
- ✅ Data retention policies specified (7 years attendance, 24 months forum)

**Gaps/Improvements Needed**:
- ⚠️ Section 6.7 (MCP Architecture) references old 3-MCP design, needs update for 8-MCP optimization
- ⚠️ Open questions (§16.2) still pending (retention periods, edit window policy)
- 💡 Consider adding: API rate limits per endpoint, backup RTO/RPO specifics

**Recommendation**: Update §6.7 after MCP optimization plan is approved

---

### 1.2 DESIGN.md — Design Specification ✅

**Score**: 9/10

**Strengths**:
- ✅ Clear C4 architecture diagrams (context + containers)
- ✅ Complete tech stack specification (Next.js 15, React 19, Supabase, Drizzle)
- ✅ Domain model with ERD (15+ core entities)
- ✅ API design with typed response envelopes
- ✅ RLS policies specified with SQL examples
- ✅ Hash-chained attendance register (tamper-evident design)
- ✅ OpenTelemetry integration with PII scrubbing processor
- ✅ STRIDE threat model analysis
- ✅ Trade-offs documented (Drizzle vs Prisma, Supabase vs Firebase)

**Gaps/Improvements Needed**:
- ⚠️ Section 1 (Architecture Overview) shows old 3-MCP design, needs 8-MCP diagram
- ⚠️ Section 4 (API Design) could benefit from OpenAPI/Swagger spec generation
- ⚠️ Section 12 (Performance) lacks specific caching TTLs per resource type
- 💡 Consider adding: Database connection pool configuration, WebSocket design for real-time

**Recommendation**: Update §1 architecture diagram after MCP optimization approval

---

### 1.3 TASKS.md — Task Specification ✅

**Score**: 9/10

**Strengths**:
- ✅ 42 actionable tasks across 11 epics
- ✅ Every task links to REQ + DESIGN sections
- ✅ Clear DoR/DoD criteria
- ✅ 4 milestones with exit criteria (Teacher MVP, Admin Ops, Student View, Hardening)
- ✅ Testing strategy defined (unit/integration/e2e/RLS/performance)
- ✅ CI/CD pipeline specified
- ✅ Risk log with mitigation strategies
- ✅ Task template provided for consistency

**Gaps/Improvements Needed**:
- ⚠️ Tasks T-020 through T-103 don't account for 8-MCP architecture (still reference 3 MCPs)
- ⚠️ Missing tasks for MCP optimization (T-110 through T-143 mentioned in optimization plan but not in TASKS.md)
- ⚠️ Estimates are T-shirt sizes (XS/S/M/L/XL) but no story point equivalents
- 💡 Consider adding: Spike tasks for technical unknowns, infrastructure setup tasks

**Recommendation**: Add migration tasks (T-110 to T-143) after MCP optimization approval

---

### 1.4 MCP-ARCHITECTURE-OPTIMIZATION.md ⚠️

**Score**: 8.5/10 (Awaiting Approval)

**Strengths**:
- ✅ Clear problem statement (50 tools in Admin MCP ❌)
- ✅ Logical domain-driven MCP split (8 MCPs, all ≤10 tools)
- ✅ Migration strategy with 4 phases
- ✅ Security improvements documented (least privilege, smaller attack surface)
- ✅ Performance benefits quantified (load distribution, cache efficiency)
- ✅ Success metrics defined (latency, authorization time, cache hit rate)

**Gaps/Improvements Needed**:
- ⚠️ Needs approval before updating other specs
- ⚠️ Missing: Detailed authorization scope matrix (which roles get which scopes)
- ⚠️ Missing: Database schema changes for new MCP boundaries (if any)
- ⚠️ Missing: Cost analysis (8 MCP servers vs 3 servers infrastructure)
- 💡 Consider: Canary rollout plan, rollback procedures, monitoring dashboard design

**Recommendation**: Get stakeholder approval, then create detailed specs for 6 new admin MCPs

---

### 1.5 README.md ✅

**Score**: 9.5/10

**Strengths**:
- ✅ Clear spine structure (REQ → DESIGN → TASKS)
- ✅ Quick start guides for Product/Engineering/Implementation
- ✅ Traceability example chain
- ✅ Version history updated to v2.1.0
- ✅ Repository structure diagram

**Gaps/Improvements Needed**:
- 💡 Consider adding: Badges (build status, test coverage, license)
- 💡 Consider adding: Link to GitHub Issues/Projects for tracking

**Recommendation**: Maintain as living document, update with each major version

---

## 2. Traceability Analysis ✅

### 2.1 Forward Traceability (REQ → DESIGN → TASKS)

**Test Sample**: REQ-T-001 (Generate CEFR-aligned lesson plan)

```
REQ-T-001 (REQ.md §5.1)
    ↓
DESIGN §6 (Lesson Planning Flow - AI Assisted)
    ↓
T-031 (API endpoint), T-032 (Zod schemas), T-033 (Caching)
```

**Result**: ✅ **Complete** - All user stories trace to design sections and tasks

**Coverage**:
- 15/15 user stories have corresponding design sections (100%)
- 15/15 user stories have corresponding tasks (100%)
- 42/42 tasks link back to requirements (100%)

---

### 2.2 Backward Traceability (TASKS → DESIGN → REQ)

**Test Sample**: T-052 (Hash-chain implementation)

```
T-052 (TASKS.md §4.6)
    ↓
DESIGN §7.2 (Register write flow with hash chain)
    ↓
REQ-A-002 (View tamper-evident audit trail)
```

**Result**: ✅ **Complete** - All tasks trace back to requirements

**Coverage**:
- 42/42 tasks have REQ IDs (100%)
- 42/42 tasks have DESIGN § references (100%)

---

### 2.3 Gap Analysis

**Orphaned Requirements** (requirements without tasks): ❌ **None found**

**Orphaned Tasks** (tasks without requirements): ❌ **None found**

**Ambiguous Links**: ⚠️ **2 found**
- T-090 (DSR export) links to both REQ-A-005 and REQ-S-005 (intentional, serves both)
- T-065 (Access logs & DSR export) → Same as T-090? (possible duplicate)

**Recommendation**: Clarify T-065 vs T-090 distinction or merge

---

## 3. Acceptance Criteria Quality ✅

### 3.1 GIVEN-WHEN-THEN Format

**Sample**: REQ-T-003 (Mark attendance with keyboard shortcuts)

```gherkin
GIVEN session roster with 20 students displayed
WHEN pressing "P" hotkey
THEN all students marked Present
  AND UI shows success toast
  AND individual overrides persist on blur
  AND total time < 90s
```

**Quality**: ✅ **Excellent**
- Clear precondition (GIVEN)
- Specific action (WHEN)
- Measurable outcomes (THEN + quantified target)

**Coverage**: 15/15 user stories have GIVEN-WHEN-THEN (100%)

---

### 3.2 Testability

**Sample Task**: T-044 (Timetable query optimisation)

**Acceptance Criteria**:
```gherkin
GIVEN teacher with 20 classes
WHEN querying timetable for week
THEN query completes in < 200ms (p95)
  AND EXPLAIN ANALYZE shows index usage
  AND cache hit ratio > 80%
```

**Tests Required**:
- [ ] Performance test (p95 measurement) ✅
- [ ] EXPLAIN ANALYZE output in PR ✅

**Quality**: ✅ **Excellent** - Quantified, measurable, testable

**Coverage**: 42/42 tasks have testable acceptance criteria (100%)

---

## 4. Technical Debt & Risks ⚠️

### 4.1 Critical Technical Debt

| Debt Item | Impact | Urgency | Status |
|-----------|--------|---------|--------|
| **Admin MCP: 50 tools** | Critical | High | ⚠️ Optimization plan created |
| **Teacher MCP: 12 tools** | Medium | Medium | ⚠️ Optimization plan created |
| **Student MCP: 14 tools** | Medium | Medium | ⚠️ Optimization plan created |
| **RLS policy test coverage** | High | High | 🟢 Specified in TASKS.md (T-023, T-051) |
| **PII scrubbing coverage** | Critical | High | 🟢 Specified in DESIGN §10.2 |

---

### 4.2 Open Risks

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| **LLM provider latency spikes** | Medium | High | Fallback cache, circuit breaker | 🟢 Mitigated in DESIGN §11 |
| **RLS complexity** | Medium | Critical | Policy test suite, peer review | 🟢 Mitigated in TASKS §5 |
| **Spec drift** | High | Medium | Traceability dashboard (T-103) | 🟡 Planned |
| **MCP tool count explosion** | High | High | ≤10 tool constraint | ⚠️ Optimization plan pending approval |

---

### 4.3 Implementation Risks

| Risk | Mitigation | Owner |
|------|------------|-------|
| **Hash chain implementation error** | Tamper simulation tests (T-052) | Backend |
| **JWT forgery** | JWKS verification, short TTL | Security |
| **PII leakage in telemetry** | Scrubbing processor, no raw PII logging | Platform |
| **Export job backlog** | Queue monitoring, auto-scaling | DevOps |

---

## 5. Compliance & Security Review ✅

### 5.1 GDPR Compliance

| Principle | REQ Reference | DESIGN Reference | Status |
|-----------|---------------|------------------|--------|
| **Purpose Limitation** | REQ §8.1 | DESIGN §8 | ✅ |
| **Data Minimisation** | REQ §7.1 | DESIGN §3.2 | ✅ |
| **Storage Limitation** | REQ §7.3 | TASKS T-091 | ✅ |
| **DSR (Access)** | REQ-A-005 | TASKS T-090 | ✅ |
| **DSR (Rectification)** | REQ-S-003 | DESIGN §8.3 | ✅ |
| **DSR (Erasure)** | REQ-S-005 | DESIGN §8 | ✅ |

**Overall GDPR Score**: 10/10 ✅

---

### 5.2 ISO 27001 Alignment

| Control Category | REQ Reference | DESIGN Reference | Status |
|------------------|---------------|------------------|--------|
| **Access Control** | REQ §8.2 | DESIGN §5 (RLS) | ✅ |
| **Logging** | REQ §8.2 | DESIGN §10 (OTel) | ✅ |
| **Backups** | REQ §15 | DESIGN §15.3 | ✅ |
| **Secret Rotation** | REQ §8.3 | DESIGN §14.2 | ✅ |
| **Encryption (at rest)** | REQ §7.2 | DESIGN §5.3 | ✅ |
| **Encryption (in transit)** | REQ §8.3 | DESIGN §5 | ✅ |

**Overall ISO 27001 Score**: 10/10 ✅

---

### 5.3 WCAG 2.2 AA Compliance

| Criterion | REQ Reference | DESIGN Reference | TASKS Reference | Status |
|-----------|---------------|------------------|-----------------|--------|
| **Keyboard Navigation** | REQ §10.1 | DESIGN §13.1 | T-070 | ✅ |
| **Focus Order** | REQ §10.1 | DESIGN §13.1 | T-070 | ✅ |
| **Contrast (4.5:1)** | REQ §10.1 | DESIGN §13.1 | - | ✅ |
| **ARIA Labels** | REQ §10.1 | DESIGN §13.1 | - | ✅ |
| **Screen Reader Support** | REQ §10.1 | DESIGN §13.1 | T-070 | ✅ |

**Overall WCAG Score**: 10/10 ✅

---

## 6. Performance Budgets ✅

### 6.1 Specified Budgets

| Operation | Target (p95) | REQ Ref | DESIGN Ref | TASKS Ref | Status |
|-----------|-------------|---------|------------|-----------|--------|
| **Page load** | < 1.5s | REQ §9.1 | DESIGN §12 | - | ✅ |
| **Timetable read** | < 200ms | REQ §9.1 | DESIGN §7.1 | T-044 | ✅ |
| **Plan generation** | < 5s | REQ §9.1 | DESIGN §6 | T-031 | ✅ |
| **Register write** | < 300ms | REQ §9.1 | DESIGN §7.2 | T-050 | ✅ |
| **Export job** | < 60s | REQ §9.1 | DESIGN §15 | T-054 | ✅ |

**Coverage**: 5/5 critical operations have quantified budgets (100%)

---

### 6.2 Enforcement Strategy

**Specified in TASKS.md**:
- Performance tests required for T-031, T-044, T-050, T-054
- CI pipeline gates on budget violations (TASKS §6)
- EXPLAIN ANALYZE required in PRs (TASKS §5.2)

**Status**: ✅ **Well-defined**

---

## 7. MCP Architecture Consistency

### 7.1 Current State

**Inconsistency Found**: ⚠️

- **REQ.md §6.7**: References 3 MCPs (Admin, Teacher, Student)
- **DESIGN.md §1**: References 3 MCPs (Admin, Teacher, Student)
- **TASKS.md §4.3**: References 3 MCPs (T-020 through T-023)
- **MCP-ARCHITECTURE-OPTIMIZATION.md**: Proposes 8 MCPs

**Root Cause**: Optimization plan created after core specs, specs not yet updated

---

### 7.2 Resolution Plan

**Option 1: Approve 8-MCP Architecture (Recommended)**
1. Update REQ.md §6.7 with 8 MCP descriptions
2. Update DESIGN.md §1 with 8-MCP C4 diagram
3. Add tasks T-110 to T-143 in TASKS.md (migration tasks)
4. Create spec/10-mcp-architecture-v3.md with detailed specs
5. Begin Phase 1 implementation (Identity & Finance MCPs)

**Option 2: Keep 3-MCP Architecture**
1. Reject optimization plan
2. Document acceptance of ≤10 tool constraint violation
3. Add risk to risk log (MCP complexity)
4. Implement current 3-MCP design as-is

**Option 3: Hybrid Approach**
1. Split only Admin MCP (most critical: 50 tools)
2. Keep Teacher (12 tools) and Student (14 tools) as-is
3. Results in 5-6 MCPs total

**Recommendation**: **Option 1** (full 8-MCP architecture)

**Rationale**:
- Meets stated constraint (≤10 tools per MCP)
- Improves security (least privilege, smaller attack surface)
- Improves performance (distributed load, domain-specific caching)
- Better maintainability (clear domain boundaries)

---

## 8. Recommendations Summary

### 8.1 Critical (Must Do)

1. ⚠️ **Approve or reject MCP optimization plan** (blocks implementation)
2. ⚠️ **Update REQ/DESIGN/TASKS with final MCP architecture**
3. ⚠️ **Clarify T-065 vs T-090** (DSR export tasks appear duplicated)
4. ⚠️ **Resolve open questions in REQ §16.2** (retention periods, edit window policy)

---

### 8.2 High Priority (Should Do)

5. 💡 **Create spec/10-mcp-architecture-v3.md** with detailed 8-MCP specs
6. 💡 **Generate authorization scope matrix** (role → scope mappings)
7. 💡 **Add migration tasks T-110 to T-143** in TASKS.md
8. 💡 **Create traceability dashboard script** (T-103)

---

### 8.3 Medium Priority (Nice to Have)

9. 💡 **Generate OpenAPI/Swagger spec** from DESIGN §4
10. 💡 **Add infrastructure setup tasks** to TASKS.md (VPS, CI/CD, monitoring)
11. 💡 **Document caching TTLs per resource type** in DESIGN §12
12. 💡 **Add build status badges** to README.md

---

### 8.4 Low Priority (Future)

13. 💡 **Convert GIVEN-WHEN-THEN to Gherkin .feature files** (BDD)
14. 💡 **Create story point estimates** from T-shirt sizes
15. 💡 **Design monitoring dashboards** (Grafana templates)
16. 💡 **Document WebSocket design** for real-time features

---

## 9. Strengths to Maintain

✅ **Comprehensive traceability** (100% coverage REQ ↔ DESIGN ↔ TASKS)
✅ **Quantified acceptance criteria** (p95 latencies, cache hit ratios, time limits)
✅ **Security-first design** (RLS, hash chains, PII scrubbing, STRIDE analysis)
✅ **Compliance integration** (GDPR, ISO 27001, WCAG 2.2 AA)
✅ **Living document approach** (version history, update process)
✅ **Clear stakeholder personas** (Sarah/Teacher, Michael/Admin, Ana/Student)
✅ **Risk-aware** (threat model, mitigation strategies, rollback plans)

---

## 10. Overall Score

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| **Completeness** | 9.5/10 | 25% | 2.38 |
| **Traceability** | 10/10 | 20% | 2.00 |
| **Quality** | 9/10 | 20% | 1.80 |
| **Compliance** | 10/10 | 15% | 1.50 |
| **Testability** | 9.5/10 | 10% | 0.95 |
| **Maintainability** | 9/10 | 10% | 0.90 |
| **Total** | **9.5/10** | 100% | **9.53** |

---

## 11. Final Verdict

**Status**: ✅ **APPROVED FOR IMPLEMENTATION** (pending MCP architecture decision)

**Rationale**:
- Specifications are comprehensive, well-structured, and traceable
- All critical requirements covered (security, compliance, performance)
- Clear acceptance criteria for all features
- Risk-aware with mitigation strategies
- One blocking decision: MCP architecture optimization (Option 1 recommended)

**Next Steps**:
1. **Stakeholder decision**: Approve 8-MCP optimization plan (or select alternative)
2. **Update specs**: Align REQ/DESIGN/TASKS with final MCP architecture
3. **Begin implementation**: Start with T-001 (project initialization) or T-110 (Identity MCP if 8-MCP approved)

---

**Reviewed by**: Claude Code
**Date**: 2025-11-07
**Specification Version**: 2.1.0
**Recommendation**: ✅ **Proceed to implementation after MCP architecture decision**
