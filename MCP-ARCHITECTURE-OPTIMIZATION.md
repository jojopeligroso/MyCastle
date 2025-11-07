# MCP Architecture Optimization Plan

> **Version:** 1.0.0 | **Date:** 2025-11-07 | **Status:** Proposed

---

## Problem Statement

Current Admin MCP (v2.0.0) contains **50 tools** across 12 business domains, exceeding the recommended limit of ≤10 tools per MCP. This creates:
- Complexity in tool routing and authorization
- Maintenance challenges
- Performance concerns
- Unclear boundaries of responsibility

**Current Tool Distribution:**
- Admin MCP: **50 tools** ❌ (5x over limit)
- Teacher MCP: 12 tools ⚠️ (slightly over)
- Student MCP: 14 tools ⚠️ (slightly over)

---

## Optimization Goals

1. **≤10 tools per MCP** (hard limit)
2. **Minimum number of MCPs** (avoid over-fragmentation)
3. **Efficient operation** (low latency, clear boundaries)
4. **Logical domain cohesion** (related tools grouped)

---

## Proposed Architecture (v3.0)

### Core Principle: **Domain-Driven MCP Design**

Split Admin MCP into **6 specialized MCPs**, plus existing Teacher and Student MCPs = **8 total MCPs**.

---

## 1. Identity & Access MCP (6 tools)

**Purpose**: User authentication, authorization, role management
**Scope**: `identity:*`

**Tools** (6):
1. `create_user` — Create new user account
2. `update_user_role` — Assign/change user role (admin/teacher/student)
3. `set_permissions` — Grant fine-grained permissions
4. `revoke_session` — Force logout/terminate session
5. `rotate_api_key` — Rotate API keys for service accounts
6. `audit_access` — Query access logs for user/resource

**Why Separate?**
- Security-critical operations require highest audit level
- Different authorization model (super-admin only)
- Minimal change frequency (stable API)

**Authorization**: Super-admin or `identity:write` scope

---

## 2. Academic Operations MCP (10 tools)

**Purpose**: Programme, course, scheduling, lesson planning
**Scope**: `academic:*`

**Tools** (10):
1. `create_programme` — Define programme (e.g., "General English")
2. `create_course` — Define course within programme
3. `map_cefr_level` — Map course to CEFR level
4. `schedule_class` — Create class session
5. `assign_teacher` — Assign teacher to class
6. `allocate_room` — Assign room to session
7. `register_lesson_template` — Register reusable lesson template
8. `approve_lesson_plan` — Approve teacher-created plan
9. `link_cefr_descriptor` — Link lesson to CEFR descriptor
10. `publish_materials` — Publish materials for class

**Why Together?**
- High cohesion: all tools relate to academic delivery
- Common authorization model (registrar, academic manager)
- Shared data model (programmes → courses → classes)

**Authorization**: Admin with `academic:write` scope

---

## 3. Attendance & Compliance MCP (8 tools)

**Purpose**: Attendance tracking, visa compliance, register exports
**Scope**: `attendance:*`, `compliance:*`

**Tools** (8):
1. `prepare_register` — Generate blank register for session
2. `record_attendance` — Bulk or individual attendance marking
3. `correct_attendance` — Admin override of attendance record
4. `export_attendance` — Export attendance CSV/Excel
5. `visa_compliance_report` — Generate visa attendance report
6. `compile_compliance_pack` — Generate compliance documentation
7. `anonymise_dataset` — Anonymise data for research/testing
8. `policy_check` — Run policy compliance check

**Why Together?**
- Attendance and compliance are legally coupled (visa tracking)
- Similar audit requirements
- Common data source (attendance records)

**Authorization**: Admin with `attendance:write` or `compliance:read`

---

## 4. Finance MCP (9 tools)

**Purpose**: Invoicing, payments, reconciliation, financial reporting
**Scope**: `finance:*`

**Tools** (9):
1. `create_booking` — Create student booking/enrolment
2. `edit_booking` — Modify booking details
3. `issue_invoice` — Generate invoice for booking
4. `apply_discount` — Apply discount to invoice
5. `refund_payment` — Process refund
6. `reconcile_payouts` — Reconcile payments with ledger
7. `ledger_export` — Export ledger to CSV
8. `aging_report` — Generate aged receivables report
9. `confirm_intake` — Confirm student intake (financial lock)

**Why Separate?**
- Financial operations require strictest audit trail
- Different authorization model (finance officer role)
- Integration with external payment systems (Stripe, etc.)
- PCI compliance considerations

**Authorization**: Admin with `finance:write` scope

---

## 5. Student Services MCP (9 tools)

**Purpose**: Accommodation, letters, certificates, lifecycle events
**Scope**: `student_services:*`

**Tools** (9):
1. `register_host` — Register accommodation host
2. `allocate_accommodation` — Assign student to accommodation
3. `swap_accommodation` — Move student between accommodations
4. `export_placements` — Export accommodation placements
5. `issue_letter` — Issue official letter (visa support, etc.)
6. `approve_deferral` — Approve course deferral request
7. `award_certificate` — Issue completion certificate
8. `track_visa_status` — Track student visa application
9. `record_pastoral_note` — Record pastoral care note

**Why Together?**
- All relate to student welfare and lifecycle
- Common authorization model (student services team)
- Shared workflows (accommodation → pastoral → letters)

**Authorization**: Admin with `student_services:write` scope

---

## 6. Operations & Quality MCP (8 tools)

**Purpose**: System operations, backups, quality assurance, CPD
**Scope**: `ops:*`, `quality:*`

**Tools** (8):
1. `backup_db` — Create database backup
2. `restore_snapshot` — Restore from backup
3. `record_observation` — Record lesson observation
4. `assign_cpd` — Assign CPD activity to teacher
5. `export_quality_report` — Export quality metrics
6. `bulk_email` — Send bulk email campaign
7. `notify_stakeholders` — Send targeted notifications
8. `mail_merge_pdf` — Generate mail-merge PDFs

**Why Together?**
- Operational tools (backup/restore) need highest privilege
- Quality assurance and CPD are related workflows
- Communication tools (email/notify) are operational

**Authorization**: Admin with `ops:write` or `quality:write` scope

---

## 7. Teacher MCP (Optimized to 10 tools)

**Existing**: 12 tools → **Reduce to 10**

**Tools** (10):
1. `view_timetable` — View personal timetable
2. `create_lesson_plan` — Create lesson plan (AI-assisted)
3. `attach_materials` — Attach materials to plan
4. `map_cefr_objectives` — Map plan to CEFR
5. `mark_attendance` — Mark class attendance
6. `record_progress_note` — Record student progress
7. `assign_homework` — Assign homework to class
8. `grade_submission` — Grade student submission
9. `export_class_data` — Export class data (CSV)
10. `raise_support_ticket` — Raise ticket for admin help

**Removed** (2):
- `request_room_swap` → Move to Academic Ops MCP (admin function)
- `quick_register_scan` → Merge into `mark_attendance` with optional "scan" mode

---

## 8. Student MCP (Optimized to 10 tools)

**Existing**: 14 tools → **Reduce to 10**

**Tools** (10):
1. `view_timetable` — View class schedule
2. `download_materials` — Download lesson materials
3. `submit_homework` — Submit homework
4. `view_grades` — View grades and feedback
5. `ask_tutor` — Ask AI tutor question (CEFR-adaptive)
6. `track_progress` — View learning progress (CEFR outcomes)
7. `attendance_summary` — View attendance record
8. `request_letter` — Request official letter
9. `raise_support_request` — Raise support ticket
10. `view_invoice` — View invoices and payment status

**Removed** (4):
- `explain_concept` → Merge into `ask_tutor` (AI tutor handles all queries)
- `practice_exercise` → Merge into `ask_tutor` (AI tutor generates exercises)
- `track_goal` → Merge into `track_progress`
- `update_contact_details` → Move to Student Services MCP (admin-approved changes)
- `pay_invoice` → Remove (external payment link, not MCP tool)
- `view_installments` → Merge into `view_invoice`

---

## Summary: Optimized Architecture

| MCP | Tools | Domain | Scope |
|-----|-------|--------|-------|
| **Identity & Access** | 6 | Authentication, authorization | `identity:*` |
| **Academic Operations** | 10 | Programmes, courses, scheduling, lessons | `academic:*` |
| **Attendance & Compliance** | 8 | Attendance, visa compliance, registers | `attendance:*`, `compliance:*` |
| **Finance** | 9 | Invoicing, payments, reconciliation | `finance:*` |
| **Student Services** | 9 | Accommodation, letters, certificates | `student_services:*` |
| **Operations & Quality** | 8 | Backups, quality, CPD, communications | `ops:*`, `quality:*` |
| **Teacher** | 10 | Lesson planning, attendance, grading | `teacher:*` |
| **Student** | 10 | Timetable, materials, AI tutor, progress | `student:*` |
| **TOTAL** | **70 tools across 8 MCPs** | — | — |

**Compliance**: ✅ All MCPs ≤10 tools
**Efficiency**: ✅ Logical domain boundaries
**Minimalism**: ✅ 8 MCPs (reduced from 3 bloated + 5 new = 8 focused)

---

## Migration Strategy

### Phase 1: Identity & Finance Split (High Priority)
**Why First?**
- Identity: Security-critical, needs isolation
- Finance: PCI compliance, audit requirements

**Tasks**:
- T-110: Create Identity MCP (6 tools)
- T-111: Create Finance MCP (9 tools)
- T-112: Update Host routing for Identity/Finance
- T-113: Migrate authorization checks
- T-114: E2E tests for split MCPs

**Exit Criteria**:
- All identity tools callable via Identity MCP
- All finance tools callable via Finance MCP
- No tools remain in old Admin MCP (identity/finance domains)
- Authorization tests pass

---

### Phase 2: Academic & Attendance Split (Medium Priority)
**Tasks**:
- T-120: Create Academic Ops MCP (10 tools)
- T-121: Create Attendance & Compliance MCP (8 tools)
- T-122: Update Host routing
- T-123: Migrate RLS policies
- T-124: E2E tests

---

### Phase 3: Student Services & Ops Split (Low Priority)
**Tasks**:
- T-130: Create Student Services MCP (9 tools)
- T-131: Create Ops & Quality MCP (8 tools)
- T-132: Update Host routing
- T-133: E2E tests

---

### Phase 4: Teacher & Student Optimisation (Final)
**Tasks**:
- T-140: Reduce Teacher MCP to 10 tools (merge/remove 2)
- T-141: Reduce Student MCP to 10 tools (merge/remove 4)
- T-142: Update Host routing
- T-143: E2E tests

---

## Performance Considerations

### Tool Call Distribution
**Before**: Admin MCP handles 70% of all tool calls (hotspot)
**After**: Load distributed across 6 admin-domain MCPs (12% each avg)

### Authorization Checks
**Before**: Single RLS check on 50-tool MCP (complex policies)
**After**: Domain-specific RLS policies (simpler, faster)

### Cache Efficiency
**Before**: Single cache for all admin resources (low hit rate)
**After**: Domain-specific caches (higher hit rates)

---

## Security Improvements

### Principle of Least Privilege
**Before**: Admin role grants access to all 50 tools
**After**: Fine-grained scopes (e.g., `finance:write` ≠ `academic:write`)

### Audit Granularity
**Before**: All admin actions logged under "admin-mcp"
**After**: Per-domain audit trails (finance actions separate from academic)

### Attack Surface
**Before**: Single MCP compromise = all 50 tools exposed
**After**: MCP compromise limited to domain (≤10 tools)

---

## Backward Compatibility

### Host Routing
- Old tool names redirect to new MCPs (transparent to LLM)
- Host maintains tool→MCP mapping
- Gradual cutover per domain (phased migration)

### Authorization
- Existing `admin` role grants all new scopes during migration
- New fine-grained roles introduced (opt-in)
- Old scopes deprecated after 6 months

---

## Success Metrics

| Metric | Before | Target (v3.0) |
|--------|--------|---------------|
| **Max Tools per MCP** | 50 | ≤10 |
| **Avg Tool Call Latency** | 220ms | <150ms |
| **Authorization Check Time** | 45ms | <20ms |
| **Cache Hit Rate** | 62% | >85% |
| **Security Incidents** | Baseline | -30% |

---

## Recommendations

1. **Start with Identity & Finance splits** (highest value, security-critical)
2. **Run both old and new MCPs in parallel** during migration (canary rollout)
3. **Update REQ.md, DESIGN.md, TASKS.md** to reflect new architecture
4. **Add MCP-specific E2E tests** for each new MCP
5. **Document scope→role mappings** in authorization matrix

---

## Next Steps

1. **Review & Approve** this optimization plan
2. **Update REQ.md** (§6.7) with new MCP architecture
3. **Update DESIGN.md** (§1) with 8-MCP diagram
4. **Update TASKS.md** with migration tasks (T-110 through T-143)
5. **Create spec/10-mcp-architecture-v3.md** with detailed specs for 6 new admin MCPs
6. **Begin Phase 1 implementation** (Identity & Finance MCPs)

---

**Status**: 🟡 Awaiting Review & Approval
**Estimated Implementation**: 8-12 weeks (phased)
**Priority**: High (technical debt reduction, security improvement)
