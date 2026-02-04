/**
 * Generate Sample XLSX Files for Bulk Upload Testing
 * Creates students.xlsx, classes.xlsx, and enrollments.xlsx
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const outputDir = path.resolve(__dirname, '../test-data');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ============================================================================
// Generate Students Sample
// ============================================================================

const studentsData = [
  {
    name: 'John Smith',
    email: 'john.smith@example.com',
    dateOfBirth: '1995-03-15',
    nationality: 'Irish',
    phone: '+353 87 123 4567',
    studentNumber: 'STU-2026-001',
    isVisaStudent: 'false',
    visaType: '',
    visaExpiryDate: '',
    emergencyContactName: 'Mary Smith',
    emergencyContactPhone: '+353 87 765 4321',
    emergencyContactRelationship: 'Mother',
  },
  {
    name: 'Maria Garcia',
    email: 'maria.garcia@example.com',
    dateOfBirth: '1998-07-22',
    nationality: 'Spanish',
    phone: '+34 612 345 678',
    studentNumber: 'STU-2026-002',
    isVisaStudent: 'true',
    visaType: 'Student Visa',
    visaExpiryDate: '2027-12-31',
    emergencyContactName: 'Carlos Garcia',
    emergencyContactPhone: '+34 612 987 654',
    emergencyContactRelationship: 'Father',
  },
  {
    name: 'Li Wei',
    email: 'li.wei@example.com',
    dateOfBirth: '1997-11-08',
    nationality: 'Chinese',
    phone: '+86 138 0000 1234',
    studentNumber: 'STU-2026-003',
    isVisaStudent: 'true',
    visaType: 'Student Visa',
    visaExpiryDate: '2027-06-30',
    emergencyContactName: 'Wei Chen',
    emergencyContactPhone: '+86 138 0000 5678',
    emergencyContactRelationship: 'Mother',
  },
];

const studentsWorksheet = XLSX.utils.json_to_sheet(studentsData);
const studentsWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(studentsWorkbook, studentsWorksheet, 'Students');
XLSX.writeFile(studentsWorkbook, path.join(outputDir, 'students.xlsx'));

console.log('✅ Generated students.xlsx');

// ============================================================================
// Generate Classes Sample
// ============================================================================

const classesData = [
  {
    name: 'General English A1 - Morning',
    level: 'A1',
    startDate: '2026-02-10',
    endDate: '2026-05-10',
    capacity: 15,
    teacherEmail: '',
  },
  {
    name: 'General English B1 - Afternoon',
    level: 'B1',
    startDate: '2026-02-10',
    endDate: '2026-05-10',
    capacity: 20,
    teacherEmail: '',
  },
  {
    name: 'IELTS Preparation B2',
    level: 'B2',
    startDate: '2026-02-17',
    endDate: '2026-04-17',
    capacity: 12,
    teacherEmail: '',
  },
];

const classesWorksheet = XLSX.utils.json_to_sheet(classesData);
const classesWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(classesWorkbook, classesWorksheet, 'Classes');
XLSX.writeFile(classesWorkbook, path.join(outputDir, 'classes.xlsx'));

console.log('✅ Generated classes.xlsx');

// ============================================================================
// Generate Enrollments Sample
// ============================================================================

const enrollmentsData = [
  {
    studentEmail: 'john.smith@example.com',
    className: 'General English A1 - Morning',
    enrollmentDate: '2026-02-01',
    expectedEndDate: '2026-05-10',
    bookedWeeks: 12,
  },
  {
    studentEmail: 'maria.garcia@example.com',
    className: 'General English B1 - Afternoon',
    enrollmentDate: '2026-02-01',
    expectedEndDate: '2026-05-10',
    bookedWeeks: 12,
  },
  {
    studentEmail: 'li.wei@example.com',
    className: 'IELTS Preparation B2',
    enrollmentDate: '2026-02-10',
    expectedEndDate: '2026-04-17',
    bookedWeeks: 8,
  },
];

const enrollmentsWorksheet = XLSX.utils.json_to_sheet(enrollmentsData);
const enrollmentsWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(enrollmentsWorkbook, enrollmentsWorksheet, 'Enrollments');
XLSX.writeFile(enrollmentsWorkbook, path.join(outputDir, 'enrollments.xlsx'));

console.log('✅ Generated enrollments.xlsx');

console.log(`\n📁 Test files created in: ${outputDir}`);
console.log('\nYou can now use these files to test the bulk upload functionality:');
console.log('1. Navigate to http://localhost:3000/admin/data/bulk-upload');
console.log('2. Select data type (Students, Classes, or Enrollments)');
console.log('3. Drag and drop the corresponding .xlsx file');
console.log('4. Review the preview and click Import');
