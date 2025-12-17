# Global Spec Rules

Apply to every admin page.

## AuthN/AuthZ

- **Supabase Auth required**
- **Role gates**: `super_admin`, `admin` (optionally later: `compliance_admin`, `finance_admin`)
- **RLS is the enforcement layer**; UI is not trusted

## Auditability

Every write action emits an audit event:
- `actor_user_id`
- `action`
- `entity`
- `entity_id`
- `before` (JSONB)
- `after` (JSONB)
- `request_id`
- `timestamp`

## Data Safety

- **No raw SQL entry for admins**
- Query Builder generates parameterised queries against an allow-list of tables/columns/views

## UX Invariants

- **Global search** and "Recent activity" for admins
- **Consistent table pattern**: filter bar, saved views, pagination, export (where allowed), row actions
