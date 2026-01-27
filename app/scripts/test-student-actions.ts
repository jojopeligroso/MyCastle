/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test Student Server Actions
 * Validates that all student CRUD operations work correctly
 * Run with: tsx scripts/test-student-actions.ts
 */

import {
  createStudent,
  updateStudent,
  approveLevelStatus,
  archiveStudent,
  getDuplicateCandidates,
} from '../src/app/admin/students/_actions/studentActions';

async function testStudentActions() {
  console.log('🧪 Testing Student Server Actions\n');
  console.log('━'.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; passed: boolean; message?: string }>,
  };

  // Test 1: Create student with confirmed level (manual assignment)
  console.log('\n📝 Test 1: Create student with confirmed level (manual)');
  try {
    const result1 = await createStudent({
      name: 'Test Student Manual',
      email: `test.manual.${Date.now()}@example.com`,
      phone: '+44 7700 900000',
      current_level: 'B1',
      initial_level: 'A2',
      level_status: 'confirmed',
    });

    if (result1.success && result1.levelStatus === 'confirmed') {
      console.log('   ✅ PASS - Student created with confirmed level');
      console.log(`   Student ID: ${result1.studentId}`);
      results.passed++;
      results.tests.push({ name: 'Create confirmed student', passed: true });
    } else {
      console.log('   ❌ FAIL -', result1.error || 'Unexpected result');
      results.failed++;
      results.tests.push({
        name: 'Create confirmed student',
        passed: false,
        message: result1.error,
      });
    }
  } catch (error) {
    console.log('   ❌ FAIL - Exception:', error);
    results.failed++;
    results.tests.push({
      name: 'Create confirmed student',
      passed: false,
      message: String(error),
    });
  }

  // Test 2: Create student with diagnostic test (provisional level)
  console.log('\n📝 Test 2: Create student with diagnostic test (provisional)');
  let diagnosticStudentId: string | undefined;
  try {
    const result2 = await createStudent({
      name: 'Test Student Diagnostic',
      email: `test.diagnostic.${Date.now()}@example.com`,
      phone: '+44 7700 900001',
      diagnostic_test: {
        score: 65,
        max_score: 100,
        suggested_level: 'B1',
      },
    });

    if (result2.success && result2.levelStatus === 'provisional') {
      console.log('   ✅ PASS - Student created with provisional level');
      console.log(`   Student ID: ${result2.studentId}`);
      console.log(`   Level status: ${result2.levelStatus}`);
      diagnosticStudentId = result2.studentId;
      results.passed++;
      results.tests.push({ name: 'Create provisional student', passed: true });
    } else {
      console.log('   ❌ FAIL -', result2.error || 'Level not provisional');
      results.failed++;
      results.tests.push({
        name: 'Create provisional student',
        passed: false,
        message: result2.error,
      });
    }
  } catch (error) {
    console.log('   ❌ FAIL - Exception:', error);
    results.failed++;
    results.tests.push({
      name: 'Create provisional student',
      passed: false,
      message: String(error),
    });
  }

  // Test 3: Approve provisional level
  console.log('\n📝 Test 3: Approve provisional level');
  if (diagnosticStudentId) {
    try {
      const result3 = await approveLevelStatus(diagnosticStudentId);

      if (result3.success) {
        console.log('   ✅ PASS - Level approved successfully');
        results.passed++;
        results.tests.push({ name: 'Approve provisional level', passed: true });
      } else {
        console.log('   ❌ FAIL -', result3.error);
        results.failed++;
        results.tests.push({
          name: 'Approve provisional level',
          passed: false,
          message: result3.error,
        });
      }
    } catch (error) {
      console.log('   ❌ FAIL - Exception:', error);
      results.failed++;
      results.tests.push({
        name: 'Approve provisional level',
        passed: false,
        message: String(error),
      });
    }
  } else {
    console.log('   ⊘ SKIP - No diagnostic student to test with');
    results.tests.push({ name: 'Approve provisional level', passed: false, message: 'Skipped' });
  }

  // Test 4: Update student
  console.log('\n📝 Test 4: Update student');
  if (diagnosticStudentId) {
    try {
      const result4 = await updateStudent(diagnosticStudentId, {
        phone: '+44 7700 900002',
        current_level: 'B2',
      });

      if (result4.success) {
        console.log('   ✅ PASS - Student updated successfully');
        results.passed++;
        results.tests.push({ name: 'Update student', passed: true });
      } else {
        console.log('   ❌ FAIL -', result4.error);
        results.failed++;
        results.tests.push({ name: 'Update student', passed: false, message: result4.error });
      }
    } catch (error) {
      console.log('   ❌ FAIL - Exception:', error);
      results.failed++;
      results.tests.push({ name: 'Update student', passed: false, message: String(error) });
    }
  } else {
    console.log('   ⊘ SKIP - No student to test with');
    results.tests.push({ name: 'Update student', passed: false, message: 'Skipped' });
  }

  // Test 5: Archive student
  console.log('\n📝 Test 5: Archive student');
  if (diagnosticStudentId) {
    try {
      const result5 = await archiveStudent(diagnosticStudentId, 'Test archival');

      if (result5.success) {
        console.log('   ✅ PASS - Student archived successfully');
        results.passed++;
        results.tests.push({ name: 'Archive student', passed: true });
      } else {
        console.log('   ❌ FAIL -', result5.error);
        results.failed++;
        results.tests.push({ name: 'Archive student', passed: false, message: result5.error });
      }
    } catch (error) {
      console.log('   ❌ FAIL - Exception:', error);
      results.failed++;
      results.tests.push({ name: 'Archive student', passed: false, message: String(error) });
    }
  } else {
    console.log('   ⊘ SKIP - No student to test with');
    results.tests.push({ name: 'Archive student', passed: false, message: 'Skipped' });
  }

  // Test 6: Get duplicate candidates
  console.log('\n📝 Test 6: Get duplicate candidates');
  try {
    const duplicates = await getDuplicateCandidates();
    console.log(`   ✅ PASS - Retrieved ${duplicates.length} duplicate candidates`);
    results.passed++;
    results.tests.push({ name: 'Get duplicate candidates', passed: true });
  } catch (error) {
    console.log('   ❌ FAIL - Exception:', error);
    results.failed++;
    results.tests.push({
      name: 'Get duplicate candidates',
      passed: false,
      message: String(error),
    });
  }

  // Test 7: Duplicate email validation
  console.log('\n📝 Test 7: Duplicate email validation');
  try {
    const duplicateEmail = `test.duplicate.${Date.now()}@example.com`;

    // Create first student
    const first = await createStudent({
      name: 'First Student',
      email: duplicateEmail,
      current_level: 'A1',
      level_status: 'confirmed',
    });

    // Try to create second with same email
    const second = await createStudent({
      name: 'Second Student',
      email: duplicateEmail,
      current_level: 'A2',
      level_status: 'confirmed',
    });

    if (first.success && !second.success && second.error?.includes('already exists')) {
      console.log('   ✅ PASS - Duplicate email correctly rejected');
      results.passed++;
      results.tests.push({ name: 'Duplicate email validation', passed: true });
    } else {
      console.log('   ❌ FAIL - Duplicate email was not rejected');
      results.failed++;
      results.tests.push({
        name: 'Duplicate email validation',
        passed: false,
        message: 'Duplicate not rejected',
      });
    }
  } catch (error) {
    console.log('   ❌ FAIL - Exception:', error);
    results.failed++;
    results.tests.push({
      name: 'Duplicate email validation',
      passed: false,
      message: String(error),
    });
  }

  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${results.tests.length}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Server actions are working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.\n');
    console.log('Failed tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`   - ${t.name}: ${t.message || 'Unknown error'}`);
      });
    console.log('');
    process.exit(1);
  }
}

// Run tests
testStudentActions().catch(error => {
  console.error('💥 Fatal error running tests:', error);
  process.exit(1);
});
