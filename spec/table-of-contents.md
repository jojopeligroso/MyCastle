# ESL Learning Platform – MCP Specification Table of Contents

> **Version:** 2.0.0 | **Last Updated:** 2025-10-31

---

## Quick Navigation

### 📋 Core Role-Based MCP Specifications

#### 1. Admin MCP **(MVP - Phase 1)**
**[01-admin-mcp.md](./01-admin-mcp.md)** - ✅ Complete

- 1.1 Overview
- 1.2 Resources (11 categories, 50+ endpoints)
  - Identity & Access, Academic Programs, Scheduling, Curriculum
  - Attendance, Admissions/Bookings, Finance, Student Lifecycle
  - Accommodation, Quality/CPD, Compliance, Infrastructure
- 1.3 Tools (12 categories, 50+ operations)
  - Identity/Access, Programme/Course, Scheduling, Lesson/Content
  - Attendance/Compliance, Admissions/Bookings, Finance
  - Student Lifecycle, Accommodation, Quality/CPD, Compliance/Ops, Communications
- 1.4 Prompts (5 system and task prompts)
- 1.5 Authorization & Scopes
- 1.6 Error Handling
- 1.7 Implementation Notes
- 1.8 Testing
- 1.9 Version History

#### 2. Teacher MCP **(Phase 3)**
**[02-teacher-mcp.md](./02-teacher-mcp.md)** - ✅ Complete

- 2.1 Overview
- 2.2 Resources (10 teacher-scoped resources)
  - Timetable, Classes, Materials, Lesson Plans, CEFR Descriptors
  - Attendance Registers, Progress Notes, Homework, CPD Tasks
- 2.3 Tools (7 categories, 20+ operations)
  - Timetable/Planning, Lesson Planning (AI-assisted), Attendance
  - Student Progress, Homework/Assessment, Class Analytics, Communication
- 2.4 Prompts (4 teaching-focused prompts with AI features)
- 2.5 Authorization & Scopes
- 2.6 Error Handling
- 2.7 Implementation Notes
- 2.8 Testing
- 2.9 Version History

#### 3. Student MCP **(Phase 3)**
**[03-student-mcp.md](./03-student-mcp.md)** - ✅ Complete

- 3.1 Overview
- 3.2 Resources (10 student-scoped resources)
  - Profile, Schedule, Materials, Homework, Grades
  - Attendance, Progress, Invoices/Payments, Accommodation, Support
- 3.3 Tools (8 categories, 15+ operations)
  - Schedule/Timetable, Learning Materials, Homework/Submission
  - AI Tutoring (ask_tutor, explain_concept, practice_exercise)
  - Progress Tracking, Attendance, Administrative Self-Service, Payment
- 3.4 Prompts (5 AI tutoring prompts with CEFR level adaptation)
- 3.5 Authorization & Scopes
- 3.6 Error Handling
- 3.7 Implementation Notes (AI tutor features)
- 3.8 Testing
- 3.9 Version History

---

### 🔧 Shared Services

#### Shared Services Overview **(Phase 2-4)**
**[shared-services/README.md](./shared-services/README.md)** - ✅ Complete

- Architecture Pattern
- 12 Shared Service MCPs:
  1. Data/Supabase MCP
  2. Calendar MCP
  3. Payments MCP
  4. Identity/SSO MCP
  5. Reporting/Analytics MCP
  6. Content/Docs MCP
  7. LMS/Moodle Bridge MCP
  8. Comms MCP
  9. Files/Storage MCP
  10. Attendance MCP (Register Engine)
  11. Accommodation MCP
  12. Compliance MCP
- Integration Patterns
- Cross-Reference Matrix
- Security Considerations

---

### 🏗️ Architecture & Patterns

#### System Architecture
**[02-system-architecture.md](./02-system-architecture.md)** - ✅ Complete

- 2.1 High-Level Architecture
- 2.2 Frontend (Next.js/React)
- 2.3 Backend (Node.js API Routes)
- 2.4 Database Layer (Supabase/PostgreSQL)
- 2.5 Authentication (Supabase Auth)
- 2.6 Integrations
- 2.7 Scalability and Performance
- 2.8 Development and Testing
- 2.9 Security Architecture

#### MCP Interaction Patterns **(NEW)**
**[09-mcp-interaction-patterns.md](./09-mcp-interaction-patterns.md)** - ✅ Complete

- 9.1 Overview
- 9.2 Architecture Overview
- 9.3 Interaction Patterns (5 core patterns)
  - Simple Query (Single MCP)
  - Single Tool Call (One MCP)
  - Multi-MCP Coordination (Sequential)
  - Fan-Out/Fan-In (Parallel Context Gathering)
  - Shared Service Delegation
- 9.4 Tool Routing
- 9.5 Context Aggregation
- 9.6 Error Handling
- 9.7 Performance Optimization
- 9.8 Security Patterns
- 9.9 Monitoring & Observability
- 9.10 Best Practices
- 9.11 Example: Complete Request Flow
- 9.12 Summary

#### Host Orchestration & Agents
**[07-agents.md](./07-agents.md)** - ⏳ Needs Update

- 7.1 Supervisor Agent (Host Service)
- 7.2 Orchestration Patterns
- 7.3 Workflow Orchestration
- 7.4 Policy Enforcement
- 7.5 Conversation State Management
- 7.6 Error Handling and Recovery
- 7.7 Logging and Observability

---

### 📖 Foundational Documents

#### Project Overview
**[01-overview.md](./01-overview.md)** - ✅ Complete

- 1.1 Purpose and Scope
- 1.2 Project Objectives
- 1.3 System Summary
- 1.4 Stakeholders and Roles
- 1.5 Key Technologies
- 1.6 Compliance and Data Governance

#### MCP Protocol Implementation
**[03-mcp.md](./03-mcp.md)** - ✅ Complete

- 3.1 MCP Overview and Purpose
- 3.2 MCP Architecture and Components
- 3.3 MCP Communication Protocol (JSON-RPC 2.0)
- 3.4 Transport and Authentication
- 3.5 Data Flow Between Host, MCPs, and LLM
- 3.6 Resources, Tools, and Prompts
- 3.7 Error Handling and Resilience
- 3.8 MCP Security Best Practices
- 3.9 MCP Inspector (Archon for Testing)

---

### 📊 Data & Database

#### Complete Database Schema
**[08-database.md](./08-database.md)** - ✅ Complete

- 8.1 Schema Overview
- 8.2 Entity Relationship Diagram (ERD)
- 8.3 Core Tables (tenants, users, classes, enrollments, sessions, attendance, assignments, submissions, grades)
- 8.4 Financial Tables (invoices, payments)
- 8.5 System Tables (audit_logs, conversations, exports)
- 8.6 SQL Views for Reports
- 8.7 Row-Level Security (RLS) Policies
- 8.8 Database Package Structure
- 8.9 Migration Strategy
- 8.10 Data Validation Rules

---

## Implementation Roadmap

### Phase 1: Admin MCP (MVP) - Weeks 1-4 ⏳

- ✅ Admin MCP specification
- ⏳ Admin MCP implementation
- ⏳ Host service integration
- ⏳ Database deployment
- ⏳ Security hardening
- ⏳ Testing

### Phase 2: Service Extraction - Weeks 5-12 📝

- ⏳ Identity/SSO MCP
- ⏳ Payments MCP
- ⏳ Data/Supabase MCP
- ⏳ Host orchestration (4 MCPs)

### Phase 3: Role MCPs - Weeks 13-24 📝

- ⏳ Teacher MCP
- ⏳ Student MCP
- ⏳ AI features (lesson generation, tutoring)

### Phase 4: Advanced Features - Week 25+ 📝

- ⏳ Calendar MCP
- ⏳ Comms MCP
- ⏳ Remaining shared services

---

## Cross-Reference Guide

### By Feature

| Feature | Specifications |
|---------|----------------|
| **User Management** | 01-admin-mcp.md (§1.3.1), 08-database.md, 09-mcp-interaction-patterns.md |
| **Class Scheduling** | 01-admin-mcp.md (§1.3.3), shared-services/README.md (Calendar MCP) |
| **Attendance** | 01-admin-mcp.md (§1.3.5), 02-teacher-mcp.md (§2.3.3), shared-services/README.md (Attendance MCP) |
| **Lesson Planning** | 02-teacher-mcp.md (§2.3.2), shared-services/README.md (Content/Docs MCP) |
| **AI Tutoring** | 03-student-mcp.md (§3.3.4), 09-mcp-interaction-patterns.md |
| **Payments** | 01-admin-mcp.md (§1.3.6), shared-services/README.md (Payments MCP) |
| **Reporting** | 01-admin-mcp.md (§1.3.7), shared-services/README.md (Reporting MCP) |
| **Compliance** | 01-admin-mcp.md (§1.3.11), shared-services/README.md (Compliance MCP) |

---

## Document Status

| Section | Status | Description |
|---------|--------|-------------|
| **01-admin-mcp.md** | ✅ Complete | Comprehensive specification with 50+ resources and tools |
| **02-teacher-mcp.md** | ✅ Complete | Full specification with AI lesson generation |
| **03-student-mcp.md** | ✅ Complete | Complete with AI tutoring and level adaptation |
| **shared-services/** | ✅ Complete | Overview of 12 shared service MCPs |
| **09-mcp-interaction-patterns.md** | ✅ Complete | 5 core patterns with examples |
| **01-overview.md** | ✅ Complete | Project objectives and stakeholders |
| **02-system-architecture.md** | ✅ Complete | Full architecture documentation |
| **03-mcp.md** | ✅ Complete | MCP protocol implementation |
| **07-agents.md** | ⏳ Needs Update | To align with new interaction patterns |
| **08-database.md** | ✅ Complete | Full database schema |

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| **Role MCPs** | 3 | ✅ Complete |
| **Shared Service MCPs** | 12 | ✅ Complete |
| **Total Resources** | 70+ | ✅ Defined |
| **Total Tools** | 85+ | ✅ Defined |
| **Total Prompts** | 15+ | ✅ Defined |
| **Specification Pages** | 200+ | ✅ Written |

---

**Last Updated**: 2025-10-31
**Specification Version**: 2.0.0 (Complete Restructure)
**Author**: Eoin Malone with Claude Code
**Status**: ✅ Complete - Ready for Implementation
