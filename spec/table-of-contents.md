# AI-Powered Learning Platform – Model Specifications

## Table of Contents

---

## 1. Overview
**[01-overview.md](./01-overview.md)**

- 1.1 Purpose and Scope
- 1.2 Project Objectives
- 1.3 System Summary
  - Architecture Components
  - Workflow Summary
- 1.4 Stakeholders and Roles
  - End Users
  - System Components
  - Operational Stakeholders
- 1.5 Key Technologies
  - Production Stack (Confirmed)
  - Development & Inspection Tools
  - Initial Scope (MVP)
  - Future MCP Servers (Planned)
  - Deployment Model
- 1.6 Compliance and Data Governance
  - Data Protection (GDPR-Aligned)
  - Security Principles
  - Quality Assurance
  - Auditability and Change Control
  - Inter-MCP Communication

---

## 2. System Architecture
**[02-system-architecture.md](./02-system-architecture.md)**

- 2.1 High-Level Architecture
- 2.2 Frontend (Next.js / React)
  - Technology Stack
  - Architecture (Student, Teacher, Admin Interfaces)
  - Key Features
- 2.3 Backend (Node.js API Routes)
  - Host Service Architecture
  - Core Responsibilities
  - API Routes
  - MCP Client Implementation
- 2.4 Database Layer (Supabase / PostgreSQL)
  - Database Selection
  - Schema Organization
  - Multi-tenancy Design
  - Key Tables (High-Level)
- 2.5 Authentication (Supabase Auth)
  - Authentication Flow
  - JWT Claims Structure
  - Authorization Enforcement
- 2.6 Integrations
  - MCP Server Integration
  - External Service Integration
  - Integration Patterns
- 2.7 Scalability and Performance
- 2.8 Development and Testing
- 2.9 Security Architecture

---

## 3. Model Context Protocol (MCP)
**[03-mcp.md](./03-mcp.md)**

- 3.1 MCP Overview and Purpose
- 3.2 MCP Architecture and Components
- 3.3 MCP Communication Protocol
  - JSON-RPC 2.0 Messaging
  - Standard Methods
- 3.4 Transport and Authentication
  - Local Development: stdio
  - Production: HTTPS
  - Authentication Flow
- 3.5 Data Flow Between Host, MCPs, and LLM
  - Complete Request Flow
  - Multi-Tool Scenarios
  - Inter-MCP Scenarios
- 3.6 Resources, Tools, and Prompts
  - Resources (Read-Only Data)
  - Tools (Callable Functions)
  - Prompts (Behavior Templates)
- 3.7 Error Handling and Resilience
- 3.8 MCP Security Best Practices
- 3.9 MCP Inspector (Archon for Testing)

---

## 4. Admin-MCP Specification **(MVP PRIORITY)**
**[04-admin-mcp.md](./04-admin-mcp.md)**

- 4.1 Overview
- 4.2 Resources
  - 4.2.1 User Roster
  - 4.2.2 Class List
  - 4.2.3 Payment Summary
  - 4.2.4 System Status
  - 4.2.5 Attendance Overview
- 4.3 Tools
  - 4.3.1 User Management Tools (add_user, modify_user, delete_user)
  - 4.3.2 Class Management Tools (create_class, modify_class, enroll_student)
  - 4.3.3 Attendance and Booking Tools
  - 4.3.4 Reporting and Export Tools (generate_report, list_export_templates, generate_excel_export, generate_csv_export)
  - 4.3.5 Payment Tools (create_invoice, record_payment)
  - 4.3.6 System Maintenance Tools (create_backup, view_audit_log)
- 4.4 Prompts
  - 4.4.1 admin_persona
  - 4.4.2 quick_report_prompt
  - 4.4.3 onboarding_wizard
- 4.5 Implementation Checklist
- 4.6 Error Handling
- 4.7 Performance Considerations
- 4.8 Security Controls

---

## 5. Teacher-MCP Specification **(FUTURE SCOPE)**
**[05-teacher-mcp.md](./05-teacher-mcp.md)**

- 5.1 Overview
- 5.2 Resources (Planned)
- 5.3 Tools (Planned)
- 5.4 Prompts (Planned)
- 5.5 User Stories
- 5.6 Implementation Notes

---

## 6. Student-MCP Specification **(FUTURE SCOPE)**
**[06-student-mcp.md](./06-student-mcp.md)**

- 6.1 Overview
- 6.2 Resources (Planned)
- 6.3 Tools (Planned)
- 6.4 Prompts (Planned)
- 6.5 User Stories
- 6.6 Implementation Notes

---

## 7. Agents and Orchestration
**[07-agents.md](./07-agents.md)**

- 7.1 Supervisor Agent (Host Service)
- 7.2 Orchestration Patterns
  - 7.2.1 Simple Query Pattern
  - 7.2.2 Single Tool Pattern
  - 7.2.3 Multi-Tool Sequential Pattern
  - 7.2.4 Multi-MCP Fan-Out Pattern
  - 7.2.5 Cross-Role Query Pattern
- 7.3 Workflow Orchestration
- 7.4 Policy Enforcement
- 7.5 Conversation State Management
- 7.6 Error Handling and Recovery
- 7.7 Logging and Observability
- 7.8 AI-Assisted Development (Meta-Agent Pattern)
- 7.9 Future Agent Enhancements

---

## 8. Database Specification
**[08-database.md](./08-database.md)**

- 8.1 Schema Overview
- 8.2 Entity Relationship Diagram (ERD)
- 8.3 Core Tables
  - 8.3.1 tenants
  - 8.3.2 users
  - 8.3.3 classes
  - 8.3.4 enrollments
  - 8.3.5 class_sessions
  - 8.3.6 attendance
  - 8.3.7 assignments
  - 8.3.8 submissions
  - 8.3.9 grades
- 8.4 Financial Tables
  - 8.4.1 invoices
  - 8.4.2 payments
- 8.5 System Tables
  - 8.5.1 audit_logs
  - 8.5.2 conversations
  - 8.5.3 exports
- 8.6 SQL Views for Reports
- 8.7 Row-Level Security (RLS) Policies
- 8.8 Database Package Structure
- 8.9 Migration Strategy
- 8.10 Data Validation Rules

---

## 9. Testing and Validation **(TO BE DETAILED)**

- 9.1 MCP Inspector (Archon)
- 9.2 Unit Testing Strategy
- 9.3 Integration Testing
- 9.4 Security Testing
- 9.5 Performance Testing

---

## 10. User Stories and Requirements **(FROM ORIGINAL SPEC)**

- Epic 1: Personalized Student Tutoring
- Epic 2: Teacher's Assistant and Classroom Management
- Epic 3: Administrative Oversight and Insights
- Epic 4: System Architecture & Development Efficiency

---

## 11. Deployment and Maintenance **(TO BE DETAILED)**

- 11.1 Local Development Setup
- 11.2 Production Deployment (VPS)
- 11.3 Environment Configuration
- 11.4 Backup and Recovery
- 11.5 Monitoring and Logging
- 11.6 Security Hardening

---

## 12. Appendices **(TO BE CREATED)**

- 12.1 Glossary
- 12.2 API References
- 12.3 Configuration Examples
- 12.4 Revision History

---

## Document Status

- ✅ **Section 1-8**: Complete and consolidated
- ⏳ **Section 9**: To be detailed in testing phase
- ⏳ **Section 10**: User stories extracted from original spec, to be integrated
- ⏳ **Section 11**: To be detailed during deployment phase
- ⏳ **Section 12**: To be created as needed

**Last Updated**: 2025-10-30
**Version**: 1.0 (Consolidated)
