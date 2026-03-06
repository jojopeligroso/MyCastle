/**
 * CompetencyProgressTab Component Tests
 *
 * Comprehensive tests for the Competency Progress tab component.
 * Tests cover:
 * - Rendering with various props
 * - Skill category display (Reading, Writing, Listening, Speaking)
 * - Progress bar calculations
 * - Skill gap details
 * - Assessment scale legend
 * - Empty states
 * - Teacher/Admin specific features
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompetencyProgressTab } from '@/components/admin/students/tabs/CompetencyProgressTab';

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: {
      skillGroups: [
        { category: 'Reading', competent: 5, total: 10, gaps: [] },
        { category: 'Writing', competent: 3, total: 10, gaps: [] },
        { category: 'Listening', competent: 7, total: 10, gaps: [] },
        { category: 'Speaking', competent: 4, total: 10, gaps: [] },
      ],
      summary: { competent: 19, total: 40, progress: 47.5 },
    },
    isLoading: false,
    error: null,
    mutate: jest.fn(),
  })),
}));

describe('CompetencyProgressTab', () => {
  const defaultProps = {
    studentId: 'student-123',
    studentName: 'Test Student',
    currentLevel: 'B1',
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      expect(screen.getByText('CEFR Competency Progress')).toBeInTheDocument();
    });

    it('displays the current level in the header', () => {
      render(<CompetencyProgressTab {...defaultProps} currentLevel="B2" />);
      expect(screen.getByText(/Tracking descriptors for level/)).toBeInTheDocument();
      expect(screen.getByText('B2')).toBeInTheDocument();
    });

    it('displays warning when no level is assigned', () => {
      render(<CompetencyProgressTab {...defaultProps} currentLevel={null} />);
      expect(screen.getByText(/Student has no assigned CEFR level/)).toBeInTheDocument();
    });
  });

  describe('Skill Categories', () => {
    it('displays all four main skill categories', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      expect(screen.getByText('Reading')).toBeInTheDocument();
      expect(screen.getByText('Writing')).toBeInTheDocument();
      expect(screen.getByText('Listening')).toBeInTheDocument();
      expect(screen.getByText('Speaking')).toBeInTheDocument();
    });

    it('displays category icons', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      // Each category button should have an SVG icon
      const categoryButtons = screen.getAllByRole('button');
      expect(categoryButtons.length).toBeGreaterThanOrEqual(4);
    });

    it('allows selecting a category to view details', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      const readingButton = screen.getByText('Reading').closest('button');
      expect(readingButton).toBeInTheDocument();

      if (readingButton) {
        fireEvent.click(readingButton);
        // After clicking, the "Skill Gaps" section for that category should appear
        expect(screen.getByText('Reading Skill Gaps')).toBeInTheDocument();
      }
    });

    it('toggles category selection on second click', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      const readingButton = screen.getByText('Reading').closest('button');

      if (readingButton) {
        fireEvent.click(readingButton);
        expect(screen.getByText('Reading Skill Gaps')).toBeInTheDocument();

        fireEvent.click(readingButton);
        expect(screen.queryByText('Reading Skill Gaps')).not.toBeInTheDocument();
      }
    });

    it('applies selected styling to active category', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      const readingButton = screen.getByText('Reading').closest('button');

      if (readingButton) {
        expect(readingButton.className).not.toContain('purple-500');

        fireEvent.click(readingButton);
        expect(readingButton.className).toContain('purple-500');
      }
    });
  });

  describe('Progress Display', () => {
    it('displays "No descriptors tracked" when total is 0', () => {
      // Override mock for empty state
      const useSWR = require('swr').default;
      useSWR.mockReturnValueOnce({
        data: {
          skillGroups: [
            { category: 'Reading', competent: 0, total: 0, gaps: [] },
            { category: 'Writing', competent: 0, total: 0, gaps: [] },
            { category: 'Listening', competent: 0, total: 0, gaps: [] },
            { category: 'Speaking', competent: 0, total: 0, gaps: [] },
          ],
          summary: { competent: 0, total: 0, progress: 0 },
        },
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });
      render(<CompetencyProgressTab {...defaultProps} />);
      const noDataMessages = screen.getAllByText('No descriptors tracked');
      expect(noDataMessages.length).toBe(4);
    });
  });

  describe('Assessment Scale Legend', () => {
    it('displays the assessment scale legend', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      expect(screen.getByText('Assessment Scale')).toBeInTheDocument();
    });

    it('displays all four score levels', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      expect(screen.getByText('1 - Not demonstrated')).toBeInTheDocument();
      expect(screen.getByText('2 - Emerging')).toBeInTheDocument();
      expect(screen.getByText('3 - Developing')).toBeInTheDocument();
      expect(screen.getByText('4 - Competent')).toBeInTheDocument();
    });

    it('displays color indicators for each level', () => {
      render(<CompetencyProgressTab {...defaultProps} />);
      const legendSection = screen.getByText('Assessment Scale').closest('section');
      expect(legendSection).toBeInTheDocument();

      if (legendSection) {
        // Check for colored indicators
        const colorIndicators = legendSection.querySelectorAll('.rounded');
        expect(colorIndicators.length).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe('Empty State', () => {
    it('displays comprehensive empty state when no data exists', () => {
      // Override mock for empty state
      const useSWR = require('swr').default;
      useSWR.mockReturnValueOnce({
        data: {
          skillGroups: [
            { category: 'Reading', competent: 0, total: 0, gaps: [] },
            { category: 'Writing', competent: 0, total: 0, gaps: [] },
            { category: 'Listening', competent: 0, total: 0, gaps: [] },
            { category: 'Speaking', competent: 0, total: 0, gaps: [] },
          ],
          summary: { competent: 0, total: 0, progress: 0 },
        },
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });
      render(<CompetencyProgressTab {...defaultProps} />);
      expect(screen.getByText('No competency assessments recorded')).toBeInTheDocument();
      expect(screen.getByText(/Teachers can add assessments/)).toBeInTheDocument();
    });
  });

  describe('Teacher Features', () => {
    it('displays Add Assessment button for teachers', () => {
      render(<CompetencyProgressTab {...defaultProps} isTeacher={true} />);
      expect(screen.getByText('Add Assessment')).toBeInTheDocument();
    });

    it('displays Add Assessment button for admins', () => {
      render(<CompetencyProgressTab {...defaultProps} isAdmin={true} />);
      expect(screen.getByText('Add Assessment')).toBeInTheDocument();
    });

    it('hides Add Assessment button for students/others', () => {
      render(<CompetencyProgressTab {...defaultProps} isTeacher={false} isAdmin={false} />);
      expect(screen.queryByText('Add Assessment')).not.toBeInTheDocument();
    });

    it('displays Record First Assessment button in empty state for teachers', () => {
      // Override mock for empty state
      const useSWR = require('swr').default;
      useSWR.mockReturnValueOnce({
        data: {
          skillGroups: [
            { category: 'Reading', competent: 0, total: 0, gaps: [] },
            { category: 'Writing', competent: 0, total: 0, gaps: [] },
            { category: 'Listening', competent: 0, total: 0, gaps: [] },
            { category: 'Speaking', competent: 0, total: 0, gaps: [] },
          ],
          summary: { competent: 0, total: 0, progress: 0 },
        },
        isLoading: false,
        error: null,
        mutate: jest.fn(),
      });
      render(<CompetencyProgressTab {...defaultProps} isTeacher={true} />);
      expect(screen.getByText('Record First Assessment')).toBeInTheDocument();
    });
  });

  describe('Score Color Coding', () => {
    // These tests verify the scoring color logic is consistent
    it('has consistent color scheme for scores', () => {
      render(<CompetencyProgressTab {...defaultProps} />);

      // The legend colors should match:
      // 1 = red, 2 = amber, 3 = blue, 4 = green
      const redIndicator = screen.getByText('1 - Not demonstrated').parentElement;
      const amberIndicator = screen.getByText('2 - Emerging').parentElement;
      const blueIndicator = screen.getByText('3 - Developing').parentElement;
      const greenIndicator = screen.getByText('4 - Competent').parentElement;

      expect(redIndicator?.querySelector('.bg-red-400')).toBeInTheDocument();
      expect(amberIndicator?.querySelector('.bg-amber-400')).toBeInTheDocument();
      expect(blueIndicator?.querySelector('.bg-blue-400')).toBeInTheDocument();
      expect(greenIndicator?.querySelector('.bg-green-400')).toBeInTheDocument();
    });
  });
});
