'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, User, Users, BookOpen, Loader2 } from 'lucide-react';

type SearchResult = {
  id: string;
  name: string;
  email?: string;
  code?: string;
  level?: string;
  status?: string;
  type: 'student' | 'teacher' | 'class';
};

type SearchResults = {
  students: SearchResult[];
  teachers: SearchResult[];
  classes: SearchResult[];
  query: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        setResults(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError('Failed to search. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const totalResults =
    (results?.students.length || 0) +
    (results?.teachers.length || 0) +
    (results?.classes.length || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Global Search</h1>
        <p className="mt-1 text-sm text-gray-500">Search across students, teachers, and classes</p>
      </div>

      {/* Search Input */}
      <div className="bg-white shadow sm:rounded-lg p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, email, or class code..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-base"
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {query.length < 2
            ? 'Enter at least 2 characters to search'
            : `Searching for "${query}"...${totalResults > 0 ? ` Found ${totalResults} results` : ''}`}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Empty State - No Search Yet */}
      {!query && !results && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Start searching</h3>
            <p className="mt-1 text-sm text-gray-500">
              Type in the search box above to find students, teachers, or classes.
            </p>
          </div>
        </div>
      )}

      {/* No Results State */}
      {debouncedQuery.length >= 2 && results && totalResults === 0 && !isLoading && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No matches for &quot;{debouncedQuery}&quot;. Try a different search term.
            </p>
          </div>
        </div>
      )}

      {/* Results - Students */}
      {results && results.students.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900">Students</h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {results.students.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-200">
              {results.students.map(student => (
                <li key={student.id}>
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="block hover:bg-gray-50 py-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {student.level && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {student.level}
                          </span>
                        )}
                        <span className="text-sm text-gray-400">View →</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Results - Teachers */}
      {results && results.teachers.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900">Teachers</h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {results.teachers.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-200">
              {results.teachers.map(teacher => (
                <li key={teacher.id}>
                  <Link
                    href={`/admin/users/${teacher.id}`}
                    className="block hover:bg-gray-50 py-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">{teacher.name}</p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Teacher
                        </span>
                        <span className="text-sm text-gray-400">View →</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Results - Classes */}
      {results && results.classes.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900">Classes</h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {results.classes.length}
              </span>
            </div>
            <ul className="divide-y divide-gray-200">
              {results.classes.map(cls => (
                <li key={cls.id}>
                  <Link
                    href={`/admin/classes/${cls.id}`}
                    className="block hover:bg-gray-50 py-4 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">
                          {cls.name}{' '}
                          {cls.code && <span className="text-gray-500">({cls.code})</span>}
                        </p>
                        {cls.level && <p className="text-sm text-gray-500">Level: {cls.level}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {cls.status && (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              cls.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : cls.status === 'completed'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {cls.status}
                          </span>
                        )}
                        <span className="text-sm text-gray-400">View →</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
