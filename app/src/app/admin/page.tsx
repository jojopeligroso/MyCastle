/**
 * Admin Dashboard - Page 1/21
 * Spec: docs/spec/admin/01-admin-dashboard.md
 *
 * Primary widgets:
 * - Alerts Panel (priority ordered)
 * - KPIs (7-day and 30-day metrics)
 * - Work Queue (items requiring review)
 * - Recent Activity (last 50 audit events)
 */

import { requireAuth } from '@/lib/auth/utils';
import { Suspense } from 'react';
import {
  getAdminAlerts,
  getAdminKPIs,
  getAdminWorkQueue,
  getRecentAuditEvents,
} from './_actions/dashboard';
import { AlertsPanel } from '@/components/admin/dashboard/AlertsPanel';
import { KPIGrid } from '@/components/admin/dashboard/KPIGrid';
import { WorkQueue } from '@/components/admin/dashboard/WorkQueue';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';

export default async function AdminDashboard() {
  const user = await requireAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.user_metadata?.name || 'Admin'}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what needs attention today across operations, compliance, and data integrity.
        </p>
      </div>

      {/* KPI Grid */}
      <Suspense fallback={<KPIGridSkeleton />}>
        <KPISection />
      </Suspense>

      {/* Alerts Panel */}
      <Suspense fallback={<PanelSkeleton title="Alerts" />}>
        <AlertsSection />
      </Suspense>

      {/* Work Queue */}
      <Suspense fallback={<PanelSkeleton title="Work Queue" />}>
        <WorkQueueSection />
      </Suspense>

      {/* Recent Activity */}
      <Suspense fallback={<PanelSkeleton title="Recent Activity" />}>
        <RecentActivitySection />
      </Suspense>
    </div>
  );
}

async function KPISection() {
  let kpis;
  let error = false;

  try {
    kpis = await getAdminKPIs();
  } catch (err) {
    console.error('Failed to load KPIs:', err);
    error = true;
    kpis = {
      activeStudents: 0,
      attendanceRate7d: 0,
      attendanceRate30d: 0,
      classesRunningToday: 0,
      capacityUtilisation: 0,
      newEnrolments7d: 0,
      outstandingComplianceTasks: 0,
    };
  }

  return <KPIGrid kpis={kpis} error={error} />;
}

async function AlertsSection() {
  const alerts = await getAdminAlerts();
  return <AlertsPanel alerts={alerts} />;
}

async function WorkQueueSection() {
  const items = await getAdminWorkQueue();
  return <WorkQueue items={items} />;
}

async function RecentActivitySection() {
  const events = await getRecentAuditEvents();
  return <RecentActivity events={events} />;
}

function KPIGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-300 animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
