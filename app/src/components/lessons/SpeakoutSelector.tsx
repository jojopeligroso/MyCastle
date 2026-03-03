'use client';

import { useState, useEffect } from 'react';
import type { SpeakoutContext, SpeakoutDescriptor } from '@/lib/lessons/chat-types';

interface UnitData {
  unit: string;
  lessonCount: number;
}

interface LessonData {
  lesson: string | null;
  page: number | null;
  descriptors: SpeakoutDescriptor[];
}

interface SpeakoutSelectorProps {
  onSelect: (context: SpeakoutContext) => void;
  selectedContext: SpeakoutContext | null;
}

export default function SpeakoutSelector({ onSelect, selectedContext }: SpeakoutSelectorProps) {
  const [books, setBooks] = useState<string[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [lessons, setLessons] = useState<LessonData[]>([]);

  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');

  const [loading, setLoading] = useState({ books: true, units: false, lessons: false });
  const [error, setError] = useState<string | null>(null);

  // Fetch books on mount
  useEffect(() => {
    async function fetchBooks() {
      try {
        const res = await fetch('/api/lessons/speakout/books');
        const data = await res.json();
        if (data.success) {
          setBooks(data.data);
        } else {
          setError('Failed to load books');
        }
      } catch {
        setError('Error loading books');
      } finally {
        setLoading(prev => ({ ...prev, books: false }));
      }
    }
    fetchBooks();
  }, []);

  // Fetch units when book changes
  useEffect(() => {
    if (!selectedBook) {
      setUnits([]);
      setSelectedUnit('');
      return;
    }

    async function fetchUnits() {
      setLoading(prev => ({ ...prev, units: true }));
      try {
        const res = await fetch(
          `/api/lessons/speakout/units?book=${encodeURIComponent(selectedBook)}`
        );
        const data = await res.json();
        if (data.success) {
          setUnits(data.data);
        }
      } catch {
        setError('Error loading units');
      } finally {
        setLoading(prev => ({ ...prev, units: false }));
      }
    }
    fetchUnits();
    setSelectedUnit('');
    setLessons([]);
    setSelectedLesson('');
  }, [selectedBook]);

  // Fetch lessons when unit changes
  useEffect(() => {
    if (!selectedBook || !selectedUnit) {
      setLessons([]);
      setSelectedLesson('');
      return;
    }

    async function fetchLessons() {
      setLoading(prev => ({ ...prev, lessons: true }));
      try {
        const res = await fetch(
          `/api/lessons/speakout/lessons?book=${encodeURIComponent(selectedBook)}&unit=${encodeURIComponent(selectedUnit)}`
        );
        const data = await res.json();
        if (data.success) {
          setLessons(data.data);
        }
      } catch {
        setError('Error loading lessons');
      } finally {
        setLoading(prev => ({ ...prev, lessons: false }));
      }
    }
    fetchLessons();
    setSelectedLesson('');
  }, [selectedBook, selectedUnit]);

  // Handle lesson selection
  const handleLessonSelect = (lessonTitle: string) => {
    setSelectedLesson(lessonTitle);

    const lessonData = lessons.find(l => l.lesson === lessonTitle);
    if (lessonData) {
      const context: SpeakoutContext = {
        book: selectedBook,
        unit: selectedUnit,
        lesson: lessonTitle,
        page: lessonData.page ?? undefined,
        level: lessonData.descriptors[0]?.level || 'B1',
        descriptors: lessonData.descriptors,
      };
      onSelect(context);
    }
  };

  // Get unique CEFR levels for badge display
  const getLevelBadges = (descriptors: SpeakoutDescriptor[]) => {
    const levels = [...new Set(descriptors.map(d => d.level))];
    return levels;
  };

  // Get unique skills for badge display
  const getSkillBadges = (descriptors: SpeakoutDescriptor[]) => {
    const skills = [...new Set(descriptors.map(d => d.skillFocus))];
    return skills;
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Book Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Speakout Book</label>
          <select
            value={selectedBook}
            onChange={e => setSelectedBook(e.target.value)}
            disabled={loading.books}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          >
            <option value="">{loading.books ? 'Loading...' : 'Select a book'}</option>
            {books.map(book => (
              <option key={book} value={book}>
                {book}
              </option>
            ))}
          </select>
        </div>

        {/* Unit Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
            disabled={!selectedBook || loading.units}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
          >
            <option value="">
              {loading.units
                ? 'Loading...'
                : selectedBook
                  ? 'Select a unit'
                  : 'Select a book first'}
            </option>
            {units.map(unit => (
              <option key={unit.unit} value={unit.unit}>
                {unit.unit} ({unit.lessonCount} lessons)
              </option>
            ))}
          </select>
        </div>

        {/* Lesson Count / Status */}
        <div className="flex items-end">
          {selectedUnit && (
            <div className="text-sm text-gray-500">
              {loading.lessons ? (
                <span className="text-indigo-600">Loading lessons...</span>
              ) : (
                <span>{lessons.length} lessons available</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lesson List */}
      {lessons.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Select a Lesson</label>
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {lessons.map(lesson => (
              <button
                key={lesson.lesson}
                onClick={() => handleLessonSelect(lesson.lesson || '')}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selectedLesson === lesson.lesson
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{lesson.lesson || 'Untitled'}</span>
                    {lesson.page && (
                      <span className="text-sm text-gray-500 ml-2">p. {lesson.page}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {getLevelBadges(lesson.descriptors).map(level => (
                      <span
                        key={level}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {getSkillBadges(lesson.descriptors).map(skill => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Context Preview */}
      {selectedContext && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-800 mb-2">Selected Lesson</h4>
          <p className="text-sm text-green-700">
            <strong>{selectedContext.lesson}</strong> from {selectedContext.book},{' '}
            {selectedContext.unit}
          </p>
          <p className="text-xs text-green-600 mt-1">
            CEFR Level: {selectedContext.level} | {selectedContext.descriptors.length} learning
            objectives
          </p>
        </div>
      )}
    </div>
  );
}
