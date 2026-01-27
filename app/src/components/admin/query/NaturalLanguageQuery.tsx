'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QueryResult {
  sql: string;
  explanation: string;
  data?: unknown[];
  error?: string;
  affectedRows?: number;
}

export function NaturalLanguageQuery() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleTranslate = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);
    setShowPreview(false);

    try {
      const response = await fetch('/api/admin/query/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ sql: '', explanation: '', error: data.error });
        return;
      }

      setResult(data);
      setShowPreview(true);
    } catch (error) {
      setResult({
        sql: '',
        explanation: '',
        error: 'Failed to translate query. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!result?.sql) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: result.sql }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ ...result, error: data.error });
        return;
      }

      setResult({
        ...result,
        data: data.data,
        affectedRows: data.affectedRows,
      });
      setShowPreview(false);
    } catch (error) {
      setResult({
        ...result,
        error: 'Failed to execute query. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!result?.data) return;

    // Convert to CSV
    const headers = Object.keys(result.data[0]);
    const csvContent = [
      headers.join(','),
      ...result.data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="query" className="block text-sm font-medium text-gray-700">
          🗣️ Natural Language Query
        </label>
        <Textarea
          id="query"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Example: Show me all active students in Pre-Int level"
          className="h-24"
          disabled={isLoading}
        />
        <p className="text-sm text-gray-500">
          Describe what you want to see in plain English. The system will translate it to SQL.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleTranslate} disabled={!query.trim() || isLoading} className="flex-1">
          {isLoading ? 'Translating...' : '🔍 Translate to SQL'}
        </Button>
      </div>

      {result?.error && (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

      {showPreview && result && !result.error && (
        <div className="border rounded-lg p-4 space-y-4 bg-blue-50">
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">📝 SQL Query</h3>
            <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">{result.sql}</pre>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-2">💡 Explanation</h3>
            <p className="text-sm text-gray-600">{result.explanation}</p>
          </div>

          <Alert>
            <AlertDescription>
              ⚠️ Review the SQL query above carefully before executing. This will query your
              database.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={handleExecute} disabled={isLoading} className="flex-1">
              {isLoading ? 'Executing...' : '▶️ Execute Query'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setResult(null);
              }}
            >
              ✖️ Cancel
            </Button>
          </div>
        </div>
      )}

      {result?.data && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-700">
              ✅ Results ({result.data.length} rows)
            </h3>
            <Button variant="outline" size="sm" onClick={handleExport}>
              📥 Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {result.data[0] &&
                    Object.keys(result.data[0]).map(key => (
                      <th key={key} className="px-4 py-2 text-left font-medium text-gray-700">
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.values(row).map((value, j) => (
                      <td key={j} className="px-4 py-2 text-gray-600">
                        {String(value || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
