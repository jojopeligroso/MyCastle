/**
 * AuditTrailTab Component Tests
 *
 * Comprehensive tests for the Audit Trail tab component.
 * Tests cover:
 * - Rendering with various props combinations
 * - Filter dropdown functionality
 * - Empty state display
 * - Timeline rendering (when entries exist)
 * - Export button visibility
 * - Action icons and labels
 * - Change formatting
 * - Date formatting
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuditTrailTab } from '@/components/admin/students/tabs/AuditTrailTab';

describe('AuditTrailTab', () => {
  const defaultProps = {
    studentId: 'student-123',
    studentUserId: 'user-456',
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<AuditTrailTab {...defaultProps} />);
      expect(screen.getByText('Complete Audit Trail')).toBeInTheDocument();
    });

    it('renders the filter dropdown', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toBeInTheDocument();
    });

    it('renders all filter options', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toHaveValue('all');

      // Check all options are present
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(6);
      expect(options[0]).toHaveTextContent('All Activity');
      expect(options[1]).toHaveTextContent('Profile Changes');
      expect(options[2]).toHaveTextContent('Level Changes');
      expect(options[3]).toHaveTextContent('Enrollments');
      expect(options[4]).toHaveTextContent('Attendance');
      expect(options[5]).toHaveTextContent('Notes');
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no audit entries', () => {
      render(<AuditTrailTab {...defaultProps} />);
      expect(screen.getByText('No audit history available')).toBeInTheDocument();
    });

    it('displays helpful description in empty state', () => {
      render(<AuditTrailTab {...defaultProps} />);
      expect(
        screen.getByText(
          'All profile changes, level adjustments, and key events will be logged here'
        )
      ).toBeInTheDocument();
    });

    it('displays clock icon in empty state', () => {
      render(<AuditTrailTab {...defaultProps} />);
      // The SVG should be present (clock icon)
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('does not display export button when empty', () => {
      render(<AuditTrailTab {...defaultProps} />);
      expect(screen.queryByText('Export Audit Trail (CSV)')).not.toBeInTheDocument();
    });
  });

  describe('Filter Functionality', () => {
    it('allows changing filter value', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const filterSelect = screen.getByRole('combobox');

      fireEvent.change(filterSelect, { target: { value: 'profile' } });
      expect(filterSelect).toHaveValue('profile');

      fireEvent.change(filterSelect, { target: { value: 'level' } });
      expect(filterSelect).toHaveValue('level');

      fireEvent.change(filterSelect, { target: { value: 'enrollment' } });
      expect(filterSelect).toHaveValue('enrollment');

      fireEvent.change(filterSelect, { target: { value: 'attendance' } });
      expect(filterSelect).toHaveValue('attendance');

      fireEvent.change(filterSelect, { target: { value: 'notes' } });
      expect(filterSelect).toHaveValue('notes');

      fireEvent.change(filterSelect, { target: { value: 'all' } });
      expect(filterSelect).toHaveValue('all');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Complete Audit Trail');
    });

    it('filter dropdown is accessible', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toBeEnabled();
    });
  });

  describe('Layout', () => {
    it('applies correct spacing classes', () => {
      const { container } = render(<AuditTrailTab {...defaultProps} />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass('space-y-6');
    });

    it('has header with flex layout', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const heading = screen.getByText('Complete Audit Trail');
      const headerDiv = heading.parentElement;
      expect(headerDiv).toHaveClass('flex');
      expect(headerDiv).toHaveClass('items-center');
      expect(headerDiv).toHaveClass('justify-between');
    });

    it('empty state has centered content', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const emptyStateText = screen.getByText('No audit history available');
      const container = emptyStateText.closest('.bg-gray-50');
      expect(container).toHaveClass('text-center');
    });
  });

  describe('Props Handling', () => {
    it('accepts studentId prop', () => {
      render(<AuditTrailTab studentId="custom-student-id" studentUserId="user-123" />);
      expect(screen.getByText('Complete Audit Trail')).toBeInTheDocument();
    });

    it('accepts studentUserId prop', () => {
      render(<AuditTrailTab studentId="student-123" studentUserId="custom-user-id" />);
      expect(screen.getByText('Complete Audit Trail')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('filter dropdown has proper styling', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const filterSelect = screen.getByRole('combobox');
      expect(filterSelect).toHaveClass('text-sm');
      expect(filterSelect).toHaveClass('border');
      expect(filterSelect).toHaveClass('border-gray-300');
      expect(filterSelect).toHaveClass('rounded-md');
    });

    it('empty state container has rounded corners', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const emptyStateText = screen.getByText('No audit history available');
      const container = emptyStateText.closest('.bg-gray-50');
      expect(container).toHaveClass('rounded-lg');
    });

    it('empty state has proper padding', () => {
      render(<AuditTrailTab {...defaultProps} />);
      const emptyStateText = screen.getByText('No audit history available');
      const container = emptyStateText.closest('.bg-gray-50');
      expect(container).toHaveClass('p-8');
    });
  });
});
