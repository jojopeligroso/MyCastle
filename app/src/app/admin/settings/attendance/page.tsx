'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Info } from 'lucide-react';

interface AttendanceSettings {
  lateAbsentThresholdMinutes: number;
  cumulativeLatenessEnabled: boolean;
  cumulativeDeductionMinutes: number;
}

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [lateThreshold, setLateThreshold] = useState(15);
  const [cumulativeEnabled, setCumulativeEnabled] = useState(false);
  const [cumulativeThreshold, setCumulativeThreshold] = useState(16);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/settings/attendance');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      setSettings(data);
      setLateThreshold(data.lateAbsentThresholdMinutes);
      setCumulativeEnabled(data.cumulativeLatenessEnabled);
      setCumulativeThreshold(data.cumulativeDeductionMinutes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/admin/settings/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateAbsentThresholdMinutes: lateThreshold,
          cumulativeLatenessEnabled: cumulativeEnabled,
          cumulativeDeductionMinutes: cumulativeThreshold,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save settings');
      }

      const data = await response.json();
      setSettings(data);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    settings &&
    (lateThreshold !== settings.lateAbsentThresholdMinutes ||
      cumulativeEnabled !== settings.cumulativeLatenessEnabled ||
      cumulativeThreshold !== settings.cumulativeDeductionMinutes);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/settings"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure late arrival thresholds and cumulative lateness tracking
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-500">Loading settings...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          <p className="font-medium">Settings saved successfully</p>
        </div>
      )}

      {!isLoading && settings && (
        <div className="space-y-6">
          {/* Late Threshold Section */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Late Arrival Threshold
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  Students arriving more than this many minutes late will be marked as{' '}
                  <span className="font-medium text-red-600">absent</span> for attendance percentage
                  calculations, but will still show as{' '}
                  <span className="font-medium">
                    &quot;L{'{'}n{'}'}&quot;
                  </span>{' '}
                  in the grid for fire drill purposes.
                </p>
              </div>
              <div className="mt-5">
                <div className="flex items-center gap-4">
                  <label htmlFor="late-threshold" className="text-sm font-medium text-gray-700">
                    Threshold (minutes)
                  </label>
                  <input
                    type="number"
                    id="late-threshold"
                    min={1}
                    max={89}
                    value={lateThreshold}
                    onChange={e => setLateThreshold(parseInt(e.target.value, 10) || 15)}
                    className="w-24 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                  />
                  <span className="text-sm text-gray-500">
                    (Default: 15 minutes. Students arriving &gt; {lateThreshold} min late count as
                    absent)
                  </span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-700">Example:</p>
                    <ul className="mt-1 space-y-1">
                      <li>
                        Student arrives <strong>5 minutes late</strong>: Shows as{' '}
                        <span className="bg-yellow-100 text-yellow-800 px-1 rounded">L5</span>{' '}
                        (counts as present)
                      </li>
                      <li>
                        Student arrives <strong>{lateThreshold + 3} minutes late</strong>: Shows as{' '}
                        <span className="bg-red-100 text-red-800 px-1 rounded">
                          L{lateThreshold + 3}
                        </span>{' '}
                        (counts as absent)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cumulative Lateness Section */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Cumulative Lateness Tracking
                  </h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>
                      When enabled, late minutes accumulate over the week. Every time the cumulative
                      total exceeds the threshold, it counts as one absence equivalent (-10% from
                      attendance).
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cumulativeEnabled}
                    onClick={() => setCumulativeEnabled(!cumulativeEnabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      cumulativeEnabled ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        cumulativeEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {cumulativeEnabled && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="cumulative-threshold"
                      className="text-sm font-medium text-gray-700"
                    >
                      Deduction threshold (minutes)
                    </label>
                    <input
                      type="number"
                      id="cumulative-threshold"
                      min={1}
                      max={180}
                      value={cumulativeThreshold}
                      onChange={e => setCumulativeThreshold(parseInt(e.target.value, 10) || 16)}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm"
                    />
                    <span className="text-sm text-gray-500">
                      (Every {cumulativeThreshold} cumulative minutes = -10% attendance)
                    </span>
                  </div>

                  <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-700">
                        <p className="font-medium">How cumulative lateness works:</p>
                        <ul className="mt-1 space-y-1 list-disc list-inside">
                          <li>
                            Minutes from students marked as{' '}
                            <span className="bg-yellow-100 px-1 rounded">late</span> (not
                            late_absent) accumulate weekly
                          </li>
                          <li>
                            Example: 5 min + 5 min + 7 min = 17 min cumulative = 1 absence
                            equivalent
                          </li>
                          <li>Resets every Monday at midnight</li>
                          <li>
                            Students already marked as{' '}
                            <span className="bg-red-100 px-1 rounded">late_absent</span> don&apos;t
                            accumulate (already counted as absent)
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {hasChanges && (
              <span className="text-sm text-orange-600 font-medium">You have unsaved changes</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                hasChanges && !isSaving
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
