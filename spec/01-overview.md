# 1. Overview

## 1.1 Purpose and Scope
This document defines the **Model Specifications** for the *ESL Management Platform* — a web-based system designed to streamline operations across an English language school’s administrative, teaching, and student-facing processes.  
It serves as a unified blueprint for the **Admin-MCP**, **Teacher-MCP**, and **Student-MCP**, detailing their resources, tools, and prompts as part of a cohesive Model Context Protocol (MCP) architecture.  
The specifications guide the design, development, and validation of all components to ensure interoperability, scalability, and compliance with institutional and data protection standards.

---

## 1.2 Objectives
- Establish a **standardised model** for managing educational workflows, from enrolment to lesson delivery.  
- Integrate **MCP-based automation** to reduce administrative overhead and enhance data reliability.  
- Ensure **real-time synchronisation** across users and roles through a Supabase-backed database.  
- Maintain strict **data integrity, traceability, and GDPR compliance** at all interaction layers.  
- Provide a **specification-first framework** that informs future system extensions (e.g. analytics MCP, communication MCP).

---

## 1.3 System Summary
The ESL Management Platform operates as a **multi-agent system** supported by a **PostgreSQL-compatible Supabase backend**.  
Core components:
- **Frontend:** Next.js + React with Tailwind CSS (white primary, yellow and blue accents).  
- **Backend:** Node.js (via Next.js API routes) connecting securely to Supabase services.  
- **Database:** PostgreSQL schema with RLS (Row Level Security) enforcing user and role isolation.  
- **MCP Integration:** Archon MCP as inspector and validator for runtime verification of MCP interactions.  
- **Authentication:** Supabase Auth supporting role-based access control (Admin / Teacher / Student).  

---

## 1.4 Stakeholders and Roles
| Role | Description | Key Responsibilities |
|------|--------------|----------------------|
| **Admin** | Management and operational staff | User registration, class scheduling, payments, compliance tracking |
| **Teacher** | Instructors and content creators | Lesson planning, attendance, assessment, feedback |
| **Student** | Learners | Profile management, accessing lessons, tracking progress |
| **Supervisor Agent** | System-level orchestration | Routing tasks to relevant MCPs and ensuring coherent workflows |
| **Archon MCP** | Testing and validation tool | Verifies MCP compliance, inspects resources, tools, and prompts |
| **External Integrations** | Third-party services (e.g., Moodle, payment systems) | Data interoperability and optional module linkage |

---

## 1.5 Key Technologies
| Layer | Technology | Purpose |
|-------|-------------|---------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS | Responsive, accessible, and modern UI |
| **Backend** | Node.js (Next.js API routes) | Lightweight, server-side logic and API handling |
| **Database** | Supabase (PostgreSQL) + Drizzle ORM | Structured storage, relational integrity, query safety |
| **Auth** | Supabase Auth (OAuth 2.0 compatible) | Secure, role-based authentication |
| **MCP Framework** | Model Context Protocol (Archon-based) | Agent orchestration, resource validation, testing |
| **Version Control** | Git (GitHub SSH) | Distributed version management |
| **Inspector** | Archon MCP Inspector | Continuous schema and MCP compliance validation |

---

## 1.6 Compliance and Data Governance
The system aligns with **ISO 27001** and **ISO 27002** for information security management and adheres to **GDPR** principles of lawful data processing.  
Core commitments include:
- **Confidentiality:** Personal data protected through Supabase RLS and encrypted storage.  
- **Integrity:** Strict validation of all transactions and MCP interactions.  
- **Availability:** Redundant backups and versioned specifications for resilience.  
- **Authenticity:** OAuth 2.0-based authentication ensuring verified user identities.  
- **Non-Repudiation:** Comprehensive logging of all administrative and MCP-level actions.  

All data operations are auditable and traceable, with each MCP action recorded in a structured format for accountability and future compliance verification.

