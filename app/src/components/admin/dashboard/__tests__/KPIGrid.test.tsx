import { render, screen } from '@testing-library/react';
import { KPIGrid } from '../KPIGrid';

describe('KPIGrid', () => {
  const mockKPIs = {
    activeStudents: 150,
    attendanceRate7d: 0.92,
    attendanceRate30d: 0.88,
    classesRunningToday: 12,
    capacityUtilisation: 0.85,
    newEnrolments7d: 8,
    outstandingComplianceTasks: 3,
  };

  it('renders all KPI tiles correctly', () => {
    render(<KPIGrid kpis={mockKPIs} />);

    expect(screen.getByText('Active Students')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();

    expect(screen.getByText('Attendance (7d)')).toBeInTheDocument();
    expect(screen.getByText('92.0%')).toBeInTheDocument();
    expect(screen.getByText('30d: 88.0%')).toBeInTheDocument();

    expect(screen.getByText('Classes Today')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('New (7d): 8')).toBeInTheDocument();
  });

  it('shows error state when error prop is true', () => {
    render(<KPIGrid kpis={mockKPIs} error={true} />);

    expect(screen.getByText('Data unavailable')).toBeInTheDocument();
    expect(screen.getByText('Unable to load KPI data at this time')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroKPIs = {
      activeStudents: 0,
      attendanceRate7d: 0,
      attendanceRate30d: 0,
      classesRunningToday: 0,
      capacityUtilisation: 0,
      newEnrolments7d: 0,
      outstandingComplianceTasks: 0,
    };

    render(<KPIGrid kpis={zeroKPIs} />);

    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('formats percentages correctly', () => {
    const kpisWithDecimals = {
      ...mockKPIs,
      attendanceRate7d: 0.9567,
      capacityUtilisation: 0.7834,
    };

    render(<KPIGrid kpis={kpisWithDecimals} />);

    expect(screen.getByText('95.7%')).toBeInTheDocument(); // 7d attendance
    expect(screen.getByText('78%')).toBeInTheDocument(); // capacity (no decimals)
  });
});
