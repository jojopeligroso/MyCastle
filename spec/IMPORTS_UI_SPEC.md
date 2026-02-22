# Imports UI Spec (MVP) - File A "classes.xlsx" Only

## Table of Contents

1. [Overview](#1-overview)
2. [Scope and Non-Scope](#2-scope-and-non-scope)
3. [Data and File Contract (File A vs File B)](#3-data-and-file-contract-file-a-vs-file-b)
4. [Route and Navigation Model](#4-route-and-navigation-model)
5. [State Machine and Transitions](#5-state-machine-and-transitions)
6. [Screen 1: Imports List](#6-screen-1-imports-list)
7. [Screen 2: Batch Summary](#7-screen-2-batch-summary)
8. [Screen 3: Row Resolution](#8-screen-3-row-resolution)
9. [Global Rules (Validation, Gating, Auditability)](#9-global-rules-validation-gating-auditability)
10. [Copy Deck (Exact UI Text)](#10-copy-deck-exact-ui-text)
11. [Acceptance Criteria Checklist](#11-acceptance-criteria-checklist)

---

## 1. Overview

This spec defines a **3-screen admin workflow** to import enrolment-related data using **File A: classes.xlsx** (MVP first), producing an automatic proposed change set that requires explicit admin confirmation before any canonical writes.

### Key Principles

- **Low complexity, deterministic behaviour**
- **Import is authoritative initially**, with an explicit approval gate
- **Only whitelisted columns are ingested**; all others ignored and reported
- **Single worksheet only**: user must upload only the one relevant week (explicit red warning)
- **Ambiguity is never guessed**: it is queued for manual resolution

---

## 2. Scope and Non-Scope

### 2.1 In Scope (MVP)

| Feature | Description |
|---------|-------------|
| File A only | `classes.xlsx` |
| Three screens only | Imports list, Batch summary, Row resolution |
| Automatic pipeline | Upload → parse → stage → propose happens automatically |
| Review outcomes | Confirm, Deny, Needs review (with email escalation) |
| Resolution actions | Exclude invalid rows, Resolve ambiguous rows (link to candidate OR treat as new) |
| Apply | Apply changes transactionally |

### 2.2 Out of Scope (Explicitly Deferred)

| Feature | Reason |
|---------|--------|
| File B import | Exists but not built in MVP |
| Multi-worksheet ingestion | Single worksheet enforced |
| Heuristic/probabilistic matching | Ambiguity requires manual resolution |
| Editing staged row values in-app | Corrections require re-upload or exclusion |
| Fine-grained per-row approvals | Batch-level approval only; row-level actions are resolution/exclusion |

---

## 3. Data and File Contract (File A vs File B)

### 3.1 File Definitions

| File | Description | MVP Status |
|------|-------------|------------|
| **File A** | `classes.xlsx` - Contains weekly class/enrolment instance rows for one week only. Exactly one worksheet must be uploaded (the relevant week). | **Supported** |
| **File B** | (placeholder) - Exists as a concept; not supported in UI except as "Coming soon" | Deferred |

### 3.2 Worksheet Rule (MUST Be Enforced)

#### Requirement

The uploaded workbook must contain **exactly 1 worksheet**.

#### Behaviour

If `worksheet_count != 1`:
- **Hard fail** the batch parse with a clear error
- Status: `FAILED_VALIDATION`
- User action: fix file (export/duplicate only relevant week as a single sheet) and re-upload

#### UI Requirement

Show a **red warning** in the upload UI:

> **WARNING:** Upload ONE worksheet only (the week you want to assess). Do not upload a multi-sheet workbook.

### 3.3 Column Relevance Rule (MUST Be Explicit)

#### Requirement

Only a fixed set of columns is relevant for MVP processing. All other columns must be ignored.

#### Implementation Requirement

- Prefer **header-name whitelist** over positional indices
- If required headers missing → invalid row or parse fail (see [9.1](#91-worksheet-enforcement-hard-fail))

#### Whitelisted Columns (MVP)

| Column Name | Required | Description |
|-------------|----------|-------------|
| `Student Name` | Yes | Student identifier |
| `Start Date` | Yes | Enrolment start date |
| `Class Name` | Yes | Target class |
| `End Date` | Yes | Enrolment end date |
| `XXX Register Flag` | Yes | Registration flag |

#### UI Requirement

Before upload, show:
- "Only these columns are used: [list]"
- "Extra columns are ignored."

---

## 4. Route and Navigation Model

### 4.1 Primary Route

```
/imports/enrolment-uploads
```

### 4.2 Navigation Pattern

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Screen 1       │     │  Screen 2       │     │  Screen 3       │
│  Imports List   │────▶│  Batch Summary  │────▶│  Row Resolution │
│  (default)      │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              ◀────────────────────────┘
                                    (Back link)
```

### 4.3 Navigation Rules

| From | To | Trigger |
|------|----|---------|
| Imports List | Batch Summary | Click batch row |
| Batch Summary | Row Resolution | Click "Resolve issues" |
| Row Resolution | Batch Summary | Back link |
| Batch Summary | Imports List | Back link |

---

## 5. State Machine and Transitions

### 5.1 Batch Status Enum (Minimal)

| Status | Description | Terminal |
|--------|-------------|----------|
| `RECEIVED` | File uploaded | No |
| `PARSING` | Processing file | No |
| `PROPOSED_OK` | No gating issues | No |
| `PROPOSED_NEEDS_REVIEW` | Has invalid/ambiguous rows | No |
| `ESCALATED` | Needs review email sent | No |
| `READY_TO_APPLY` | Gating cleared and confirm selected | No |
| `APPLYING` | Transaction in progress | No |
| `APPLIED` | Successfully applied | **Yes** |
| `REJECTED` | Denied by admin | **Yes** |
| `FAILED_VALIDATION` | File validation failed (e.g., multi-worksheet) | **Yes** |
| `FAILED_SYSTEM` | System error, rollback guaranteed | **Yes** |

### 5.2 Gating Flags (Derived)

| Flag | Condition |
|------|-----------|
| `invalid_rows > 0` | Rows with validation errors |
| `ambiguous_rows > 0` | Rows with multiple candidate matches |

### 5.3 State Transition Diagram

```
                    ┌──────────────┐
                    │   RECEIVED   │
                    └──────┬───────┘
                           │ upload complete
                           ▼
                    ┌──────────────┐
                    │   PARSING    │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌───────────┐ ┌──────────────────────┐
    │ FAILED_      │ │PROPOSED_OK│ │PROPOSED_NEEDS_REVIEW │
    │ VALIDATION   │ └─────┬─────┘ └──────────┬───────────┘
    └──────────────┘       │                  │
         (terminal)        │                  │
                           │         ┌────────┴────────┐
                           │         │                 │
                           │         ▼                 ▼
                           │   ┌───────────┐    ┌───────────┐
                           │   │ ESCALATED │    │ (resolve) │
                           │   └─────┬─────┘    └─────┬─────┘
                           │         │                │
                           │         └────────┬───────┘
                           │                  │
                           ▼                  ▼
                    ┌──────────────────────────────┐
                    │       READY_TO_APPLY         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │   APPLYING   │
                            └──────┬───────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
             ┌──────────────┐             ┌──────────────┐
             │   APPLIED    │             │ FAILED_SYSTEM│
             └──────────────┘             └──────────────┘
               (terminal)                   (terminal)


    * REJECTED can be reached from any non-terminal state (except APPLYING)
```

### 5.4 Transition Rules (Deterministic)

#### Upload Phase

| Current State | Event | Next State |
|---------------|-------|------------|
| (none) | File uploaded | `RECEIVED` |
| `RECEIVED` | Parse starts | `PARSING` |

#### Parse/Stage/Propose Outcome

| Condition | Next State |
|-----------|------------|
| `worksheet_count != 1` | `FAILED_VALIDATION` |
| Parse fails unexpectedly | `FAILED_SYSTEM` |
| `invalid_rows == 0 AND ambiguous_rows == 0` | `PROPOSED_OK` |
| `invalid_rows > 0 OR ambiguous_rows > 0` | `PROPOSED_NEEDS_REVIEW` |

#### Review Triage

| Action | Condition | Next State |
|--------|-----------|------------|
| Deny | Any non-terminal (except `APPLYING`) | `REJECTED` |
| Needs review + email sent | - | `ESCALATED` |
| Confirm | Gating cleared | `READY_TO_APPLY` |
| Confirm | Gating NOT cleared | Remain `PROPOSED_NEEDS_REVIEW` |

#### Resolution Actions

| Condition | Next State |
|-----------|------------|
| `invalid_rows == 0 AND ambiguous_rows == 0 AND review_outcome == CONFIRM` | `READY_TO_APPLY` |
| `invalid_rows == 0 AND ambiguous_rows == 0 AND review_outcome != CONFIRM` | `PROPOSED_OK` |

#### Apply Phase

| Current State | Event | Next State |
|---------------|-------|------------|
| `READY_TO_APPLY` | Apply clicked | `APPLYING` |
| `APPLYING` | Success | `APPLIED` |
| `APPLYING` | Failure | `FAILED_SYSTEM` (rollback) |

---

## 6. Screen 1: Imports List

### 6.1 Purpose

Show all import batches and their status; allow creating a new upload batch for File A `classes.xlsx`.

### 6.2 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Imports                                                             │
│ Enrolment uploads                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                          [Upload classes.xlsx]      │
├─────────────────────────────────────────────────────────────────────┤
│ Batch ID │ Uploaded at │ Uploaded by │ Status │ Counts │ Outcome   │
├──────────┼─────────────┼─────────────┼────────┼────────┼───────────┤
│ B-001    │ 2026-02-22  │ admin@...   │ APPLIED│ 45/2/0 │ Confirm   │
│ B-002    │ 2026-02-21  │ admin@...   │ NEEDS..│ 30/5/3 │ Pending   │
│ ...      │ ...         │ ...         │ ...    │ ...    │ ...       │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Components

#### A) Header

| Element | Value |
|---------|-------|
| Title | "Imports" |
| Sub-title | "Enrolment uploads" |

#### B) Primary Action

| Element | Details |
|---------|---------|
| Button | "Upload classes.xlsx" |
| Icon | Upload icon |
| Style | Primary button |

#### C) Batches Table

| Column | Description |
|--------|-------------|
| Batch ID | Unique identifier (e.g., `B-001`) |
| Uploaded at | Timestamp |
| Uploaded by | Admin email/name |
| File type | Always "classes.xlsx" in MVP |
| Status | Badge with status enum value |
| Summary counts | Format: `New / Updates / Invalid / Ambiguous` |
| Review outcome | Confirm / Deny / Needs review / Blank |

#### D) Row Actions

| Action | Trigger |
|--------|---------|
| Open Batch Summary | Click row |

### 6.4 Button Rules

| Button | Enabled When |
|--------|--------------|
| "Upload classes.xlsx" | User has admin role |

### 6.5 Empty State

| Element | Value |
|---------|-------|
| Message | "No uploads yet." |
| CTA | "Upload classes.xlsx" button |

---

## 7. Screen 2: Batch Summary

### 7.1 Purpose

Single screen to:
1. Upload File A (new batch)
2. View batch-level summary
3. Choose triage outcome (Confirm / Deny / Needs review)
4. Navigate to row resolution if needed
5. Apply when eligible

### 7.2 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Imports                                                   │
│                                                                     │
│ Batch Summary: B-002                                                │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 1: UPLOAD PANEL (for new batch)                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ WARNING (red): Upload ONE worksheet only (the week you      │ │
│ │ want to assess). Do not upload a multi-sheet workbook.         │ │
│ │                                                                 │ │
│ │ Only these columns are used:                                    │ │
│ │ • Student Name  • Start Date  • Class Name                      │ │
│ │ • End Date      • XXX Register Flag                             │ │
│ │ Extra columns are ignored.                                      │ │
│ │                                                                 │ │
│ │ [Choose file...]              [Upload]                          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 2: BATCH OVERVIEW                                           │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Batch ID: B-002           Status: [PROPOSED_NEEDS_REVIEW]       │ │
│ │ Uploaded by: admin@ex.com                                       │ │
│ │ Uploaded at: 2026-02-22 14:30                                   │ │
│ │ File type: classes.xlsx                                         │ │
│ │                                                                 │ │
│ │ ┌─────────┬─────────┬─────────┬─────────┬─────────┬───────────┐ │ │
│ │ │ Total   │ Valid   │ Invalid │ Ambig.  │ New     │ Updates   │ │ │
│ │ │   45    │   38    │    5    │    2    │   10    │    28     │ │ │
│ │ └─────────┴─────────┴─────────┴─────────┴─────────┴───────────┘ │ │
│ │                                                                 │ │
│ │ ⚠️ This batch requires resolution before it can be applied.    │ │
│ │                                                                 │ │
│ │ Ignored columns: [ColumnX, ColumnY] (informational)             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 3: TRIAGE CONTROLS                                          │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Review Outcome:                                                 │ │
│ │ ○ Confirm   ○ Deny   ● Needs review                             │ │
│ │                                                                 │ │
│ │ Escalate to: [Admin dropdown ▼]    [Send email]                 │ │
│ │                                                                 │ │
│ │ Comment: [________________________________]                     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ SECTION 4: ACTIONS                                                  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [Resolve issues (7)]                    [Apply changes]         │ │
│ │      (enabled)                            (disabled)            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Section 1: Upload Panel (File A Only)

#### Inputs

| Element | Details |
|---------|---------|
| File picker | Label: "Select file", Accept: `.xlsx` |
| File type | Fixed: `classes.xlsx` (label only) |

#### Pre-Upload Warnings (MANDATORY)

| Warning Type | Style | Text |
|--------------|-------|------|
| Worksheet warning | **Red text** | "WARNING: Upload ONE worksheet only (the week you want to assess). Do not upload a multi-sheet workbook." |
| Column relevance | Normal text | "Only these columns are used: [Student Name], [Start Date], [Class Name], [End Date], [XXX Register Flag]. Extra columns are ignored." |

#### Validation Rules (Client-Side Pre-Check)

| Check | Action |
|-------|--------|
| Extension is `.xlsx` | Block upload if not |
| Worksheet count == 1 | If client-side inspection possible, reject early; else warn and let server reject |

#### Upload Action

| Element | Details |
|---------|---------|
| Button | "Upload" |
| Enabled | Only when file is selected |

#### Post-Upload UX

| State | Display |
|-------|---------|
| Uploading | Progress indicator |
| Parsing | "Parsing..." message |
| Complete | Auto-open new batch summary |

### 7.4 Section 2: Batch Overview (Read-Only)

#### Fields

| Field | Description |
|-------|-------------|
| Batch ID | Unique identifier |
| Uploaded by | Admin email |
| Uploaded at | Timestamp |
| File type | "classes.xlsx" |
| Status | Badge with current status |

#### Counts Display

| Metric | Description |
|--------|-------------|
| Total rows | All rows in file |
| Valid | Rows passing validation |
| Invalid | Rows with validation errors |
| Ambiguous | Rows with multiple candidate matches |
| New inserts | Proposed new enrolments |
| Updates | Proposed updates to existing |
| No-ops | No changes needed |
| Excluded | Manually excluded rows |

#### Conditional Messages

| Condition | Message |
|-----------|---------|
| Status in `PROPOSED_NEEDS_REVIEW` or `ESCALATED` | Callout: "This batch requires resolution before it can be applied." |
| Ignored columns present | Info: "Ignored columns: X, Y, Z" |

### 7.5 Section 3: Triage Controls

#### Control Group

| Element | Options |
|---------|---------|
| Radio group | Confirm, Deny, Needs review |
| Comment field | Optional text area |

#### Needs Review Escalation

| Element | Details |
|---------|---------|
| Dropdown | "Escalate to" (list of admins) |
| Button | "Send email" |
| Timestamp | "Sent at: [time]" (after send) |

#### Enable/Disable Rules

| Control | Enabled When |
|---------|--------------|
| Triage controls | Status in: `PROPOSED_OK`, `PROPOSED_NEEDS_REVIEW`, `ESCALATED`, `READY_TO_APPLY` |
| Deny | Status NOT in `APPLYING`, `APPLIED`, `REJECTED` |
| Send email | `review_outcome == NEEDS_REVIEW` AND `escalated_to` selected |

#### Action Effects

| Action | Effect |
|--------|--------|
| **Deny** | Modal confirmation → Set status `REJECTED` |
| **Needs review + Send email** | Send email with batch link, counts, uploader, comment → Set status `ESCALATED` |
| **Confirm** (gating cleared) | Set status `READY_TO_APPLY` |
| **Confirm** (gating NOT cleared) | Remain `PROPOSED_NEEDS_REVIEW`, show inline error |

### 7.6 Section 4: Actions

#### A) "Resolve issues" Button

| Attribute | Value |
|-----------|-------|
| Navigates to | Screen 3 (Row Resolution) |
| Badge | Count of `invalid_rows + ambiguous_rows` |
| Enabled | `invalid_rows > 0 OR ambiguous_rows > 0` |
| Disabled | No issues to resolve |

#### B) "Apply changes" Button

| Attribute | Value |
|-----------|-------|
| Style | Primary button |
| Requires modal | Yes (confirmation) |

| Enabled When (ALL must be true) |
|--------------------------------|
| `status == READY_TO_APPLY` |
| `triage == Confirm` |
| `invalid_rows == 0` |
| `ambiguous_rows == 0` |

#### Apply Flow

```
Click "Apply changes"
        │
        ▼
┌───────────────────┐
│ Confirmation      │
│ Modal             │
│ [Cancel] [Apply]  │
└─────────┬─────────┘
          │ Apply
          ▼
    Status: APPLYING
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
 SUCCESS     FAILURE
    │           │
    ▼           ▼
 APPLIED    FAILED_SYSTEM
(success    (error banner,
 banner)    rollback)
```

---

## 8. Screen 3: Row Resolution

### 8.1 Purpose

Allow resolving **only** the rows that block apply:
- **Invalid rows** → Exclude
- **Ambiguous rows** → Link to candidate OR treat as new

**No other editing allowed in MVP.**

### 8.2 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to Batch Summary                                             │
│                                                                     │
│ Row Resolution: B-002                                               │
├─────────────────────────────────────────────────────────────────────┤
│ FILTERS                                                             │
│ [Invalid (5)] [Ambiguous (2)] [Excluded (0)] [All]                  │
├─────────────────────────────────────────────────────────────────────┤
│ ROW LIST                                          │ ROW DETAIL      │
│ ┌───────────────────────────────────────────────┐ │ ┌─────────────┐ │
│ │ Row │ Student Name │ Start Date │ Status      │ │ │ Row #12     │ │
│ │ #12 │ John Smith   │ 2026-03-01 │ [INVALID]   │ │ │             │ │
│ │ #15 │ Jane Doe     │ 2026-03-01 │ [INVALID]   │ │ │ Validation  │ │
│ │ #23 │ Bob Wilson   │ 2026-03-01 │ [AMBIGUOUS] │ │ │ Errors:     │ │
│ │ ... │ ...          │ ...        │ ...         │ │ │ • Missing   │ │
│ └───────────────────────────────────────────────┘ │ │   End Date  │ │
│                                                   │ │ • Invalid   │ │
│                                                   │ │   date fmt  │ │
│                                                   │ │             │ │
│                                                   │ │ Raw Values: │ │
│                                                   │ │ Name: John  │ │
│                                                   │ │ Start: 3/1  │ │
│                                                   │ │ End: (null) │ │
│                                                   │ │             │ │
│                                                   │ │ [Exclude    │ │
│                                                   │ │  row]       │ │
│                                                   │ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Components

#### A) Header

| Element | Value |
|---------|-------|
| Title | "Row Resolution" |
| Back link | "← Back to Batch Summary" |

#### B) Filters

| Filter | Description |
|--------|-------------|
| Invalid | Rows with validation errors |
| Ambiguous | Rows with multiple candidates |
| Excluded | Manually excluded rows |
| All | All rows (optional) |

#### C) Row List

| Column | Description |
|--------|-------------|
| Row | Row number from XLSX |
| Student Name | Raw value (+ normalised optional) |
| Start Date | Parsed date |
| Status | Badge: `INVALID` / `AMBIGUOUS` / `EXCLUDED` |

#### D) Row Detail Panel

Opens on row click, shows details based on row type.

### 8.4 Invalid Row Resolution

#### Row Detail Contents

| Section | Content |
|---------|---------|
| Validation errors | Human-readable list of issues |
| Raw values | Original values from required fields |

#### Actions

| Button | "Exclude row" |
|--------|---------------|
| Style | Secondary/destructive |

#### Enable Rule

| Enabled When |
|--------------|
| Batch status in `PROPOSED_NEEDS_REVIEW` or `ESCALATED` |

| Disabled When |
|---------------|
| Status is `READY_TO_APPLY`, `APPLYING`, `APPLIED`, `REJECTED` |

#### Effect

| Action | Result |
|--------|--------|
| Exclude | `row_status → EXCLUDED` |
| | `invalid_rows` decremented |
| | Proposed change removed or marked excluded |

### 8.5 Ambiguous Row Resolution

#### Row Detail Contents

| Section | Content |
|---------|---------|
| Staged row values | Parsed values from upload |
| Candidate matches | List of potential matches |

#### Candidate Card Details

| Field | Description |
|-------|-------------|
| Candidate enrolment ID | Unique identifier |
| Student display name | Full name |
| Start date | Enrolment start |
| Current class | Class name |
| Current end date | Enrolment end |
| Current XXX flag | Flag value |
| Last updated | Timestamp |

#### Actions

| Button | Description |
|--------|-------------|
| "Link to selected candidate" | Requires selecting exactly 1 candidate |
| "Treat as new enrolment" | Creates INSERT instead of UPDATE |

#### Enable Rule

| Enabled When |
|--------------|
| Batch status in `PROPOSED_NEEDS_REVIEW` or `ESCALATED` |

#### Effects

| Action | Result |
|--------|--------|
| Link to candidate | Ambiguity resolved; proposed_change becomes `UPDATE` or `NOOP` based on diffs |
| Treat as new | Ambiguity resolved; proposed_change becomes `INSERT` (may trigger provisional student) |

### 8.6 Completion and Auto-State Updates

#### After Each Resolution Action

1. Recompute counts immediately (invalidate cached summary)
2. Check if all blocking issues resolved:

| Condition | Result |
|-----------|--------|
| `invalid_rows == 0 AND ambiguous_rows == 0 AND triage == Confirm` | Status → `READY_TO_APPLY` |
| `invalid_rows == 0 AND ambiguous_rows == 0 AND triage != Confirm` | Status → `PROPOSED_OK` |

3. Show banner: "All blocking issues resolved. Return to Batch summary to apply."

---

## 9. Global Rules (Validation, Gating, Auditability)

### 9.1 Worksheet Enforcement (Hard Fail)

| Condition | Action |
|-----------|--------|
| `workbook.worksheet_count != 1` | Batch status → `FAILED_VALIDATION` |
| | No staging or proposals generated |
| | UI shows: "Invalid file: workbook must contain exactly one worksheet." |

### 9.2 Column Whitelist Enforcement

| Rule | Behaviour |
|------|-----------|
| System ingests only whitelisted headers | Other columns ignored |
| System records unexpected headers | For visibility/debugging |

#### UI Behaviour

| Location | Display |
|----------|---------|
| Batch summary | "Ignored columns: X, Y, Z" (if any) |
| Gating | Informational only; not blocking |

### 9.3 Required Headers Policy

| Approach | Behaviour |
|----------|-----------|
| **MVP Recommendation** | Missing required headers → `FAILED_VALIDATION` |
| Alternative | Missing headers → all rows marked invalid |

**Rationale:** Fail fast prevents silent data corruption.

### 9.4 No Canonical Writes Until Apply

| Rule | Description |
|------|-------------|
| Staging only | Until `APPLIED`, canonical enrolment tables are untouched |
| Rollback guarantee | Any apply failure results in rollback and `FAILED_SYSTEM` |
| Atomicity | Apply is a single transaction; partial applies not possible |

---

## 10. Copy Deck (Exact UI Text)

### 10.1 Upload Panel

#### Red Warning (MANDATORY)

```
WARNING: Upload ONE worksheet only (the week you want to assess).
Do not upload a multi-sheet workbook.
```

#### Column Relevance Note

```
Only the following columns are used: [Student Name], [Start Date],
[Class Name], [End Date], [XXX Register Flag].
Extra columns are ignored.
```

### 10.2 Batch Summary

#### Gating Callout

```
This batch cannot be applied until all invalid and ambiguous rows
are resolved or excluded.
```

#### Confirm Blocked Message

```
Confirm selected, but apply is blocked.
Resolve invalid and ambiguous rows first.
```

### 10.3 Escalation

#### Email Sent Confirmation

```
An email has been sent to {AdminName} with a link to review this batch.
```

### 10.4 Validation Errors

#### Multi-Worksheet Error

```
Invalid file: workbook must contain exactly one worksheet.
```

#### Missing Required Headers

```
Invalid file: missing required columns: {column_list}.
```

### 10.5 Success States

#### All Issues Resolved

```
All blocking issues resolved. Return to Batch summary to apply.
```

#### Apply Success

```
Changes applied successfully. {X} enrolments created, {Y} updated.
```

---

## 11. Acceptance Criteria Checklist

### 11.1 Upload and Validation

- [ ] User can upload File A `.xlsx`
- [ ] System rejects any workbook with `worksheet_count != 1` (`FAILED_VALIDATION`)
- [ ] System shows red warning before upload
- [ ] System whitelists columns and ignores all others
- [ ] Batch summary lists ignored columns (if present)
- [ ] Missing required headers causes `FAILED_VALIDATION`

### 11.2 Automatic Proposal

- [ ] Proposal is generated automatically after parse
- [ ] Batch status is `PROPOSED_OK` iff `invalid == 0` and `ambiguous == 0`
- [ ] Batch status is `PROPOSED_NEEDS_REVIEW` iff `invalid > 0` or `ambiguous > 0`
- [ ] Counts are accurately computed and displayed

### 11.3 Three-Screen Navigation

- [ ] Imports list → Batch summary → Row resolution only
- [ ] No additional screens required for core workflow
- [ ] Back navigation works correctly
- [ ] URL reflects current batch (for direct linking)

### 11.4 Triage and Escalation

- [ ] Confirm / Deny / Needs review present on Batch summary
- [ ] Needs review requires selecting an admin
- [ ] Needs review sends an email with batch link
- [ ] Deny is terminal and applies nothing
- [ ] Deny requires confirmation modal
- [ ] Email can be re-sent (idempotent)

### 11.5 Resolution

- [ ] Invalid rows can only be excluded (no inline editing)
- [ ] Ambiguous rows can be linked to candidate OR treated as new
- [ ] Resolving updates counts immediately
- [ ] Status auto-updates when all issues resolved
- [ ] Resolution actions disabled in terminal states

### 11.6 Apply

- [ ] Apply button disabled unless `READY_TO_APPLY` AND `triage == Confirm` AND `invalid == 0` AND `ambiguous == 0`
- [ ] Apply requires confirmation modal
- [ ] Apply is transactional (all or nothing)
- [ ] Success shows confirmation with counts
- [ ] Failure shows error and sets `FAILED_SYSTEM`

### 11.7 Auditability

- [ ] Batch tracks `created_by`, `created_at`
- [ ] Apply tracks actor and timestamp
- [ ] Escalation tracks recipient and sent time
- [ ] All state transitions are logged

---

## Appendix A: Database Schema (UI-Relevant)

### upload_batch

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| file_type | ENUM | "classes" |
| created_by | UUID | Admin user ID |
| created_at | TIMESTAMP | Upload time |
| status | ENUM | See State Machine |
| total_rows | INT | Total rows parsed |
| valid_rows | INT | Rows passing validation |
| invalid_rows | INT | Rows with errors |
| ambiguous_rows | INT | Rows with multiple matches |
| new_rows | INT | Proposed inserts |
| update_rows | INT | Proposed updates |
| noop_rows | INT | No changes needed |
| excluded_rows | INT | Manually excluded |
| review_outcome | ENUM | CONFIRM / DENY / NEEDS_REVIEW / NULL |
| review_comment | TEXT | Optional |
| escalated_to_admin_id | UUID | Optional |
| escalated_at | TIMESTAMP | Optional |

### stg_row (Staged Rows)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | FK to upload_batch |
| row_number | INT | Original XLSX row |
| row_status | ENUM | VALID / INVALID / AMBIGUOUS / EXCLUDED |
| raw_data | JSONB | Original values |
| parsed_data | JSONB | Normalised values |
| validation_errors | JSONB | List of errors |
| match_candidates | JSONB | For ambiguous rows |

### proposed_change

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| batch_id | UUID | FK to upload_batch |
| stg_row_id | UUID | FK to stg_row |
| action | ENUM | INSERT / UPDATE / NOOP / NEEDS_RESOLUTION |
| target_enrolment_id | UUID | For UPDATE, NULL for INSERT |
| diff | JSONB | Changed fields only |

---

## Appendix B: API Endpoints (Reference)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/imports/batches` | GET | List all batches |
| `/api/imports/batches` | POST | Create new batch (upload) |
| `/api/imports/batches/:id` | GET | Get batch details |
| `/api/imports/batches/:id/triage` | POST | Set review outcome |
| `/api/imports/batches/:id/escalate` | POST | Send escalation email |
| `/api/imports/batches/:id/apply` | POST | Apply changes |
| `/api/imports/batches/:id/rows` | GET | List staged rows |
| `/api/imports/batches/:id/rows/:rowId/exclude` | POST | Exclude row |
| `/api/imports/batches/:id/rows/:rowId/resolve` | POST | Resolve ambiguous row |

---

## Appendix C: Supabase Integration & Testing

### C.1 Database Configuration

The Imports UI requires proper Supabase connection with RLS session variable support.

| Configuration | Requirement |
|--------------|-------------|
| Connection mode | **Session Mode Pooler (port 5432)** - NOT Transaction Mode (port 6543) |
| Environment variable | `DIRECT_URL` must be set with Session Mode connection string |
| RLS context | Must support `SET app.user_email`, `SET app.is_super_admin`, `SET app.tenant_id` |

#### Critical Requirement

The database connection **must** preserve session variables across queries within a request. This is required for:
- Row-Level Security (RLS) policy enforcement
- Multi-tenant data isolation
- Admin-only access to import tables

### C.2 Migration Requirements

| Migration | File | Purpose |
|-----------|------|---------|
| FRESH_0020_imports.sql | `app/migrations/FRESH_0020_imports.sql` | Creates `upload_batches`, `stg_rows`, `proposed_changes` tables with RLS |

#### Running the Migration

```bash
# Via Supabase SQL Editor (recommended)
# Copy contents of FRESH_0020_imports.sql and execute

# Or via script
cd ~/Work/MyCastle/app
npx tsx -e "
import { db } from './src/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
const migration = readFileSync('./migrations/FRESH_0020_imports.sql', 'utf-8');
await db.execute(sql.raw(migration));
console.log('Migration complete');
"
```

### C.3 Schema Verification

After migration, verify schema alignment:

```bash
cd ~/Work/MyCastle/app

# 1. Test database connection supports RLS
npm run test:db

# 2. Verify TypeScript compiles with new schema
npx tsc --noEmit

# 3. Test CRUD operations on import tables
npx tsx -e "
import { db } from './src/db';
import { sql } from 'drizzle-orm';
import { uploadBatches, stgRows, proposedChanges } from './src/db/schema/imports';

// Set RLS context
await db.execute(sql\`SET app.user_email = 'admin@example.com'\`);
await db.execute(sql\`SET app.is_super_admin = 'true'\`);

// Test query
const batches = await db.select().from(uploadBatches).limit(1);
console.log('Schema verified:', batches.length >= 0 ? 'OK' : 'FAIL');
"
```

### C.4 RLS Policy Requirements

All three tables have admin-only RLS policies:

| Table | Policy Pattern |
|-------|---------------|
| `upload_batches` | Admin/Super Admin can SELECT, INSERT, UPDATE, DELETE |
| `stg_rows` | Admin/Super Admin can SELECT, INSERT, UPDATE, DELETE |
| `proposed_changes` | Admin/Super Admin can SELECT, INSERT, UPDATE, DELETE |

#### Policy Verification

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('upload_batches', 'stg_rows', 'proposed_changes')
ORDER BY tablename, policyname;
```

Expected: 4 policies per table (SELECT, INSERT, UPDATE, DELETE) + super admin bypass policies.

### C.5 Drizzle Schema Alignment

The Drizzle ORM schema file must use **camelCase** for TypeScript properties:

| TypeScript Property | Database Column |
|--------------------|-----------------|
| `uploadBatches.tenantId` | `tenant_id` |
| `uploadBatches.fileType` | `file_type` |
| `uploadBatches.createdBy` | `created_by` |
| `stgRows.batchId` | `batch_id` |
| `stgRows.rowNumber` | `row_number` |
| `stgRows.rowStatus` | `row_status` |
| `proposedChanges.stgRowId` | `stg_row_id` |
| `proposedChanges.targetEnrollmentId` | `target_enrollment_id` |

#### Schema File Location

`app/src/db/schema/imports.ts`

### C.6 Transaction Support

The apply operation uses Drizzle transactions for atomicity:

```typescript
await db.transaction(async (tx) => {
  // All inserts/updates here
  // Automatically rolls back on any error
});
```

This ensures:
- **All-or-nothing apply** - No partial writes on failure
- **Automatic rollback** - Database state preserved on error
- **Status tracking** - `APPLIED` on success, `FAILED_SYSTEM` on failure

### C.7 Testing Checklist

Before deployment, verify:

- [ ] `npm run test:db` passes (RLS session variables work)
- [ ] `npx tsc --noEmit` passes (Drizzle schema compiles)
- [ ] Migration executed without errors
- [ ] RLS policies created (12 admin policies + 3 super admin)
- [ ] Test insert/select/delete works on all three tables
- [ ] Transaction rollback works (simulate failure, verify no partial writes)
