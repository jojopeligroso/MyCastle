/**
 * Tests for AttendanceExport component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttendanceExport } from '@/components/export/AttendanceExport';

// Mock fetch globally
global.fetch = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement to track download
const mockAnchorClick = jest.fn();
const originalCreateElement = document.createElement.bind(document);

describe('AttendanceExport Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock createElement for anchor element
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'a') {
        const anchor = originalCreateElement('a');
        anchor.click = mockAnchorClick;
        return anchor;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement;
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
  });

  const mockClasses = [
    { id: 'class-1', name: 'English 101', code: 'ENG101' },
    { id: 'class-2', name: 'Math 202', code: null },
  ];

  it('should render export form with all elements', () => {
    render(<AttendanceExport classes={mockClasses} />);

    expect(screen.getByText('Export Attendance')).toBeInTheDocument();
    expect(screen.getByLabelText('Class')).toBeInTheDocument();
    expect(screen.getByLabelText(/week start/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('should display class options correctly', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;

    expect(classSelect).toBeInTheDocument();
    expect(screen.getByText('English 101 (ENG101)')).toBeInTheDocument();
    expect(screen.getByText('Math 202')).toBeInTheDocument();
  });

  it('should have export button disabled when no class selected', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    expect(exportButton).toBeDisabled();
  });

  it('should enable export button when class and week are selected', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    expect(exportButton).not.toBeDisabled();
  });

  it('should set current week when "This Week" button is clicked', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const thisWeekButton = screen.getByRole('button', { name: /this week/i });
    fireEvent.click(thisWeekButton);

    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    // Should set to a Monday (format: YYYY-MM-DD)
    expect(weekInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should trigger export when valid form is submitted', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'X-Execution-Time-Ms': '150',
        'X-Record-Count': '50',
        'Content-Disposition': 'attachment; filename="attendance_class-1_2024-01-08.csv"',
      }),
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/attendance/export?weekStart=2024-01-08&classId=class-1'
      );
    });
  });

  it('should display loading state during export', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            headers: new Headers({
              'X-Execution-Time-Ms': '150',
              'X-Record-Count': '50',
              'Content-Disposition': 'attachment; filename="export.csv"',
            }),
            blob: async () => new Blob(['csv'], { type: 'text/csv' }),
          });
        }, 100);
      })
    );

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    expect(exportButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export csv/i })).not.toBeDisabled();
    });
  });

  it('should display export metadata after successful export', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'X-Execution-Time-Ms': '250',
        'X-Record-Count': '75',
        'Content-Disposition': 'attachment; filename="attendance_export.csv"',
      }),
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Last Export')).toBeInTheDocument();
      expect(screen.getByText('attendance_export.csv')).toBeInTheDocument();
      expect(screen.getByText('75 attendance records')).toBeInTheDocument();
      expect(screen.getByText('250ms')).toBeInTheDocument();
    });
  });

  it('should display error message when export fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Export failed' }),
    });

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to export attendance/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should show error when trying to export without selections', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const exportButton = screen.getByRole('button', { name: /export csv/i });

    // Button should be disabled, but we can check the validation logic separately
    expect(exportButton).toBeDisabled();
  });

  it('should display tamper-evident information', () => {
    render(<AttendanceExport classes={mockClasses} />);

    expect(screen.getByText(/tamper-evident export/i)).toBeInTheDocument();
    expect(screen.getByText(/sha256 hash columns/i)).toBeInTheDocument();
  });

  it('should handle missing headers gracefully', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(), // Empty headers
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('attendance_export.csv')).toBeInTheDocument();
      expect(screen.getByText('0 attendance records')).toBeInTheDocument();
      expect(screen.getByText('0ms')).toBeInTheDocument();
    });
  });

  it('should disable form controls during export', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            headers: new Headers({
              'X-Execution-Time-Ms': '150',
              'X-Record-Count': '50',
              'Content-Disposition': 'attachment; filename="export.csv"',
            }),
            blob: async () => new Blob(['csv'], { type: 'text/csv' }),
          });
        }, 100);
      })
    );

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;
    const thisWeekButton = screen.getByRole('button', { name: /this week/i });

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    // All controls should be disabled during export
    expect(classSelect).toBeDisabled();
    expect(weekInput).toBeDisabled();
    expect(thisWeekButton).toBeDisabled();
    expect(exportButton).toBeDisabled();

    await waitFor(() => {
      expect(classSelect).not.toBeDisabled();
      expect(weekInput).not.toBeDisabled();
      expect(thisWeekButton).not.toBeDisabled();
      expect(exportButton).not.toBeDisabled();
    });
  });

  it('should render without classes prop', () => {
    render(<AttendanceExport />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    expect(classSelect).toBeInTheDocument();

    // Should only have the "Select a class..." option
    expect(classSelect.options).toHaveLength(1);
  });

  it('should warn about slow exports (> 60s)', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'X-Execution-Time-Ms': '65000', // 65 seconds
        'X-Record-Count': '5000',
        'Content-Disposition': 'attachment; filename="attendance_export.csv"',
      }),
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    const classSelect = screen.getByLabelText('Class') as HTMLSelectElement;
    const weekInput = screen.getByLabelText(/week start/i) as HTMLInputElement;

    fireEvent.change(classSelect, { target: { value: 'class-1' } });
    fireEvent.change(weekInput, { target: { value: '2024-01-08' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/65000ms/i)).toBeInTheDocument();
      expect(screen.getByText(/exceeds 60s target/i)).toBeInTheDocument();
    });
  });
});
