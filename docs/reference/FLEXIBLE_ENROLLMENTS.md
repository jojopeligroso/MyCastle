# Flexible Enrollment Durations - System Design

## Overview

The MyCastle system supports **flexible enrollment durations** where students can book courses for variable lengths of time, and amend their bookings (extend, shorten, transfer) as needed.

## Key Principle

> **Courses define STANDARD durations, but individual student enrollments can vary**

- Courses/Programmes have `duration_weeks` and `hours_per_week` as **default/recommended** values
- Each student enrollment can have its own `booked_weeks` and `expected_end_date`
- Students can extend, reduce, or transfer enrollments through an amendment workflow

---

## Data Model

### 1. Programmes & Courses (Templates)

**Purpose:** Define standard/default course structure

```typescript
programmes {
  id, name, code
  duration_weeks: 12        // Standard programme length
  hours_per_week: 15        // Standard contact hours
  levels: ["A1"..."C2"]     // CEFR levels offered
}

courses {
  id, name, code
  programme_id              // Links to programme
  cefr_level: "B1"          // Specific CEFR level
  duration_weeks: 12        // Default for this course
  hours_per_week: 15        // Default contact hours
}
```

**Note:** These are templates. Actual student bookings can differ.

---

### 2. Enrollments (Individual Student Bookings)

**Purpose:** Track each student's actual enrollment with flexible duration

```typescript
enrollments {
  // Core enrollment
  id, student_id, class_id
  enrollment_date           // When student enrolled

  // FLEXIBLE DURATION FIELDS (Migration 0008)
  expected_end_date         // When THIS student's booking ends
  booked_weeks              // How many weeks THIS student booked
  original_course_id        // Reference to course template

  // Amendment tracking
  is_amended: false         // Has enrollment been modified?
  extensions_count: 0       // Number of times extended

  // Status
  completion_date           // Actual completion (may differ from expected)
  status: 'active'          // active, completed, dropped
}
```

**Examples:**

```javascript
// Student A books standard 12-week course
{
  student_id: "...",
  class_id: "GE-B1-001",
  enrollment_date: "2025-01-20",
  expected_end_date: "2025-04-14",  // 12 weeks later
  booked_weeks: 12,
  original_course_id: "course-ge-b1-id"
}

// Student B books same course for 8 weeks (shorter)
{
  student_id: "...",
  class_id: "GE-B1-001",
  enrollment_date: "2025-01-20",
  expected_end_date: "2025-03-17",  // Only 8 weeks
  booked_weeks: 8,
  original_course_id: "course-ge-b1-id"
}

// Student C extends from 12 to 16 weeks
{
  student_id: "...",
  class_id: "GE-B1-001",
  enrollment_date: "2025-01-20",
  expected_end_date: "2025-05-12",  // Extended to 16 weeks
  booked_weeks: 16,
  original_course_id: "course-ge-b1-id",
  is_amended: true,
  extensions_count: 1
}
```

---

### 3. Enrollment Amendments (Change History)

**Purpose:** Track all changes to enrollments with approval workflow

```typescript
enrollment_amendments {
  id, enrollment_id

  // Amendment details
  amendment_type: 'extension' | 'reduction' | 'transfer' | 'level_change' | 'cancellation'
  amendment_date

  // Before & after values
  previous_end_date
  previous_weeks
  previous_class_id

  new_end_date
  new_weeks
  new_class_id

  // Financial
  fee_adjustment: 150.00      // Additional fee for extension

  // Approval workflow
  status: 'pending' | 'approved' | 'rejected'
  requested_by: user_id       // Who requested
  approved_by: user_id        // Admin who approved
  reason: "Student requested..."
}
```

**Workflow:**
1. **Request** - Student or admin creates amendment (status: `pending`)
2. **Review** - Admin reviews request
3. **Approve/Reject** - Admin approves → enrollment automatically updated via trigger
4. **Applied** - Enrollment's `expected_end_date`, `booked_weeks`, `is_amended` updated

---

## Common Scenarios

### Scenario 1: Extension

**Student wants to extend from 12 to 16 weeks**

```javascript
// 1. Create amendment
POST /api/admin/enrollments/{id}/amendments
{
  amendment_type: "extension",
  previous_weeks: 12,
  previous_end_date: "2025-04-14",
  new_weeks: 16,
  new_end_date: "2025-05-12",
  fee_adjustment: 600.00,  // 4 weeks @ £150/week
  reason: "Student requested extension to improve proficiency"
}

// 2. Admin approves
PATCH /api/admin/enrollments/amendments/{amendment_id}
{
  status: "approved",
  approved_by: admin_user_id
}

// 3. Trigger automatically updates enrollment:
// - expected_end_date → "2025-05-12"
// - booked_weeks → 16
// - is_amended → true
// - extensions_count → 1
```

### Scenario 2: Reduction/Early Completion

**Student wants to finish early (reduce from 12 to 8 weeks)**

```javascript
{
  amendment_type: "reduction",
  previous_weeks: 12,
  new_weeks: 8,
  new_end_date: "2025-03-17",  // 4 weeks earlier
  fee_adjustment: -600.00,     // Refund for 4 weeks
  reason: "Student found employment, ending course early"
}
```

### Scenario 3: Transfer/Level Change

**Student progresses to next level mid-enrollment**

```javascript
{
  amendment_type: "level_change",
  previous_class_id: "GE-B1-001",
  new_class_id: "GE-B2-001",
  reason: "Student progressed faster than expected, moving to B2"
}
```

---

## Database Features

### Automatic Updates (Trigger)

When amendment status changes to `approved`, a trigger automatically updates the enrollment:

```sql
CREATE TRIGGER enrollment_amendment_approved
  AFTER UPDATE ON enrollment_amendments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_amended_status();
```

This ensures:
- Enrollment data always reflects approved changes
- Complete audit trail maintained
- No manual updates needed

### Data Migration

Existing enrollments without `expected_end_date` are backfilled:

```sql
-- Set expected_end_date based on class end_date
UPDATE enrollments e
SET expected_end_date = c.end_date,
    booked_weeks = EXTRACT(EPOCH FROM (c.end_date - c.start_date)) / (7 * 24 * 60 * 60)
FROM classes c
WHERE e.class_id = c.id;
```

---

## UI/UX Implications

### Student Registry View

**Enrollment display should show:**
- ✅ Original course duration (from course template)
- ✅ Student's booked duration (if different)
- ✅ Amendment indicators (extended/reduced icons)
- ✅ Expected vs actual end dates

**Example UI:**

```
Student: Maria Garcia
Enrollment: General English B1
  Course Standard: 12 weeks
  Maria's Booking: 16 weeks ⬆️ (Extended)
  Started: 2025-01-20
  Expected End: 2025-05-12
  Amendments: 1 extension
```

### Course History Tab

Show full amendment history:

```
Enrollment Timeline
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jan 20, 2025: Enrolled (12 weeks)
Mar 15, 2025: Extended to 16 weeks (+£600)
May 12, 2025: Expected completion
```

### Amendment Request Form

Fields needed:
- Amendment type (dropdown)
- New end date (date picker)
- New duration in weeks (number input)
- Reason (textarea, required)
- Fee adjustment (auto-calculated or manual)

---

## API Endpoints Needed

### Enrollment Amendments

```typescript
// Create amendment request
POST /api/admin/enrollments/{enrollmentId}/amendments
Body: {
  amendment_type, new_end_date, new_weeks,
  new_class_id?, reason, fee_adjustment
}

// List amendments for enrollment
GET /api/admin/enrollments/{enrollmentId}/amendments

// Approve/reject amendment
PATCH /api/admin/enrollments/amendments/{amendmentId}
Body: { status: 'approved' | 'rejected', approved_by }

// Get pending amendments (admin dashboard)
GET /api/admin/amendments?status=pending
```

---

## Financial Integration

### Fee Adjustments

Amendments can have financial impact:

- **Extension:** Additional fees (positive `fee_adjustment`)
- **Reduction:** Refund (negative `fee_adjustment`)
- **Transfer:** May have difference in course fees

**Integration points:**
1. Calculate fee adjustment when creating amendment
2. Create invoice/credit note when amendment approved
3. Track in student financial account
4. Show in student billing history

---

## Compliance & Reporting

### Visa Students

**Important:** Visa regulations may limit enrollment changes

- Track `original_course_id` for visa documentation
- Flag amendments that might affect visa status
- Generate reports for compliance:
  - Students who extended (may need visa extension)
  - Students who reduced (may affect visa validity)

### Reporting Queries

```sql
-- Students with amended enrollments
SELECT * FROM enrollments WHERE is_amended = true;

-- Recent extensions (last 30 days)
SELECT * FROM enrollment_amendments
WHERE amendment_type = 'extension'
  AND amendment_date > CURRENT_DATE - INTERVAL '30 days';

-- Financial impact of amendments
SELECT
  SUM(fee_adjustment) as total_adjustment,
  COUNT(*) as amendment_count
FROM enrollment_amendments
WHERE status = 'approved';
```

---

## Implementation Checklist

- ✅ Migration 0008 created (`0008_add_enrollment_flexibility.sql`)
- ✅ Drizzle schema updated (`academic.ts`)
- ✅ `enrollmentAmendments` table defined
- ⏳ Server actions for amendments (Phase 3.5 - to be added)
- ⏳ UI components for amendment workflow (Phase 4)
- ⏳ Financial integration (invoicing)
- ⏳ Compliance reports

---

## Next Steps

1. **Run migration 0008** when ready
2. **Add server actions** for enrollment amendments:
   - `createEnrollmentAmendment()`
   - `approveEnrollmentAmendment()`
   - `getEnrollmentAmendments()`
3. **Add UI in CourseHistoryTab** to show amendments
4. **Create amendment request form** (admin feature)
5. **Integrate with invoicing** for fee adjustments

---

## Summary

✅ **Courses = Templates** with standard durations
✅ **Enrollments = Actual Bookings** with flexible durations
✅ **Amendments = Change History** with approval workflow
✅ **Automatic Updates** via database triggers
✅ **Full Audit Trail** of all changes
✅ **Financial Tracking** of adjustments

This system provides complete flexibility while maintaining data integrity and audit compliance.
