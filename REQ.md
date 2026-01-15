# REQ.md — Requirements Specification (MyCastle)

> **Version:** 3.0.0 | **Status:** Living Document | **Last Updated:** 2025-11-07

---

## 1. Purpose & Scope

**MyCastle** is an ESL school operations platform built on the Model Context Protocol (MCP) architecture. It covers: timetable management, CEFR-driven lesson planning, attendance/register, student profiles & progress, lightweight forum, and authentication/authorisation.

**Key Innovation**: AI-assisted workflows through role-specific MCP servers (Admin, Teacher, Student) that provide context-aware automation while maintaining strict security boundaries.

**Initial focus**:
- Admin workflows (user management, reporting, compliance)
- Teacher workflows (lesson planning, attendance marking, materials)
- Student read/self-service (timetable, progress tracking, materials access)

---

## 2. Context & Background

### 2.1 Organisation Context
- **Location**: Dublin-based language school
- **Compliance**: ISO 27001/27002 aligned, GDPR-compliant
- **Scale**: Multi-tenant platform supporting multiple organisations

### 2.2 System Architecture

**MyCastle uses a dual-system design with strict separation of concerns:**

#### Finance System (Primary - Operational ✅)
- **Purpose**: Revenue tracking, bookings, payments, financial reporting
- **Core Tables**: `bookings`, `payments`, `agencies`, `courses`, `accommodation_types`
- **Status**: Implemented and operational (Phase 1 - 43% complete)
- **Key Flows**: Student books course → Payments recorded → Finance dashboard shows revenue
- **Principle**: DO NOT MODIFY - this system is working and represents 26 completed tasks

#### Academic System (Secondary - In Development)
- **Purpose**: Class management, enrollment, attendance, progress tracking, teaching operations
- **Core Tables**: `classes`, `class_sessions`, `enrollments`, `attendance`, `assessments`, `grades`, `cefr_descriptors`
- **Status**: Planned (migrations to be created)
- **Key Flows**: Admin creates class → Students enrolled → Attendance marked → Progress tracked
- **Principle**: Additive architecture - new tables do not affect existing finance system

#### Bridge Layer (Linking Finance and Academics)
- **Shared Entity**: `students` table (used by both systems)
- **Optional Link**: `enrollments.booking_id` → `bookings.id` (connects class enrollment to financial booking)
- **Key Principle**: **Finance ≠ Academic** (strict separation, seamless DB interaction)
- **Example**: One 24-week booking can spawn three 8-week class enrollments as student progresses through levels (A2 → B1 → B2)

**Rationale**:
- Finance system drives operations (booking-first model for Irish ESL schools)
- Academic system enables teaching operations (class rosters, attendance, compliance)
- Students exist in both domains but serve different purposes
- Systems are independent but can be linked when needed (e.g., linking enrollment to booking for visa compliance reporting)

### 2.3 Pain Points (Current State)
- High administrative load for routine operations
- Fragmented records across multiple systems
- Slow manual export processes
- Weak auditability and compliance tracking
- Lack of AI-assisted content generation for teachers
- No unified view of student progress

### 2.3 Target Stack
**Frontend**: Next.js 15, TypeScript, React 19, Tailwind CSS, Radix UI, RHF + Zod
**Backend**: Next.js App Router + API routes, Node.js, MCP servers (TypeScript)
**Database**: Supabase (PostgreSQL + RLS), Drizzle ORM
**Auth**: Supabase Auth (JWT with role-based claims)
**AI/LLM**: OpenAI API (model-agnostic design)
**Observability**: OpenTelemetry (OTel)

---

## 3. Goals (MoSCoW) and Non-Goals

### 3.1 Must Have (v1)
- ✅ **MCP Architecture**: Role-based MCP servers with Host orchestration
- ✅ **CEFR-driven lesson planner** with AI generation
- ✅ **Fast attendance marking** with keyboard-first UI
- ✅ **Weekly admin exports** (CSV/XLSX) with audit hashes
- ✅ **RLS isolation** at database level for tenant and role separation
- ✅ **Immutable audit trail** for register edits (hash-chained)
- ✅ **Student profile & progress view** (CEFR-aligned)
- ✅ **Observability with PII scrubbing** (OTel integration)
- ✅ **WCAG 2.2 AA compliance** (accessibility)

### 3.2 Should Have (v1.5)
- **Forum with moderation** (teacher/admin moderation queue)
- **Performance budgets** (p95 latency targets enforced)
- **i18n support** (en-IE, es-ES, ga-IE)
- **Caching for plan generation** (deterministic key-based)
- **AI tutor for students** (CEFR-adaptive explanations)

### 3.3 Could Have (v2)
- Topic/material libraries with tagging
- Progress dashboards with visualisations
- Analytics exports (learning outcomes, attendance trends)
- Calendar MCP for external sync
- Payment MCP integration

### 3.4 Won't Have (v1)
- Payment processing (financial transactions)
- Timetable optimisation algorithms
- HR/payroll integration
- Native mobile applications
- Advanced LMS features (proctoring, certification printing)

### 3.5 Non-Goals
- Replace existing SIS (Student Information System)
- Replace finance/accounting systems
- Become a full-featured LMS (Moodle competitor)

---

## 4. Stakeholders & Personas

### 4.1 Primary Users

#### Teacher (Persona: Sarah)
**Profile**: ESL teacher, 5 years experience, teaches B1-C1 levels
**Goals**:
- Minimise administrative overhead
- Generate CEFR-aligned lesson plans quickly
- Mark attendance efficiently (< 2 minutes per class)
- Share materials easily with students
- Track student progress against CEFR outcomes

**Pain Points**:
- Spends 2-3 hours/week on lesson planning
- Manual attendance entry is error-prone
- No unified view of class progress

**AI Assistant Needs**:
- Generate lesson outlines from CEFR descriptors
- Suggest activities and materials
- Provide class-level insights

#### Admin (Persona: Michael)
**Profile**: School operations manager, handles compliance and reporting
**Goals**:
- Extract weekly registers for compliance
- Track student progress across cohorts
- Manage tenant organisations and users
- Ensure audit trail integrity
- Generate reports for stakeholders

**Pain Points**:
- Manual CSV exports take 30-60 minutes
- No tamper-evident audit trail
- Difficult to track RLS policy violations

**AI Assistant Needs**:
- Generate compliance reports
- Analyse cross-class trends
- Automate routine admin tasks

#### Student (Persona: Ana)
**Profile**: B2-level Spanish student, studying for 6 months
**Goals**:
- View timetable and upcoming sessions
- Access lesson materials
- Track progress against CEFR outcomes
- Get homework help

**Pain Points**:
- Unclear how far along CEFR progression
- No access to AI tutoring for homework
- Limited self-service profile updates

**AI Assistant Needs**:
- Answer homework questions (CEFR-appropriate)
- Explain concepts at appropriate level
- Show progress visualisation

### 4.2 System Components
- **MCP Host**: Orchestrates all AI interactions, enforces authorisation
- **Admin MCP Server**: Provides admin-specific resources/tools
- **Teacher MCP Server**: Provides teaching-specific resources/tools
- **Student MCP Server**: Provides student-specific resources/tools
- **Database (Supabase)**: Persistent storage with RLS enforcement

### 4.3 Operational Stakeholders
- **DPO (Data Protection Officer)**: GDPR compliance, DSR processing
- **Compliance/QA**: ISO 27001 audits, policy alignment
- **DevOps**: Infrastructure, monitoring, backups

---

## 5. User Stories (IDs: REQ-T-*, REQ-A-*, REQ-S-*)

### 5.1 Teacher Stories

**REQ-T-001**: Generate CEFR-aligned lesson plan
- **As a** teacher
- **I want to** generate a lesson outline from a CEFR descriptor (e.g., B1 Listening—global comprehension)
- **So that** I can save 60% of lesson planning time
- **Acceptance**: Stored plan JSON passes Zod schema, appears in session planning list
- **Design Ref**: DESIGN §6, TASKS T-031, T-032, T-033

**REQ-T-002**: Save lesson plan with materials
- **As a** teacher
- **I want to** save a lesson plan with objectives, activities, materials, and timings in <5s
- **So that** I can reuse plans and maintain consistency
- **Acceptance**: Plan stored with content hash, cached for reuse
- **Design Ref**: DESIGN §6, TASKS T-032, T-033

**REQ-T-003**: Mark attendance with keyboard shortcuts
- **As a** teacher
- **I want to** mark attendance using keyboard shortcuts (P=Present, A=Absent, L=Late)
- **So that** I can complete attendance marking in < 90 seconds
- **Acceptance**: Keyboard flow works, all statuses persist, optimistic UI
- **Design Ref**: DESIGN §7, TASKS T-020, T-023, T-024

**REQ-T-004**: Bulk mark students present
- **As a** teacher
- **I want to** bulk mark all students present, then override outliers
- **So that** I can reduce repetitive clicks
- **Acceptance**: Single "Mark All Present" button, per-row overrides persist
- **Design Ref**: DESIGN §7, TASKS T-020

**REQ-T-005**: Attach materials to lessons
- **As a** teacher
- **I want to** attach/download materials per lesson plan and session
- **So that** students can access resources
- **Acceptance**: Materials accessible via signed URLs, expire < 24h
- **Design Ref**: DESIGN §7, §8, TASKS T-045

**REQ-T-006**: View personal timetable (cached)
- **As a** teacher
- **I want to** see my personal timetable with p95 < 200ms
- **So that** I can quickly check upcoming sessions
- **Acceptance**: Query uses compound indexes, cache hit ratio > 80%
- **Design Ref**: DESIGN §7, §12, TASKS T-044

### 5.2 Admin Stories

**REQ-A-001**: Export weekly register with audit hash
- **As an** admin
- **I want to** export weekly register per class/cohort (CSV) with audit hash
- **So that** I can prove tamper-evidence to auditors
- **Acceptance**: CSV includes hash column, signed URL expires < 24h
- **Design Ref**: DESIGN §7, §15, TASKS T-041, T-042

**REQ-A-002**: View tamper-evident audit trail
- **As an** admin
- **I want to** view tamper-evident audit trail for any register entry
- **So that** I can investigate discrepancies
- **Acceptance**: Hash chain validated, all edits show actor + timestamp
- **Design Ref**: DESIGN §7, §16, TASKS T-024

**REQ-A-003**: Manage organisations and classes
- **As an** admin
- **I want to** manage orgs/tenants, classes, and enrolments
- **So that** I can onboard schools and cohorts
- **Acceptance**: CRUD operations work, RLS enforces tenant isolation
- **Design Ref**: DESIGN §5, TASKS T-023

**REQ-A-004**: Enforce RLS policies
- **As an** admin
- **I want to** enforce RLS so teachers only see assigned classes
- **So that** data leaks are prevented
- **Acceptance**: Policy tests pass (positive + negative cases)
- **Design Ref**: DESIGN §5, TASKS T-023

**REQ-A-005**: Run compliance report
- **As an** admin
- **I want to** run compliance report (DSRs, last access, retention clocks)
- **So that** I can meet GDPR obligations
- **Acceptance**: Report includes all PII, exportable as JSON
- **Design Ref**: DESIGN §10, §15, TASKS T-065

### 5.3 Student Stories

**REQ-S-001**: View timetable and materials
- **As a** student
- **I want to** view my timetable and download materials
- **So that** I can prepare for lessons
- **Acceptance**: Only own classes visible, signed URLs for materials
- **Design Ref**: DESIGN §7, §8, TASKS T-045

**REQ-S-002**: View CEFR progress
- **As a** student
- **I want to** view my progress vs CEFR outcomes (read-only)
- **So that** I can understand my learning trajectory
- **Acceptance**: Progress visualisation shows completed descriptors
- **Design Ref**: DESIGN §8, TASKS T-060

**REQ-S-003**: Update profile fields (verified)
- **As a** student
- **I want to** update limited profile fields (email, phone) with verification
- **So that** my contact details stay current
- **Acceptance**: Verification challenge sent, changes logged
- **Design Ref**: DESIGN §8, TASKS T-060

**REQ-S-004**: Post in forum within rate limits
- **As a** student
- **I want to** post in forum within rate limits and report inappropriate content
- **So that** I can participate safely in class discussions
- **Acceptance**: Token bucket enforced, flagged posts hidden
- **Design Ref**: DESIGN §9, TASKS T-050, T-052

**REQ-S-005**: Opt-in/out of data retention
- **As a** student
- **I want to** opt-in/opt-out of data retention beyond legal minimums
- **So that** I control my data footprint
- **Acceptance**: Preference stored, retention jobs respect flag
- **Design Ref**: DESIGN §8, TASKS T-065

---

## 6. Functional Requirements (by Module)

### 6.1 Authentication & Authorisation
**Module**: Auth (Supabase Auth + RLS)
- Supabase Auth for session management (JWT with role claims)
- Roles: `admin`, `teacher`, `student` (stored in `user.role_scope`)
- Organisation tenancy via `org_id` in JWT claims
- RLS policies enforce:
  - Teachers see only assigned classes
  - Students see only enrolled classes
  - Admins see all within their org
- Session token refresh (short-lived access tokens)
- JWKS verification for token integrity

**REQ IDs**: REQ-A-004, REQ-T-006, REQ-S-001
**Design Ref**: DESIGN §5
**Tasks**: T-023 (RLS policies)

### 6.2 Timetable
**Module**: Timetable (read-optimised queries)
- Filter by teacher/student/week
- Cache keys: `{role,id,week}`
- Compound indexes on `(teacher_id, week_range)` and `(student_id, week_range)`
- p95 latency < 200ms

**REQ IDs**: REQ-T-006, REQ-S-001
**Design Ref**: DESIGN §7, §12
**Tasks**: T-044 (query optimisation)

### 6.3 Lesson Planner
**Module**: Planner (AI-assisted content generation)
- **Input**: CEFR level + descriptor ID (+ optional topic/aims)
- **Output**: Structured JSON (objectives, activities, timings, materials, assessments)
- **AI Integration**: OpenAI API with schema-constrained prompts
- **Retry strategy**: ≤2 retries on schema validation failure
- **Caching**: Deterministic cache key `{level,descriptorId,topic?}`
- **Performance**: p95 < 5s

**REQ IDs**: REQ-T-001, REQ-T-002
**Design Ref**: DESIGN §6
**Tasks**: T-031 (API endpoint), T-032 (Zod schemas), T-033 (caching)

### 6.4 Register (Attendance)
**Module**: Register (tamper-evident attendance tracking)
- **Real-time marking**: Statuses: P (Present), A (Absent), L (Late) + optional note
- **Hash chain**: `RegisterEntry.hash = sha256(payload || hash_prev)` for tamper evidence
- **Edit window**:
  - Teacher can amend same day
  - Later edits require admin approval
  - All edits audited in `AuditLog`
- **Performance**: Write p95 < 300ms
- **UI**: Keyboard-first (bulk present + per-row override)

**REQ IDs**: REQ-T-003, REQ-T-004, REQ-A-001, REQ-A-002
**Design Ref**: DESIGN §7
**Tasks**: T-020 (UI), T-023 (RLS), T-024 (hash chain)

### 6.5 Student Profile
**Module**: Profile (PII management with verification)
- **Data split**: `student_public` (name, avatar) vs `student_sensitive` (dob, contacts)
- **Verification**: Email/phone changes require challenge codes
- **Audit**: All reads/writes logged
- **Self-service**: Students can update allow-listed fields
- **Admin override**: Admins can update all fields

**REQ IDs**: REQ-S-003
**Design Ref**: DESIGN §8
**Tasks**: T-060 (split tables + RLS)

### 6.6 Forum
**Module**: Forum (class-level discussions with moderation)
- **Threads & posts**: Per class/cohort
- **Moderation**: Teacher/admin can flag/hide posts
- **Rate limits**: Token bucket (e.g., 10 posts/10 min per user per class)
- **Abuse reporting**: Students can report posts
- **Soft deletes**: Flagged posts hidden until reviewed

**REQ IDs**: REQ-S-004
**Design Ref**: DESIGN §9
**Tasks**: T-050 (rate limiter), T-052 (moderation queue)

### 6.7 MCP Architecture (v3.0) — ✅ APPROVED for Implementation
**Module**: MCP Host + Domain-based Servers (8 MCPs, all ≤10 tools)

**Status**: ✅ **Architectural decision approved 2025-11-11**

**Architecture Principle**: Domain-driven MCP design for security, performance, maintainability, and future extensibility

#### 6.7.1 Identity & Access MCP (6 tools)
- **Purpose**: User authentication, authorization, role management
- **Scope**: `identity:*`
- **Tools**: create_user, update_user_role, set_permissions, revoke_session, rotate_api_key, audit_access
- **Authorization**: Super-admin or `identity:write`
- **Why Separate**: Security-critical operations, highest audit level, minimal change frequency

#### 6.7.2 Academic Operations MCP (10 tools)
- **Purpose**: Programme, course, scheduling, lesson planning
- **Scope**: `academic:*`
- **Tools**: create_programme, create_course, map_cefr_level, schedule_class, assign_teacher, allocate_room, register_lesson_template, approve_lesson_plan, link_cefr_descriptor, publish_materials
- **Authorization**: Admin with `academic:write`
- **Why Together**: High cohesion (academic delivery), shared data model

#### 6.7.3 Attendance & Compliance MCP (8 tools)
- **Purpose**: Attendance tracking, visa compliance, register exports
- **Scope**: `attendance:*`, `compliance:*`
- **Tools**: prepare_register, record_attendance, correct_attendance, export_attendance, visa_compliance_report, compile_compliance_pack, anonymise_dataset, policy_check
- **Authorization**: Admin with `attendance:write` or `compliance:read`
- **Why Together**: Legally coupled (visa tracking), similar audit requirements

#### 6.7.4 Finance MCP (9 tools)
- **Purpose**: Invoicing, payments, reconciliation, financial reporting
- **Scope**: `finance:*`
- **Tools**: create_booking, edit_booking, issue_invoice, apply_discount, refund_payment, reconcile_payouts, ledger_export, aging_report, confirm_intake
- **Authorization**: Admin with `finance:write`
- **Why Separate**: Strictest audit trail, PCI compliance, external integrations

#### 6.7.5 Student Services MCP (9 tools)
- **Purpose**: Accommodation, letters, certificates, lifecycle events
- **Scope**: `student_services:*`
- **Tools**: register_host, allocate_accommodation, swap_accommodation, export_placements, issue_letter, approve_deferral, award_certificate, track_visa_status, record_pastoral_note
- **Authorization**: Admin with `student_services:write`
- **Why Together**: Student welfare and lifecycle, shared workflows

#### 6.7.6 Operations & Quality MCP (8 tools)
- **Purpose**: System operations, backups, quality assurance, CPD
- **Scope**: `ops:*`, `quality:*`
- **Tools**: backup_db, restore_snapshot, record_observation, assign_cpd, export_quality_report, bulk_email, notify_stakeholders, mail_merge_pdf
- **Authorization**: Admin with `ops:write` or `quality:write`
- **Why Together**: Operational tools need highest privilege, QA/CPD related

#### 6.7.7 Teacher MCP (10 tools)
- **Purpose**: Lesson planning, attendance marking, grading
- **Scope**: `teacher:*`
- **Tools**: view_timetable, create_lesson_plan, attach_materials, map_cefr_objectives, mark_attendance, record_progress_note, assign_homework, grade_submission, export_class_data, raise_support_ticket
- **Authorization**: Teacher role
- **Optimized**: Reduced from 12 → 10 tools (merged room_swap into Academic MCP, merged quick_scan into mark_attendance)

#### 6.7.8 Student MCP (10 tools)
- **Purpose**: Timetable, materials, AI tutor, progress tracking
- **Scope**: `student:*`
- **Tools**: view_timetable, download_materials, submit_homework, view_grades, ask_tutor (includes explain/practice), track_progress, attendance_summary, request_letter, raise_support_request, view_invoice
- **Authorization**: Student role
- **Optimized**: Reduced from 14 → 10 tools (merged AI tutor tools, merged invoice tools, moved profile updates to Student Services MCP)

#### 6.7.9 Cross-Cutting Concerns
- **Host orchestration**: Routes requests to appropriate MCP server based on scope
- **Security**: MCP servers cannot access each other's context (strict isolation)
- **Protocol**: JSON-RPC 2.0 over stdio (dev) or HTTPS (prod)
- **Performance**: Domain-specific caching, distributed load (8 MCPs vs 3 hotspot)
- **Authorization**: Fine-grained scopes (e.g., `finance:write` ≠ `academic:write`)
- **Audit**: Per-domain audit trails (finance separate from academic)

**Benefits over v2.0 (3-MCP)**:
- ✅ All MCPs ≤10 tools (compliance with constraint)
- ✅ Better security (least privilege, smaller attack surface per MCP)
- ✅ Better performance (distributed load, domain-specific caching)
- ✅ Easier maintenance (clear domain boundaries, focused responsibility)
- ✅ Future-proof (seamless addition of new domain MCPs)

#### 6.7.10 Future Extensibility Pattern

**Design for Extension**: The 8-MCP architecture is designed to support seamless addition of future domain MCPs without modifying existing code.

**Example Future MCPs:**

1. **Parent MCP** (`parent:*`, ≤10 tools)
   - Purpose: Parent portal for student progress, attendance, communications
   - Tools: view_student_progress, request_meeting, update_emergency_contact, view_attendance_report, approve_absence, view_invoices, message_teacher, download_reports, manage_consent, view_calendar
   - RLS: Parents see only their own students via parent_student_relationship table

2. **Partner MCP** (`partner:*`, ≤10 tools)
   - Purpose: Partner school integrations, referrals, co-teaching arrangements
   - Tools: view_partner_students, initiate_referral, accept_transfer, view_shared_resources, schedule_joint_session, export_performance_report, manage_partnership_terms, sync_calendars, message_coordinator, track_referral_pipeline

3. **Analytics MCP** (`analytics:*`, ≤10 tools)
   - Purpose: Business intelligence, reporting, data visualization
   - Tools: generate_cohort_report, track_retention_metrics, export_financial_dashboard, analyze_attendance_trends, benchmark_performance, forecast_enrollment, visualize_progress_distribution, create_custom_report, schedule_recurring_report, export_to_powerbi

4. **Marketing MCP** (`marketing:*`, ≤10 tools)
   - Purpose: Lead generation, CRM, campaigns, enrollment funnels
   - Tools: capture_lead, track_inquiry, schedule_demo, send_campaign, segment_audience, track_conversion, manage_waitlist, generate_referral_code, analyze_channel_performance, export_crm_data

**Extension Checklist** (for adding new MCP):
- [ ] Define new authorization scope (e.g., `parent:*`)
- [ ] Design ≤10 tools with clear domain responsibility
- [ ] Implement MCP server following standard template (see DESIGN §1)
- [ ] Add RLS policies for new role/scope
- [ ] Register MCP with Host routing layer
- [ ] Add scope to JWT claims (if new role)
- [ ] Write integration tests for all tools
- [ ] Document tools in spec/XX-{domain}-mcp.md
- [ ] Update DESIGN.md C4 diagram (optional, for major MCPs)
- [ ] Deploy independently (no changes to existing MCPs required)

**Technical Requirements for Extension:**

```typescript
// Standard MCP Interface
interface MCPServer {
  scope: string;              // e.g., 'parent:*'
  maxTools: 10;               // Hard constraint
  tools: Tool[];              // ≤10 tools
  resources?: Resource[];     // Optional resources
  prompts?: Prompt[];         // Optional prompts

  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

// Tool Interface
interface Tool {
  name: string;               // e.g., 'view_student_progress'
  description: string;
  inputSchema: JSONSchema;    // Zod schema for validation
  handler: (input: any, context: AuthContext) => Promise<any>;
}

// Authorization Context
interface AuthContext {
  userId: string;
  orgId: string;
  role: string;
  scopes: string[];           // e.g., ['parent:read', 'parent:write']
  tenantId: string;
}
```

**Migration Path for New MCPs:**
1. **Phase 1**: Design & specification (1-2 weeks)
2. **Phase 2**: Implementation & testing (2-3 weeks)
3. **Phase 3**: RLS policies & security review (1 week)
4. **Phase 4**: Deployment & monitoring (1 week)

**Constraints:**
- **≤10 tools per MCP** (hard limit, architectural constraint)
- **Single domain responsibility** (no cross-domain tools)
- **No MCP-to-MCP communication** (Host mediates all interactions)
- **Independent deployment** (zero downtime, no cascading changes)

**REQ IDs**: All (cross-cutting)
**Design Ref**: DESIGN §1 (v3.0 architecture with extensibility pattern)
**Tasks**: T-020 through T-023 (core MCP servers), T-110 through T-143 (v3.0 migration)

---

## 7. Data Requirements

### 7.1 Core Entities

#### 7.1.1 Organisation & Users
```typescript
Organisation(id, name, locale, created_at)
User(id, email, role_scope, org_id, created_at)
Teacher(id, user_id, staff_code)
Student(id, user_id, date_of_birth, emergency_contact_id)
```

#### 7.1.2 Academic Structure
```typescript
Class(id, org_id, name, cefr_level, teacher_id)
Session(id, class_id, start_at, end_at, room)
Enrolment(id, class_id, student_id, active)
```

#### 7.1.3 Attendance & Audit
```typescript
RegisterEntry(id, session_id, student_id, status, marked_by, marked_at, note, hash, hash_prev)
AuditLog(id, entity, entity_id, action, actor_id, diff_json, created_at)
```

#### 7.1.4 Curriculum & Planning
```typescript
CEFRDescriptor(id, level, domain, code, text)
Plan(id, class_id, session_id?, cefr_level, descriptor_id, json_plan, created_by, cached_key)
Material(id, plan_id, title, url, content_hash)
```

#### 7.1.5 Forum
```typescript
ForumPost(id, class_id, author_user_id, parent_post_id?, body, created_at, is_flagged)
```

### 7.2 Constraints
- **FK integrity**: All foreign keys enforced
- **RLS on org_id**: Tenant isolation mandatory
- **Unique constraints**: `unique(cached_key)` on `Plan` (optional)
- **Hash chain**: `RegisterEntry.hash = sha256(payload || hash_prev)`
- **PII encryption**: Sensitive fields encrypted at rest (column-level or TDE)

### 7.3 Retention Policies
| Entity | Retention Period | Notes |
|--------|------------------|-------|
| **Attendance & Enrolment** | 7 years | Confirm with DPO per jurisdiction |
| **Audit logs** | 7 years | Immutable, legal hold compatible |
| **Forum posts** | 24 months | Configurable per org |
| **Access logs** | 12 months | Pseudonymised IP addresses |

**Right to be forgotten**: Honoured except legal-hold datasets; use keyed encryption for revocation.

---

## 8. Compliance & Security

### 8.1 GDPR Principles
- **Purpose limitation**: Data collected only for stated purposes
- **Data minimisation**: Only essential PII stored
- **Storage limitation**: Retention policies enforced via scheduled jobs
- **DSRs (Data Subject Requests)**:
  - **Access**: JSON export within 30 days
  - **Rectification**: Profile update workflows
  - **Erasure**: Keyed encryption revocation

### 8.2 ISO 27001 Alignment
- **Access control**: RLS + JWT verification
- **Logging**: All significant actions logged immutably
- **Backups**: Nightly DB + WAL; recovery drills quarterly
- **Secret rotation**: Quarterly rotation process

### 8.3 Security Measures
- **Supabase RLS**: Tenant & role separation at database level
- **Least-privilege policies**: Roles have minimal necessary permissions
- **Immutable audit trail**: Register edits hash-chained
- **PII scrubbing**: Telemetry redacts emails, phones, names
- **JWT short TTL**: Access tokens expire quickly, refresh tokens rotated

---

## 9. Performance & SLAs

### 9.1 Latency Targets (p95)
| Operation | Target | Notes |
|-----------|--------|-------|
| **Page load** | < 1.5s | Full hydration |
| **Timetable read** | < 200ms | Cached |
| **Plan generation** | < 5s | AI-assisted |
| **Register write** | < 300ms | Single transaction |
| **Export job** | < 60s | Standard weekly cohort |

### 9.2 Availability
| API Type | SLA | Notes |
|----------|-----|-------|
| **Core read APIs** | 99.9% | Timetable, profile |
| **Write APIs** | 99.5% | Register, plan save |
| **Export jobs** | 99.5% | Background processing |

### 9.3 Scalability
- **Horizontal scaling**: Stateless API routes, DB read replicas
- **Cache hit ratio**: > 80% for timetable queries
- **Rate limiting**: Per-user, per-endpoint (token bucket)

---

## 10. Accessibility & Internationalisation

### 10.1 WCAG 2.2 AA
- **Focus order**: Logical tab flow for register and planner
- **Contrast**: All text meets 4.5:1 ratio
- **Keyboard navigation**: Full keyboard access for all workflows
- **Labels**: All form inputs have accessible labels
- **ARIA**: Screen reader support for dynamic content

### 10.2 Internationalisation
- **Locales**: en-IE (primary), es-ES, ga-IE
- **Server-driven**: Message catalogues, date/number localisation
- **RTL-safe**: Components support right-to-left layouts
- **UI theming**: White base, yellow/blue accents, snap-scroll sections

---

## 11. Dependencies & Assumptions

### 11.1 Dependencies
- **Runtime**: Node 22+
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle
- **Auth**: Supabase Auth
- **LLM**: OpenAI API (or compatible)

### 11.2 Assumptions
- School calendar maintained externally (CSV/ICS import possible later)
- CEFR descriptors seeded in database
- LLM provider available with uptime > 99.5%
- Network latency < 50ms to database
- Storage for materials available (Supabase Storage or S3-compatible)

---

## 12. Acceptance Criteria (GIVEN–WHEN–THEN)

### 12.1 Lesson Planning (REQ-T-001)
```gherkin
GIVEN CEFR level B1 and descriptor "Listening—global comprehension" selected
WHEN user clicks "Generate Plan"
THEN plan JSON passes Zod schema
  AND plan appears in session planning list
  AND generation completes in < 5s (p95)
```

### 12.2 Attendance Marking (REQ-T-003)
```gherkin
GIVEN session roster with 20 students displayed
WHEN user presses "P" hotkey
THEN all students marked Present
  AND UI shows success toast
  AND individual overrides persist on blur
  AND total time < 90s
```

### 12.3 Weekly Export (REQ-A-001)
```gherkin
GIVEN admin selects week range "2025-11-01 to 2025-11-07"
WHEN clicking "Export Register"
THEN CSV generated with hash column
  AND signed URL provided
  AND URL expires in < 24h
  AND job completes in < 60s (p95)
```

### 12.4 RLS Enforcement (REQ-A-004)
```gherkin
GIVEN teacher Alice assigned to Class A
  AND teacher Bob assigned to Class B
WHEN Alice queries timetable
THEN only Class A sessions returned
  AND Class B sessions not visible
  AND policy test suite passes
```

### 12.5 Student Profile Update (REQ-S-003)
```gherkin
GIVEN student updates email to "new@example.com"
WHEN clicking "Save"
THEN verification code sent to new email
  AND change logged in AuditLog
  AND email not updated until verified
```

---

## 13. Risks & Mitigations

### 13.1 Technical Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **LLM nondeterminism** | High | Medium | Strict schema, retries, cached templates |
| **RLS misconfiguration** | Critical | Low | Policy test suite, migration gates |
| **Spec drift** | Medium | High | Traceability dashboard, PR checklist |
| **PII leakage** | Critical | Low | Redaction rules, secrets scanning |
| **DB performance degradation** | High | Medium | Query budgets, EXPLAIN ANALYZE in PR |

### 13.2 Operational Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **LLM provider outage** | Medium | Low | Fallback to cached plans, degraded mode |
| **DB connection pool exhaustion** | High | Medium | Circuit breakers, connection limits |
| **Export job backlog** | Medium | Medium | Queue monitoring, auto-scaling workers |

---

## 14. Metrics / Success Criteria

### 14.1 Lead Indicators (Process)
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Planning time reduction** | 60% ↓ | Time to generate + save plan |
| **Attendance marking cycle** | < 90s/class | Session start to completion |
| **p95 latency budgets** | All met | OTel traces, percentile aggregation |
| **Test coverage (RLS policies)** | > 80% | Jest + SQL policy tests |
| **Cache hit ratio** | > 80% | Timetable queries |

### 14.2 Lag Indicators (Outcomes)
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Unauthorised profile reads** | Zero | RLS violation logs |
| **Export uptime** | 99.9% | Background job success rate |
| **Audit discrepancy rate** | < 0.5% | Hash chain validation failures |
| **User satisfaction (NPS)** | > 50 | Quarterly survey |

---

## 15. Traceability Matrix (Excerpt)

| REQ ID | Requirement | Design Ref | Task IDs |
|--------|-------------|------------|----------|
| **REQ-T-001** | Generate CEFR lesson plan | DESIGN §6 | T-031, T-032, T-033 |
| **REQ-T-002** | Save plan with materials | DESIGN §6 | T-032, T-033 |
| **REQ-T-003** | Keyboard attendance marking | DESIGN §7 | T-020, T-023, T-024 |
| **REQ-T-004** | Bulk present override | DESIGN §7 | T-020 |
| **REQ-T-005** | Attach materials | DESIGN §7, §8 | T-045 |
| **REQ-T-006** | Cached timetable | DESIGN §7, §12 | T-044 |
| **REQ-A-001** | Weekly export with hash | DESIGN §7, §15 | T-041, T-042 |
| **REQ-A-002** | Audit trail view | DESIGN §7, §16 | T-024 |
| **REQ-A-003** | Manage orgs/classes | DESIGN §5 | T-023 |
| **REQ-A-004** | RLS enforcement | DESIGN §5 | T-023 |
| **REQ-A-005** | Compliance reports | DESIGN §10, §15 | T-065 |
| **REQ-S-001** | View timetable/materials | DESIGN §7, §8 | T-045 |
| **REQ-S-002** | CEFR progress view | DESIGN §8 | T-060 |
| **REQ-S-003** | Profile updates | DESIGN §8 | T-060 |
| **REQ-S-004** | Forum posts & rate limits | DESIGN §9 | T-050, T-052 |
| **REQ-S-005** | Data retention opt-in/out | DESIGN §8 | T-065 |

---

## 16. Out of Scope & Open Questions

### 16.1 Out of Scope (v1)
- Payment processing (financial transactions)
- Certification printing
- Proctoring features
- HR/payroll integration
- Mobile native applications
- Advanced timetable optimisation

### 16.2 Open Questions
| Question | Owner | Status |
|----------|-------|--------|
| Legal retention periods per EU jurisdiction? | DPO | 🟡 Pending legal review |
| Forum moderation thresholds (auto-hide after X flags)? | Product | 🟡 TBD |
| Register edit window policy (same-day vs 24h)? | Academic Lead | 🟡 In discussion |
| CEFR descriptor taxonomy finalisation? | Curriculum Team | 🟢 Resolved (using official CEFR 2018) |

---

## 17. Related Documents

- **DESIGN.md**: Technical design and architecture details
- **TASKS.md**: Work breakdown and task specifications
- **spec/01-overview.md**: Project overview and stakeholders
- **spec/02-system-architecture.md**: Detailed architecture
- **spec/03-mcp.md**: MCP protocol implementation
- **spec/04-admin-mcp.md**: Admin MCP specification
- **spec/05-teacher-mcp.md**: Teacher MCP specification
- **spec/06-student-mcp.md**: Student MCP specification
- **spec/08-database.md**: Complete database schema

---

## 18. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.0.0 | 2025-11-11 | Eoin Malone + Claude Code | **APPROVED**: 8-MCP architecture (≤10 tools per MCP) with extensibility pattern for future domain MCPs (Parent, Partner, Analytics, Marketing). Complete technical requirements and migration path defined. Split Admin into 6 domain MCPs, optimized Teacher/Student to 10 tools each. |
| 2.1.0 | 2025-11-07 | Eoin Malone + Claude Code | Integrated REQ structure with existing MCP specs |
| 2.0.0 | 2025-10-31 | Eoin Malone + Claude Code | Complete MCP architecture restructure |
| 1.0.0 | 2025-10-30 | Eoin Malone | Initial consolidated specification |

---

**Status**: ✅ Complete and aligned with DESIGN.md and TASKS.md
**Next Review**: 2025-11-14 (weekly cadence)
**Sign-off**: Pending stakeholder review
