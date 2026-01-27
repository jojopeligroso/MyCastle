/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(__dirname, '../src/app/admin');

const pages = [
  // Registry
  { path: 'users', title: 'User Management', desc: 'Manage system users and roles' },
  { path: 'students', title: 'Student Registry', desc: 'Manage student profiles and enrollments' },
  { path: 'teachers', title: 'Teacher Registry', desc: 'Manage teacher assignments and profiles' },
  {
    path: 'classes',
    title: 'Class & Cohort Management',
    desc: 'Manage academic classes and cohorts',
  },

  // Academic
  { path: 'timetable', title: 'Timetable Overview', desc: 'View and manage schedules' },
  { path: 'attendance', title: 'Attendance and Registers', desc: 'Track and verify attendance' },
  {
    path: 'progress',
    title: 'Progress and CEFR Tracking',
    desc: 'Monitor student academic progress',
  },

  // Compliance
  {
    path: 'compliance/visa',
    title: 'Visa and Immigration Compliance',
    desc: 'Track visa status and compliance requirements',
  },
  {
    path: 'compliance/regulatory',
    title: 'Regulatory Reporting',
    desc: 'Generate regulatory reports',
  },
  { path: 'audit-log', title: 'Audit Log', desc: 'View system audit trails' },

  // Data & Search
  { path: 'search', title: 'Advanced Search', desc: 'Query builder and advanced search' },
  { path: 'data/bulk-upload', title: 'Bulk Uploads (ETL)', desc: 'Import data via CSV/Excel' },
  { path: 'data/exports', title: 'Data Exports', desc: 'Export system data' },

  // System & Settings
  {
    path: 'communications/notifications',
    title: 'Notifications and Messaging',
    desc: 'Manage system alerts and messages',
  },
  { path: 'communications/email-logs', title: 'Email Logs', desc: 'View delivery logs' },
  { path: 'settings', title: 'System Settings', desc: 'Configure application settings' },
  {
    path: 'integrations',
    title: 'Integrations',
    desc: 'Manage external integrations',
    restricted: true,
  },
  {
    path: 'policies',
    title: 'Access Policies',
    desc: 'Configure RBAC and policies',
    restricted: true,
  },

  // Profile & Help
  { path: 'profile', title: 'Profile and Security', desc: 'Manage your account security' },
  { path: 'help', title: 'Help and Diagnostics', desc: 'System diagnostics and support' },
];

const template = (title: string, desc: string, restricted: boolean) => `
import { requireAuth } from '@/lib/auth/utils';

export default async function Page() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">${title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          ${desc}
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="h-96 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center flex-col gap-4">
             ${
               restricted
                 ? `<svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <span className="text-gray-400 font-medium">Access Restricted</span>
                  <span className="text-gray-400 text-sm">You do not have permission to view this resource.</span>`
                 : `<span className="text-gray-400">Content placeholder for ${title}</span>`
             }
          </div>
        </div>
      </div>
    </div>
  );
}
`;

// Helper to ensure directory exists
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

console.log('🚀 Scaffolding Admin Pages...');

pages.forEach(p => {
  const filePath = path.join(APP_DIR, p.path, 'page.tsx');

  // Don't overwrite if exists (except maybe for placeholder check?)
  // For now, let's assume we want to create if missing.
  // Actually, user wants these specifically created now, so safe to write if not customized.
  // I will check if it exists purely to log.

  if (fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${p.path} (Already exists)`);
  } else {
    ensureDirectoryExistence(filePath);
    fs.writeFileSync(filePath, template(p.title, p.desc, !!p.restricted));
    console.log(`✅ Created ${p.path}`);
  }
});

console.log('🎉 Scaffolding Complete!');
