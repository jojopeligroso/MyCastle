# MCP Agents Quick Reference Guide

> **Last Updated**: 2025-10-31 | **Version**: 1.0.0

---

## Overview

You now have **3 specialized agents** to work with your ESL Learning Platform MCP specifications. These agents help you review, implement, and orchestrate MCP servers based on the comprehensive specifications in `esl-mcp-spec/`.

---

## 🔍 Agent 1: MCP Spec Reviewer

**Location**: `.claude/agents/mcp-spec-reviewer.md`

### Purpose
Reviews and validates MCP specifications for completeness, consistency, and security.

### Capabilities
- ✅ Completeness checks (resources, tools, prompts)
- ✅ Consistency validation across MCPs
- ✅ Schema validation (TypeScript, Zod, JSON)
- ✅ Security audits (JWT, RLS, scopes)
- ✅ Cross-MCP integration review
- ✅ Implementation readiness assessment

### How to Use

**Review entire MCP:**
```
@mcp-spec-reviewer Please review spec/01-admin-mcp.md for completeness and consistency
```

**Security audit:**
```
@mcp-spec-reviewer Perform a security review of all tool scopes in Teacher MCP
```

**Cross-spec consistency:**
```
@mcp-spec-reviewer Check consistency of user management tools across Admin, Teacher, and Student MCPs
```

**Integration review:**
```
@mcp-spec-reviewer Review how Admin MCP and Payments MCP integrate
```

### Output Format
The agent generates a comprehensive review report with:
- ✅ Executive summary
- ✅ Completeness checklist
- ✅ Consistency validation
- ✅ Schema validation results
- ✅ Security findings
- ✅ Prioritized issues (critical → major → minor)
- ✅ Specific recommendations with examples

---

## 🛠️ Agent 2: MCP Implementer

**Location**: `.claude/agents/mcp-implementer.md`

### Purpose
Transforms MCP specifications into production-ready TypeScript code.

### Capabilities
- ✅ Generate MCP server structure
- ✅ Implement tools with Zod validation
- ✅ Create resource handlers with RLS
- ✅ Add JWT authentication
- ✅ Implement audit logging
- ✅ Generate comprehensive tests
- ✅ Create documentation

### How to Use

**Generate entire MCP server:**
```
@mcp-implementer Implement the Teacher MCP server based on spec/02-teacher-mcp.md
```

**Implement specific tool:**
```
@mcp-implementer Implement the create_lesson_plan tool from Teacher MCP specification including validation and tests
```

**Generate tests:**
```
@mcp-implementer Create comprehensive test suite for all Admin MCP tools
```

**Add new tool:**
```
@mcp-implementer Add export_attendance tool to Admin MCP following the specification pattern
```

**Implement resource:**
```
@mcp-implementer Implement the teacher://my_classes resource with RLS enforcement
```

### Output
The agent generates:
- ✅ Complete TypeScript code with strict typing
- ✅ Zod schemas for validation
- ✅ JWT verification and scope checking
- ✅ Database queries with RLS
- ✅ Error handling
- ✅ Audit logging
- ✅ Unit and integration tests
- ✅ JSDoc documentation

---

## 🎯 Agent 3: Host Orchestrator

**Location**: `.claude/agents/host-orchestrator.md`

### Purpose
Builds the Host service that orchestrates multiple MCP servers.

### Capabilities
- ✅ Implement Next.js API routes
- ✅ MCP client connection management
- ✅ Tool routing logic
- ✅ Context aggregation strategies
- ✅ Multi-MCP coordination
- ✅ Performance optimization (caching, parallel execution)
- ✅ Error handling and resilience

### How to Use

**Create basic host route:**
```
@host-orchestrator Create the Next.js API route for Admin MCP chat using Pattern 1 (Simple Query)
```

**Multi-MCP workflow:**
```
@host-orchestrator Implement the payment processing workflow coordinating Admin MCP and Payments MCP using Pattern 3 (Sequential)
```

**Add context aggregation:**
```
@host-orchestrator Implement context aggregation for Student MCP that fetches profile, schedule, and homework in parallel
```

**Implement tool routing:**
```
@host-orchestrator Create the tool routing logic that maps tool names to correct MCP servers
```

**Add caching:**
```
@host-orchestrator Add resource caching to the host service with 60-second TTL
```

**Implement tracing:**
```
@host-orchestrator Add distributed tracing to track MCP calls through the system
```

### Output
The agent generates:
- ✅ Next.js API routes
- ✅ MCP client management code
- ✅ Tool routing logic
- ✅ Context aggregation pipelines
- ✅ LLM integration
- ✅ Error handling with retries
- ✅ Caching strategies
- ✅ Logging and monitoring

---

## 🎓 Usage Patterns

### Pattern 1: Specification → Implementation Pipeline

```bash
# Step 1: Review specification
@mcp-spec-reviewer Review spec/02-teacher-mcp.md for implementation readiness

# Step 2: Implement MCP server
@mcp-implementer Implement Teacher MCP server from spec/02-teacher-mcp.md

# Step 3: Create host integration
@host-orchestrator Create Next.js API route for Teacher MCP chat
```

### Pattern 2: Add New Tool to Existing MCP

```bash
# Step 1: Review specification for new tool
@mcp-spec-reviewer Check if export_grades tool follows Admin MCP patterns

# Step 2: Implement tool
@mcp-implementer Add export_grades tool to Admin MCP with tests

# Step 3: Update host routing
@host-orchestrator Add export_grades to the tool routing registry
```

### Pattern 3: Multi-MCP Workflow

```bash
# Step 1: Review integration pattern
@mcp-spec-reviewer Review integration between Admin MCP and Payments MCP for invoice workflow

# Step 2: Implement workflow
@host-orchestrator Implement invoice payment workflow coordinating Admin and Payments MCPs

# Step 3: Add tests
@mcp-implementer Create integration tests for invoice payment workflow
```

---

## 📚 Reference Specifications

All agents work with specifications in `esl-mcp-spec/spec/`:

### Core MCP Specifications
- **spec/01-admin-mcp.md** - Admin operations (50+ tools)
- **spec/02-teacher-mcp.md** - Teaching workflows (20+ tools)
- **spec/03-student-mcp.md** - Learning support (15+ tools)

### Architecture & Patterns
- **spec/09-mcp-interaction-patterns.md** - 5 core patterns
- **spec/02-system-architecture.md** - System design
- **spec/08-database.md** - Database schema

### Shared Services
- **spec/shared-services/README.md** - 12 shared MCPs

### Navigation
- **spec/table-of-contents.md** - Master index

---

## 🚀 Quick Start Examples

### Example 1: Implement Admin MCP

```bash
# Review the spec first
@mcp-spec-reviewer Perform complete review of spec/01-admin-mcp.md

# Implement the server
@mcp-implementer Generate Admin MCP server with all 50+ tools from specification

# Create tests
@mcp-implementer Generate comprehensive test suite for Admin MCP

# Set up host integration
@host-orchestrator Create Next.js API routes for Admin MCP with all 5 interaction patterns
```

### Example 2: Add AI Tutoring Feature

```bash
# Check student MCP spec
@mcp-spec-reviewer Review spec/03-student-mcp.md section on AI tutoring tools

# Implement ask_tutor tool
@mcp-implementer Implement ask_tutor tool with CEFR level adaptation

# Create host endpoint
@host-orchestrator Create /api/chat/student route with AI tutoring integration
```

### Example 3: Security Audit

```bash
# Audit all MCPs
@mcp-spec-reviewer Perform security audit of authorization scopes across all 3 role MCPs

# Review JWT implementation
@mcp-implementer Review JWT verification implementation in Admin MCP

# Check host security
@host-orchestrator Verify JWT propagation and scope checking in Host service
```

---

## 💡 Tips & Best Practices

### Working with Agents

1. **Be Specific**: Provide exact file paths and section references
   ```
   ✅ "Review spec/01-admin-mcp.md section 1.3.1 (User Management Tools)"
   ❌ "Review the user stuff"
   ```

2. **Reference Patterns**: Cite specific interaction patterns
   ```
   ✅ "Implement using Pattern 3 (Multi-MCP Sequential) from spec/09"
   ❌ "Make it work with multiple MCPs"
   ```

3. **Iterative Approach**: Review → Implement → Test
   ```
   First: Review spec
   Then: Implement code
   Finally: Generate tests
   ```

4. **Cross-Reference**: Agents can work together
   ```
   @mcp-spec-reviewer → validates spec
   @mcp-implementer → generates code
   @host-orchestrator → integrates it
   ```

### Common Workflows

**New MCP Development:**
1. Review specification completeness
2. Implement MCP server structure
3. Add tools one by one
4. Generate tests for each tool
5. Create host integration
6. Test end-to-end workflow

**Adding Feature:**
1. Review spec for new tool
2. Implement tool with validation
3. Add to existing MCP
4. Update host routing
5. Generate tests
6. Deploy and test

**Debugging:**
1. Review spec vs implementation
2. Check authorization scopes
3. Validate RLS policies
4. Test with different user roles
5. Check audit logs

---

## 📖 Agent Capabilities Matrix

| Capability | Spec Reviewer | Implementer | Host Orchestrator |
|------------|---------------|-------------|-------------------|
| **Review Specs** | ✅ Primary | ✅ References | ✅ References |
| **Validate Schemas** | ✅ Primary | ✅ Implements | ❌ |
| **Generate Code** | ❌ | ✅ Primary | ✅ Primary |
| **Security Audit** | ✅ Primary | ✅ Implements | ✅ Enforces |
| **Create Tests** | ❌ | ✅ Primary | ✅ Integration |
| **MCP Coordination** | ✅ Reviews | ❌ | ✅ Primary |
| **Documentation** | ✅ Validates | ✅ Generates | ✅ Generates |

---

## 🔗 Related Resources

- **MCP Specifications**: `esl-mcp-spec/` repository
- **GitHub**: https://github.com/jojopeligroso/esl-mcp-spec
- **Reference Implementation**: `/admin-mcp` directory
- **Database Schema**: `spec/08-database.md`
- **Interaction Patterns**: `spec/09-mcp-interaction-patterns.md`

---

## 📝 Next Steps

1. **Review Specifications**
   ```
   @mcp-spec-reviewer Review all 3 role-based MCP specifications
   ```

2. **Start Implementation**
   ```
   @mcp-implementer Implement Admin MCP server (Phase 1 - MVP)
   ```

3. **Build Host Service**
   ```
   @host-orchestrator Create Next.js host service with Admin MCP integration
   ```

4. **Test Everything**
   ```
   @mcp-implementer Generate comprehensive test suites for all implementations
   ```

---

**Ready to build your ESL Learning Platform with AI-powered MCP architecture!** 🚀

Use the agents to transform your 200+ pages of specifications into production-ready code.
