#!/bin/bash
# Run Student Registry Migrations
# This script runs migrations 0004-0008 in order and verifies results

set -e  # Exit on any error

echo "🗄️  Running Student Registry Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo "   Please run: source .env.local"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Migration files in order
MIGRATIONS=(
  "migrations/0004_add_programmes_table.sql"
  "migrations/0005_add_courses_table.sql"
  "migrations/0006_extend_users_for_students.sql"
  "migrations/0007_student_registry_views.sql"
  "migrations/0008_add_enrollment_flexibility.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
  echo "📝 Running: $migration"

  if psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
    echo "   ✅ SUCCESS"
  else
    echo "   ❌ FAILED"
    echo "   Run manually to see errors:"
    echo "   psql \$DATABASE_URL -f $migration"
    exit 1
  fi

  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All migrations completed successfully!"
echo ""
echo "📊 Verifying database state..."
echo ""

# Verify programmes table
echo "📝 Programmes created:"
psql "$DATABASE_URL" -c "SELECT code, name FROM programmes ORDER BY code;" -t | head -5
echo ""

# Verify courses table
echo "📝 Courses created (first 5):"
psql "$DATABASE_URL" -c "SELECT code, name, cefr_level FROM courses ORDER BY code LIMIT 5;" -t
echo ""

# Verify users table extensions
echo "📝 Users table columns:"
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('current_level', 'initial_level', 'level_status', 'visa_type', 'visa_expiry');" -t
echo ""

# Verify views
echo "📝 Database views created:"
psql "$DATABASE_URL" -c "SELECT viewname FROM pg_views WHERE viewname LIKE 'v_student%';" -t
echo ""

# Verify enrollments table extensions
echo "📝 Enrollments table flexible duration columns:"
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name IN ('expected_end_date', 'booked_weeks', 'is_amended', 'extensions_count');" -t
echo ""

# Check enrollment_amendments table
echo "📝 Enrollment amendments table:"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as amendment_table_exists FROM information_schema.tables WHERE table_name = 'enrollment_amendments';" -t
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Migration verification complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run db:generate    # Generate TypeScript types"
echo "2. Run: npm run seed:students  # Seed sample data"
echo "3. Run: tsx scripts/test-student-actions.ts  # Test server actions"
echo ""
