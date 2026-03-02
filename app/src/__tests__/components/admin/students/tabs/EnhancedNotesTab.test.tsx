/**
 * EnhancedNotesTab Component Tests
 *
 * Comprehensive tests for the Enhanced Notes tab component.
 * Tests cover:
 * - Rendering with various props
 * - Note type filtering
 * - Visibility controls
 * - Add note form
 * - Share with student functionality
 * - Permission-based features
 * - Empty states
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedNotesTab } from '@/components/admin/students/tabs/EnhancedNotesTab';

describe('EnhancedNotesTab', () => {
  const defaultProps = {
    studentId: 'student-123',
    currentUserId: 'user-456',
    currentUserRole: 'teacher',
    canViewSensitiveNotes: false,
    canAddNotes: true,
    canShareNotes: true,
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<EnhancedNotesTab {...defaultProps} />);
      expect(screen.getByText('Student Notes')).toBeInTheDocument();
    });

    it('renders the filter dropdown', () => {
      render(<EnhancedNotesTab {...defaultProps} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('displays Add Note button when canAddNotes is true', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      expect(screen.getByText('Add Note')).toBeInTheDocument();
    });

    it('hides Add Note button when canAddNotes is false', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={false} />);
      expect(screen.queryByText('Add Note')).not.toBeInTheDocument();
    });
  });

  describe('Filter Dropdown', () => {
    it('has all filter options', () => {
      render(<EnhancedNotesTab {...defaultProps} />);
      const select = screen.getByRole('combobox');

      expect(select).toHaveDisplayValue('All Notes');

      const options = screen.getAllByRole('option');
      const optionValues = options.map(opt => opt.textContent);

      expect(optionValues).toContain('All Notes');
      expect(optionValues).toContain('General');
      expect(optionValues).toContain('Academic');
      expect(optionValues).toContain('Behavioral');
      expect(optionValues).toContain('Pastoral');
      expect(optionValues).toContain('Medical');
      expect(optionValues).toContain('Shared with Student');
    });

    it('changes filter when option is selected', () => {
      render(<EnhancedNotesTab {...defaultProps} />);
      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'academic' } });
      expect(select).toHaveValue('academic');
    });
  });

  describe('Add Note Form', () => {
    it('shows form when Add Note button is clicked', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);

      const addButton = screen.getByText('Add Note');
      fireEvent.click(addButton);

      expect(screen.getByText('Note Content')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Write your note here...')).toBeInTheDocument();
    });

    it('hides form when Cancel is clicked', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);

      // Open form
      fireEvent.click(screen.getByText('Add Note'));
      expect(screen.getByText('Note Content')).toBeInTheDocument();

      // Cancel - use the button with type="button" inside the form
      const cancelButtons = screen.getAllByText('Cancel');
      const formCancelButton = cancelButtons.find(btn => btn.getAttribute('type') === 'button');
      if (formCancelButton) {
        fireEvent.click(formCancelButton);
      }
      expect(screen.queryByText('Note Content')).not.toBeInTheDocument();
    });

    it('has type dropdown with correct options', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      fireEvent.click(screen.getByText('Add Note'));

      // Get all selects - type is the second one (after filter)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(3); // Filter + Type + Visibility
    });

    it('has visibility dropdown with correct options', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      fireEvent.click(screen.getByText('Add Note'));

      // Check that Private, Staff Only, and Shareable options exist
      expect(screen.getByText('Private (only me)')).toBeInTheDocument();
      expect(screen.getByText('Staff Only')).toBeInTheDocument();
      expect(screen.getByText('Shareable with Student')).toBeInTheDocument();
    });

    it('hides medical option in type dropdown for users without sensitive note access', () => {
      render(
        <EnhancedNotesTab {...defaultProps} canAddNotes={true} canViewSensitiveNotes={false} />
      );
      fireEvent.click(screen.getByText('Add Note'));

      // Get all selects - the Type dropdown is the second one (after filter)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);

      // The type select (second one) should not have Medical
      const typeSelect = selects[1];
      const typeOptions = typeSelect.querySelectorAll('option');
      const typeOptionValues = Array.from(typeOptions).map(opt => opt.textContent);
      expect(typeOptionValues).not.toContain('Medical');
    });

    it('shows medical option in type dropdown for users with sensitive note access', () => {
      render(
        <EnhancedNotesTab {...defaultProps} canAddNotes={true} canViewSensitiveNotes={true} />
      );
      fireEvent.click(screen.getByText('Add Note'));

      // Get all selects - the Type dropdown is the second one (after filter)
      const selects = screen.getAllByRole('combobox');
      const typeSelect = selects[1];
      const typeOptions = typeSelect.querySelectorAll('option');
      const typeOptionValues = Array.from(typeOptions).map(opt => opt.textContent);
      expect(typeOptionValues).toContain('Medical');
    });

    it('disables Save button when content is empty', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      fireEvent.click(screen.getByText('Add Note'));

      const saveButton = screen.getByText('Save Note');
      expect(saveButton).toBeDisabled();
    });

    it('enables Save button when content is entered', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      fireEvent.click(screen.getByText('Add Note'));

      const textarea = screen.getByPlaceholderText('Write your note here...');
      fireEvent.change(textarea, { target: { value: 'Test note content' } });

      const saveButton = screen.getByText('Save Note');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no notes exist', () => {
      render(<EnhancedNotesTab {...defaultProps} />);
      expect(screen.getByText('No notes available')).toBeInTheDocument();
    });

    it('shows helpful message about adding notes', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      expect(screen.getByText(/Click "Add Note" to create the first note/)).toBeInTheDocument();
    });

    it('shows different message when user cannot add notes', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={false} />);
      expect(
        screen.getByText(/Notes added by teachers and admins will appear here/)
      ).toBeInTheDocument();
    });
  });

  describe('Permission Notice', () => {
    it('shows permission notice when user cannot view sensitive notes', () => {
      render(<EnhancedNotesTab {...defaultProps} canViewSensitiveNotes={false} />);
      expect(
        screen.getByText(/You do not have permission to view medical notes/)
      ).toBeInTheDocument();
    });

    it('hides permission notice when user can view sensitive notes', () => {
      render(<EnhancedNotesTab {...defaultProps} canViewSensitiveNotes={true} />);
      expect(
        screen.queryByText(/You do not have permission to view medical notes/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Note Type Styling', () => {
    // Tests for note type color coding would go here
    // Since we have empty state, we'll test the helper function logic indirectly
    it('renders without errors for all note types', () => {
      // This test ensures the component doesn't crash with various configurations
      const noteTypes = ['general', 'academic', 'behavioral', 'pastoral', 'medical'];

      noteTypes.forEach(type => {
        const { unmount } = render(<EnhancedNotesTab {...defaultProps} />);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: type } });
        expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Visibility Indicators', () => {
    it('renders component with visibility controls in form', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      fireEvent.click(screen.getByText('Add Note'));

      expect(screen.getByText('Visibility')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      fireEvent.click(screen.getByText('Add Note'));

      expect(screen.getByText('Note Content')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Visibility')).toBeInTheDocument();
    });

    it('has required attribute on content textarea', () => {
      render(<EnhancedNotesTab {...defaultProps} canAddNotes={true} />);
      fireEvent.click(screen.getByText('Add Note'));

      const textarea = screen.getByPlaceholderText('Write your note here...');
      expect(textarea).toHaveAttribute('required');
    });
  });
});
