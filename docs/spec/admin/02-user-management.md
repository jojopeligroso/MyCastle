# Page 2: User Management

**Route**: `/admin/users`
**Role**: `admin`, `super_admin`

## Goal
Manage platform users and their roles without leaking security primitives.

## Core UI

### Users Table
- email
- name
- role
- status
- last login
- created at

### Detail Drawer
- Role history
- Linked entities (teacher/student records)
- Session info
- Activity log

## Actions

1. **Create user** - Invite / magic-link enablement
2. **Change role** - Guarded by permission checks
3. **Deactivate/reactivate** - Suspend or restore access
4. **Reset MFA** - Admin-initiated security response
5. **Revoke sessions** - Force logout

## Permissions

- `admin`: Can create/disable users; cannot promote to `super_admin`
- `super_admin`: Full control including role elevation

## Data Model

- `users` table (from Supabase Auth + profiles)
- `user_roles` mapping (history-aware, optional)
- `user_role_audit` (optional)

## Edge Cases

- **Orphaned auth user** - Exists in Auth but no `users` row → repair workflow
- **Role change** - Requires 2-step confirmation + audit reason
- **Self-modification** - Admin cannot change own role or deactivate self

## Acceptance Criteria

✅ Role change emits audit event and is reflected immediately in claims/policies  
✅ Deactivated user cannot authenticate or access any page  
✅ Session revocation is immediate (no cached sessions)  
✅ Cannot escalate own permissions  
✅ Orphaned users detectable and repairable

## Component Structure

```
/admin/users/page.tsx
  ├── UsersTable
  │   ├── UserRow
  │   └── UserFilters
  ├── UserDetailDrawer
  │   ├── RoleChangeForm
  │   ├── SessionManager
  │   └── ActivityLog
  └── CreateUserModal
      └── InviteUserForm
```

## Database Views

### v_users_with_metadata
```sql
CREATE OR REPLACE VIEW v_users_with_metadata AS
SELECT
  u.id,
  u.tenant_id,
  u.auth_id,
  u.email,
  u.name,
  u.role,
  u.status,
  u.last_login,
  u.created_at,
  u.updated_at,
  (SELECT COUNT(*) FROM enrollments WHERE student_id = u.id) AS enrollment_count,
  (SELECT COUNT(*) FROM classes WHERE teacher_id = u.id) AS class_count
FROM users u
WHERE u.tenant_id = (SELECT id FROM tenants LIMIT 1)
ORDER BY u.created_at DESC;
```

### v_orphaned_auth_users
```sql
CREATE OR REPLACE VIEW v_orphaned_auth_users AS
SELECT
  au.id AS auth_id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.auth_id
WHERE u.id IS NULL;
```
