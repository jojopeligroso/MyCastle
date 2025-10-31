# Shared Services MCPs - Overview

> **Document Status:** Living specification | **Priority:** Phase 2-4 (As Needed)
> **Version:** 2.0.0 | **Last Updated:** 2025-10-31

---

## Purpose

Shared Service MCPs are **invoked by role MCPs** (Admin, Teacher, Student) to handle specialized domains like data access, payments, calendar integration, and external communications. They provide reusable, well-scoped services that multiple role MCPs can leverage.

## Architecture Pattern

```
┌─────────────┐
│ Admin MCP   │────┐
└─────────────┘    │
                   │
┌─────────────┐    │    ┌──────────────────┐
│ Teacher MCP │────┼───→│  HOST SERVICE    │
└─────────────┘    │    │  (Orchestrator)  │
                   │    └──────────────────┘
┌─────────────┐    │              │
│ Student MCP │────┘              │
└─────────────┘                   │
                                  ↓
                    ┌─────────────────────────┐
                    │  SHARED SERVICE MCPs    │
                    ├─────────────────────────┤
                    │  - Data/Supabase        │
                    │  - Calendar             │
                    │  - Payments             │
                    │  - Identity/SSO         │
                    │  - Reporting            │
                    │  - Content/Docs         │
                    │  - Comms                │
                    │  - Files/Storage        │
                    │  - Attendance (Engine)  │
                    │  - Accommodation        │
                    │  - Compliance           │
                    │  - LMS/Moodle Bridge    │
                    └─────────────────────────┘
```

**Key Principle**: Role MCPs never call shared service MCPs directly. All communication is **host-mediated**.

---

## Shared Service MCPs

### 1. Data / Supabase MCP

**Purpose**: Database access layer with RLS enforcement

**Responsibilities**:
- Execute SQL queries with RLS
- Run stored procedures/functions
- Manage migrations
- Policy verification
- Transaction management

**Resources**:
```typescript
"data://tables"           // List of tables
"data://migrations"       // Migration status
"data://rls_policies"     // Active RLS policies
```

**Tools**:
```typescript
"query"                   // Execute SELECT with RLS
"execute"                 // INSERT/UPDATE/DELETE with RLS
"call_function"           // RPC to stored procedure
"migrate"                 // Apply/rollback migration
"policy_check"            // Verify RLS policy match
"transaction"             // Begin/commit/rollback
```

**Authorization**: Passes through user JWT; RLS enforced at DB layer

---

### 2. Calendar MCP

**Purpose**: External calendar integration (Google/Microsoft)

**Responsibilities**:
- Sync timetable to external calendars
- Manage room resource booking
- Handle calendar subscriptions
- Detect scheduling conflicts

**Resources**:
```typescript
"calendar://calendars"    // Available calendars
"calendar://events"       // Synced events
"calendar://rooms"        // Room resources
```

**Tools**:
```typescript
"create_event"            // Add calendar event
"update_event"            // Modify event
"sync_series"             // Sync recurring class sessions
"check_availability"      // Query room/teacher availability
"subscribe_notifications" // Webhook setup for changes
```

**Integration**: Google Calendar API / Microsoft Graph API

---

### 3. Payments MCP

**Purpose**: Payment gateway integration (Stripe/Adyen)

**Responsibilities**:
- Create payment intents
- Process payments
- Handle refunds
- Manage subscriptions/installments
- Reconcile payouts

**Resources**:
```typescript
"payments://customers"    // Customer records
"payments://invoices"     // Invoice status
"payments://transactions" // Payment history
```

**Tools**:
```typescript
"create_invoice"          // Generate invoice
"create_payment_intent"   // Setup Stripe checkout
"process_payment"         // Capture payment
"refund"                  // Issue refund
"setup_installments"      // Payment plan
"reconcile_payout"        // Match bank payout
```

**Security**: PCI DSS compliant; uses hosted payment pages

---

### 4. Identity / SSO MCP

**Purpose**: Authentication and authorization

**Responsibilities**:
- JWT issuing/verification
- OAuth/SSO integration
- Session management
- Role assignment
- Password resets

**Resources**:
```typescript
"identity://users"        // User accounts
"identity://sessions"     // Active sessions
"identity://providers"    // OAuth providers (Google, Microsoft)
```

**Tools**:
```typescript
"verify_jwt"              // Validate token
"refresh_token"           // Issue new token
"oauth_login"             // SSO flow
"reset_password"          // Password reset link
"revoke_session"          // Force logout
"assign_role"             // Update user role
```

**Integration**: Supabase Auth / Auth0 / Okta

---

### 5. Reporting / Analytics MCP

**Purpose**: Business intelligence and reporting

**Responsibilities**:
- Pre-built report execution
- KPI calculations
- Export generation
- Report scheduling

**Resources**:
```typescript
"reporting://kpis"        // Key metrics (attendance %, revenue, etc.)
"reporting://reports"     // Available report definitions
```

**Tools**:
```typescript
"run_report"              // Execute predefined report
"calculate_kpi"           // Compute metric
"export_csv"              // Export data
"schedule_report"         // Automated delivery
"describe_methodology"    // Explain calculation
```

**Features**: Caching, incremental refresh, variance analysis

---

### 6. Content / Docs MCP

**Purpose**: Document management and templating

**Responsibilities**:
- File storage (materials, policies)
- Document versioning
- Template rendering (letters, certificates)
- PDF/HTML generation

**Resources**:
```typescript
"content://files"         // Uploaded files
"content://templates"     // Document templates
```

**Tools**:
```typescript
"upload"                  // Upload file
"tag"                     // Add metadata
"version"                 // Create new version
"render_template"         // Generate document from template
"bundle_export"           // Create ZIP archive
```

**Storage**: Supabase Storage / S3-compatible

---

### 7. LMS / Moodle Bridge MCP

**Purpose**: Integration with external LMS

**Responsibilities**:
- Sync course structure
- Push grades
- Pull completion data
- Map users between systems

**Resources**:
```typescript
"lms://courses"           // Synced courses
"lms://activities"        // Course activities
"lms://grades"            // Grade items
```

**Tools**:
```typescript
"sync_course"             // Sync course to Moodle
"push_grade"              // Send grade to LMS
"pull_completion"         // Fetch completion status
"map_users"               // Link users between systems
```

**Integration**: Moodle Web Services API

---

### 8. Comms MCP

**Purpose**: Multi-channel communications

**Responsibilities**:
- Email delivery
- SMS sending
- Push notifications
- Template management
- Opt-out handling

**Resources**:
```typescript
"comms://templates"       // Email/SMS templates
"comms://groups"          // Contact groups
"comms://logs"            // Delivery logs
```

**Tools**:
```typescript
"send_email"              // Single email
"send_bulk"               // Batch emails
"send_sms"                // SMS message
"deliverability_report"   // Check delivery status
"manage_opt_out"          // Handle unsubscribes
```

**Integration**: SendGrid, Twilio, Firebase Cloud Messaging

---

### 9. Files / Storage MCP

**Purpose**: Object storage management

**Responsibilities**:
- File upload/download
- Presigned URL generation
- Lifecycle policies
- Antivirus scanning

**Resources**:
```typescript
"files://buckets"         // Storage buckets
"files://objects"         // Stored files
```

**Tools**:
```typescript
"upload"                  // Upload file
"presign_url"             // Generate download link
"move"                    // Move file
"copy"                    // Copy file
"lifecycle_policy"        // Set expiry rules
"antivirus_scan"          // Scan for malware
```

**Storage**: Supabase Storage / S3

---

### 10. Attendance MCP (Register Engine)

**Purpose**: Specialized attendance processing

**Responsibilities**:
- Register preparation
- Batch attendance recording
- Visa compliance calculations
- Register locking rules

**Resources**:
```typescript
"attendance://sessions"   // Session roster
"attendance://corrections"// Admin corrections log
```

**Tools**:
```typescript
"prepare_register"        // Create session register
"mark_present"            // Record attendance
"bulk_import"             // CSV import
"lock_register"           // Finalize (after N days)
"calculate_compliance"    // Visa attendance %
```

**Rules**: Immutable after lock period (default 7 days), admin override with audit

---

### 11. Accommodation MCP

**Purpose**: Student accommodation management

**Responsibilities**:
- Host family matching
- Placement allocation
- Safeguarding validation
- Occupancy tracking

**Resources**:
```typescript
"accommodation://hosts"   // Host families
"accommodation://placements" // Active placements
```

**Tools**:
```typescript
"match_student"           // Find suitable host
"allocate"                // Create placement
"swap"                    // Move student
"terminate_placement"     // End placement
"export_placements"       // Placement list
```

**Validation**: Safeguarding checks, guardianship for under-18

---

### 12. Compliance MCP

**Purpose**: Regulatory compliance and audit

**Responsibilities**:
- Evidence pack compilation
- Data retention policies
- DSAR processing
- Incident reporting

**Resources**:
```typescript
"compliance://policies"   // Policy register
"compliance://evidence"   // Compliance evidence
"compliance://incidents"  // Incident log
```

**Tools**:
```typescript
"compile_pack"            // Generate evidence ZIP
"apply_retention"         // Enforce data retention
"anonymise"               // GDPR anonymization
"submit_return"           // Government reporting (draft)
"audit_trail"             // Extract audit log
```

**Standards**: ISO 27001/27002, GDPR, FERPA

---

## Implementation Guidelines

### Phase Prioritization

**Phase 2 (Weeks 5-12)**:
1. Identity/SSO MCP - Auth separation
2. Payments MCP - Financial compliance
3. Data/Supabase MCP - RLS abstraction layer

**Phase 3 (Weeks 13-24)**:
4. Calendar MCP - Timetable sync
5. Comms MCP - Automated emails
6. Files/Storage MCP - Material management

**Phase 4 (As Needed)**:
7. Reporting MCP - Analytics
8. Content/Docs MCP - Template system
9. Attendance MCP - Specialized engine
10. Accommodation MCP - If needed
11. Compliance MCP - Audit preparation
12. LMS/Moodle MCP - Only if integration required

### Decision Criteria: Do You Need a Separate MCP?

Create a shared service MCP only if:
- ✅ Multiple role MCPs need the same functionality
- ✅ Requires separate secrets/credentials
- ✅ Different compliance requirements
- ✅ External vendor integration
- ✅ Independent scaling needs

Don't create a separate MCP if:
- ❌ Only one role MCP uses it
- ❌ Simple database CRUD (use Data MCP instead)
- ❌ Can be a tool in role MCP
- ❌ Doesn't justify operational overhead

---

## Integration Patterns

### Pattern 1: Role MCP → Data MCP

```typescript
// Teacher MCP needs to query assigned classes
async function getMyClasses(teacherId: string) {
  // Host mediates call to Data MCP
  const result = await dataMCP.callTool('query', {
    table: 'classes',
    where: { teacher_id: teacherId },
    select: ['id', 'name', 'enrolled', 'capacity']
  });

  return result.data;
}
```

### Pattern 2: Admin MCP → Payments MCP

```typescript
// Admin issues invoice
async function issueInvoice(bookingId: string, amount: number) {
  // Host mediates:
  // 1. Admin MCP creates invoice record
  const invoice = await adminMCP.callTool('create_invoice', {
    booking_id: bookingId,
    amount
  });

  // 2. Payments MCP creates Stripe invoice
  const stripeInvoice = await paymentsMCP.callTool('create_stripe_invoice', {
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    amount
  });

  return { invoice, stripe_url: stripeInvoice.url };
}
```

### Pattern 3: Student MCP → Comms MCP

```typescript
// Student requests letter → triggers email
async function requestLetter(studentId: string, letterType: string) {
  // 1. Student MCP creates request
  const request = await studentMCP.callTool('request_letter', {
    letter_type: letterType
  });

  // 2. Admin approves (manual step)
  // ...

  // 3. Comms MCP sends email with PDF
  await commsMCP.callTool('send_email', {
    template_id: 'letter_issued',
    to: student.email,
    variables: { student_name: student.name },
    attachments: [{ filename: 'letter.pdf', url: letterPdf }]
  });
}
```

---

## Cross-Reference Matrix

| Shared Service MCP | Used By | Purpose |
|--------------------|---------|---------|
| **Data/Supabase** | Admin, Teacher, Student | Database queries with RLS |
| **Calendar** | Admin, Teacher | Timetable sync, room booking |
| **Payments** | Admin, Student | Invoicing, payment processing |
| **Identity/SSO** | All | Authentication, authorization |
| **Reporting** | Admin, Teacher | Analytics, KPIs, exports |
| **Content/Docs** | Admin, Teacher | Materials, templates, policies |
| **LMS/Moodle** | Admin, Teacher | Grade sync, completion tracking |
| **Comms** | Admin, Teacher | Email, SMS, notifications |
| **Files/Storage** | All | File upload/download |
| **Attendance** | Admin, Teacher | Register engine, compliance |
| **Accommodation** | Admin, Student | Placement management |
| **Compliance** | Admin | Evidence packs, GDPR, audits |

---

## Security Considerations

### Credential Isolation

Each shared service MCP has its own credentials:

```bash
# Data/Supabase MCP
SUPABASE_SERVICE_ROLE_KEY=...

# Payments MCP
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Identity MCP
JWKS_URI=...
JWT_SIGNING_KEY=...

# Calendar MCP
GOOGLE_CALENDAR_API_KEY=...
MICROSOFT_GRAPH_TOKEN=...

# Comms MCP
SENDGRID_API_KEY=...
TWILIO_API_KEY=...
```

### Authorization Flow

```
1. User authenticates → gets JWT from Identity MCP
2. User makes request → Role MCP (Admin/Teacher/Student)
3. Role MCP validates JWT scope
4. Role MCP calls Host for orchestration
5. Host invokes Shared Service MCP(s) with user context
6. Shared Service applies its own authorization rules
7. Shared Service returns data to Host
8. Host aggregates and returns to Role MCP
9. Role MCP formats response for user
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-31 | Complete shared services overview with 12 MCP specifications |
| 1.0.0 | 2025-10-30 | Initial draft |

---

**Document Status**: Complete - Design Reference
**Next Steps**: Implement shared service MCPs in Phases 2-4 as role MCPs require them
**Priority Order**: Identity → Payments → Data → Calendar → Comms → Others
