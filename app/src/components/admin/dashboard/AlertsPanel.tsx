'use client';

import { useState } from 'react';
import Link from 'next/link';
import { acknowledgeAlert } from '@/app/admin/_actions/dashboard';

interface Alert {
  alert_id: string;
  alert_type: string;
  priority: number;
  entity_type: string;
  entity_id: string;
  message: string;
  action_url: string | null;
  created_at: Date;
  acknowledged_at: Date | null;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const PRIORITY_LABELS = {
  1: { label: 'Critical', color: 'red' },
  2: { label: 'High', color: 'orange' },
  3: { label: 'Medium', color: 'yellow' },
  4: { label: 'Low', color: 'blue' },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  visa_risk: 'Visa Risk',
  missing_register: 'Missing Register',
  timetable_conflict: 'Timetable Conflict',
  etl_failed: 'ETL Failed',
  bounced_email: 'Bounced Email',
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      const result = await acknowledgeAlert(alertId);
      if (result.success) {
        setAcknowledgedAlerts(prev => new Set(prev).add(alertId));
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setAcknowledging(null);
    }
  };

  const activeAlerts = alerts.filter(
    a => !a.acknowledged_at && !acknowledgedAlerts.has(a.alert_id)
  );

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h2>
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">All clear!</p>
          <p className="text-sm">No active alerts at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Alerts
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {activeAlerts.length}
          </span>
        </h2>
      </div>
      <div className="divide-y divide-gray-200">
        {activeAlerts.map(alert => {
          const priority = PRIORITY_LABELS[alert.priority as keyof typeof PRIORITY_LABELS] || PRIORITY_LABELS[4];
          const isAcknowledging = acknowledging === alert.alert_id;

          return (
            <div key={alert.alert_id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${priority.color}-100 text-${priority.color}-800`}
                    >
                      {priority.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{alert.message}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {alert.action_url && (
                    <Link
                      href={alert.action_url}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View
                    </Link>
                  )}
                  <button
                    onClick={() => handleAcknowledge(alert.alert_id)}
                    disabled={isAcknowledging}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
