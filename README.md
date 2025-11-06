# AI-Powered Learning Platform – MCP Specification

This repository contains the **consolidated model specifications** for an AI-powered learning platform built on the Model Context Protocol (MCP) architecture. It defines the complete system design for Admin, Teacher, and Student modules with MCP-driven automation.

## 📋 Overview

An educational platform that leverages AI assistants (via MCP) to support three primary user roles:
- **Students**: Personalized tutoring, homework help, progress tracking
- **Teachers**: Content generation, grading automation, performance analytics
- **Administrators**: User management, reporting, system operations

## 🗂️ Repository Structure

```
MyCastle/
├── spec/                           # Detailed specifications
│   ├── 01-overview.md              # Project objectives, stakeholders, tech stack
│   ├── 02-system-architecture.md   # Architecture, frontend, backend, database
│   ├── 03-mcp.md                   # MCP protocol implementation details
│   ├── 04-admin-mcp.md             # Admin MCP (MVP PRIORITY)
│   ├── 05-teacher-mcp.md           # Teacher MCP (future scope)
│   ├── 06-student-mcp.md           # Student MCP (future scope)
│   ├── 07-agents.md                # Host orchestration patterns
│   ├── 08-database.md              # Complete database schema (Drizzle/PostgreSQL)
│   └── table-of-contents.md        # Navigation index
├── README.md                       # This file
└── .gitignore

```

## 🚀 Quick Start

1. **Read the Overview**: Start with [spec/01-overview.md](./spec/01-overview.md) for project objectives and architecture summary
2. **Understand MCP**: Review [spec/03-mcp.md](./spec/03-mcp.md) for MCP protocol details
3. **MVP Focus**: Study [spec/04-admin-mcp.md](./spec/04-admin-mcp.md) for the first MCP server to build
4. **Database Schema**: Reference [spec/08-database.md](./spec/08-database.md) for complete data model

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

## 📝 Version History

- **v1.0** (2025-10-30) - Consolidated specification from multiple sources
  - Merged original spec.md and esl-mcp-spec content
  - Completed sections 1-8
  - Established MVP priorities (Admin MCP + Host)

## 👤 Author

**Eoin Malone**

## 📄 License

[Specify license here]

---

**Last Updated**: 2025-10-30
**Specification Version**: 1.0 (Consolidated)  

