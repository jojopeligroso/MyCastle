/**
 * TimetableWeekView Component Tests
 * Tests weekly timetable display and interactions
 */

import { render, screen } from '@testing-library/react';
import { TimetableWeekView } from '@/components/timetable/TimetableWeekView';

describe('TimetableWeekView Component', () => {
  const mockTeacherId = 'teacher-123';

  describe('Basic Rendering', () => {
    it('should render timetable with week header', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      expect(screen.getByText(/Week of/i)).toBeInTheDocument();
    });

    it('should display all weekdays', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Tuesday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
      expect(screen.getByText('Thursday')).toBeInTheDocument();
      expect(screen.getByText('Friday')).toBeInTheDocument();
    });

    it('should display time slots', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('13:00')).toBeInTheDocument();
      expect(screen.getByText('17:00')).toBeInTheDocument();
    });

    it('should show total hours and class count', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      // Mock data has 4 classes
      expect(screen.getByText(/4 classes/i)).toBeInTheDocument();
      // Should show total hours
      expect(screen.getByText(/hours total/i)).toBeInTheDocument();
    });
  });

  describe('Session Display', () => {
    it('should display mock class sessions', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      // Check for mock session names
      expect(screen.getByText('B1 Morning Group A')).toBeInTheDocument();
      expect(screen.getByText('A2 Evening Class')).toBeInTheDocument();
      expect(screen.getByText('B2 Advanced Group')).toBeInTheDocument();
      expect(screen.getByText('C1 Professional')).toBeInTheDocument();
    });

    it('should display session times', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      // B1 Morning Group A: 09:00 - 13:00
      expect(screen.getByText('09:00 - 13:00')).toBeInTheDocument();
    });

    it('should display room information', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      expect(screen.getByText('Room 3')).toBeInTheDocument();
      expect(screen.getByText('Room 1')).toBeInTheDocument();
      expect(screen.getByText('Room 5')).toBeInTheDocument();
      expect(screen.getByText('Room 2')).toBeInTheDocument();
    });

    it('should display student enrollment counts', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      // B1 Morning: 12/15
      expect(screen.getByText('12/15 students')).toBeInTheDocument();
      // A2 Evening: 10/12
      expect(screen.getByText('10/12 students')).toBeInTheDocument();
    });
  });

  describe('Navigation Controls', () => {
    it('should render week navigation buttons', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      expect(screen.getByRole('button', { name: /previous week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /this week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next week/i })).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('should display timetable legend', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      expect(screen.getByText('Scheduled Class')).toBeInTheDocument();
      expect(screen.getByText('Free Time')).toBeInTheDocument();
    });
  });

  describe('Grid Structure', () => {
    it('should render time column header', () => {
      render(<TimetableWeekView teacherId={mockTeacherId} />);

      expect(screen.getByText('Time')).toBeInTheDocument();
    });

    it('should create a grid layout', () => {
      const { container } = render(<TimetableWeekView teacherId={mockTeacherId} />);

      // Should have grid container
      const grid = container.querySelector('.grid-cols-6');
      expect(grid).toBeInTheDocument();
    });
  });
});
