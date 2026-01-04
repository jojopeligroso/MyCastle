# MyCastle – ESL Learning Platform Specification

> **Version:** 3.0.0 **APPROVED** | **Last Updated:** 2025-11-11

This repository contains the **complete specifications** for MyCastle, an ESL school operations platform built on the **8-MCP domain-driven architecture** with extensibility for future domain MCPs. It covers timetable management, CEFR-driven lesson planning, attendance tracking, student profiles, and AI-assisted workflows through role-specific MCP servers.

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

**Updated:** 2026-01-02 - Consolidated from 27 → 12 core documents

```
MyCastle/
├── README.md                       # This file - Navigation hub
│
├── Core Specification ("The Spine")
├── REQ.md                          # ✅ Requirements Specification (v3.0.0)
├── DESIGN.md                       # ✅ Design Specification (v3.0.0)
├── TASKS.md                        # ✅ Task Specification (v3.0.0)
│
├── Living Documents (Updated Weekly)
├── STATUS.md                       # ⭐ Current sprint tasks with 20-min subtasks
├── ROADMAP.md                      # Phases 1-4 (105 tasks)
│
├── Operational Guides
├── GETTING-STARTED.md              # Quick start + detailed setup + overview
├── TESTING.md                      # All testing procedures (unit, E2E, RLS)
├── DEPLOYMENT.md                   # Production deployment guide
│
├── Reference Documents
├── docs/
│   ├── reference/
│   │   ├── 8-MCP-IMPLEMENTATION-PLAN.md
│   │   ├── BUSINESS_VALUE_PRIORITIES.md
│   │   └── FLEXIBLE_ENROLLMENTS.md
│   │
│   ├── archive/                    # Historical documents
│   │   ├── sprints/                # Sprint retrospectives
│   │   ├── analyses/               # Gap analyses and reviews
│   │   ├── PROGRESS.md             # Old progress tracking
│   │   └── NEXT_STEPS_GUIDE.md     # Old setup guide
│   │
│   └── migration/
│       └── MIGRATION_GUIDE.md
│
├── Technical Specifications
├── spec/                           # Detailed MCP architecture specs
│   ├── 01-overview.md              # Project objectives, stakeholders
│   ├── 02-system-architecture.md   # System architecture details
│   ├── 03-mcp.md                   # MCP protocol implementation
│   ├── 04-admin-mcp.md             # Admin MCP specification
│   ├── 05-teacher-mcp.md           # Teacher MCP specification
│   ├── 06-student-mcp.md           # Student MCP specification
│   ├── 07-agents.md                # Host orchestration patterns
│   ├── 08-database.md              # Complete database schema
│   ├── 09-mcp-interaction-patterns.md
│   └── table-of-contents.md
│
└── Implementation
    └── app/                        # Next.js application code
```

---

## 🚀 Quick Start

### For Product/Business
1. **[GETTING-STARTED.md](./GETTING-STARTED.md)** - Project overview and current status
2. **[STATUS.md](./STATUS.md)** - Current sprint progress (updated weekly)
3. **[REQ.md](./REQ.md)** - Complete requirements specification

### For New Developers
1. **[GETTING-STARTED.md](./GETTING-STARTED.md)** - 5-minute quick start or detailed setup
2. **[STATUS.md](./STATUS.md)** - See current sprint tasks with 20-min subtasks
3. **[TESTING.md](./TESTING.md)** - Run tests and verify setup

### For Engineering
1. **[DESIGN.md](./DESIGN.md)** - Technical architecture and patterns
2. **[TASKS.md](./TASKS.md)** - Work breakdown structure (42 tasks)
3. **spec/** - Detailed MCP architecture specifications

### For Implementation
1. Check **[STATUS.md](./STATUS.md)** for current sprint tasks
2. Each task has 20-minute subtasks for easy tracking
3. Link to requirements in **[REQ.md](./REQ.md)**
4. Review design in **[DESIGN.md](./DESIGN.md)**
5. Implement with traceability comments
6. Run `npm run check` before committing
7. Update STATUS.md with progress

## 🎯 8-MCP Architecture (v3.0 APPROVED)

**Core MCPs (all ≤10 tools):**
1. ✅ **Identity & Access MCP** (6 tools) - User auth, roles, permissions
2. ✅ **Academic Operations MCP** (10 tools) - Programmes, courses, scheduling
3. ✅ **Attendance & Compliance MCP** (8 tools) - Registers, visa tracking
4. ✅ **Finance MCP** (9 tools) - Invoicing, payments, reconciliation
5. ✅ **Student Services MCP** (9 tools) - Accommodation, letters, certificates
6. ✅ **Operations & Quality MCP** (8 tools) - Backups, QA, CPD
7. ✅ **Teacher MCP** (10 tools) - Lesson planning, grading, attendance
8. ✅ **Student MCP** (10 tools) - Timetable, AI tutor, progress tracking

**Future Extensibility:**
- ⏭️ **Parent MCP** - Parent portal (≤10 tools)
- ⏭️ **Partner MCP** - School partnerships (≤10 tools)
- ⏭️ **Analytics MCP** - BI and reporting (≤10 tools)
- ⏭️ **Marketing MCP** - CRM and campaigns (≤10 tools)
- ⏭️ **Custom domain MCPs** - Easy to add without modifying existing MCPs

**Migration Strategy:** 4-phase rollout (see TASKS.md §4.3.1)

## 🏗️ Technology Stack

### Core Framework & Language
| Technology | Version | Purpose |
|-----------|---------|---------|
| **TypeScript** | ^5 | Type-safe development across entire stack |
| **Next.js** | 16.0.1 | Full-stack React framework with API routes |
| **Node.js** | ^20 | Server runtime for MCP orchestration |

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.2.0 | UI component library |
| **React DOM** | 19.2.0 | React rendering for web |
| **Tailwind CSS** | ^4 | Utility-first CSS framework |

### Backend & API
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js API Routes** | 16.0.1 | RESTful endpoints and MCP orchestration |
| **MCP SDK** | ^1.21.1 | Model Context Protocol implementation |
| **Zod** | ^4.1.12 | Runtime schema validation |

### Database & ORM
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase** | ^2.80.0 | Primary database platform with RLS |
| **PostgreSQL** | - | Underlying relational database |
| **Drizzle ORM** | ^0.44.7 | Type-safe SQL query builder |
| **Drizzle Kit** | ^0.31.6 | Schema migrations and management |
| **postgres** | ^3.4.7 | PostgreSQL client for Node.js |

### Authentication
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Supabase Auth** | ^2.80.0 | JWT-based authentication |
| **Supabase SSR** | ^0.7.0 | Server-side rendering auth support |

### AI & LLM
| Technology | Version | Purpose |
|-----------|---------|---------|
| **OpenAI API** | ^6.8.1 | LLM integration (model-agnostic design) |

### Testing
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Jest** | ^30.2.0 | Unit and integration testing |
| **Testing Library** | ^16.3.0 | React component testing |
| **jest-dom** | ^6.9.1 | Custom Jest matchers for DOM |

### Code Quality & Development Tools
| Technology | Version | Purpose |
|-----------|---------|---------|
| **ESLint** | ^9 | Code linting and quality checks |
| **Prettier** | ^3.6.2 | Code formatting |
| **tsx** | ^4.20.6 | TypeScript execution for scripts |
| **Archon** | - | MCP inspector for development |

### Transport & Deployment
| Layer | Technology | Notes |
|-------|-----------|-------|
| **MCP Protocol** | JSON-RPC 2.0 over stdio/HTTPS | stdio (dev), HTTPS (prod) |
| **Multi-tenancy** | Row-Level Security (RLS) | Database-enforced tenant isolation |

## 📐 Architecture Principles

1. **Domain-Driven Design**: 8 focused MCPs (all ≤10 tools) vs bloated 3-MCP design
2. **Host-Mediated Communication**: All MCP servers communicate through the Host (no direct MCP-to-MCP)
3. **Scope-Based Routing**: Fine-grained authorization (identity:*, finance:*, academic:*, etc.)
4. **Tenant Isolation**: Multi-tenancy ready with `tenant_id` and RLS policies
5. **Extensibility by Design**: Add new domain MCPs without modifying existing ones
6. **Spec-First Development**: All changes documented before implementation
7. **Security by Design**: JWT verification, RLS, audit logging throughout
8. **Performance**: Distributed load, domain-specific caching, simpler RLS per MCP

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

### v3.0.0 **APPROVED** (2025-11-11) — 8-MCP Domain-Driven Architecture
**Status:** ✅ Architectural decision finalized and approved for implementation

**Core Changes:**
- ✅ Split Admin MCP into 6 domain MCPs (Identity, Academic, Attendance, Finance, Student Services, Ops)
- ✅ Optimized Teacher MCP (12 → 10 tools)
- ✅ Optimized Student MCP (14 → 10 tools)
- ✅ All 8 MCPs now ≤10 tools (compliance with architectural constraint)
- ✅ Added 34 migration tasks (T-110 to T-143) with 4-phase rollout plan
- ✅ Updated C4 architecture diagrams with scope-based routing
- ✅ Fine-grained authorization scopes (identity:*, finance:*, academic:*, etc.)
- ✅ Total: 76 tasks (42 core + 34 migration)

**Extensibility:**
- ✅ Clear pattern for adding future domain MCPs (Parent, Partner, Analytics, Marketing)
- ✅ Standard MCP interface with maxTools=10 constraint
- ✅ Independent deployment model (no cascading changes)
- ✅ Extension guidelines and technical requirements documented
- ✅ Example implementations provided (Parent MCP with 10 tools)

**Benefits:**
- ✅ Better security: least privilege, smaller attack surface per MCP
- ✅ Better performance: distributed load, domain-specific caching
- ✅ Easier maintenance: clear domain boundaries, focused responsibility
- ✅ Future-proof: seamless addition of new domains without refactoring existing MCPs

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

**Specification Status**: ✅ v3.0.0 APPROVED - Complete and Aligned (REQ ↔ DESIGN ↔ TASKS)
**Architectural Decision**: ✅ 8-MCP domain-driven architecture with extensibility approved 2025-11-11
**Last Updated**: 2025-11-11
**Version**: 3.0.0  

