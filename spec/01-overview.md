# 1. Overview

> **Document status:** Living specification. This document will be updated as design decisions are made and implementation progresses.

## 1.1 Purpose and Scope
This document defines the **Model Specifications** for an **AI-Powered Learning Platform** built on the Model Context Protocol (MCP) architecture. The platform serves three primary user roles — **Students**, **Teachers**, and **Administrators** — each supported by specialized AI assistants that provide personalized, context-aware support.

This unified specification covers:
- **Administrative workflows**: User management, enrollment, scheduling, payments, and compliance
- **Teaching workflows**: Lesson planning, content creation, assessment, and student performance analysis
- **Learning workflows**: Personalized tutoring, practice exercises, progress tracking, and study guidance

The specification defines **Admin-MCP**, **Teacher-MCP**, and **Student-MCP** modules, each exposing resources, tools, and prompts through the Model Context Protocol. It guides design, development, validation, and deployment while maintaining a spec-first approach.

---

## 1.2 Project Objectives
- **Personalized Student Support**: Provide students with an AI tutor that can answer questions, explain concepts, and adapt to the student's learning progress and style
- **Teacher Assistance**: Equip educators with an AI assistant to create content (quizzes, lesson plans), analyze student performance, and handle routine queries
- **Administrative Insights**: Enable administrators to interact with an AI agent for analytics, reporting, content management, and data-driven decision making
- **Unified Platform Architecture**: Develop a robust, web-first system using TypeScript and modern web technologies with MCP integration
- **Operational Excellence**: Establish standardized models for enrollment, scheduling, lesson delivery, assessment, and reporting
- **MCP-Driven Automation**: Reduce manual effort and improve data quality through intelligent agent orchestration
- **Real-Time Consistency**: Ensure data consistency across all roles using a PostgreSQL-compatible backend
- **GDPR-Aligned Governance**: Maintain strong auditability, data protection, and compliance across all actions
- **Scalable Architecture**: Enable incremental delivery and future extensions (analytics, communications, external integrations)

---

## 1.3 System Summary
The platform follows a **client–host–server architecture** inspired by the Model Context Protocol. The system is a **multi-agent, MCP-integrated web application** backed by a **PostgreSQL-compatible database**.

### Architecture Components
- **User Interface (Client Application)**: Web-based chat interface for each role (student, teacher, admin), built with React/Next.js and TypeScript. Users authenticate via Supabase Auth and interact with their role-specific AI assistant in real-time.

- **MCP Host (Backend Brain)**: Node.js/TypeScript application that orchestrates AI sessions, manages user authorization, aggregates context from MCP servers, constructs prompts for the LLM, and maintains conversation history.

- **LLM (Language Model) Service**: AI engine (e.g., OpenAI GPT-4 or locally hosted model) that generates assistant responses. The host provides user prompts plus supplemental context from servers in a composite prompt. The system is designed to be model-agnostic.

- **MCP Servers (Role-specific Modules)**: Three primary server modules (Student Assistant Server, Teacher Assistant Server, Admin Assistant Server) that provide specialized data (resources), functions (tools), and prompt templates. Each server operates independently with security boundaries enforced by MCP.

- **Database**: Supabase/PostgreSQL stores persistent data including user accounts and roles, student grades/progress records, course content and curriculum, conversation logs, and feedback. Row-level security (RLS) enforces per-role data isolation.

- **External Integrations**: Architecture allows adding external tools or APIs (knowledge base search, computation services, school SIS integration, Moodle compatibility) exposed via MCP servers.

### Workflow Summary
When a user asks a question in the chat UI, the query is sent to the host. The host activates the appropriate MCP server(s) for that session, which supply relevant context (resources) and available tools. The host combines the user's question and context, sends it to the LLM, handles any tool calls via MCP protocol, and returns the final response to the user interface—all in real-time using JSON-RPC 2.0 messaging.

---

## 1.4 Stakeholders and Roles

### End Users
| Role | Description | Key Responsibilities | AI Assistant Focus |
|------|-------------|----------------------|-------------------|
| **Student** | Learners using the platform | Access learning materials, complete assignments, track progress, interact with AI tutor | Personalized tutoring, homework help, practice quizzes, study guidance, progress tracking |
| **Teacher** | Instructors and educators | Lesson planning, content creation, delivery, attendance tracking, assessment, student feedback | Content generation (quizzes, lesson plans), grading automation, performance analysis, class insights |
| **Admin** | Operational and administrative staff | User onboarding, enrollment management, class operations, payments, compliance, reporting | Analytics and reporting, user management, content management, system oversight |

### System Components
| Component | Description | Key Responsibilities |
|-----------|-------------|----------------------|
| **MCP Host** | Central orchestration layer | Session management, authorization, context aggregation, LLM coordination, conversation history |
| **Student MCP Server** | Student domain module | Provides student-specific resources, tools, and prompts; enforces student data access boundaries |
| **Teacher MCP Server** | Teacher domain module | Provides teacher-specific resources, tools, and prompts; manages class and assessment data |
| **Admin MCP Server** | Admin domain module | Provides admin-specific resources, tools, and prompts; handles system-wide operations and analytics |
| **Supervisor Agent** | Orchestration logic | Routes user intents to appropriate MCPs, enforces workflow rules, manages multi-agent coordination |

### Operational Stakeholders
| Role | Description | Key Responsibilities |
|------|-------------|----------------------|
| **Compliance/QA** | Internal oversight | Policy alignment, GDPR compliance, audits, quality assurance |
| **External Integrations** | Third-party systems | Moodle compatibility, payment gateways, SIS integration via connectors/bridges |

---

## 1.5 Key Technologies

### Production Stack (Confirmed)
| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js, React, Tailwind CSS | Web-first UI; accessible patterns; responsive design |
| **Host Service** | Next.js API routes / Node.js (TypeScript) | Central orchestration layer; MCP mediation; session management |
| **Database** | Supabase (primary) / PostgreSQL (switchable) | RLS for multi-tenancy; Auth provider; Object storage |
| **ORM** | Drizzle ORM | Type-safe queries; migration discipline; shared `packages/platform-db` |
| **Auth** | Supabase Auth | JWT issuer (JWKS verification); role-based access; OAuth2-compatible |
| **MCP Implementation** | TypeScript (JSON-RPC 2.0) | Host uses stdio locally; HTTPS with TLS on VPS |
| **LLM** | OpenAI API (model-agnostic design) | GPT-4 or equivalent; easily swappable |

### Development & Inspection Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| **Archon** | MCP inspector (dev-only) | Local inspection, tool testing, schema verification, call simulation |
| **Version Control** | Git (GitHub via SSH) | Repo-first workflow; PR-based changes |
| **Export Generation** | ExcelJS | Server-side XLSX generation with template registry |

### Initial Scope (MVP)
- **MCP Servers to Build**: **Admin MCP only** (+ Host service)
- **Rationale**: Proves end-to-end orchestration; avoids premature complexity
- **Teacher MCP and Student MCP**: To be built later when toolsets stabilize

### Future MCP Servers (Planned)
- **Identity MCP**: Separate service for authentication, authorization, user management (separate secrets, compliance, audit needs)
- **Payments MCP**: Separate service for payment processing, invoicing, financial operations
- **Teacher MCP**: Teaching workflows, lesson planning, assessment
- **Student MCP**: Learning workflows, tutoring, progress tracking

### Deployment Model
- **Services**:
  1. Host (Next.js Node/TS) — UX, auth, policy, orchestration
  2. Admin MCP — tools/resources server
- **Transports**:
  - Local dev: `stdio`
  - Production VPS: HTTPS with TLS behind lightweight reverse proxy
- **Multi-tenancy**: Start single-tenant (one school per deploy); design with `tenant_id` and RLS patterns for future multi-tenant evolution

---

## 1.6 Compliance and Data Governance

### Data Protection (GDPR-Aligned)
- **Lawful Basis**: Clear purposes for data processing with appropriate legal basis
- **Data Minimization**: Collect only necessary data for specified purposes
- **Purpose Limitation**: Use data only for stated purposes
- **Access Control**: Row-level security (RLS) enforces role-based data access
- **Privacy by Design**: Security and privacy built into architecture from the start

### Security Principles
- **Authentication**: Supabase Auth with JWT tokens (JWKS verification)
- **Authorization**: Role-based access control (Admin, Teacher, Student) enforced at database and application layers
- **Least Privilege**: Each MCP server accesses only data required for its domain
- **Context Isolation**: MCP servers operate independently with enforced security boundaries
- **Encrypted Transport**: TLS for all production communications; secure stdio for local dev
- **Audit Logs**: Structured logging of all MCP actions, data changes, and user activities

### Quality Assurance
- **Automated Testing**: Unit tests for MCP server functions, integration tests for full workflows, security tests for cross-role access prevention
- **Schema Validation**: Database schema versioning and migration discipline via Drizzle
- **MCP Inspection**: Archon for dev-time tool testing, schema verification, and call simulation
- **Reproducible Builds**: Version-controlled codebase with consistent environments

### Auditability and Change Control
- **Audit Trail**: Non-repudiation via structured logs of MCP actions, database changes, and user sessions
- **Version Control**: Git-based workflow with SSH authentication
- **Spec-First Development**: All architectural changes documented in specification before implementation
- **Change Management**: Pull request workflow with review and approval gates
- **MCP Contract Versioning**: Versioned releases of MCP tool/resource contracts

### Inter-MCP Communication
- **Pattern**: Host-mediated fan-out/fan-in (no direct MCP-to-MCP communication)
- **Rationale**: Centralized policy enforcement, simplified auditing, reduced secret leakage, easier retries and timeouts
- **Orchestration**: Host sequences calls across MCPs (e.g., Identity → Admin → Payments), aggregates results, and enforces policies

