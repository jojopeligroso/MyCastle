# Model Specifications Document – Table of Contents

## 1. Overview  
[See section 1 – Overview](./01-overview.md)
1.1 Purpose and Scope  
1.2 Objectives  
1.3 System Summary  
1.4 Stakeholders and Roles  
1.5 Key Technologies (Next.js, Supabase, Postgres, Archon MCP)  
1.6 Compliance and Data Governance  

---

## 2. System Architecture
2.1 High-Level Architecture Diagram  
2.2 Frontend (Next.js / React)  
2.3 Backend (Node.js API Routes)  
2.4 Database Layer (Supabase / PostgreSQL Compatibility)  
2.5 Authentication (Supabase Auth)  
2.6 Integrations (Archon MCP, Moodle Compatibility)  

---

## 3. Model Context Protocol (MCP)
3.1 MCP Overview and Purpose  
3.2 MCP Inspector (Testing and Validation)  
3.3 MCP Server Configuration  
3.4 Transport and Authentication  
3.5 Data Flow Between Agents and MCPs  

---

## 4. Admin-MCP
4.1 Overview  
4.2 Resources  
 4.2.1 Tutor-Basic  
 4.2.2 User-Record  
 4.2.3 Payment-Detail  
4.3 Tools  
 4.3.1 Add-User  
 4.3.2 Modify-User  
 4.3.3 Delete-User  
 4.3.4 Generate-Report  
4.4 Prompts  
 4.4.1 Create-Invoice  
 4.4.2 Generate-User-Summary  
 4.4.3 Update-Role  

---

## 5. Teacher-MCP
5.1 Overview  
5.2 Resources  
 5.2.1 Tutor-Basic  
 5.2.2 Lesson-Plan  
 5.2.3 Attendance-Register  
5.3 Tools  
 5.3.1 Create-Lesson  
 5.3.2 Record-Attendance  
 5.3.3 Generate-Progress-Report  
5.4 Prompts  
 5.4.1 Generate-Lesson  
 5.4.2 Summarise-Performance  
 5.4.3 Recommend-Material  

---

## 6. Student-MCP
6.1 Overview  
6.2 Resources  
 6.2.1 Tutor-Basic  
 6.2.2 Profile-Detail  
 6.2.3 Study-Record  
6.3 Tools  
 6.3.1 View-Lesson  
 6.3.2 Submit-Task  
 6.3.3 Track-Progress  
6.4 Prompts  
 6.4.1 Generate-Study-Tip  
 6.4.2 Review-Progress  
 6.4.3 Recommend-Next-Step  

---

## 7. Agents and Sub-Agents
7.1 Supervisor-Agent  
7.2 Admin-Agent  
7.3 Teacher-Agent  
7.4 Student-Agent  
7.5 Communication-Agent  
7.6 Reporting-Agent  

---

## 8. Database Specification
8.1 Schema Overview  
8.2 Entity Relationship Diagram (ERD)  
8.3 RLS (Row Level Security)  
8.4 Data Validation Rules  
8.5 Integration with Supabase and Postgres  

---

## 9. Testing and Validation
9.1 MCP Inspector  
9.2 Unit Testing  
9.3 Integration Testing  
9.4 Agent-MCP Communication Testing  
9.5 Data Consistency and Error Handling  

---

## 10. UI/UX Design (Future Section)
10.1 Layout and Components  
10.2 Colour Palette (White, Yellow, Blue)  
10.3 Accessibility Standards  
10.4 Snap Scrolling Design  

---

## 11. Deployment and Maintenance
11.1 Environment Setup  
11.2 Version Control and Branching Strategy  
11.3 Backup and Recovery  
11.4 Monitoring and Logging  
11.5 Security Hardening  

---

## 12. Appendices
12.1 Glossary  
12.2 API References  
12.3 Configuration Files (.env, MCP maps)  
12.4 Revision History
