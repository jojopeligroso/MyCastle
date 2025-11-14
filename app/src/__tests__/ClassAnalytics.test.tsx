/**
 * Tests for ClassAnalytics component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassAnalytics } from '@/components/analytics/ClassAnalytics';

// Mock fetch globally
global.fetch = jest.fn();

describe('ClassAnalytics Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(() => {
        /* never resolves */
      })
    );

    render(<ClassAnalytics classId="class-123" />);

    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  it('should render analytics data when API call succeeds', async () => {
    const mockData = {
      success: true,
      data: {
        classId: 'class-123',
        className: 'Advanced English',
        enrollment: {
          totalStudents: 25,
          capacity: 30,
          averageAttendance: 92.5,
        },
        assignments: {
          total: 15,
          active: 3,
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Advanced English')).toBeInTheDocument();
    });

    // Check enrollment stats
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('/ 30 capacity')).toBeInTheDocument();

    // Check attendance
    expect(screen.getByText('92.5%')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();

    // Check assignments
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show "Good" attendance rating for 75-90%', async () => {
    const mockData = {
      success: true,
      data: {
        classId: 'class-123',
        className: 'Test Class',
        enrollment: {
          totalStudents: 20,
          capacity: 25,
          averageAttendance: 80.0,
        },
        assignments: {
          total: 10,
          active: 2,
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  it('should show "Needs improvement" for attendance below 75%', async () => {
    const mockData = {
      success: true,
      data: {
        classId: 'class-123',
        className: 'Test Class',
        enrollment: {
          totalStudents: 20,
          capacity: 25,
          averageAttendance: 65.0,
        },
        assignments: {
          total: 10,
          active: 2,
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Needs improvement')).toBeInTheDocument();
    });
  });

  it('should display near capacity warning when enrollment > 80%', async () => {
    const mockData = {
      success: true,
      data: {
        classId: 'class-123',
        className: 'Test Class',
        enrollment: {
          totalStudents: 28,
          capacity: 30,
          averageAttendance: 90.0,
        },
        assignments: {
          total: 10,
          active: 2,
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText('Near capacity')).toBeInTheDocument();
    });
  });

  it('should render error state when API call fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Failed to fetch analytics' }),
    });

    render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch analytics/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should call API with correct URL', async () => {
    const mockData = {
      success: true,
      data: {
        classId: 'class-456',
        className: 'Test Class',
        enrollment: {
          totalStudents: 20,
          capacity: 25,
          averageAttendance: 85.0,
        },
        assignments: {
          total: 5,
          active: 1,
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<ClassAnalytics classId="class-456" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/mcp/tools/view_class_analytics',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classId: 'class-456' }),
        })
      );
    });
  });

  it('should render null when no analytics data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: null }),
    });

    const { container } = render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should calculate completed assignments correctly', async () => {
    const mockData = {
      success: true,
      data: {
        classId: 'class-123',
        className: 'Test Class',
        enrollment: {
          totalStudents: 20,
          capacity: 25,
          averageAttendance: 85.0,
        },
        assignments: {
          total: 20,
          active: 7,
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<ClassAnalytics classId="class-123" />);

    await waitFor(() => {
      // Completed = Total - Active = 20 - 7 = 13
      expect(screen.getByText('13')).toBeInTheDocument();
    });
  });

  it('should call API when classId prop is provided', async () => {
    const mockData = {
      success: true,
      data: {
        classId: 'class-1',
        className: 'Class One',
        enrollment: {
          totalStudents: 20,
          capacity: 25,
          averageAttendance: 85.0,
        },
        assignments: {
          total: 10,
          active: 2,
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<ClassAnalytics classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Class One')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/mcp/tools/view_class_analytics',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ classId: 'class-1' }),
      })
    );
  });
});
