# Supabase Storage Setup for Student Documents

## 📋 Overview

This guide sets up the Supabase Storage bucket for student documents with proper RLS policies.

**Bucket Name:** `student-documents`
**Access:** Private (RLS-controlled)
**Max File Size:** 25MB per file
**Allowed File Types:** PDF, Word (.docx), Excel (.xlsx), Images (JPG, PNG)

---

## 🪣 Step 1: Create Storage Bucket

### Via Supabase Dashboard:

1. Go to **Storage** in left sidebar
2. Click **New Bucket**
3. Configure:
   - **Name:** `student-documents`
   - **Public:** ❌ **OFF** (private bucket - RLS controlled)
   - **File size limit:** 25 MB
   - **Allowed MIME types:**
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
     - `image/jpeg`
     - `image/png`
4. Click **Create bucket**

### Via SQL (Alternative):

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-documents',
  'student-documents',
  false,  -- Private bucket
  26214400,  -- 25MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
);
```

---

## 🔐 Step 2: Set Up RLS Policies for Storage

Run this SQL in Supabase SQL Editor:

```sql
-- ============================================================================
-- STORAGE RLS POLICIES: student-documents bucket
-- ============================================================================

-- Policy 1: Admin/DoS/Super Admin - Full Access (All Operations)
CREATE POLICY "Admin full access to student documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  current_setting('app.user_role', true) IN ('admin', 'dos', 'super_admin')
)
WITH CHECK (
  bucket_id = 'student-documents' AND
  current_setting('app.user_role', true) IN ('admin', 'dos', 'super_admin')
);

-- Policy 2: Teachers - Read-only for students in their classes
CREATE POLICY "Teacher read access to student documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  current_setting('app.user_role', true) = 'teacher' AND
  -- Path format: {tenant_id}/{student_id}/filename
  -- Extract student_id from path and check if teacher has access
  (storage.foldername(name))[2]::uuid IN (
    SELECT e.student_id
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    WHERE c.teacher_id = current_setting('app.user_id', true)::uuid
      AND e.tenant_id = current_setting('app.tenant_id', true)::uuid
      AND e.status IN ('active', 'completed')
  )
);

-- Policy 3: Students - Read-only for their own shared documents
CREATE POLICY "Student read access to own shared documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  current_setting('app.user_role', true) = 'student' AND
  -- Path format: {tenant_id}/{student_id}/filename
  -- Student can only access their own folder
  (storage.foldername(name))[2]::uuid = current_setting('app.user_id', true)::uuid AND
  -- And only if document is marked as shared in database
  EXISTS (
    SELECT 1 FROM student_documents sd
    WHERE sd.file_url = name
      AND sd.student_id = current_setting('app.user_id', true)::uuid
      AND sd.is_shared_with_student = true
      AND sd.is_current = true
  )
);

-- Policy 4: Students - Upload access (if enabled for document type)
CREATE POLICY "Student upload to own folder if permitted"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-documents' AND
  current_setting('app.user_role', true) = 'student' AND
  -- Path must be in their own folder: {tenant_id}/{student_id}/filename
  (storage.foldername(name))[1]::uuid = current_setting('app.tenant_id', true)::uuid AND
  (storage.foldername(name))[2]::uuid = current_setting('app.user_id', true)::uuid
  -- Note: Document type permission check happens at application layer
  -- This just ensures path-level isolation
);

-- Policy 5: Tenant Isolation (all roles)
CREATE POLICY "Tenant isolation for storage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'student-documents' AND
  -- Path format: {tenant_id}/{student_id}/filename
  (storage.foldername(name))[1]::uuid = current_setting('app.tenant_id', true)::uuid
)
WITH CHECK (
  bucket_id = 'student-documents' AND
  (storage.foldername(name))[1]::uuid = current_setting('app.tenant_id', true)::uuid
);
```

---

## 📁 Step 3: Folder Structure Convention

**Path Format:**
```
{tenant_id}/{student_id}/{timestamp}_{filename}
```

**Example:**
```
550e8400-e29b-41d4-a716-446655440000/  (tenant_id)
└── 660e9500-f30c-52e5-b827-557766551111/  (student_id)
    ├── 20260305_143022_passport_copy.pdf
    ├── 20260310_091545_visa_renewal.jpg
    └── 20260315_165430_test_results_unit3.pdf
```

**Timestamp Format:** `YYYYMMdd_HHmmss`

**Filename Sanitization:**
- Remove spaces → underscore
- Lowercase
- Remove special characters (except underscore, hyphen, period)
- Preserve extension

---

## 🧪 Step 4: Test Storage Access

### Test 1: Admin Upload
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Set RLS context
await supabase.rpc('set_user_context', {
  p_user_id: adminUserId,
  p_tenant_id: tenantId,
  p_role: 'admin'
});

// Upload file
const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
const path = `${tenantId}/${studentId}/${timestamp}_test.pdf`;

const { data, error } = await supabase.storage
  .from('student-documents')
  .upload(path, file);

console.log('Upload result:', data, error);
```

### Test 2: Student Read (Shared Document)
```typescript
// Set RLS context for student
await supabase.rpc('set_user_context', {
  p_user_id: studentId,
  p_tenant_id: tenantId,
  p_role: 'student'
});

// Try to download shared document
const { data, error } = await supabase.storage
  .from('student-documents')
  .download(path);

console.log('Download result:', data ? 'Success' : 'Failed', error);
```

### Test 3: Verify Tenant Isolation
```typescript
// Try to access another tenant's document (should fail)
const wrongTenantPath = `${otherTenantId}/${studentId}/${timestamp}_test.pdf`;

const { data, error } = await supabase.storage
  .from('student-documents')
  .download(wrongTenantPath);

console.log('Should fail:', error); // Expected: RLS policy violation
```

---

## 🚨 Troubleshooting

### Error: "new row violates row-level security policy"
- **Cause:** RLS context not set before operation
- **Solution:** Call `set_user_context()` before every storage operation

### Error: "File size exceeds limit"
- **Cause:** File > 25MB
- **Solution:** Check file size on client before upload, show error to user

### Error: "MIME type not allowed"
- **Cause:** Uploading unsupported file type
- **Solution:** Validate file extension/MIME type before upload

### Storage fills up too quickly
- **Monitor:** Check Supabase dashboard → Storage → Usage
- **Solution:** Implement document archival policy (soft delete old documents)

---

## 📊 Storage Monitoring

### Query: Total storage usage per tenant
```sql
SELECT
  (storage.foldername(name))[1]::uuid AS tenant_id,
  COUNT(*) AS file_count,
  SUM((metadata->>'size')::bigint) AS total_bytes,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) AS total_mb
FROM storage.objects
WHERE bucket_id = 'student-documents'
GROUP BY (storage.foldername(name))[1]
ORDER BY total_bytes DESC;
```

### Query: Largest files
```sql
SELECT
  name,
  (metadata->>'size')::bigint AS size_bytes,
  ROUND((metadata->>'size')::bigint / 1024.0 / 1024.0, 2) AS size_mb,
  created_at
FROM storage.objects
WHERE bucket_id = 'student-documents'
ORDER BY (metadata->>'size')::bigint DESC
LIMIT 20;
```

---

## ✅ Verification Checklist

- [ ] Bucket `student-documents` created
- [ ] Bucket is **private** (not public)
- [ ] File size limit set to 25MB
- [ ] Allowed MIME types configured
- [ ] All 5 RLS policies created successfully
- [ ] Admin can upload/download files
- [ ] Teacher can only read files for their students
- [ ] Student can only read their own shared files
- [ ] Student cannot access other students' files
- [ ] Tenant isolation enforced (cannot access other tenant's files)

---

**✅ Setup Complete!** Storage bucket ready for document uploads.
