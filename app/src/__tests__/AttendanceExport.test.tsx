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
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Classes (select multiple)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('should display class options correctly', () => {
    render(<AttendanceExport classes={mockClasses} />);

    expect(screen.getByText('English 101 (ENG101)')).toBeInTheDocument();
    expect(screen.getByText('Math 202')).toBeInTheDocument();
  });

  it('should have export button disabled when no class selected', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    expect(exportButton).toBeDisabled();
  });

  it('should enable export button when class and dates are selected', () => {
    render(<AttendanceExport classes={mockClasses} />);

    // Select a class
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);

    // Set dates
    const startDate = screen.getByLabelText('Start Date');
    const endDate = screen.getByLabelText('End Date');
    fireEvent.change(startDate, { target: { value: '2024-01-08' } });
    fireEvent.change(endDate, { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    expect(exportButton).not.toBeDisabled();
  });

  it('should set current week when "This Week" button is clicked', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const thisWeekButton = screen.getByRole('button', { name: /this week/i });
    fireEvent.click(thisWeekButton);

    const startDateInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('End Date') as HTMLInputElement;

    // Should set to dates (format: YYYY-MM-DD)
    expect(startDateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endDateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should trigger export when valid form is submitted', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'Content-Type': 'text/csv',
        'X-Execution-Time-Ms': '150',
        'X-Record-Count': '50',
        'Content-Disposition': 'attachment; filename="attendance_export.csv"',
      }),
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    // Select a class
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);

    // Set dates
    const startDate = screen.getByLabelText('Start Date');
    const endDate = screen.getByLabelText('End Date');
    fireEvent.change(startDate, { target: { value: '2024-01-08' } });
    fireEvent.change(endDate, { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/attendance/export?startDate=2024-01-08&endDate=2024-01-14&classIds=class-1&format=csv'
      );
    });
  });

  it('should display loading state during export', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              headers: new Headers({
                'Content-Type': 'text/csv',
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

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-08' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-14' } });

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
      headers: {
        get: (name: string) => {
          const headers: Record<string, string> = {
            'content-type': 'text/csv',
            'x-execution-time-ms': '250',
            'x-record-count': '75',
            'content-disposition': 'attachment; filename="attendance_export.csv"',
          };
          return headers[name.toLowerCase()] || null;
        },
      },
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-08' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(screen.getByText('Last Export')).toBeInTheDocument();
        expect(screen.getByText('attendance_export.csv')).toBeInTheDocument();
        expect(screen.getByText('75 attendance records')).toBeInTheDocument();
        expect(screen.getByText('250ms')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should display error message when export fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Export failed' }),
    });

    render(<AttendanceExport classes={mockClasses} />);

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-08' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AttendanceExport classes={mockClasses} />);

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-08' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-14' } });

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

    // Button should be disabled
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
      headers: new Headers({
        'Content-Type': 'text/csv',
      }), // Minimal headers
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-08' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('attendance_export.csv')).toBeInTheDocument();
      expect(screen.getByText('0 attendance records')).toBeInTheDocument();
      expect(screen.getByText('0ms')).toBeInTheDocument();
    });
  });

  it('should disable form controls during export', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              headers: new Headers({
                'Content-Type': 'text/csv',
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

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');
    const thisWeekButton = screen.getByRole('button', { name: /this week/i });

    fireEvent.change(startDateInput, { target: { value: '2024-01-08' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    // All controls should be disabled during export
    expect(classCheckbox).toBeDisabled();
    expect(startDateInput).toBeDisabled();
    expect(endDateInput).toBeDisabled();
    expect(thisWeekButton).toBeDisabled();
    expect(exportButton).toBeDisabled();

    await waitFor(() => {
      expect(startDateInput).not.toBeDisabled();
      expect(endDateInput).not.toBeDisabled();
      expect(thisWeekButton).not.toBeDisabled();
      expect(exportButton).not.toBeDisabled();
    });
  });

  it('should render without classes prop', () => {
    render(<AttendanceExport />);

    expect(screen.getByText('No classes available')).toBeInTheDocument();
  });

  it('should warn about slow exports (> 60s)', async () => {
    const mockBlob = new Blob(['csv content'], { type: 'text/csv' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => {
          const headers: Record<string, string> = {
            'content-type': 'text/csv',
            'x-execution-time-ms': '65000',
            'x-record-count': '5000',
            'content-disposition': 'attachment; filename="attendance_export.csv"',
          };
          return headers[name.toLowerCase()] || null;
        },
      },
      blob: async () => mockBlob,
    });

    render(<AttendanceExport classes={mockClasses} />);

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-08' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(screen.getByText(/65000ms/i)).toBeInTheDocument();
        expect(screen.getByText(/exceeds 60s target/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should allow selecting multiple classes', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const class1Checkbox = screen.getByRole('checkbox', { name: /english 101/i });
    const class2Checkbox = screen.getByRole('checkbox', { name: /math 202/i });

    fireEvent.click(class1Checkbox);
    fireEvent.click(class2Checkbox);

    expect(class1Checkbox).toBeChecked();
    expect(class2Checkbox).toBeChecked();
    expect(screen.getByText('2 classes selected')).toBeInTheDocument();
  });

  it('should allow toggling format between CSV and XLSX', () => {
    render(<AttendanceExport classes={mockClasses} />);

    const csvRadio = screen.getByRole('radio', { name: /csv/i });
    const xlsxRadio = screen.getByRole('radio', { name: /xlsx/i });

    expect(csvRadio).toBeChecked();
    expect(xlsxRadio).not.toBeChecked();

    fireEvent.click(xlsxRadio);

    expect(csvRadio).not.toBeChecked();
    expect(xlsxRadio).toBeChecked();
  });

  it('should handle JSON response with signed URL', async () => {
    // Mock window.open
    const originalOpen = window.open;
    window.open = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'content-type') return 'application/json';
          return null;
        },
      },
      json: async () => ({
        recordCount: 100,
        executionTime: 500,
        filename: 'attendance_export.csv',
        signedUrl: 'https://example.com/signed-url',
      }),
    });

    render(<AttendanceExport classes={mockClasses} />);

    // Select a class and set dates
    const classCheckbox = screen.getByRole('checkbox', { name: /english 101/i });
    fireEvent.click(classCheckbox);
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2024-01-08' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2024-01-14' } });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(
      () => {
        expect(window.open).toHaveBeenCalledWith('https://example.com/signed-url', '_blank');
        expect(screen.getByText('100 attendance records')).toBeInTheDocument();
        expect(screen.getByText('500ms')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Restore
    window.open = originalOpen;
  });
});
