# Bulk Upload Approval Workflow - Manual Testing Guide

## Overview

This guide provides comprehensive manual testing steps for the bulk upload approval workflow with field-level change detection and selective import.

## Prerequisites

- ✅ Dev server running on `http://localhost:3000`
- ✅ Test data files generated in `app/test-data/`
- ✅ Prerequisite data seeded (courses, accommodation types)
- ✅ Admin user logged in (`eoinmaleoin@gmail.com`)

## Test Data Files Available

- `students.xlsx` - 3 sample students
- `classes.xlsx` - 3 sample classes
- `enrollments.xlsx` - 3 sample enrollments
- `bookings.xlsx` - 3 sample bookings with exact column format

## Test Cases

### Test 1: Students Upload - New Records

**Objective:** Test basic upload, preview, and field change detection for new records

**Steps:**

1. Navigate to `http://localhost:3000/admin/data/bulk-upload`
2. Click "Students" button in "1. Select Data Type" section
3. Drag and drop `test-data/students.xlsx` onto the upload area
   - OR click "Select File" and choose the file
4. Wait for processing (should take 1-2 seconds)

**Expected Results:**

- ✅ File name and size displayed
- ✅ Preview section appears showing:
  - Total Rows: 3
  - Valid: 3 (green)
  - Invalid: 0 (red)
  - New Records: 3 (blue)
  - Updates: 0 (yellow)
- ✅ "Select All Valid" button shows "3 of 3 selected"
- ✅ Preview table shows 3 rows with:
  - Checkboxes checked by default (only for valid rows)
  - Row numbers (1, 2, 3)
  - Status: "Valid" with green checkmark
  - Change: "insert" badge (blue)
  - Data preview showing first 3 fields

**Visual Verification:**

- All rows should have blue background tint (selected)
- Checkboxes should be checked
- No error messages

### Test 2: Row Expansion - Field-by-Field View

**Objective:** Test expandable row details showing all fields

**Steps:**

1. Click on first row in preview table (anywhere except checkbox)
2. Observe expanded section
3. Click again to collapse
4. Click on second row to expand it

**Expected Results:**

- ✅ First row expands showing:
  - Header: "New Record Details" (since it's an insert)
  - Grid of field cards (2 columns on desktop, 1 on mobile)
  - Each field card shows:
    - Field name
    - Current value
    - No "CHANGED" badge (all new fields)
  - Click indicator changes from "▼ Click to expand" to "▲ Click to collapse"
- ✅ Clicking again collapses the row
- ✅ Second row expands independently
- ✅ Previously expanded rows can stay expanded while others are clicked

**Visual Verification:**

- Expanded section has light gray background
- Field cards are evenly spaced in grid
- All student fields visible: name, email, dateOfBirth, nationality, phone, etc.

### Test 3: Checkbox Selection - Individual and Batch

**Objective:** Test selective approval controls

**Steps:**

1. Uncheck the first student (click checkbox)
2. Observe selection count
3. Click "Deselect All" button
4. Observe all checkboxes unchecked
5. Click "Select All Valid" button
6. Check only first and third students manually
7. Click "Import X Records" button with only 2 selected

**Expected Results:**

- ✅ Clicking individual checkbox toggles that row only
- ✅ Selection count updates: "2 of 3 selected", then "0 of 3 selected", etc.
- ✅ "Deselect All" unchecks all checkboxes
- ✅ "Select All Valid" checks all valid rows (excludes error rows)
- ✅ Selected rows have blue/indigo background tint
- ✅ Unselected rows have white background
- ✅ Import button text updates: "Import 2 Records" when 2 selected

**Visual Verification:**

- Clear visual distinction between selected (blue tint) and unselected (white) rows
- Checkbox state matches background color
- Button text is dynamic

### Test 4: Confirmation Dialog

**Objective:** Test import confirmation with summary

**Steps:**

1. Select 2 students (first and third)
2. Click "Import 2 Records" button
3. Review confirmation dialog
4. Click "Cancel"
5. Verify still on preview screen
6. Click "Import 2 Records" again
7. Click "Confirm Import"

**Expected Results:**

- ✅ Modal dialog appears with:
  - Title: "Confirm Import"
  - Summary text: "You are about to import 2 record(s)"
  - Stats cards showing:
    - New Records: 2 (blue background)
    - Updates: 0 (yellow background)
  - Warning box (yellow) with "Important" message
  - "Cancel" and "Confirm Import" buttons
- ✅ Clicking "Cancel" closes dialog, stays on preview
- ✅ Clicking "Confirm Import" starts import process
- ✅ Shows loading state: "Importing..." with spinner
- ✅ Success message appears after completion

**Visual Verification:**

- Modal centers on screen with overlay
- Stats cards use correct colors
- Warning message is visible but not alarming
- Green "Confirm Import" button stands out

### Test 5: Selective Import - Verify Only Selected Imported

**Objective:** Verify only selected records are imported to database

**Steps:**

1. Note which students were selected (first and third)
2. After successful import, click "Import More Data"
3. Navigate to `http://localhost:3000/admin/students`
4. Search for the imported students

**Expected Results:**

- ✅ Only 2 students appear in database (first and third)
- ✅ Second student (maria.garcia) was NOT imported
- ✅ Students have correct data: name, email, nationality, etc.

**Verification Query (optional):**

```sql
SELECT name, email FROM users WHERE email LIKE '%@example.com' ORDER BY name;
```

Should show: John Smith, Li Wei (NOT Maria Garcia if only 1st and 3rd were selected)

### Test 6: Classes Upload - With Validation Errors

**Objective:** Test error handling and validation display

**Steps:**

1. Click "Reset" or reload page
2. Select "Classes" data type
3. Upload `test-data/classes.xlsx`

**Expected Results:**

- ✅ Preview shows 3 valid classes
- ✅ All rows show green "Valid" status
- ✅ Error rows (if any) show:
  - Red background tint
  - Red "Error" status with X icon
  - Error details in last column with field name and message
  - Checkbox is disabled (grayed out, cannot be checked)

**Note:** Current test file has all valid data. To test errors, you can:

1. Edit `classes.xlsx` to have invalid level (e.g., "X5")
2. Remove required field (e.g., delete a class name)
3. Re-upload and verify error handling

### Test 7: Updates - Field-by-Field Change Detection

**Objective:** Test update detection and before/after comparison

**Steps:**

1. Import students first (all 3)
2. Edit `test-data/students.xlsx`:
   - Change John Smith's phone to "+353 87 999 9999"
   - Change Li Wei's nationality to "Japanese"
   - Keep Maria Garcia unchanged
3. Save the Excel file
4. Upload the edited file again

**Expected Results:**

- ✅ Preview shows:
  - Total Rows: 3
  - Valid: 3
  - New Records: 0
  - Updates: 3 (yellow)
- ✅ All rows show "update" badge (yellow)
- ✅ Expanding John Smith's row shows:
  - Header: "Field-by-Field Comparison"
  - Changed fields have yellow background with "CHANGED" badge
  - Phone field shows:
    - Before: "+353 87 123 4567" (strikethrough)
    - After: "+353 87 999 9999" (bold)
  - Unchanged fields have white background
- ✅ Expanding Maria Garcia shows:
  - All fields marked as NOT changed
  - Message: "No changes detected (duplicate row)"

**Visual Verification:**

- Changed fields clearly highlighted with yellow background
- "CHANGED" badge visible on modified fields only
- Before values have strikethrough
- After values are bold
- Duplicate records show appropriate message

### Test 8: Bookings Upload - Complex Multi-Table Import

**Objective:** Test bookings with user's exact column format

**Steps:**

1. Select "Bookings" data type
2. Upload `test-data/bookings.xlsx`
3. Expand first booking to see all fields

**Expected Results:**

- ✅ Preview shows 3 valid bookings
- ✅ All financial fields parsed correctly:
  - Deposit Paid, Course Fee Due, Accommodation, etc.
- ✅ Column names with spaces recognized:
  - "Sale Date", "Start date", "End date", "Accom Type"
- ✅ Expanded view shows:
  - All booking fields
  - Student information (Name, DOB, Nationality)
  - Course details
  - Financial breakdown
- ✅ Import creates:
  - New students (or updates existing)
  - New bookings linked to students
  - Auto-created agencies from "Source" field

**Verification After Import:**
Navigate to `http://localhost:3000/admin/bookings`

- ✅ 3 bookings appear
- ✅ Each booking shows correct student, course, dates
- ✅ Financial data matches Excel file

### Test 9: Mobile Responsiveness

**Objective:** Test UI works on mobile viewport

**Steps:**

1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Repeat any test case above

**Expected Results:**

- ✅ Entity type buttons stack vertically on mobile
- ✅ Preview table scrolls horizontally if needed
- ✅ Field cards in expanded view show 1 column on mobile
- ✅ Confirmation dialog is responsive
- ✅ All buttons and interactions work on touch

### Test 10: Error Handling and Edge Cases

**Objective:** Test robustness and user feedback

**Test Cases:**

1. **No file selected:**
   - Click "Import X Records" without selecting data type
   - Expected: Error message "Please select a data type first"

2. **Empty selection:**
   - Deselect all rows
   - Click "Import 0 Records" (button should be disabled)
   - If enabled, expect error: "Please select at least one record to import"

3. **Large file:**
   - Create Excel with 100+ rows
   - Upload and verify: "Showing first 50 of 100 records" message

4. **Invalid file format:**
   - Try uploading a .txt or .pdf file
   - Expected: Validation error or file rejected

5. **Corrupted Excel:**
   - Create malformed Excel file
   - Expected: Parse error with helpful message

## Success Criteria Summary

All test cases should pass with:

- ✅ No console errors
- ✅ All UI elements render correctly
- ✅ Field change detection works accurately
- ✅ Checkbox selection functions properly
- ✅ Only selected records are imported
- ✅ Confirmation dialog shows accurate summary
- ✅ Data appears correctly in database
- ✅ Mobile UI is usable
- ✅ Error messages are clear and helpful

## Cleanup After Testing

```bash
# Remove test data from database (optional)
cd ~/Work/MyCastle/app
npx tsx scripts/cleanup-test-data.ts
```

Or manually via Supabase SQL Editor:

```sql
-- Delete test users (will cascade to enrollments via FK)
DELETE FROM users WHERE email LIKE '%@example.com' OR email LIKE '%@import.temp';

-- Delete test classes
DELETE FROM classes WHERE name LIKE '%Test%' OR name LIKE '%Morning%' OR name LIKE '%Afternoon%';

-- Delete test bookings
DELETE FROM bookings WHERE sale_date >= '2026-02-01';
```

## Reporting Issues

If any test case fails, please document:

1. Test case number and name
2. Steps taken
3. Expected vs actual result
4. Screenshots (if UI issue)
5. Console errors (F12 → Console tab)
6. Browser and version

## Notes

- All tests assume clean database or tolerance for duplicate key errors on re-import
- Selective import is the core feature - ensure only checked rows are imported
- Field change detection should work for all entity types
- Confirmation dialog prevents accidental imports
- UI should be intuitive without reading documentation

---

**Test Status:** ⏳ Pending Manual Verification
**Last Updated:** 2026-02-04
**Estimated Time:** 30-45 minutes for complete test suite
