/**
 * Generate Sample Bookings XLSX with User's Exact Column Format
 * Columns: Sale Date, Name, Source, Visa Type, Nationality, Visa, DOB,
 *          Deposit Paid, Paid, Course Fee Due, Accomodation, Transfer, Exam Fee,
 *          Registration Fee, Learner Protection, Medical Insurance, Total Booking,
 *          Total Booking Due, Course, Placement test score, Level/Class, Weeks,
 *          Start date, End date, Accom Type, Start date, End date
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const outputDir = path.resolve(__dirname, '../test-data');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const bookingsData = [
  {
    'Sale Date': '2026-02-01',
    Name: 'John Smith',
    Source: 'Direct',
    'Visa Type': '',
    Nationality: 'Irish',
    Visa: '',
    DOB: '1995-03-15',
    'Deposit Paid': 1000,
    Paid: 1000,
    'Course Fee Due': 2160,
    Accomodation: 2400,
    Transfer: 75,
    'Exam Fee': 120,
    'Registration Fee': 50,
    'Learner Protection': 150,
    'Medical Insurance': 100,
    'Total Booking': 5055,
    'Total Booking Due': 4055,
    Course: 'General English B1',
    'Placement test score': '65',
    'Level/Class': 'B1',
    Weeks: 12,
    'Start date': '2026-02-10',
    'End date': '2026-05-05',
    'Accom Type': 'Host Family',
    // Note: Can't have duplicate column names, so accommodation dates will need special handling
  },
  {
    'Sale Date': '2026-02-01',
    Name: 'Maria Garcia',
    Source: 'ABC Language Agency',
    'Visa Type': 'Student Visa',
    Nationality: 'Spanish',
    Visa: 'SV-123456',
    DOB: '1998-07-22',
    'Deposit Paid': 1500,
    Paid: 2500,
    'Course Fee Due': 2340,
    Accomodation: 3000,
    Transfer: 75,
    'Exam Fee': 0,
    'Registration Fee': 50,
    'Learner Protection': 150,
    'Medical Insurance': 100,
    'Total Booking': 5715,
    'Total Booking Due': 3215,
    Course: 'IELTS Preparation',
    'Placement test score': '72',
    'Level/Class': 'B2',
    Weeks: 8,
    'Start date': '2026-02-17',
    'End date': '2026-04-12',
    'Accom Type': 'Residence',
  },
  {
    'Sale Date': '2026-02-05',
    Name: 'Li Wei',
    Source: 'Direct',
    'Visa Type': 'Student Visa',
    Nationality: 'Chinese',
    Visa: 'SV-789012',
    DOB: '1997-11-08',
    'Deposit Paid': 800,
    Paid: 800,
    'Course Fee Due': 1440,
    Accomodation: 2200,
    Transfer: 75,
    'Exam Fee': 120,
    'Registration Fee': 50,
    'Learner Protection': 100,
    'Medical Insurance': 100,
    'Total Booking': 4085,
    'Total Booking Due': 3285,
    Course: 'General English A2',
    'Placement test score': '45',
    'Level/Class': 'A2',
    Weeks: 8,
    'Start date': '2026-02-24',
    'End date': '2026-04-20',
    'Accom Type': 'Student House',
  },
];

const bookingsWorksheet = XLSX.utils.json_to_sheet(bookingsData);
const bookingsWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(bookingsWorkbook, bookingsWorksheet, 'Bookings');
XLSX.writeFile(bookingsWorkbook, path.join(outputDir, 'bookings.xlsx'));

console.log('✅ Generated bookings.xlsx with your exact column format');
console.log('\n📋 Column names included:');
console.log('- Sale Date, Name, Source, Visa Type, Nationality, Visa, DOB');
console.log('- Deposit Paid, Paid, Course Fee Due, Accomodation, Transfer');
console.log('- Exam Fee, Registration Fee, Learner Protection, Medical Insurance');
console.log('- Total Booking, Total Booking Due');
console.log('- Course, Placement test score, Level/Class, Weeks');
console.log('- Start date, End date, Accom Type');
console.log(`\n📁 File location: ${path.join(outputDir, 'bookings.xlsx')}`);
console.log('\n⚠️  NOTE: Before importing, ensure these reference data exist:');
console.log('- Courses: "General English B1", "IELTS Preparation", "General English A2"');
console.log('- Accommodation Types: "Host Family", "Residence", "Student House"');
console.log("- Agencies will be auto-created if they don't exist");
