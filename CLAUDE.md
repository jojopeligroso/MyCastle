# Claude Code Project Configuration

## Project Overview
AI-Powered Learning Platform with Model Context Protocol (MCP) architecture.

## Specification Location
**Primary Spec**: `/esl-mcp-spec/spec/`

All architectural decisions, MCP server specifications, and database schemas are documented in the consolidated specification located at:
```
/home/eoin/work/esl-learning-platform/esl-mcp-spec/
```

## Mandatory Workflow: Spec Update on Commit

**MANDATE**: Before every git commit, ensure the specification is updated to reflect any architectural or design changes.

### Pre-Commit Checklist
1. ✅ Has the relevant spec document been updated?
2. ✅ Is the table of contents current?
3. ✅ Have version numbers been incremented?
4. ✅ Are architectural decisions documented?

### Specification Structure
```
esl-mcp-spec/
├── README.md                       # Project overview and quick start
├── spec/
│   ├── 01-overview.md              # Objectives, stakeholders, tech stack
│   ├── 02-system-architecture.md   # Architecture diagrams and components
│   ├── 03-mcp.md                   # MCP protocol details
│   ├── 04-admin-mcp.md             # Admin MCP (MVP PRIORITY)
│   ├── 05-teacher-mcp.md           # Teacher MCP (future)
│   ├── 06-student-mcp.md           # Student MCP (future)
│   ├── 07-agents.md                # Host orchestration patterns
│   ├── 08-database.md              # Complete database schema
│   └── table-of-contents.md        # Navigation index
└── 01-overview.md                  # Symlink to spec/01-overview.md
```

## Development Principles

### 1. Spec-First Development
- **All architectural changes** must be documented in `/esl-mcp-spec/spec/` BEFORE implementation
- **Database schema changes** update `08-database.md` first
- **MCP tool additions** update relevant MCP spec (04-admin, 05-teacher, 06-student)

### 2. Git Workflow
```bash
# Before committing code changes:
1. Update relevant spec document(s)
2. Update table-of-contents.md if structure changed
3. Commit spec changes first
4. Then commit code implementation

# Example:
git add esl-mcp-spec/spec/04-admin-mcp.md
git commit -m "spec: add export_template tool to Admin MCP"

git add src/admin-mcp/tools/export.ts
git commit -m "feat(admin-mcp): implement export_template tool"
```

### 3. Documentation Updates
When you make changes, update:
- Relevant spec section
- Table of contents (if structure changed)
- README.md (if major feature added)
- Increment version in document status

## MVP Implementation Priority

**Phase 1 (Current Focus):**
1. Host service (Next.js/Node.js)
2. Admin MCP server
3. Database schema (`packages/platform-db`)
4. Supabase Auth integration

**Phase 2 (Future):**
- Identity MCP
- Payments MCP
- Teacher MCP
- Student MCP

## Key Architectural Decisions

### MCP Architecture
- **Admin MCP ONLY** for MVP (not all three MCPs)
- **Identity MCP** and **Payments MCP** as separate future services
- **Host-mediated** inter-MCP communication (no direct MCP-to-MCP)

### Database
- **Drizzle ORM** with TypeScript
- **Supabase** primary (PostgreSQL compatible)
- **Multi-tenancy ready** with `tenant_id` pattern
- **RLS policies** enforced at database level

### Authentication
- **Supabase Auth** as JWT issuer
- **JWKS verification** in Host and MCPs
- Claims: `sub`, `role`, `tenant_id`

### Export System
- **Template registry** for Excel/CSV exports
- **SQL views** as stable data sources
- **ExcelJS** for server-side generation
- **Supabase Storage** for file hosting

## Quick Reference

### Spec Locations by Topic

| Topic | File |
|-------|------|
| Architecture overview | `spec/01-overview.md` |
| System design | `spec/02-system-architecture.md` |
| MCP protocol | `spec/03-mcp.md` |
| Admin tools (MVP) | `spec/04-admin-mcp.md` |
| Database schema | `spec/08-database.md` |
| Host orchestration | `spec/07-agents.md` |

### Common Update Scenarios

**Adding a new Admin MCP tool:**
1. Update `spec/04-admin-mcp.md` → Section 4.3 (Tools)
2. Document input schema, examples, error cases
3. Add to implementation checklist (4.5)
4. Commit spec changes
5. Implement tool in code
6. Commit implementation

**Database schema change:**
1. Update `spec/08-database.md` → Relevant table section
2. Update ERD if relationships changed (8.2)
3. Document migration in 8.9
4. Commit spec changes
5. Create Drizzle migration
6. Commit migration

**Architectural decision:**
1. Update `spec/01-overview.md` or `spec/02-system-architecture.md`
2. Document rationale
3. Update affected sections
4. Commit spec changes
5. Implement changes
6. Commit implementation

---

## Session Summary (2025-10-30)

### Consolidation Completed
- ✅ Merged original `spec.md` and `esl-mcp-spec` into unified specification
- ✅ Created 8 comprehensive specification documents
- ✅ Archived original `spec.md` as `spec.md.archived`
- ✅ Updated README with consolidated overview
- ✅ Established MVP priorities (Admin MCP + Host first)

### Next Implementation Steps
1. Bootstrap Host service route
2. Create `packages/platform-db` with Drizzle schema
3. Implement Admin MCP tools (User CRUD, Class CRUD, Attendance, Exports)
4. Wire Supabase Auth with JWT verification
5. Set up Archon for MCP inspection

---

**Specification Version**: 1.0 (Consolidated)
**Last Updated**: 2025-10-30
**Author**: Eoin Malone
