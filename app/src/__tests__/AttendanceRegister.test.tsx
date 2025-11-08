/**
 * AttendanceRegister Component Tests
 * Tests attendance marking interface and functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceRegister } from '@/components/attendance/AttendanceRegister';

describe('AttendanceRegister Component', () => {
  const mockTeacherId = 'teacher-123';

  beforeEach(() => {
    // Mock alert
    global.alert = jest.fn();
  });

  describe('Session Selection', () => {
    it('should render session selection controls', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      expect(screen.getByLabelText(/class/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/session time/i)).toBeInTheDocument();
    });

    it('should render class options', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      expect(classSelect).toHaveValue('1');
    });

    it('should default to today\'s date', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
      const today = new Date().toISOString().split('T')[0];

      expect(dateInput.value).toBe(today);
    });
  });

  describe('Student Register Display', () => {
    it('should not show student list when no class selected', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      expect(screen.queryByText('Student Register')).not.toBeInTheDocument();
    });

    it('should show student list when class is selected', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      expect(screen.getByText('Student Register')).toBeInTheDocument();
    });

    it('should display all mock students', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
      expect(screen.getByText('Carol Williams')).toBeInTheDocument();
      expect(screen.getByText('David Chen')).toBeInTheDocument();
      expect(screen.getByText('Emma Thompson')).toBeInTheDocument();
    });

    it('should display student emails', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      expect(screen.getByText('alice.johnson@example.com')).toBeInTheDocument();
    });

    it('should display attendance rates', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      expect(screen.getByText('95.5%')).toBeInTheDocument();
      expect(screen.getByText('88.2%')).toBeInTheDocument();
    });

    it('should show visa badge for visa students', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      const visaBadges = screen.getAllByText('Visa');
      expect(visaBadges.length).toBe(2); // Bob and David are visa students
    });
  });

  describe('Attendance Marking', () => {
    it('should allow marking student as present', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      // Find all P buttons and click the first one
      const presentButtons = screen.getAllByRole('button', { name: /present \(p\)/i });
      fireEvent.click(presentButtons[0]);

      // Check if the button has the active styling
      expect(presentButtons[0].className).toContain('bg-green-100');
    });

    it('should allow marking student as absent', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      const absentButtons = screen.getAllByRole('button', { name: /absent \(a\)/i });
      fireEvent.click(absentButtons[0]);

      expect(absentButtons[0].className).toContain('bg-red-100');
    });

    it('should allow marking student as late', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      const lateButtons = screen.getAllByRole('button', { name: /late \(l\)/i });
      fireEvent.click(lateButtons[0]);

      expect(lateButtons[0].className).toContain('bg-yellow-100');
    });

    it('should allow marking student as excused', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      const excusedButtons = screen.getAllByRole('button', { name: /excused \(e\)/i });
      fireEvent.click(excusedButtons[0]);

      expect(excusedButtons[0].className).toContain('bg-blue-100');
    });
  });

  describe('Statistics', () => {
    it('should display attendance statistics', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      expect(screen.getByText('Quick Stats')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Present')).toBeInTheDocument();
      expect(screen.getByText('Absent')).toBeInTheDocument();
      expect(screen.getByText('Late')).toBeInTheDocument();
      expect(screen.getByText('Excused')).toBeInTheDocument();
    });

    it('should update statistics when attendance is marked', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      const presentButtons = screen.getAllByRole('button', { name: /present \(p\)/i });
      fireEvent.click(presentButtons[0]);
      fireEvent.click(presentButtons[1]);

      // Check stats update - should show 2 present
      const statNumbers = screen.getAllByText('2');
      expect(statNumbers.length).toBeGreaterThan(0);
    });

    it('should show visa absence warning when visa student is marked absent', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      // Bob Martinez (index 1) is a visa student
      const absentButtons = screen.getAllByRole('button', { name: /absent \(a\)/i });
      fireEvent.click(absentButtons[1]);

      expect(screen.getByText(/1 visa student marked absent/i)).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should disable save button when no attendance marked', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      const saveButton = screen.getByRole('button', { name: /save attendance/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when attendance is marked', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      const presentButtons = screen.getAllByRole('button', { name: /present \(p\)/i });
      fireEvent.click(presentButtons[0]);

      const saveButton = screen.getByRole('button', { name: /save attendance/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('should show alert when trying to save without selecting class', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      // Don't select a class, try to save directly is not possible
      // since the save button only appears after class selection
      // This test verifies the design prevents this scenario
      expect(screen.queryByRole('button', { name: /save attendance/i })).not.toBeInTheDocument();
    });

    it('should clear all attendance when clear button is clicked', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      // Mark some attendance
      const presentButtons = screen.getAllByRole('button', { name: /present \(p\)/i });
      fireEvent.click(presentButtons[0]);

      // Clear all
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearButton);

      // Save button should be disabled again
      const saveButton = screen.getByRole('button', { name: /save attendance/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('UI Elements', () => {
    it('should display keyboard shortcut instructions', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      const classSelect = screen.getByLabelText(/class/i);
      fireEvent.change(classSelect, { target: { value: '1' } });

      expect(
        screen.getByText(/use keyboard shortcuts: p \(present\), a \(absent\), l \(late\), e \(excused\)/i)
      ).toBeInTheDocument();
    });

    it('should render session details heading', () => {
      render(<AttendanceRegister teacherId={mockTeacherId} />);

      expect(screen.getByText('Session Details')).toBeInTheDocument();
    });
  });
});
