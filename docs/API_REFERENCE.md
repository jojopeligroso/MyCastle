# MyCastle API Reference Guide

**Version:** 1.0
**Last Updated:** January 2026
**Base URL:** `http://localhost:3000` (Development) | `https://mycastle.vercel.app` (Production)

---

## Table of Contents

1. [Getting Started](#getting-started)
   - [Authentication](#authentication)
   - [Base URLs & Environments](#base-urls--environments)
   - [Common Patterns](#common-patterns)
2. [Student Management APIs](#student-management-apis)
3. [Enrollment Management APIs](#enrollment-management-apis)
4. [Finance APIs](#finance-apis)
5. [Academic Management APIs](#academic-management-apis)
6. [Teacher Management APIs](#teacher-management-apis)
7. [Search & Audit APIs](#search--audit-apis)
8. [Data Models](#data-models)
9. [Error Reference](#error-reference)
10. [Business Logic Rules](#business-logic-rules)

---

## Getting Started

### Authentication

All API endpoints require authentication. MyCastle supports two authentication methods:

#### Method 1: Password Authentication

```typescript
POST /auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}

// Response: Session cookie set automatically
// Subsequent requests include cookie automatically
```

#### Method 2: Magic Link (Passwordless)

```typescript
POST /api/auth/magic-link
Content-Type: application/json

{
  "email": "user@example.com",
  "redirectTo": "https://mycastle.app/auth/callback?next=/dashboard"
}

// Response
{
  "message": "If an account exists, a magic link has been sent."
}

// User clicks link in email → Authenticated
```

**Security Features:**
- ✅ Rate limiting: 3 requests/minute per IP/email
- ✅ Timing attack prevention (constant-time responses)
- ✅ Email enumeration prevention (generic success message)

#### Authorization Requirements

Most endpoints require **admin role**. Role enforcement is done via:

```typescript
await requireAuth(['admin']);
```

**HTTP 401 Unauthorized** will be returned if not authenticated.
**HTTP 403 Forbidden** will be returned if insufficient permissions.

---

### Base URLs & Environments

| Environment | Base URL | Usage |
|-------------|----------|-------|
| **Development** | `http://localhost:3000` | Local development |
| **Production** | `https://mycastle.vercel.app` | Live environment |

All API routes are prefixed with `/api`:
- Student APIs: `/api/admin/students`
- Finance APIs: `/api/admin/finance/invoices`
- Attendance APIs: `/api/attendance/session`

---

### Common Patterns

#### Request Format

All POST/PATCH requests use **JSON** format:

```http
POST /api/admin/students
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### Response Format

Successful responses return JSON:

```json
{
  "id": "student-123",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2025-01-15T10:00:00Z"
}
```

#### Pagination

List endpoints support pagination via query parameters:

```http
GET /api/admin/students?limit=50&offset=0

Response:
{
  "students": [...],
  "pagination": {
    "total": 250,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Parameters:**
- `limit`: Number of records to return (default: 100, max: 1000)
- `offset`: Number of records to skip (default: 0)

#### Filtering

Use query parameters for filtering:

```http
GET /api/admin/students?search=john&status=active&level=B1
```

Common filters:
- `search`: Text search (name, email)
- `status`: Filter by status (active, inactive)
- `level`: Filter by CEFR level (A1-C2)
- `student_id`: Filter by student
- `class_id`: Filter by class

#### Soft Deletes

DELETE operations perform **soft deletes** (set `deleted_at` timestamp):

```http
DELETE /api/admin/students/student-123

Response:
{
  "success": true
}
```

Soft-deleted records are excluded from queries automatically.

#### Timestamps

All entities include:

```json
{
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T11:30:00Z",
  "deleted_at": null
}
```

Format: ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)

---

## Student Management APIs

### Create Student

**Endpoint:** `POST /api/admin/students`

**Description:** Create a new student account with personal details, CEFR level, and optional visa information.

**Authorization:** Admin role required

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "date_of_birth": "1995-05-15",
  "address": "123 Main St",
  "city": "Dublin",
  "country": "Ireland",
  "postal_code": "D01 F5P2",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+1234567891",
  "emergency_contact_relationship": "Spouse",
  "current_level": "B1",
  "target_level": "C1",
  "visa_type": "Study Visa",
  "visa_expiry": "2026-12-31",
  "visa_conditions": "Must maintain 80% attendance",
  "notes": "Prefers morning classes"
}
```

**Required Fields:**
- `name` (string, min 1 char)
- `email` (string, valid email format)

**Optional Fields:**
- `phone`, `date_of_birth`, `address`, `city`, `country`, `postal_code`
- `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`
- `current_level`, `target_level` (CEFR levels: A1, A2, B1, B2, C1, C2)
- `visa_type`, `visa_expiry`, `visa_conditions`
- `notes`

**Response:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "student",
  "phone": "+1234567890",
  "current_level": "B1",
  "target_level": "C1",
  "status": "active",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Valid email is required" | Invalid email format |
| 409 | "A user with this email already exists" | Duplicate email |
| 401 | "Unauthorized" | Not authenticated |
| 500 | "Failed to create student" | Database error |

---

### List Students

**Endpoint:** `GET /api/admin/students`

**Description:** Retrieve paginated list of students with optional filtering and search.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | number | Records per page | 100 |
| `offset` | number | Records to skip | 0 |
| `search` | string | Search name/email | - |
| `status` | string | Filter by status (active, inactive) | - |
| `level` | string | Filter by CEFR level (A1-C2) | - |

**Example Request:**

```http
GET /api/admin/students?limit=10&offset=0&status=active&search=john
```

**Response:** `200 OK`

```json
{
  "students": [
    {
      "id": "student-1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "status": "active",
      "current_level": "B1",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": "student-2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "student",
      "status": "active",
      "current_level": "A2",
      "created_at": "2025-01-14T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Get Student Details

**Endpoint:** `GET /api/admin/students/:id`

**Description:** Retrieve comprehensive student profile including enrollments, attendance summary, and grades.

**Authorization:** Admin role required

**Example Request:**

```http
GET /api/admin/students/550e8400-e29b-41d4-a716-446655440000
```

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "current_level": "B1",
  "target_level": "C1",
  "status": "active",
  "enrollments": [
    {
      "id": "enrollment-1",
      "className": "General English B1 - Morning",
      "start_date": "2025-01-15",
      "end_date": "2025-06-15",
      "status": "active",
      "amendments": [
        {
          "type": "EXTENSION",
          "previous_value": "2025-06-15",
          "new_value": "2025-08-15",
          "reason": "Student requested extension",
          "created_at": "2025-05-01T10:00:00Z"
        }
      ]
    }
  ],
  "attendance": {
    "summary": {},
    "rate": 85.5,
    "total": 20
  },
  "grades": []
}
```

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 404 | "Student not found" | Invalid student ID or soft-deleted |
| 401 | "Unauthorized" | Not authenticated |

---

### Update Student

**Endpoint:** `PATCH /api/admin/students/:id`

**Description:** Update student information (partial update supported).

**Authorization:** Admin role required

**Request Body:**

```json
{
  "phone": "+9876543210",
  "current_level": "B2",
  "notes": "Updated notes"
}
```

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "phone": "+9876543210",
  "current_level": "B2",
  "notes": "Updated notes",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

---

### Delete Student

**Endpoint:** `DELETE /api/admin/students/:id`

**Description:** Soft delete student (sets `deleted_at` timestamp).

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "success": true
}
```

**Note:** Soft-deleted students are excluded from queries but retained for audit purposes.

---

## Enrollment Management APIs

### Create Enrollment

**Endpoint:** `POST /api/admin/enrollments`

**Description:** Enroll a student in a class with custom start/end dates.

**Authorization:** Admin role required

**Request Body:**

```json
{
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "class_id": "class-456",
  "start_date": "2025-01-15",
  "end_date": "2025-06-15",
  "status": "active"
}
```

**Required Fields:**
- `student_id` (UUID)
- `class_id` (UUID)
- `start_date` (YYYY-MM-DD)

**Optional Fields:**
- `end_date` (YYYY-MM-DD, defaults to class end date)
- `status` (enum: active, completed, withdrawn, transferred, default: active)

**Response:** `201 Created`

```json
{
  "id": "enrollment-789",
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "class_id": "class-456",
  "start_date": "2025-01-15",
  "end_date": "2025-06-15",
  "status": "active",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 404 | "Student not found" | Invalid student_id |
| 404 | "Class not found" | Invalid class_id |
| 409 | "Class is at full capacity" | Class.enrolled_count >= Class.capacity |
| 400 | "Valid student ID is required" | Invalid UUID format |

**Business Logic:**
- Class `enrolled_count` is incremented automatically
- Validates class capacity before enrollment
- Checks for duplicate active enrollments (same student + class)

---

### List Enrollments

**Endpoint:** `GET /api/admin/enrollments`

**Description:** List enrollments with filtering options. Includes student and class details.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Records per page (default: 100) |
| `offset` | number | Records to skip (default: 0) |
| `student_id` | UUID | Filter by student |
| `class_id` | UUID | Filter by class |
| `status` | string | Filter by status (active, completed, withdrawn, transferred) |

**Example Request:**

```http
GET /api/admin/enrollments?student_id=550e8400-e29b-41d4-a716-446655440000&status=active
```

**Response:** `200 OK`

```json
{
  "enrollments": [
    {
      "enrollment": {
        "id": "enrollment-789",
        "student_id": "550e8400-e29b-41d4-a716-446655440000",
        "class_id": "class-456",
        "status": "active",
        "start_date": "2025-01-15",
        "end_date": "2025-06-15"
      },
      "student": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "class": {
        "id": "class-456",
        "name": "General English B1 - Morning",
        "code": "B1-GEN-001",
        "level": "B1"
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Enrollment Details

**Endpoint:** `GET /api/admin/enrollments/:id`

**Description:** Get enrollment with student, class, and amendment history.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "enrollment": {
    "id": "enrollment-123",
    "status": "active",
    "start_date": "2025-01-15",
    "end_date": "2025-08-15"
  },
  "student": {
    "id": "student-123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "class": {
    "id": "class-456",
    "name": "General English B1",
    "level": "B1"
  },
  "amendments": [
    {
      "id": "amendment-1",
      "type": "EXTENSION",
      "previous_value": "2025-06-15",
      "new_value": "2025-08-15",
      "reason": "Student requested extension",
      "created_at": "2025-05-01T10:00:00Z"
    }
  ]
}
```

---

### Create Amendment

**Endpoint:** `POST /api/admin/enrollments/:id`

**Description:** Create an enrollment amendment (extension, reduction, level change, or transfer).

**Authorization:** Admin role required

**Amendment Types:**

#### 1. EXTENSION - Extend enrollment end date

```json
POST /api/admin/enrollments/enrollment-123

{
  "type": "EXTENSION",
  "previous_value": "2025-06-15",
  "new_value": "2025-08-15",
  "reason": "Student requested extension",
  "metadata": {
    "weeks_added": 8,
    "fee_charged": 400,
    "approved_by": "admin-user-id"
  }
}
```

**Business Logic:** Automatically updates `enrollment.end_date` to `new_value`

#### 2. REDUCTION - Reduce enrollment duration

```json
{
  "type": "REDUCTION",
  "previous_value": "2025-06-15",
  "new_value": "2025-05-15",
  "reason": "Student leaving early",
  "metadata": {
    "weeks_removed": 4,
    "refund_amount": 200
  }
}
```

#### 3. LEVEL_CHANGE - Change student CEFR level

```json
{
  "type": "LEVEL_CHANGE",
  "previous_value": "B1",
  "new_value": "B2",
  "reason": "Student progressed to next level",
  "metadata": {
    "assessment_score": 85,
    "teacher_recommendation": "Promoted based on test results"
  }
}
```

#### 4. TRANSFER - Transfer to different class

```json
{
  "type": "TRANSFER",
  "previous_value": "class-old-id",
  "new_value": "class-new-id",
  "reason": "Student transferred to morning class",
  "metadata": {
    "requested_by": "student",
    "approved_by": "admin-user-id"
  }
}
```

**Required Fields:**
- `type` (enum: EXTENSION, REDUCTION, LEVEL_CHANGE, TRANSFER)
- `previous_value` (string)
- `new_value` (string)
- `reason` (string, min 1 char)

**Optional Fields:**
- `metadata` (object, arbitrary key-value pairs)

**Response:** `201 Created`

```json
{
  "id": "amendment-1",
  "enrollment_id": "enrollment-123",
  "type": "EXTENSION",
  "previous_value": "2025-06-15",
  "new_value": "2025-08-15",
  "reason": "Student requested extension",
  "metadata": {
    "weeks_added": 8,
    "fee_charged": 400
  },
  "created_at": "2025-05-01T10:00:00Z"
}
```

---

### Update Enrollment

**Endpoint:** `PATCH /api/admin/enrollments/:id`

**Description:** Update enrollment details (partial update).

**Authorization:** Admin role required

**Request Body:**

```json
{
  "status": "completed",
  "end_date": "2025-06-30"
}
```

**Response:** `200 OK`

---

### Delete Enrollment

**Endpoint:** `DELETE /api/admin/enrollments/:id`

**Description:** Soft delete enrollment (sets `deleted_at`).

**Authorization:** Admin role required

**Business Logic:** Decrements class `enrolled_count` automatically

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Finance APIs

### Create Invoice

**Endpoint:** `POST /api/admin/finance/invoices`

**Description:** Create invoice with optional itemized line items. Invoice number is auto-generated.

**Authorization:** Admin role required

**Request Body:**

```json
{
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1500,
  "due_date": "2025-02-15",
  "description": "Spring 2025 Tuition",
  "line_items": [
    {
      "description": "Tuition - General English B1 (12 weeks)",
      "quantity": 12,
      "unit_price": 100,
      "amount": 1200
    },
    {
      "description": "Registration Fee",
      "quantity": 1,
      "unit_price": 150,
      "amount": 150
    },
    {
      "description": "Course Materials",
      "quantity": 1,
      "unit_price": 150,
      "amount": 150
    }
  ],
  "notes": "Student requested payment plan"
}
```

**Required Fields:**
- `student_id` (UUID)
- `amount` (number, positive)
- `due_date` (YYYY-MM-DD)

**Optional Fields:**
- `description` (string)
- `line_items` (array of objects)
  - `description` (string)
  - `quantity` (number, positive)
  - `unit_price` (number)
  - `amount` (number)
- `notes` (string)

**Response:** `201 Created`

```json
{
  "id": "invoice-123",
  "student_id": "550e8400-e29b-41d4-a716-446655440000",
  "invoice_number": "INV-2025-000001",
  "amount": 1500,
  "amount_paid": 0,
  "amount_due": 1500,
  "due_date": "2025-02-15",
  "status": "pending",
  "description": "Spring 2025 Tuition",
  "line_items": [
    {
      "description": "Tuition - General English B1 (12 weeks)",
      "quantity": 12,
      "unit_price": 100,
      "amount": 1200
    },
    {
      "description": "Registration Fee",
      "quantity": 1,
      "unit_price": 150,
      "amount": 150
    },
    {
      "description": "Course Materials",
      "quantity": 1,
      "unit_price": 150,
      "amount": 150
    }
  ],
  "notes": "Student requested payment plan",
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Invoice Number Format:** `INV-YYYY-NNNNNN` (auto-generated, sequential per year)

**Status Values:**
- `pending`: No payments received (amount_paid = 0)
- `partial`: Partial payment (0 < amount_paid < amount)
- `paid`: Fully paid (amount_paid = amount)
- `overdue`: Past due_date with amount_due > 0
- `cancelled`: Invoice cancelled

---

### List Invoices

**Endpoint:** `GET /api/admin/finance/invoices`

**Description:** List invoices with filtering and pagination.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Records per page (default: 100) |
| `offset` | number | Records to skip (default: 0) |
| `student_id` | UUID | Filter by student |
| `status` | string | Filter by status (pending, partial, paid, overdue, cancelled) |

**Example Request:**

```http
GET /api/admin/finance/invoices?student_id=550e8400-e29b-41d4-a716-446655440000&status=pending
```

**Response:** `200 OK`

```json
{
  "invoices": [
    {
      "id": "invoice-123",
      "invoice_number": "INV-2025-000001",
      "amount": 1500,
      "amount_paid": 0,
      "amount_due": 1500,
      "status": "pending",
      "due_date": "2025-02-15",
      "student": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Invoice Details

**Endpoint:** `GET /api/admin/finance/invoices/:id`

**Description:** Get invoice with line items and payment history.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "id": "invoice-123",
  "invoice_number": "INV-2025-000001",
  "amount": 1500,
  "amount_paid": 500,
  "amount_due": 1000,
  "status": "partial",
  "due_date": "2025-02-15",
  "student": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "line_items": [
    {
      "description": "Tuition - General English B1 (12 weeks)",
      "quantity": 12,
      "unit_price": 100,
      "amount": 1200
    }
  ],
  "payments": [
    {
      "id": "payment-1",
      "amount": 500,
      "payment_method": "card",
      "payment_date": "2025-01-20",
      "reference": "REF-12345",
      "created_at": "2025-01-20T14:00:00Z"
    }
  ]
}
```

---

### Delete Invoice

**Endpoint:** `DELETE /api/admin/finance/invoices/:id`

**Description:** Soft delete invoice.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

### Record Payment

**Endpoint:** `POST /api/admin/finance/payments`

**Description:** Record a payment for an invoice. Invoice status is automatically updated.

**Authorization:** Admin role required

**Request Body:**

```json
{
  "invoice_id": "invoice-123",
  "amount": 500,
  "payment_method": "card",
  "payment_date": "2025-01-20",
  "reference": "REF-12345",
  "notes": "Payment via Stripe"
}
```

**Required Fields:**
- `invoice_id` (UUID)
- `amount` (number, can be negative for refunds)
- `payment_method` (enum: cash, card, bank_transfer, other, refund)
- `payment_date` (YYYY-MM-DD)

**Optional Fields:**
- `reference` (string, payment reference/transaction ID)
- `notes` (string)

**Response:** `201 Created`

```json
{
  "id": "payment-1",
  "invoice_id": "invoice-123",
  "amount": 500,
  "payment_method": "card",
  "payment_date": "2025-01-20",
  "reference": "REF-12345",
  "notes": "Payment via Stripe",
  "created_at": "2025-01-20T14:00:00Z"
}
```

**Business Logic:**
- Automatically updates invoice `amount_paid` (sum of all payments)
- Automatically updates invoice `amount_due` (amount - amount_paid)
- Automatically updates invoice `status`:
  - `pending` if amount_paid = 0
  - `partial` if 0 < amount_paid < amount
  - `paid` if amount_paid = amount

**Refunds:**
- Use negative `amount` for refunds
- Set `payment_method` to "refund"

**Example Refund:**

```json
{
  "invoice_id": "invoice-123",
  "amount": -200,
  "payment_method": "refund",
  "payment_date": "2025-01-25",
  "notes": "Refund for cancelled classes"
}
```

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Payment amount exceeds amount due" | Attempting to overpay invoice |
| 404 | "Invoice not found" | Invalid invoice_id |

---

### List Payments

**Endpoint:** `GET /api/admin/finance/payments`

**Description:** List all payments with optional invoice filtering.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Records per page (default: 100) |
| `offset` | number | Records to skip (default: 0) |
| `invoice_id` | UUID | Filter by invoice |

**Response:** `200 OK`

```json
{
  "payments": [
    {
      "id": "payment-1",
      "invoice_id": "invoice-123",
      "amount": 500,
      "payment_method": "card",
      "payment_date": "2025-01-20",
      "reference": "REF-12345"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## Academic Management APIs

### Create Programme

**Endpoint:** `POST /api/admin/programmes`

**Description:** Create a learning programme with CEFR levels.

**Authorization:** Admin role required

**Request Body:**

```json
{
  "name": "General English",
  "description": "Comprehensive English language programme",
  "duration_weeks": 12,
  "levels": ["A1", "A2", "B1", "B2", "C1", "C2"],
  "is_active": true
}
```

**Required Fields:**
- `name` (string, min 1 char)
- `duration_weeks` (number, positive integer)

**Optional Fields:**
- `description` (string)
- `levels` (array of CEFR levels: A1, A2, B1, B2, C1, C2)
- `is_active` (boolean, default: true)

**Response:** `201 Created`

```json
{
  "id": "programme-123",
  "name": "General English",
  "code": "GEN",
  "description": "Comprehensive English language programme",
  "duration_weeks": 12,
  "levels": ["A1", "A2", "B1", "B2", "C1", "C2"],
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Auto-Generated Code:** First 3 letters of name, uppercase (e.g., "General English" → "GEN")

---

### List Programmes

**Endpoint:** `GET /api/admin/programmes`

**Description:** List all programmes with course counts.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Records per page (default: 100) |
| `offset` | number | Records to skip (default: 0) |

**Response:** `200 OK`

```json
{
  "programmes": [
    {
      "id": "programme-123",
      "name": "General English",
      "code": "GEN",
      "duration_weeks": 12,
      "is_active": true,
      "courseCount": 6
    }
  ],
  "pagination": {
    "total": 8,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Programme Details

**Endpoint:** `GET /api/admin/programmes/:id`

**Description:** Get programme with associated courses.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "id": "programme-123",
  "name": "General English",
  "code": "GEN",
  "description": "Comprehensive English language programme",
  "duration_weeks": 12,
  "levels": ["A1", "A2", "B1", "B2", "C1", "C2"],
  "is_active": true,
  "courses": [
    {
      "id": "course-1",
      "name": "General English A1",
      "code": "A1-GEN",
      "level": "A1"
    }
  ]
}
```

---

### Update Programme

**Endpoint:** `PATCH /api/admin/programmes/:id`

**Description:** Update programme details (partial update).

**Authorization:** Admin role required

**Request Body:**

```json
{
  "description": "Updated description",
  "is_active": false
}
```

**Response:** `200 OK`

---

### Delete Programme

**Endpoint:** `DELETE /api/admin/programmes/:id`

**Description:** Soft delete programme.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

### Create Course

**Endpoint:** `POST /api/admin/courses`

**Description:** Create a course within a programme with CEFR level and descriptors.

**Authorization:** Admin role required

**Request Body:**

```json
{
  "programme_id": "programme-123",
  "name": "General English",
  "level": "B1",
  "duration_weeks": 12,
  "description": "Comprehensive B1 course",
  "objectives": "Master all B1 competencies",
  "cefr_descriptor_ids": ["desc-1", "desc-2", "desc-3"]
}
```

**Required Fields:**
- `programme_id` (UUID)
- `name` (string)
- `level` (enum: A1, A2, B1, B2, C1, C2)
- `duration_weeks` (number, positive integer)

**Optional Fields:**
- `description`, `objectives` (string)
- `cefr_descriptor_ids` (array of UUIDs)

**Response:** `201 Created`

```json
{
  "id": "course-456",
  "programme_id": "programme-123",
  "name": "General English",
  "code": "B1-GEN",
  "level": "B1",
  "duration_weeks": 12,
  "description": "Comprehensive B1 course",
  "objectives": "Master all B1 competencies",
  "cefr_descriptor_ids": ["desc-1", "desc-2", "desc-3"],
  "created_at": "2025-01-15T10:00:00Z"
}
```

**Auto-Generated Code:** `{level}-{first 3 letters of name}` (e.g., "B1-GEN")

---

### List Courses

**Endpoint:** `GET /api/admin/courses`

**Description:** List all courses with programme information.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Records per page (default: 100) |
| `offset` | number | Records to skip (default: 0) |
| `programme_id` | UUID | Filter by programme |
| `level` | string | Filter by CEFR level (A1-C2) |

**Response:** `200 OK`

```json
{
  "courses": [
    {
      "id": "course-456",
      "name": "General English",
      "code": "B1-GEN",
      "level": "B1",
      "duration_weeks": 12,
      "programme": {
        "id": "programme-123",
        "name": "General English",
        "code": "GEN"
      }
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Course Details

**Endpoint:** `GET /api/admin/courses/:id`

**Description:** Get course with programme and CEFR descriptors.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "id": "course-456",
  "name": "General English",
  "code": "B1-GEN",
  "level": "B1",
  "duration_weeks": 12,
  "description": "Comprehensive B1 course",
  "objectives": "Master all B1 competencies",
  "programme": {
    "id": "programme-123",
    "name": "General English"
  },
  "cefr_descriptors": [
    {
      "id": "desc-1",
      "level": "B1",
      "category": "Speaking",
      "descriptor": "Can interact with a degree of fluency..."
    }
  ]
}
```

---

### Update Course

**Endpoint:** `PATCH /api/admin/courses/:id`

**Description:** Update course details (partial update).

**Authorization:** Admin role required

**Response:** `200 OK`

---

### Delete Course

**Endpoint:** `DELETE /api/admin/courses/:id`

**Description:** Soft delete course.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "success": true
}
```

---

## Teacher Management APIs

### List Teachers

**Endpoint:** `GET /api/admin/teachers`

**Description:** List all teachers with class assignments.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Records per page (default: 100) |
| `offset` | number | Records to skip (default: 0) |

**Response:** `200 OK`

```json
{
  "teachers": [
    {
      "id": "teacher-1",
      "name": "Ms. Smith",
      "email": "smith@school.com",
      "status": "active",
      "classCount": 3
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Teacher Details

**Endpoint:** `GET /api/admin/teachers/:id`

**Description:** Get teacher profile with class assignments and schedule.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "id": "teacher-1",
  "name": "Ms. Smith",
  "email": "smith@school.com",
  "status": "active",
  "classes": [
    {
      "id": "class-1",
      "name": "General English B1 - Morning",
      "code": "B1-GEN-001",
      "level": "B1",
      "enrolled_count": 15,
      "capacity": 20
    }
  ]
}
```

---

## Search & Audit APIs

### Global Search

**Endpoint:** `GET /api/admin/search`

**Description:** Search across students, teachers, and classes.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (min 2 chars) |
| `limit` | number | Max results per entity type (default: 20) |

**Example Request:**

```http
GET /api/admin/search?q=john&limit=10
```

**Response:** `200 OK`

```json
{
  "query": "john",
  "students": [
    {
      "id": "student-1",
      "name": "John Doe",
      "email": "john@example.com",
      "current_level": "B1",
      "status": "active",
      "type": "student"
    }
  ],
  "teachers": [
    {
      "id": "teacher-1",
      "name": "John Smith",
      "email": "john.smith@school.com",
      "status": "active",
      "type": "teacher"
    }
  ],
  "classes": [
    {
      "id": "class-1",
      "name": "Morning Class with John",
      "code": "B1-GEN-001",
      "level": "B1",
      "status": "active",
      "type": "class"
    }
  ]
}
```

**Search Behavior:**
- **Case-insensitive** (ILIKE pattern matching)
- **Minimum 2 characters** required
- **Searches:**
  - Students: name, email
  - Teachers: name, email
  - Classes: name, code

---

### List Audit Logs

**Endpoint:** `GET /api/admin/audit-log`

**Description:** List audit logs with filtering by entity type, action, user.

**Authorization:** Admin role required

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Records per page (default: 100) |
| `offset` | number | Records to skip (default: 0) |
| `entity_type` | string | Filter by entity (student, teacher, class, enrollment, invoice, payment, programme, course) |
| `action` | string | Filter by action (create, update, delete) |
| `user_id` | UUID | Filter by user who performed action |

**Example Request:**

```http
GET /api/admin/audit-log?entity_type=student&action=update&limit=10
```

**Response:** `200 OK`

```json
{
  "logs": [
    {
      "id": "log-1",
      "user_id": "admin-123",
      "entity_type": "student",
      "entity_id": "student-456",
      "action": "update",
      "created_at": "2025-01-15T10:00:00Z",
      "user": {
        "name": "Admin User",
        "email": "admin@school.com"
      }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Supported Entity Types:**
- student, teacher, class, enrollment, invoice, payment, programme, course

**Supported Actions:**
- create, update, delete

---

### Get Audit Log Details

**Endpoint:** `GET /api/admin/audit-log/:id`

**Description:** Get audit log with related change history for the same entity.

**Authorization:** Admin role required

**Response:** `200 OK`

```json
{
  "log": {
    "id": "log-123",
    "user_id": "admin-123",
    "entity_type": "student",
    "entity_id": "student-456",
    "action": "update",
    "created_at": "2025-01-15T10:00:00Z"
  },
  "user": {
    "name": "Admin User",
    "email": "admin@school.com"
  },
  "relatedLogs": [
    {
      "id": "log-100",
      "action": "create",
      "created_at": "2025-01-01T09:00:00Z"
    },
    {
      "id": "log-123",
      "action": "update",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Note:** Returns up to 50 related logs for complete entity change history.

---

## Data Models

### Student Schema

```typescript
{
  id: string (UUID)
  name: string (required, min 1 char)
  email: string (required, valid email, unique)
  phone?: string
  date_of_birth?: string (YYYY-MM-DD)
  address?: string
  city?: string
  country?: string
  postal_code?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  current_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  target_level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  visa_type?: string
  visa_expiry?: string (YYYY-MM-DD)
  visa_conditions?: string
  notes?: string
  role: 'student' (fixed)
  status: 'active' | 'inactive' (default: 'active')
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  deleted_at?: string (ISO 8601, null if not deleted)
}
```

### Enrollment Schema

```typescript
{
  id: string (UUID)
  student_id: string (UUID, required)
  class_id: string (UUID, required)
  start_date: string (YYYY-MM-DD, required)
  end_date?: string (YYYY-MM-DD)
  status: 'active' | 'completed' | 'withdrawn' | 'transferred' (default: 'active')
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  deleted_at?: string (ISO 8601)
}
```

### Amendment Schema

```typescript
{
  id: string (UUID)
  enrollment_id: string (UUID, required)
  type: 'EXTENSION' | 'REDUCTION' | 'LEVEL_CHANGE' | 'TRANSFER' (required)
  previous_value: string (required)
  new_value: string (required)
  reason: string (required, min 1 char)
  metadata?: object (arbitrary key-value pairs)
  created_at: string (ISO 8601)
}
```

### Invoice Schema

```typescript
{
  id: string (UUID)
  student_id: string (UUID, required)
  invoice_number: string (auto-generated: INV-YYYY-NNNNNN)
  amount: number (required, positive)
  amount_paid: number (auto-calculated, sum of payments)
  amount_due: number (auto-calculated, amount - amount_paid)
  due_date: string (YYYY-MM-DD, required)
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' (auto-updated)
  description?: string
  line_items?: Array<{
    description: string
    quantity: number (positive)
    unit_price: number
    amount: number
  }>
  notes?: string
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  deleted_at?: string (ISO 8601)
}
```

### Payment Schema

```typescript
{
  id: string (UUID)
  invoice_id: string (UUID, required)
  amount: number (required, can be negative for refunds)
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'other' | 'refund' (required)
  payment_date: string (YYYY-MM-DD, required)
  reference?: string (payment reference/transaction ID)
  notes?: string
  created_at: string (ISO 8601)
}
```

### Programme Schema

```typescript
{
  id: string (UUID)
  name: string (required, min 1 char)
  code: string (auto-generated, first 3 letters uppercase)
  description?: string
  duration_weeks: number (required, positive integer)
  levels?: Array<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>
  is_active: boolean (default: true)
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  deleted_at?: string (ISO 8601)
}
```

### Course Schema

```typescript
{
  id: string (UUID)
  programme_id: string (UUID, required)
  name: string (required)
  code: string (auto-generated: LEVEL-NAME)
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' (required)
  duration_weeks: number (required, positive integer)
  description?: string
  objectives?: string
  cefr_descriptor_ids?: Array<string (UUID)>
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
  deleted_at?: string (ISO 8601)
}
```

### CEFR Levels

**Common European Framework of Reference for Languages:**

| Level | Name | Description |
|-------|------|-------------|
| **A1** | Beginner | Basic phrases, simple interactions |
| **A2** | Elementary | Simple tasks, immediate needs |
| **B1** | Intermediate | Main points, familiar matters |
| **B2** | Upper Intermediate | Complex text, technical discussions |
| **C1** | Advanced | Wide range of topics, fluent |
| **C2** | Proficiency | Virtually everything, native-like |

---

## Error Reference

### HTTP Status Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Validation error or invalid data |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist or soft-deleted |
| 409 | Conflict | Business logic violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server/database error |

### Error Response Format

All errors return consistent JSON format:

```json
{
  "error": "Error message here"
}
```

Or with validation details:

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "email": ["Valid email is required"],
      "name": ["Name is required"]
    }
  }
}
```

### Common Error Scenarios

#### 400 Bad Request - Validation Errors

```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "email": ["Valid email is required"]
    }
  }
}
```

**Causes:**
- Invalid email format
- Missing required fields
- Invalid UUID format
- Invalid enum values (status, level, payment_method)
- Negative numbers where positive required

#### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

**Causes:**
- No session cookie (not authenticated)
- Expired session
- Missing authentication header

**Solution:** Authenticate via password or magic link

#### 404 Not Found

```json
{
  "error": "Student not found"
}
```

**Causes:**
- Invalid resource ID
- Resource has been soft-deleted (deleted_at is set)

#### 409 Conflict - Business Logic Violations

```json
{
  "error": "A user with this email already exists"
}
```

**Common business logic errors:**
- Duplicate email (students, teachers)
- Class at full capacity (enrollments)
- Payment amount exceeds amount due (payments)
- Duplicate enrollment (same student + class)

#### 429 Too Many Requests

```json
{
  "error": "Too many requests. Please wait 60 seconds.",
  "retryAfter": 60
}
```

**Applies to:** Magic link authentication (3 requests/minute per IP/email)

#### 500 Internal Server Error

```json
{
  "error": "Failed to create student"
}
```

**Causes:**
- Database connection error
- Constraint violation
- Unexpected server error

**Solution:** Check server logs, contact support

---

## Business Logic Rules

### Class Capacity Management

**Rule:** Cannot enroll student if class is at full capacity.

**Implementation:**
1. Check current `enrolled_count` vs. `capacity`
2. If `enrolled_count >= capacity`, return 409 Conflict
3. On enrollment creation: increment `enrolled_count`
4. On enrollment deletion: decrement `enrolled_count`

**Error:**
```json
{
  "error": "Class is at full capacity"
}
```

---

### Invoice Payment Tracking

**Rule:** Invoice status automatically updates based on payments.

**Status Logic:**
```
if (amount_paid === 0) → status = 'pending'
else if (amount_paid < amount) → status = 'partial'
else if (amount_paid === amount) → status = 'paid'
```

**Auto-Calculated Fields:**
- `amount_paid` = sum of all payment.amount for this invoice
- `amount_due` = amount - amount_paid

---

### Amendment Auto-Application

**Rule:** EXTENSION amendments automatically update enrollment.end_date.

**Example:**
```json
POST /api/admin/enrollments/enrollment-123

{
  "type": "EXTENSION",
  "new_value": "2025-08-15"
}

// Automatically sets:
enrollment.end_date = "2025-08-15"
```

**Other amendment types (REDUCTION, LEVEL_CHANGE, TRANSFER) require manual application.**

---

### Soft Delete Behavior

**Rule:** DELETE operations set `deleted_at` timestamp instead of removing records.

**Implementation:**
- DELETE endpoint sets `deleted_at = new Date()`
- All queries include `WHERE deleted_at IS NULL`
- Soft-deleted records are excluded from lists, searches, counts

**Rationale:** Preserve audit trail, enable "undo", regulatory compliance

---

### Auto-Generated Codes

**Invoice Numbers:**
- Format: `INV-YYYY-NNNNNN`
- Example: `INV-2025-000001`
- Sequential per year
- Never reused

**Programme Codes:**
- First 3 letters of name, uppercase
- Example: "General English" → "GEN"
- Example: "IELTS Preparation" → "IEL"

**Course Codes:**
- Format: `{level}-{first 3 letters of name}`
- Example: { level: "B1", name: "General English" } → "B1-GEN"
- Example: { level: "C1", name: "Academic Writing" } → "C1-ACA"

---

### Overpayment Prevention

**Rule:** Cannot record payment exceeding invoice `amount_due`.

**Implementation:**
```
if (payment.amount > invoice.amount_due) {
  return 400 Bad Request: "Payment amount exceeds amount due"
}
```

**Rationale:** Prevents billing errors, ensures accurate reconciliation

---

## Appendix: Quick Reference

### All Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/students` | POST | Create student |
| `/api/admin/students` | GET | List students |
| `/api/admin/students/:id` | GET | Get student details |
| `/api/admin/students/:id` | PATCH | Update student |
| `/api/admin/students/:id` | DELETE | Delete student |
| `/api/admin/enrollments` | POST | Create enrollment |
| `/api/admin/enrollments` | GET | List enrollments |
| `/api/admin/enrollments/:id` | GET | Get enrollment details |
| `/api/admin/enrollments/:id` | POST | Create amendment |
| `/api/admin/enrollments/:id` | PATCH | Update enrollment |
| `/api/admin/enrollments/:id` | DELETE | Delete enrollment |
| `/api/admin/finance/invoices` | POST | Create invoice |
| `/api/admin/finance/invoices` | GET | List invoices |
| `/api/admin/finance/invoices/:id` | GET | Get invoice details |
| `/api/admin/finance/invoices/:id` | DELETE | Delete invoice |
| `/api/admin/finance/payments` | POST | Record payment |
| `/api/admin/finance/payments` | GET | List payments |
| `/api/admin/programmes` | POST | Create programme |
| `/api/admin/programmes` | GET | List programmes |
| `/api/admin/programmes/:id` | GET | Get programme details |
| `/api/admin/programmes/:id` | PATCH | Update programme |
| `/api/admin/programmes/:id` | DELETE | Delete programme |
| `/api/admin/courses` | POST | Create course |
| `/api/admin/courses` | GET | List courses |
| `/api/admin/courses/:id` | GET | Get course details |
| `/api/admin/courses/:id` | PATCH | Update course |
| `/api/admin/courses/:id` | DELETE | Delete course |
| `/api/admin/teachers` | GET | List teachers |
| `/api/admin/teachers/:id` | GET | Get teacher details |
| `/api/admin/search` | GET | Global search |
| `/api/admin/audit-log` | GET | List audit logs |
| `/api/admin/audit-log/:id` | GET | Get audit log details |

---

**Document Version:** 1.0
**Maintainer:** Development Team
**Support:** See Integration Guide for troubleshooting
