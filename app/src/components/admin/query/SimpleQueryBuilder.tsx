'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SchemaTable {
  name: string;
  description?: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
  }[];
}

interface Filter {
  column: string;
  operator: string;
  value: string;
}

interface QueryResult {
  sql: string;
  data?: unknown[];
  error?: string;
}

const OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: 'LIKE', label: 'Contains' },
  { value: 'IN', label: 'In List' },
];

export function SimpleQueryBuilder() {
  const [tables, setTables] = useState<SchemaTable[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [limit, setLimit] = useState('100');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load schema on mount
  useEffect(() => {
    fetch('/api/admin/query/schema')
      .then(res => res.json())
      .then(data => setTables(data.tables))
      .catch(console.error);
  }, []);

  const currentTable = tables.find(t => t.name === selectedTable);

  const handleAddFilter = () => {
    if (!currentTable || currentTable.columns.length === 0) return;
    setFilters([...filters, { column: currentTable.columns[0].name, operator: '=', value: '' }]);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = (index: number, field: keyof Filter, value: string) => {
    const updated = [...filters];
    updated[index] = { ...updated[index], [field]: value };
    setFilters(updated);
  };

  const handleExecute = async () => {
    if (!selectedTable) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/query/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selectedTable,
          columns: selectedColumns.length > 0 ? selectedColumns : undefined,
          filters,
          limit: parseInt(limit, 10),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ sql: '', error: data.error });
        return;
      }

      setResult(data);
    } catch (error) {
      setResult({
        sql: '',
        error: 'Failed to execute query. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!result?.data || result.data.length === 0) return;

    const firstRow = result.data[0] as Record<string, unknown>;
    const headers = Object.keys(firstRow);
    const csvContent = [
      headers.join(','),
      ...result.data.map(row => {
        const typedRow = row as Record<string, unknown>;
        return headers.map(h => JSON.stringify(typedRow[h] || '')).join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 border rounded-lg p-4 bg-white">
        <h3 className="font-semibold text-gray-900">🔧 Build Your Query</h3>

        {/* Table Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">1. Select Table</label>
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a table..." />
            </SelectTrigger>
            <SelectContent>
              {tables.map(table => (
                <SelectItem key={table.name} value={table.name}>
                  {table.name} {table.description && `- ${table.description}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Column Selection */}
        {currentTable && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              2. Select Columns (leave empty for all)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {currentTable.columns.map(col => (
                <label key={col.name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.name)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, col.name]);
                      } else {
                        setSelectedColumns(selectedColumns.filter(c => c !== col.name));
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-gray-700">{col.name}</span>
                  <span className="text-gray-400 text-xs">({col.type})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        {currentTable && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                3. Add Filters (optional)
              </label>
              <Button variant="outline" size="sm" onClick={handleAddFilter}>
                + Add Filter
              </Button>
            </div>

            {filters.length > 0 && (
              <div className="space-y-2">
                {filters.map((filter, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <Select
                      value={filter.column}
                      onValueChange={value => handleUpdateFilter(index, 'column', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentTable.columns.map(col => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={value => handleUpdateFilter(index, 'operator', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={filter.value}
                      onChange={e => handleUpdateFilter(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />

                    <Button variant="ghost" size="sm" onClick={() => handleRemoveFilter(index)}>
                      ✖️
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Limit */}
        {currentTable && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">4. Limit Results</label>
            <Input
              type="number"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              placeholder="100"
              className="w-32"
            />
          </div>
        )}

        {/* Execute Button */}
        <div className="pt-4 border-t">
          <Button onClick={handleExecute} disabled={!selectedTable || isLoading} className="w-full">
            {isLoading ? 'Executing...' : '▶️ Run Query'}
          </Button>
        </div>
      </div>

      {/* Error */}
      {result?.error && (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

      {/* Generated SQL */}
      {result?.sql && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Generated SQL</h4>
          <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">{result.sql}</pre>
        </div>
      )}

      {/* Results */}
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
                  {result.data.length > 0 &&
                    Object.keys(result.data[0] as Record<string, unknown>).map(key => (
                      <th key={key} className="px-4 py-2 text-left font-medium text-gray-700">
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.data.map((row, i) => {
                  const typedRow = row as Record<string, unknown>;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.values(typedRow).map((value, j) => (
                        <td key={j} className="px-4 py-2 text-gray-600">
                          {String(value ?? '')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
