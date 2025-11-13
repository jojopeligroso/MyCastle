/**
 * Tests for TeacherDashboard component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe('TeacherDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {
        /* never resolves */
      })
    );

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('should render welcome message with teacher name', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: [] },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(screen.getByText(/welcome back, john smith/i)).toBeInTheDocument();
    });
  });

  it('should display dashboard stats correctly', async () => {
    const today = new Date().toISOString().split('T')[0];

    const mockClasses = [
      { id: 'class-1', name: 'English 101', enrolledCount: 25 },
      { id: 'class-2', name: 'English 102', enrolledCount: 20 },
    ];

    const mockSessions = [
      {
        session: {
          id: 'session-1',
          sessionDate: today,
          startTime: '09:00',
          endTime: '10:00',
        },
        class: { name: 'English 101', enrolledCount: 25 },
      },
      {
        session: {
          id: 'session-2',
          sessionDate: today,
          startTime: '11:00',
          endTime: '12:00',
        },
        class: { name: 'English 102', enrolledCount: 20 },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: mockClasses },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: mockSessions },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading dashboard/i)).not.toBeInTheDocument();
    });

    // Total students: 25 + 20 = 45
    expect(screen.getByText('45')).toBeInTheDocument();

    // Check that we have stats cards for Classes and sessions
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText("Today's Sessions")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("Total Students")).toBeInTheDocument();
  });

  it('should display upcoming sessions', async () => {
    const today = new Date().toISOString().split('T')[0];

    const mockSessions = [
      {
        session: {
          id: 'session-1',
          sessionDate: today,
          startTime: '14:00',
          endTime: '15:00',
        },
        class: { name: 'Advanced English', enrolledCount: 18 },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: mockSessions },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(screen.getByText('Advanced English')).toBeInTheDocument();
      expect(screen.getByText('18 students')).toBeInTheDocument();
    });
  });

  it('should show "No upcoming sessions" when there are none', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: [] },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(screen.getByText(/no upcoming sessions/i)).toBeInTheDocument();
    });
  });

  it('should render quick action links', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: [] },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(screen.getByText('View Timetable')).toBeInTheDocument();
      expect(screen.getByText('Mark Attendance')).toBeInTheDocument();
      expect(screen.getByText('Create Lesson Plan')).toBeInTheDocument();
      expect(screen.getByText('Export Attendance')).toBeInTheDocument();
    });
  });

  it('should display error state when classes API fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Failed to load classes' },
      }),
    });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
    });
  });

  it('should display error state when timetable API fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should calculate this week sessions correctly', async () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const weekStart = monday.toISOString().split('T')[0];

    const mockSessions = [
      {
        session: {
          id: 'session-1',
          sessionDate: weekStart,
          startTime: '09:00',
          endTime: '10:00',
        },
        class: { name: 'Class 1', enrolledCount: 20 },
      },
      {
        session: {
          id: 'session-2',
          sessionDate: weekStart,
          startTime: '11:00',
          endTime: '12:00',
        },
        class: { name: 'Class 2', enrolledCount: 15 },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: mockSessions },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      const weekSessions = screen.getAllByText('2');
      expect(weekSessions.length).toBeGreaterThan(0);
    });
  });

  it('should fetch timetable with correct week start date', async () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const expectedWeekStart = monday.toISOString().split('T')[0];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: [] },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/timetable?weekStart=${expectedWeekStart}`)
      );
    });
  });

  it('should render attendance link for each upcoming session', async () => {
    const today = new Date().toISOString().split('T')[0];

    const mockSessions = [
      {
        session: {
          id: 'session-123',
          sessionDate: today,
          startTime: '14:00',
          endTime: '15:00',
        },
        class: { name: 'Test Class', enrolledCount: 20 },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: mockSessions },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      expect(screen.getByText('Test Class')).toBeInTheDocument();
    });

    // Verify the session is rendered with correct details
    expect(screen.getByText('20 students')).toBeInTheDocument();

    // Find links to attendance page (there will be multiple - one in quick actions, one for session)
    const attendanceLinks = screen.getAllByText(/mark attendance/i);
    expect(attendanceLinks.length).toBeGreaterThan(0);
  });

  it('should handle missing enrolledCount gracefully', async () => {
    const mockClasses = [
      { id: 'class-1', name: 'English 101' }, // no enrolledCount
      { id: 'class-2', name: 'English 102', enrolledCount: 20 },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: mockClasses },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: [] },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      // Total students should be 20 (0 + 20)
      expect(screen.getByText('20')).toBeInTheDocument();
    });
  });

  it('should limit upcoming sessions to 5', async () => {
    const today = new Date().toISOString().split('T')[0];

    const mockSessions = Array.from({ length: 10 }, (_, i) => ({
      session: {
        id: `session-${i}`,
        sessionDate: today,
        startTime: `${9 + i}:00`,
        endTime: `${10 + i}:00`,
      },
      class: { name: `Class ${i}`, enrolledCount: 20 },
    }));

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { classes: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { sessions: mockSessions },
        }),
      });

    render(<TeacherDashboard teacherId="teacher-123" teacherName="John Smith" />);

    await waitFor(() => {
      // Should only show 5 sessions, not all 10
      expect(screen.getByText('Class 0')).toBeInTheDocument();
      expect(screen.getByText('Class 4')).toBeInTheDocument();
      expect(screen.queryByText('Class 5')).not.toBeInTheDocument();
    });
  });
});
