'use client';

import { useState, useEffect, useMemo } from 'react';

interface CefrDescriptor {
  id: string;
  level: string;
  category: string;
  subcategory: string | null;
  descriptorText: string;
  scale: string | null;
  skillFocus: string | null;
  isOverall: boolean;
  youngLearners7To10: string | null;
  youngLearners11To15: string | null;
}

interface TextbookDescriptor {
  id: string;
  book: string;
  unit: string;
  page: number | null;
  lesson: string | null;
  level: string;
  skillFocus: string;
  descriptorText: string;
}

type TabType = 'cefr' | 'textbook';

const LEVELS = ['PreA1', 'A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];
const SKILLS = ['Reading', 'Writing', 'Listening', 'Speaking', 'Mediation', 'General'];
const BOOKS = [
  'Speakout Pre-intermediate 2nd endition',
  'Speakout Intermediate 2nd Edition',
  'Speakout intermediate plus 2nd edition',
  'Speakout Upper Intermediate 2nd edition',
  'Speakout Advanced 2nd edition',
  'Speakout AdvPlus 2nd edition',
];

export default function CEFRBrowserPage() {
  const [activeTab, setActiveTab] = useState<TabType>('cefr');
  const [cefrDescriptors, setCefrDescriptors] = useState<CefrDescriptor[]>([]);
  const [textbookDescriptors, setTextbookDescriptors] = useState<TextbookDescriptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for CEFR tab
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filters for Textbook tab
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [cefrRes, textbookRes] = await Promise.all([
          fetch('/api/admin/curriculum/cefr'),
          fetch('/api/admin/curriculum/textbook'),
        ]);

        if (!cefrRes.ok || !textbookRes.ok) {
          throw new Error('Failed to fetch descriptors');
        }

        const cefrData = await cefrRes.json();
        const textbookData = await textbookRes.json();

        setCefrDescriptors(cefrData.descriptors || []);
        setTextbookDescriptors(textbookData.descriptors || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Get unique scales from CEFR descriptors
  const scales = useMemo(() => {
    const uniqueScales = new Set(cefrDescriptors.map(d => d.scale).filter(Boolean));
    return Array.from(uniqueScales).sort() as string[];
  }, [cefrDescriptors]);

  // Get unique units from textbook descriptors for selected book
  const units = useMemo(() => {
    const filtered = selectedBook
      ? textbookDescriptors.filter(d => d.book === selectedBook)
      : textbookDescriptors;
    const uniqueUnits = new Set(filtered.map(d => d.unit).filter(Boolean));
    return Array.from(uniqueUnits).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [textbookDescriptors, selectedBook]);

  // Filter CEFR descriptors
  const filteredCefr = useMemo(() => {
    return cefrDescriptors.filter(d => {
      if (selectedLevel && d.level !== selectedLevel) return false;
      if (selectedSkill && d.category !== selectedSkill) return false;
      if (selectedScale && d.scale !== selectedScale) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !d.descriptorText.toLowerCase().includes(query) &&
          !d.scale?.toLowerCase().includes(query) &&
          !d.subcategory?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [cefrDescriptors, selectedLevel, selectedSkill, selectedScale, searchQuery]);

  // Filter textbook descriptors
  const filteredTextbook = useMemo(() => {
    return textbookDescriptors.filter(d => {
      if (selectedBook && d.book !== selectedBook) return false;
      if (selectedUnit && d.unit !== selectedUnit) return false;
      if (selectedLevel && d.level !== selectedLevel) return false;
      if (selectedSkill && d.skillFocus !== selectedSkill) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !d.descriptorText.toLowerCase().includes(query) &&
          !d.lesson?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [textbookDescriptors, selectedBook, selectedUnit, selectedLevel, selectedSkill, searchQuery]);

  // Group textbook descriptors by unit
  const groupedTextbook = useMemo(() => {
    const groups: Record<string, TextbookDescriptor[]> = {};
    filteredTextbook.forEach(d => {
      const key = `${d.unit} - ${d.lesson || 'General'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  }, [filteredTextbook]);

  const clearFilters = () => {
    setSelectedLevel('');
    setSelectedSkill('');
    setSelectedScale('');
    setSelectedBook('');
    setSelectedUnit('');
    setSearchQuery('');
  };

  const getLevelColor = (level: string): string => {
    if (level.startsWith('A')) return 'bg-green-100 text-green-800';
    if (level.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (level.startsWith('C')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSkillIcon = (skill: string): string => {
    switch (skill) {
      case 'Reading':
        return '📖';
      case 'Writing':
        return '✍️';
      case 'Listening':
        return '👂';
      case 'Speaking':
        return '🗣️';
      case 'Mediation':
        return '🤝';
      default:
        return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading descriptors</h3>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CEFR Descriptors</h1>
        <p className="text-gray-600 mt-1">
          Browse {cefrDescriptors.length.toLocaleString()} official CEFR descriptors and{' '}
          {textbookDescriptors.length.toLocaleString()} Speakout textbook mappings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cefr')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cefr'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Official CEFR ({cefrDescriptors.length.toLocaleString()})
          </button>
          <button
            onClick={() => setActiveTab('textbook')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'textbook'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Speakout Textbooks ({textbookDescriptors.length.toLocaleString()})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search descriptors..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Level Filter */}
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Levels</option>
              {LEVELS.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Skill Filter */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Skill</label>
            <select
              value={selectedSkill}
              onChange={e => setSelectedSkill(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Skills</option>
              {SKILLS.map(skill => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          {/* Tab-specific filters */}
          {activeTab === 'cefr' && (
            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
              <select
                value={selectedScale}
                onChange={e => setSelectedScale(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Scales</option>
                {scales.map(scale => (
                  <option key={scale} value={scale}>
                    {scale}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'textbook' && (
            <>
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                <select
                  value={selectedBook}
                  onChange={e => {
                    setSelectedBook(e.target.value);
                    setSelectedUnit('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Books</option>
                  {BOOKS.map(book => (
                    <option key={book} value={book}>
                      {book
                        .replace('Speakout ', '')
                        .replace(' 2nd edition', '')
                        .replace(' 2nd endition', '')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Units</option>
                  {units.map(unit => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Clear Filters */}
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            Clear filters
          </button>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing{' '}
          {activeTab === 'cefr'
            ? filteredCefr.length.toLocaleString()
            : filteredTextbook.length.toLocaleString()}{' '}
          results
        </div>
      </div>

      {/* Results */}
      {activeTab === 'cefr' ? (
        <div className="space-y-3">
          {filteredCefr.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No descriptors match your filters</div>
          ) : (
            filteredCefr.slice(0, 100).map(descriptor => (
              <div
                key={descriptor.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(descriptor.level)}`}
                    >
                      {descriptor.level}
                    </span>
                    <span className="text-lg" title={descriptor.category}>
                      {getSkillIcon(descriptor.category)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {descriptor.category}
                      </span>
                      {descriptor.scale && (
                        <span className="text-xs text-gray-500">• {descriptor.scale}</span>
                      )}
                      {descriptor.isOverall && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                          Overall
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700">{descriptor.descriptorText}</p>
                    {(descriptor.youngLearners7To10 || descriptor.youngLearners11To15) && (
                      <div className="mt-2 text-sm">
                        {descriptor.youngLearners7To10 && (
                          <div className="text-green-700">
                            <span className="font-medium">Ages 7-10:</span>{' '}
                            {descriptor.youngLearners7To10}
                          </div>
                        )}
                        {descriptor.youngLearners11To15 && (
                          <div className="text-blue-700">
                            <span className="font-medium">Ages 11-15:</span>{' '}
                            {descriptor.youngLearners11To15}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {filteredCefr.length > 100 && (
            <div className="text-center py-4 text-gray-500">
              Showing first 100 of {filteredCefr.length.toLocaleString()} results. Use filters to
              narrow down.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedTextbook).length === 0 ? (
            <div className="text-center py-12 text-gray-500">No descriptors match your filters</div>
          ) : (
            Object.entries(groupedTextbook)
              .slice(0, 20)
              .map(([group, descriptors]) => (
                <div
                  key={group}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">{group}</h3>
                    <p className="text-sm text-gray-500">
                      {descriptors[0].book.replace('Speakout ', '')} • Page{' '}
                      {descriptors[0].page || '?'}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {descriptors.map(d => (
                      <div key={d.id} className="p-4 flex items-start gap-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(d.level)}`}
                        >
                          {d.level}
                        </span>
                        <span className="text-lg" title={d.skillFocus}>
                          {getSkillIcon(d.skillFocus)}
                        </span>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-600">{d.skillFocus}</span>
                          <p className="text-gray-700 mt-1">{d.descriptorText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
          {Object.keys(groupedTextbook).length > 20 && (
            <div className="text-center py-4 text-gray-500">
              Showing first 20 groups. Use filters to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
