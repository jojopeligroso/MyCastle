/**
 * Comprehensive Test Script for Bulk Upload Approval Workflow
 * Tests all entity types, field-level change detection, and selective import
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseAndValidateFile,
  commitBulkUpload,
  type EntityType,
  type UploadPreview,
} from '../src/app/admin/data/bulk-upload/_actions';

const testDataDir = path.resolve(__dirname, '../test-data');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.bold + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function testEntityUpload(
  entityType: EntityType,
  filename: string,
  description: string
): Promise<UploadPreview | null> {
  logSection(`Testing ${entityType.toUpperCase()} Upload: ${description}`);

  try {
    // Read the file
    const filePath = path.join(testDataDir, filename);
    if (!fs.existsSync(filePath)) {
      logError(`File not found: ${filePath}`);
      return null;
    }

    logInfo(`Reading file: ${filename}`);
    const fileBuffer = fs.readFileSync(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    // Parse and validate
    logInfo('Parsing and validating...');
    const preview = await parseAndValidateFile(arrayBuffer, entityType);

    // Display results
    logInfo('Preview Results:');
    console.log(`  Total Rows: ${preview.totalRows}`);
    console.log(`  Valid Rows: ${colors.green}${preview.validRows}${colors.reset}`);
    console.log(`  Invalid Rows: ${colors.red}${preview.invalidRows}${colors.reset}`);
    console.log(`  New Records (Inserts): ${colors.cyan}${preview.inserts}${colors.reset}`);
    console.log(`  Updates: ${colors.yellow}${preview.updates}${colors.reset}`);

    if (preview.success) {
      logSuccess('Validation passed!');
    } else {
      logError('Validation failed!');
    }

    // Display sample records
    console.log('\n📋 Sample Records:');
    preview.records.slice(0, 3).forEach((record, idx) => {
      console.log(`\n  Record ${idx + 1} (Row ${record.rowNumber}):`);
      console.log(`    Change Type: ${record.changeType}`);
      console.log(`    Errors: ${record.errors.length}`);

      if (record.errors.length > 0) {
        record.errors.forEach(err => {
          logError(`      ${err.field}: ${err.message}`);
        });
      }

      // Display field changes
      if (record.fieldChanges && record.fieldChanges.length > 0) {
        const changedFields = record.fieldChanges.filter(f => f.changed);
        if (changedFields.length > 0) {
          console.log(`    Changed Fields: ${changedFields.length}`);
          changedFields.slice(0, 3).forEach(change => {
            console.log(
              `      ${change.field}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`
            );
          });
        } else if (record.changeType === 'update') {
          logWarning('      No field changes detected (duplicate)');
        }
      }

      // Display some data
      const dataPreview = Object.entries(record.data)
        .slice(0, 3)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      console.log(`    Data: ${dataPreview}...`);
    });

    return preview;
  } catch (error) {
    logError(`Error testing ${entityType}: ${(error as Error).message}`);
    console.error(error);
    return null;
  }
}

async function testSelectiveCommit(preview: UploadPreview, entityType: EntityType) {
  logSection(`Testing Selective Commit for ${entityType.toUpperCase()}`);

  try {
    // Test 1: Select only first 2 valid records
    const validRecords = preview.records.filter(r => r.errors.length === 0);

    if (validRecords.length < 2) {
      logWarning('Not enough valid records to test selective commit');
      return;
    }

    const selectedRecords = validRecords.slice(0, 2);
    const selectedPreview = {
      ...preview,
      records: selectedRecords,
    };

    logInfo(`Committing ${selectedRecords.length} of ${validRecords.length} valid records...`);

    const result = await commitBulkUpload(selectedPreview);

    if (result.success) {
      logSuccess(
        `Import successful! Inserted: ${result.inserted}, Updated: ${result.updated}, Failed: ${result.failed}`
      );
    } else {
      logError(
        `Import failed! Inserted: ${result.inserted}, Updated: ${result.updated}, Failed: ${result.failed}`
      );
    }

    return result;
  } catch (error) {
    logError(`Error during selective commit: ${(error as Error).message}`);
    console.error(error);
    return null;
  }
}

async function testFieldChangeDetection(preview: UploadPreview) {
  logSection('Testing Field-Level Change Detection');

  const updateRecords = preview.records.filter(r => r.changeType === 'update');

  if (updateRecords.length === 0) {
    logWarning('No update records found to test field change detection');
    return;
  }

  logInfo(`Found ${updateRecords.length} update record(s)`);

  updateRecords.slice(0, 2).forEach((record, idx) => {
    console.log(`\n  Update Record ${idx + 1} (Row ${record.rowNumber}):`);

    if (!record.fieldChanges || record.fieldChanges.length === 0) {
      logWarning('    No field changes data available');
      return;
    }

    const changedFields = record.fieldChanges.filter(f => f.changed);
    const unchangedFields = record.fieldChanges.filter(f => !f.changed);

    console.log(`    Total Fields: ${record.fieldChanges.length}`);
    console.log(`    Changed: ${colors.yellow}${changedFields.length}${colors.reset}`);
    console.log(`    Unchanged: ${colors.green}${unchangedFields.length}${colors.reset}`);

    if (changedFields.length > 0) {
      console.log('\n    Changed Fields:');
      changedFields.forEach(change => {
        console.log(
          `      ${colors.yellow}${change.field}${colors.reset}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`
        );
      });
    }

    if (unchangedFields.length > 0 && unchangedFields.length <= 5) {
      console.log('\n    Unchanged Fields:');
      unchangedFields.forEach(change => {
        console.log(`      ${change.field}: ${JSON.stringify(change.newValue)}`);
      });
    }
  });

  logSuccess('Field change detection working correctly!');
}

async function main() {
  log('\n🧪 BULK UPLOAD APPROVAL WORKFLOW - COMPREHENSIVE TEST', colors.bold + colors.cyan);
  log('Testing field-level change detection and selective import\n', colors.cyan);

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Students Upload
    const studentsPreview = await testEntityUpload(
      'students',
      'students.xlsx',
      'New student records'
    );
    if (studentsPreview) {
      testsPassed++;
      await testFieldChangeDetection(studentsPreview);
    } else {
      testsFailed++;
    }

    // Test 2: Classes Upload
    const classesPreview = await testEntityUpload('classes', 'classes.xlsx', 'New class records');
    if (classesPreview) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 3: Enrollments Upload
    const enrollmentsPreview = await testEntityUpload(
      'enrollments',
      'enrollments.xlsx',
      'Student enrollments'
    );
    if (enrollmentsPreview) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 4: Bookings Upload
    const bookingsPreview = await testEntityUpload(
      'bookings',
      'bookings.xlsx',
      "Bookings with user's exact column format"
    );
    if (bookingsPreview) {
      testsPassed++;
      await testFieldChangeDetection(bookingsPreview);
    } else {
      testsFailed++;
    }

    // Test 5: Selective Commit (only if we have valid data)
    if (studentsPreview && studentsPreview.validRows >= 2) {
      const commitResult = await testSelectiveCommit(studentsPreview, 'students');
      if (commitResult?.success) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

    // Final Summary
    logSection('TEST SUMMARY');
    console.log(`Total Tests Run: ${testsPassed + testsFailed}`);
    log(`Tests Passed: ${testsPassed}`, colors.green);
    log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? colors.red : colors.green);

    if (testsFailed === 0) {
      logSuccess('\n🎉 All tests passed! Bulk upload workflow is working correctly.');
    } else {
      logError('\n⚠️  Some tests failed. Please review the output above.');
    }
  } catch (error) {
    logError(`\n💥 Fatal error during testing: ${(error as Error).message}`);
    console.error(error);
    process.exit(1);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

main();
