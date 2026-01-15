'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const SAVED_VIEWS = [
  { id: 'all', label: 'All Students', icon: '👥' },
  { id: 'active', label: 'Active', icon: '✅' },
  { id: 'visa-expiring', label: 'Visa Expiring', icon: '⚠️' },
  { id: 'new-this-week', label: 'New This Week', icon: '🆕' },
  { id: 'at-risk', label: 'At Risk', icon: '🚨' },
];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const STATUSES = ['active', 'suspended', 'archived'];

export function StudentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentView = searchParams.get('view') || 'all';
  const currentStatus = searchParams.get('status') || '';
  const currentLevel = searchParams.get('level') || '';
  const searchQuery = searchParams.get('search') || '';

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const handleViewChange = (viewId: string) => {
    updateParams({ view: viewId, status: null, level: null });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams({ status: e.target.value || null });
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams({ level: e.target.value || null });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateParams({ search: e.target.value || null });
  };

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = currentView !== 'all' || currentStatus || currentLevel || searchQuery;

  return (
    <div className="space-y-4">
      {/* Header with Add Student button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Student Registry</h1>
        <a
          href="/admin/students/create"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Student
        </a>
      </div>

      {/* Saved Views */}
      <div className="flex flex-wrap items-center gap-2">
        {SAVED_VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => handleViewChange(view.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentView === view.id
                ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
            }`}
          >
            <span>{view.icon}</span>
            {view.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-40">
          <select
            value={currentStatus}
            onChange={handleStatusChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* CEFR Level Filter */}
        <div className="w-32">
          <select
            value={currentLevel}
            onChange={handleLevelChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Levels</option>
            {CEFR_LEVELS.map(level => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">Active filters:</span>
          {currentView !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded">
              {SAVED_VIEWS.find(v => v.id === currentView)?.label}
              <button
                onClick={() => handleViewChange('all')}
                className="ml-1 hover:text-purple-900"
              >
                ×
              </button>
            </span>
          )}
          {currentStatus && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
              Status: {currentStatus}
              <button
                onClick={() => updateParams({ status: null })}
                className="ml-1 hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {currentLevel && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
              Level: {currentLevel}
              <button
                onClick={() => updateParams({ level: null })}
                className="ml-1 hover:text-green-900"
              >
                ×
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
              Search: "{searchQuery}"
              <button
                onClick={() => updateParams({ search: null })}
                className="ml-1 hover:text-gray-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
