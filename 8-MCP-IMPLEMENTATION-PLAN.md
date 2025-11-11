# 8-MCP Implementation Plan

> **Version:** 1.0.0 | **Status:** ✅ APPROVED | **Created:** 2025-11-11

---

## Executive Summary

**Objective:** Migrate MyCastle from v2.0 (3-MCP) to v3.0 (8-MCP) domain-driven architecture to meet ≤10 tools per MCP constraint and enable future extensibility.

**Timeline:** 8-12 weeks across 4 phases

**Scope:** 34 migration tasks (T-110 to T-143) + MCP Host updates

**Benefits:**
- ✅ Security: Least privilege, smaller attack surface per MCP
- ✅ Performance: Distributed load, domain-specific caching
- ✅ Maintainability: Clear domain boundaries, focused responsibility
- ✅ Extensibility: Seamless addition of future MCPs (Parent, Partner, Analytics, Marketing)

---

## 1. Current State Assessment

### v2.0 (3-MCP) Architecture Limitations

| MCP | Tools | Status | Issue |
|-----|-------|--------|-------|
| Admin MCP | **50 tools** | ❌ Bloated | Violates ≤10 tool constraint, mixed concerns |
| Teacher MCP | **12 tools** | ⚠️ Over limit | Slightly exceeds constraint |
| Student MCP | **14 tools** | ⚠️ Over limit | Slightly exceeds constraint |

**Problems:**
- Single Admin MCP handles 6 different domains (identity, finance, academic, etc.)
- Poor separation of concerns (authentication mixed with finance mixed with academics)
- Difficult to add new features without bloating existing MCPs
- Security: Single MCP breach exposes all admin functionality
- Performance: Single hotspot for all admin operations

---

## 2. Target State: v3.0 (8-MCP) Architecture

### 8 Core MCPs (All ≤10 Tools)

| MCP | Tools | Scope | Domain | Phase |
|-----|-------|-------|--------|-------|
| **Identity & Access** | 6 | `identity:*` | Auth, roles, permissions | 1 |
| **Finance** | 9 | `finance:*` | Invoicing, payments | 1 |
| **Academic Operations** | 10 | `academic:*` | Programmes, scheduling | 2 |
| **Attendance & Compliance** | 8 | `attendance:*`, `compliance:*` | Registers, visa | 2 |
| **Student Services** | 9 | `student_services:*` | Accommodation, letters | 3 |
| **Operations & Quality** | 8 | `ops:*`, `quality:*` | Backups, QA | 3 |
| **Teacher** | 10 | `teacher:*` | Lesson planning, grading | 4 |
| **Student** | 10 | `student:*` | Timetable, AI tutor | 4 |

**Total:** 70 tools across 8 MCPs (avg 8.75 tools per MCP)

### Extensibility: Future MCPs

| Future MCP | Tools | Scope | Purpose | Timeline |
|------------|-------|-------|---------|----------|
| **Parent** | ≤10 | `parent:*` | Parent portal, progress views | Post-MVP |
| **Partner** | ≤10 | `partner:*` | School partnerships | Post-MVP |
| **Analytics** | ≤10 | `analytics:*` | BI, reporting, dashboards | Post-MVP |
| **Marketing** | ≤10 | `marketing:*` | CRM, campaigns, leads | Post-MVP |

---

## 3. Migration Strategy: 4-Phase Rollout

### Phase 1: Identity & Finance (Weeks 1-3)

**Goal:** Extract security-critical and financially-sensitive operations from Admin MCP

**Tasks:** T-110 to T-114

**Duration:** 2-3 weeks

**Dependencies:** T-020 (MCP Host) must support scope-based routing

#### T-110: Create Identity & Access MCP (6 tools)
**Duration:** 1 week
**Owner:** Backend/Security
**Scope:** `identity:*`

**Tools:**
1. `create_user` - Create new user with role
2. `update_user_role` - Modify user permissions
3. `set_permissions` - Assign fine-grained permissions
4. `revoke_session` - Force logout/invalidate token
5. `rotate_api_key` - Rotate service account keys
6. `audit_access` - Review access logs

**RLS Policies:**
```sql
-- Only super-admins can access Identity MCP
CREATE POLICY identity_mcp_access ON user
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM "user"
      WHERE role_scope = 'super_admin'
    )
  );
```

**Success Criteria:**
- All 6 tools callable via MCP protocol
- Authorization scope `identity:*` enforced
- Audit logging for all identity operations
- E2E tests passing (100% coverage)

---

#### T-111: Create Finance MCP (9 tools)
**Duration:** 1-1.5 weeks
**Owner:** Backend/Finance
**Scope:** `finance:*`

**Tools:**
1. `create_booking` - New student booking
2. `edit_booking` - Modify existing booking
3. `issue_invoice` - Generate invoice PDF
4. `apply_discount` - Apply discount code
5. `refund_payment` - Process refund
6. `reconcile_payouts` - Match payments to invoices
7. `ledger_export` - Export to accounting software
8. `aging_report` - Accounts receivable aging
9. `confirm_intake` - Confirm student intake

**External Integrations:**
- Stripe API (payments)
- QuickBooks/Xero API (accounting exports)

**RLS Policies:**
```sql
-- Finance officers and admins can access Finance MCP
CREATE POLICY finance_mcp_access ON invoice
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM "user"
      WHERE role_scope IN ('admin', 'finance_officer')
        AND org_id = invoice.org_id
    )
  );
```

**Success Criteria:**
- All 9 tools callable
- Stripe integration tested (sandbox mode)
- PCI compliance maintained
- Audit trail for all financial operations

---

#### T-112: Update Host Routing (1-2 days)
**Duration:** 1-2 days
**Owner:** Platform
**Scope:** Host service

**Changes:**
- Add scope-based routing logic to MCP Host
- Map `identity:*` → Identity MCP
- Map `finance:*` → Finance MCP
- Maintain backward compatibility with existing Admin MCP (deprecate after Phase 3)

**Code Example:**
```typescript
class MCPHost {
  private mcpServers: Map<string, MCPServer> = new Map();

  register(mcp: MCPServer) {
    this.mcpServers.set(mcp.scope, mcp);
  }

  async route(toolCall: ToolCall, context: AuthContext): Promise<any> {
    // Extract scope from tool name (e.g., 'identity:create_user' → 'identity')
    const scope = this.extractScope(toolCall.tool);

    // Check authorization
    if (!context.scopes.includes(`${scope}:*`) &&
        !context.scopes.includes(`${scope}:${toolCall.action}`)) {
      throw new UnauthorizedError(`Missing scope: ${scope}:*`);
    }

    // Route to appropriate MCP
    const mcp = this.mcpServers.get(scope);
    if (!mcp) {
      throw new Error(`No MCP registered for scope: ${scope}`);
    }

    return await mcp.call(toolCall, context);
  }
}
```

---

#### T-113: Migrate Authorization Scopes (2-3 days)
**Duration:** 2-3 days
**Owner:** Backend/Security
**Scope:** Auth system

**Changes:**
- Update JWT claims to include fine-grained scopes array
- Existing `admin` role → grants all new scopes during migration
- Add new roles: `finance_officer`, `registrar`, `super_admin`

**JWT Structure:**
```json
{
  "sub": "user-id-123",
  "org_id": "org-456",
  "role_scope": "admin",
  "scopes": [
    "identity:*",
    "finance:*",
    "academic:*",
    "attendance:*",
    "compliance:*",
    "student_services:*",
    "ops:*",
    "quality:*"
  ],
  "iat": 1699920000,
  "exp": 1699923600
}
```

---

#### T-114: E2E Tests (2-3 days)
**Duration:** 2-3 days
**Owner:** QA/Platform
**Scope:** Testing

**Test Coverage:**
- Identity MCP: All 6 tools callable, authorization enforced
- Finance MCP: All 9 tools callable, PCI compliance
- Host routing: Correct MCP selected based on scope
- Performance: p95 latency < 500ms per tool call
- Security: Unauthorized access blocked

---

### Phase 2: Academic & Attendance (Weeks 4-6)

**Goal:** Extract academic operations and compliance tracking from Admin MCP

**Tasks:** T-120 to T-124

**Duration:** 2-3 weeks

**Dependencies:** Phase 1 complete (Host routing working)

#### T-120: Create Academic Operations MCP (10 tools)
**Duration:** 1-1.5 weeks
**Owner:** Backend/Academic
**Scope:** `academic:*`

**Tools:**
1. `create_programme` - Define new programme
2. `create_course` - Define course within programme
3. `map_cefr_level` - Map course to CEFR level
4. `schedule_class` - Create class schedule
5. `assign_teacher` - Assign teacher to class
6. `allocate_room` - Assign classroom to session
7. `register_lesson_template` - Save reusable lesson template
8. `approve_lesson_plan` - Admin approval workflow
9. `link_cefr_descriptor` - Link official CEFR descriptor
10. `publish_materials` - Publish materials to students

**Data Model:**
```
Programme → Course → Class → Session
          → CEFRLevel → CEFRDescriptor
```

**Success Criteria:**
- All 10 tools callable
- High cohesion (shared academic data model)
- RLS policies enforce registrar/admin access

---

#### T-121: Create Attendance & Compliance MCP (8 tools)
**Duration:** 1 week
**Owner:** Backend/Compliance
**Scope:** `attendance:*`, `compliance:*`

**Tools:**
1. `prepare_register` - Initialize register for session
2. `record_attendance` - Mark attendance (P/A/L)
3. `correct_attendance` - Admin correction with audit
4. `export_attendance` - CSV/Excel export with hash
5. `visa_compliance_report` - Visa student attendance tracking
6. `compile_compliance_pack` - Bundle docs for audit
7. `anonymise_dataset` - GDPR anonymization
8. `policy_check` - Validate retention policies

**Compliance Features:**
- Hash-chained register entries (tamper-evident)
- Visa compliance tracking (attendance %, warnings)
- GDPR anonymization after retention period

**Success Criteria:**
- Hash chain validated
- Visa compliance alerts working
- Export includes audit hash

---

#### T-122-124: Host Routing + RLS + E2E Tests
**Duration:** 1 week total
**Similar to T-112 to T-114 but for academic:*, attendance:*, compliance:* scopes**

---

### Phase 3: Services & Operations (Weeks 7-9)

**Goal:** Extract student services and operational tools from Admin MCP

**Tasks:** T-130 to T-133

**Duration:** 2-3 weeks

**Dependencies:** Phase 2 complete

#### T-130: Create Student Services MCP (9 tools)
**Duration:** 1 week
**Owner:** Backend/StudentServices
**Scope:** `student_services:*`

**Tools:**
1. `register_host` - Register host family
2. `allocate_accommodation` - Assign student to accommodation
3. `swap_accommodation` - Process accommodation change
4. `export_placements` - Export accommodation list
5. `issue_letter` - Generate official letters (enrollment, completion)
6. `approve_deferral` - Approve course deferral
7. `award_certificate` - Issue certificate (digital + PDF)
8. `track_visa_status` - Track visa application status
9. `record_pastoral_note` - Record pastoral care notes

**Integration:**
- Accommodation database
- PDF generation (letters, certificates)
- Visa tracking system

**Success Criteria:**
- All 9 tools callable
- PDF generation working
- RLS policies enforce student services access

---

#### T-131: Create Operations & Quality MCP (8 tools)
**Duration:** 1 week
**Owner:** Platform/QA
**Scope:** `ops:*`, `quality:*`

**Tools:**
1. `backup_db` - Trigger database backup
2. `restore_snapshot` - Restore from backup
3. `record_observation` - Record lesson observation
4. `assign_cpd` - Assign CPD (Continuing Professional Development)
5. `export_quality_report` - Export QA report
6. `bulk_email` - Send bulk notifications
7. `notify_stakeholders` - Send targeted notifications
8. `mail_merge_pdf` - Generate personalized PDFs

**Operational Features:**
- Database backup/restore (requires highest privileges)
- Quality assurance workflows
- Bulk communication tools

**Success Criteria:**
- Backup/restore tested in staging
- QA workflows documented
- Email integration working

---

#### T-132-133: Host Routing + E2E Tests
**Duration:** 1 week total
**Similar to Phase 1-2**

---

### Phase 4: Optimize Teacher & Student MCPs (Weeks 10-12)

**Goal:** Reduce Teacher and Student MCPs to exactly 10 tools each

**Tasks:** T-140 to T-143

**Duration:** 1-2 weeks

**Dependencies:** Phase 3 complete, all 6 admin MCPs working

#### T-140: Optimize Teacher MCP (12 → 10 tools)
**Duration:** 3-4 days
**Owner:** Backend/Teacher
**Scope:** `teacher:*`

**Changes:**
1. Move `request_room_swap` → Academic MCP (`academic:swap_room`)
2. Merge `quick_register_scan` into `mark_attendance` (add optional scan mode)

**Resulting 10 Tools:**
1. `view_timetable`
2. `create_lesson_plan`
3. `attach_materials`
4. `map_cefr_objectives`
5. `mark_attendance` (now includes scan mode)
6. `record_progress_note`
7. `assign_homework`
8. `grade_submission`
9. `export_class_data`
10. `raise_support_ticket`

---

#### T-141: Optimize Student MCP (14 → 10 tools)
**Duration:** 3-4 days
**Owner:** Backend/Student
**Scope:** `student:*`

**Changes:**
1. Merge `explain_concept` + `practice_exercise` into `ask_tutor` (AI router decides intent)
2. Merge `view_invoice` + `view_installments` into single `view_invoice` tool
3. Move `update_profile` → Student Services MCP (`student_services:update_profile`)
4. Move `request_certificate` → Student Services MCP (`student_services:request_certificate`)

**Resulting 10 Tools:**
1. `view_timetable`
2. `download_materials`
3. `submit_homework`
4. `view_grades`
5. `ask_tutor` (handles explain + practice via AI routing)
6. `track_progress`
7. `attendance_summary`
8. `request_letter` (general letters, not certificates)
9. `raise_support_request`
10. `view_invoice` (includes installments)

---

#### T-142: Update Host Routing (1-2 days)
**Duration:** 1-2 days
**Owner:** Platform
**Scope:** Host service

**Changes:**
- Remove old tool mappings for moved tools
- Update routing for merged tools
- Ensure backward compatibility during migration

---

#### T-143: Final E2E Tests (3-4 days)
**Duration:** 3-4 days
**Owner:** QA/Platform
**Scope:** Complete system

**Test Coverage:**
- All 70 tools across 8 MCPs callable
- All MCPs ≤10 tools (validation)
- Performance budgets met (p95 latencies)
- Authorization scopes enforced correctly
- Cache hit ratio > 80%
- Security audit passed (no vulnerabilities)

**Acceptance Criteria:**
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

---

## 4. Future Extensibility: Adding New MCPs

### Standard MCP Template

```typescript
// Example: Parent MCP
import { MCPServer, Tool, AuthContext } from '@/lib/mcp';

export class ParentMCP implements MCPServer {
  scope = 'parent:*';
  maxTools = 10;

  tools: Tool[] = [
    {
      name: 'view_student_progress',
      description: 'View academic progress for own students',
      inputSchema: {
        type: 'object',
        properties: {
          studentId: { type: 'string', format: 'uuid' }
        },
        required: ['studentId']
      },
      handler: async (input, context) => {
        // Implementation
      }
    },
    // ... 9 more tools
  ];

  async initialize() {
    // Setup
  }

  async shutdown() {
    // Cleanup
  }
}
```

### Adding Parent MCP (Example)

**Step 1: Design (1 week)**
- Define 10 tools (no more, no less)
- Design RLS policies for parent access
- Document scope: `parent:*`

**Step 2: Implementation (2 weeks)**
- Implement `ParentMCP` class
- Add 10 tool handlers
- Write unit tests for each tool

**Step 3: Integration (1 week)**
- Register with MCP Host
- Add `parent` role to authorization system
- Add `parent:*` scope to JWT claims
- Update RLS policies

**Step 4: Testing & Deployment (1 week)**
- E2E tests for all 10 tools
- Performance testing
- Security review
- Deploy to production (independent deployment, no changes to existing MCPs)

**Total:** 5 weeks from design to production

---

## 5. Risk Management

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Host routing complexity** | Medium | High | Incremental rollout, extensive testing |
| **Authorization scope bugs** | Medium | Critical | Policy test suite, security review |
| **Performance degradation** | Low | Medium | Performance tests, distributed load |
| **Migration errors** | Low | High | Canary rollout, rollback plan |
| **Tool count violations** | Low | Medium | Automated validation, PR checks |

### Rollback Plan

Each phase can be rolled back independently:

**Phase 1 Rollback:**
- Disable Identity & Finance MCPs in Host routing
- Route `identity:*` and `finance:*` back to Admin MCP temporarily
- No data loss (RLS policies remain)

**Phase 2-4 Rollback:**
- Similar approach for each phase
- Graceful degradation to previous MCP

---

## 6. Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Tool count per MCP** | ≤10 | Automated validation |
| **p95 latency per tool** | < 500ms | OpenTelemetry traces |
| **Authorization time** | < 50ms | JWT verification + scope check |
| **Cache hit ratio** | > 80% | Domain-specific caches |
| **Test coverage** | > 90% | Jest + E2E tests |
| **Security vulnerabilities** | 0 critical | SAST + dependency scanning |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Extensibility** | Add new MCP in < 5 weeks | Track time for first future MCP |
| **Developer velocity** | 20% improvement | Story points per sprint |
| **Maintenance effort** | 30% reduction | Time spent on MCP updates |
| **Security incidents** | 0 | Security audit logs |

---

## 7. Timeline & Milestones

```
Week 1-3:  Phase 1 (Identity & Finance MCPs)
           ├─ T-110: Identity MCP
           ├─ T-111: Finance MCP
           ├─ T-112: Host routing
           ├─ T-113: Authorization scopes
           └─ T-114: E2E tests
           Milestone: Identity & Finance MCPs live

Week 4-6:  Phase 2 (Academic & Attendance MCPs)
           ├─ T-120: Academic MCP
           ├─ T-121: Attendance & Compliance MCP
           ├─ T-122: Host routing
           ├─ T-123: RLS policies
           └─ T-124: E2E tests
           Milestone: Academic & Compliance MCPs live

Week 7-9:  Phase 3 (Services & Operations MCPs)
           ├─ T-130: Student Services MCP
           ├─ T-131: Operations & Quality MCP
           ├─ T-132: Host routing
           └─ T-133: E2E tests
           Milestone: All 6 admin MCPs complete

Week 10-12: Phase 4 (Optimize Teacher & Student MCPs)
           ├─ T-140: Optimize Teacher MCP
           ├─ T-141: Optimize Student MCP
           ├─ T-142: Host routing updates
           └─ T-143: Final E2E tests
           Milestone: 8-MCP architecture complete
```

---

## 8. Extensibility Roadmap

### Post-MVP MCPs (Priority Order)

1. **Parent MCP** (Q1 2026)
   - Priority: High
   - Demand: High (parent portal requested by schools)
   - Effort: 5 weeks

2. **Analytics MCP** (Q2 2026)
   - Priority: Medium
   - Demand: Medium (BI requested by management)
   - Effort: 6 weeks (includes dashboard UI)

3. **Partner MCP** (Q2 2026)
   - Priority: Low
   - Demand: Low (partner integrations nice-to-have)
   - Effort: 5 weeks

4. **Marketing MCP** (Q3 2026)
   - Priority: Medium
   - Demand: Medium (CRM requested by sales)
   - Effort: 6 weeks (includes Salesforce integration)

---

## 9. Documentation & Training

### Documentation Updates

- [x] DESIGN.md: C4 diagrams updated with 8 MCPs
- [x] REQ.md: Extensibility pattern documented
- [x] TASKS.md: Migration tasks T-110 to T-143 defined
- [x] README.md: v3.0.0 architecture overview
- [x] PROGRESS.md: Migration status tracking
- [x] 8-MCP-IMPLEMENTATION-PLAN.md: This document

### Training Materials (To Create)

- [ ] Video: "8-MCP Architecture Overview" (15 min)
- [ ] Guide: "Adding a New MCP in 5 Weeks" (tutorial)
- [ ] Cheatsheet: "MCP Tool Count Rules" (1-pager)
- [ ] Workshop: "Extensibility Patterns" (2 hours)

---

## 10. Approval & Sign-off

| Role | Name | Status | Date |
|------|------|--------|------|
| **Technical Architect** | Eoin Malone | ✅ Approved | 2025-11-11 |
| **Product Owner** | TBD | ⏳ Pending | - |
| **Engineering Lead** | TBD | ⏳ Pending | - |
| **Security Lead** | TBD | ⏳ Pending | - |

---

## 11. Next Steps

1. ✅ **Architecture approved** (2025-11-11)
2. ⏳ **Stakeholder sign-off** (pending)
3. ⏳ **Begin Phase 1** (T-110-T-114)
4. ⏳ **Weekly progress reviews** (every Monday)
5. ⏳ **Milestone celebrations** (end of each phase)

---

**Plan Status:** ✅ Approved and ready for implementation

**Contact:** Eoin Malone (eoin@mycastle.com)

**Last Updated:** 2025-11-11
