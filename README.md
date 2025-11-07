# MyCastle – ESL Learning Platform Specification

> **Version:** 3.0.0 | **Last Updated:** 2025-11-07

This repository contains the **complete specifications** for MyCastle, an ESL school operations platform built on the Model Context Protocol (MCP) architecture. It covers timetable management, CEFR-driven lesson planning, attendance tracking, student profiles, and AI-assisted workflows.

---

## 📋 Core Specification Documents (The Spine)

These three documents form the **authoritative spine** of the project and are updated with every commit:

### 1. [**REQ.md** — Requirements Specification](./REQ.md)
**What the system must do and why.**
- Goals (MoSCoW), stakeholders, user stories
- Functional and non-functional requirements
- Data requirements, compliance, acceptance criteria
- Success metrics and traceability

### 2. [**DESIGN.md** — Design Specification](./DESIGN.md)
**How the system fulfils the requirements.**
- Architecture (MCP, Next.js, Supabase)
- Domain model, data flows, APIs
- Security (RLS, JWT, encryption)
- Performance strategies, observability

### 3. [**TASKS.md** — Task Specification](./TASKS.md)
**How work is executed to implement the design.**
- Work breakdown structure (WBS) by Epic
- Actionable tasks with acceptance criteria
- Testing strategy, CI/CD pipeline
- Traceability (REQ → DESIGN → TASK)

**These documents are living and must be kept aligned with implementation.**

---

## 🗂️ Repository Structure

```
MyCastle/
├── REQ.md                          # ✅ Requirements Specification (v2.1.0)
├── DESIGN.md                       # ✅ Design Specification (v2.1.0)
├── TASKS.md                        # ✅ Task Specification (v2.1.0)
├── README.md                       # This file
│
├── spec/                           # Detailed MCP architecture specs
│   ├── 01-overview.md              # Project objectives, stakeholders
│   ├── 02-system-architecture.md   # System architecture details
│   ├── 03-mcp.md                   # MCP protocol implementation
│   ├── 04-admin-mcp.md             # Admin MCP specification
│   ├── 05-teacher-mcp.md           # Teacher MCP specification
│   ├── 06-student-mcp.md           # Student MCP specification
│   ├── 07-agents.md                # Host orchestration patterns
│   ├── 08-database.md              # Complete database schema
│   ├── 09-mcp-interaction-patterns.md  # MCP interaction patterns
│   ├── table-of-contents.md        # Navigation index
│   └── shared-services/            # Shared service MCPs
│
└── .gitignore
```

---

## 🚀 Quick Start

### For Product/Business
1. **[REQ.md](./REQ.md)** — Understand what we're building and why
2. **spec/01-overview.md** — See stakeholder personas and use cases

### For Engineering
1. **[DESIGN.md](./DESIGN.md)** — Understand technical architecture
2. **[TASKS.md](./TASKS.md)** — See work breakdown and acceptance criteria
3. **spec/03-mcp.md** — Deep-dive into MCP protocol
4. **spec/08-database.md** — Review database schema

### For Implementation
1. Pick a task from **[TASKS.md](./TASKS.md)**
2. Check linked requirements in **[REQ.md](./REQ.md)**
3. Review design in **[DESIGN.md](./DESIGN.md)**
4. Implement with traceability comments
5. Update specs if design changes

## 🎯 MVP Scope (Phase 1)

**Build First:**
- ✅ Host service (Next.js/Node.js) - orchestration layer
- ✅ Admin MCP server - administrative operations
- ✅ Database schema (Drizzle + Supabase/PostgreSQL)
- ✅ Authentication (Supabase Auth with JWT)

**Build Later:**
- ⏳ Identity MCP - separate auth service
- ⏳ Payments MCP - separate financial service
- ⏳ Teacher MCP - teaching workflows
- ⏳ Student MCP - learning workflows

## 🏗️ Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js, React, Tailwind CSS | Web-first UI |
| **Host** | Next.js API routes / Node.js (TypeScript) | MCP orchestration |
| **Database** | Supabase (primary) / PostgreSQL | RLS for multi-tenancy |
| **ORM** | Drizzle ORM | Type-safe queries |
| **Auth** | Supabase Auth | JWT issuer |
| **MCP** | TypeScript (JSON-RPC 2.0) | stdio (dev), HTTPS (prod) |
| **LLM** | OpenAI API | Model-agnostic design |
| **Inspector** | Archon | Dev-only MCP testing |

## 📐 Architecture Principles

1. **Host-Mediated Communication**: All MCP servers communicate through the Host (no direct MCP-to-MCP)
2. **Role-Based Isolation**: Separate MCP servers for each user role with strict authorization
3. **Tenant Isolation**: Multi-tenancy ready with `tenant_id` and RLS policies
4. **Spec-First Development**: All changes documented before implementation
5. **Security by Design**: JWT verification, RLS, audit logging throughout

## 📚 Key Documents

- **[Table of Contents](./spec/table-of-contents.md)** - Complete navigation
- **[System Architecture](./spec/02-system-architecture.md)** - Detailed architecture diagrams and component descriptions
- **[Admin MCP](./spec/04-admin-mcp.md)** - Complete specification for MVP MCP server (resources, tools, prompts)
- **[Database Schema](./spec/08-database.md)** - Full Drizzle schema with ERD, RLS policies, and views
- **[Agent Orchestration](./spec/07-agents.md)** - Host patterns for multi-MCP coordination

## 🔐 Security & Compliance

- **GDPR-Aligned**: Data minimization, purpose limitation, access control
- **RLS (Row-Level Security)**: Enforced at database level for tenant isolation
- **JWT Authentication**: Supabase Auth with JWKS verification
- **Audit Logging**: All significant actions logged immutably
- **Context Isolation**: MCP servers cannot access each other's data directly

## 🎓 Use Cases

### For Administrators
- Manage users (add, modify, delete)
- Create and manage classes
- Track attendance and bookings
- Generate Excel/CSV exports from templates
- View payment summaries and create invoices
- System backups and audit logs

### For Teachers (Future)
- Generate lesson plans and quizzes
- Auto-grade assignments
- Analyze student performance
- Record attendance and grades
- Send class announcements

### For Students (Future)
- Get personalized tutoring and homework help
- Take practice quizzes
- Track learning progress
- Access course materials
- Receive study guidance

## 🛠️ Development Workflow

This project follows a **spec-first** approach:

1. **Specification** → Design documented before implementation
2. **Schema Definition** → Database tables defined with Drizzle
3. **MCP Server** → Tools, resources, prompts implemented
4. **Host Integration** → Connect MCP to Host service
5. **Testing** → Archon inspection + unit/integration tests
6. **Deployment** → Local dev (stdio), Production (HTTPS)

## 📖 Documentation Status

| Section | Status | Description |
|---------|--------|-------------|
| 1-8 | ✅ Complete | Overview, Architecture, MCP, Admin/Teacher/Student MCPs, Agents, Database |
| 9 | ⏳ To Detail | Testing strategies |
| 10 | ⏳ To Integrate | User stories from original spec |
| 11 | ⏳ To Detail | Deployment procedures |
| 12 | ⏳ To Create | Appendices, glossary, API reference |

## 🤝 Contributing

This is a living specification. Changes should follow this process:

1. Discuss proposed changes
2. Update relevant spec documents
3. Update table of contents if structure changes
4. Increment version in document status
5. Commit with clear description

## 📊 Traceability

Every task in **TASKS.md** links to:
- **User Stories** in REQ.md (§5) via REQ-T-*, REQ-A-*, REQ-S-* IDs
- **Design Sections** in DESIGN.md via § references
- **Acceptance Criteria** (GIVEN-WHEN-THEN format)

**Example Traceability Chain**:
```
User Story (REQ-T-001): Generate CEFR-aligned lesson plan
    ↓
Design (DESIGN §6): Lesson Planning Flow (AI-Assisted)
    ↓
Tasks: T-031 (API), T-032 (Schema), T-033 (Cache)
    ↓
Implementation: Code with comments linking back to REQ-T-001
    ↓
Tests: E2E test named "REQ-T-001: Generate lesson plan"
```

This ensures **bidirectional traceability**: from requirements to implementation, and from code back to requirements.

---

## 📝 Version History

### v3.0.0 (2025-11-07) — 8-MCP Domain-Driven Architecture
- ✅ Split Admin MCP into 6 domain MCPs (Identity, Academic, Attendance, Finance, Student Services, Ops)
- ✅ Optimized Teacher MCP (12 → 10 tools)
- ✅ Optimized Student MCP (14 → 10 tools)
- ✅ All 8 MCPs now ≤10 tools (compliance with constraint)
- ✅ Added 34 migration tasks (T-110 to T-143) with 4-phase rollout plan
- ✅ Updated C4 architecture diagrams with scope-based routing
- ✅ Fine-grained authorization scopes (identity:*, finance:*, academic:*, etc.)
- ✅ Total: 76 tasks (42 core + 34 migration)

### v2.1.0 (2025-11-07) — Specification Spine Integration
- ✅ Added REQ.md, DESIGN.md, TASKS.md as project spine
- ✅ Reconciled MCP architecture with traditional requirements
- ✅ Established traceability between all specs
- ✅ User stories mapped to detailed tasks
- ✅ 42 tasks defined across 11 epics
- ✅ 4 milestones with clear exit criteria

### v2.0.0 (2025-10-31) — MCP Architecture Restructure
- Complete MCP architecture specs (Admin, Teacher, Student MCPs)
- Interaction patterns and orchestration details
- Shared services architecture

### v1.0.0 (2025-10-30) — Initial Consolidation
- Merged original spec.md and esl-mcp-spec content
- Completed sections 1-8
- Established MVP priorities (Admin MCP + Host)

---

## 👤 Author

**Eoin Malone** (with Claude Code)

## 📄 License

[To be specified]

---

**Specification Status**: ✅ Complete and Aligned (REQ ↔ DESIGN ↔ TASKS)
**Last Updated**: 2025-11-07
**Version**: 2.1.0  

