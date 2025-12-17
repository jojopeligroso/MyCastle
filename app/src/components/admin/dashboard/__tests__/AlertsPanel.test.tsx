import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertsPanel } from '../AlertsPanel';
import { acknowledgeAlert } from '@/app/admin/_actions/dashboard';

jest.mock('@/app/admin/_actions/dashboard', () => ({
  acknowledgeAlert: jest.fn(),
}));

describe('AlertsPanel', () => {
  const mockAlerts = [
    {
      alert_id: '1',
      alert_type: 'visa_risk',
      priority: 1,
      entity_type: 'student',
      entity_id: 'student-1',
      message: 'Student attendance below visa threshold',
      action_url: '/admin/students/student-1',
      created_at: new Date('2025-12-17T10:00:00Z'),
      acknowledged_at: null,
      acknowledged_by: null,
      acknowledged_by_name: null,
    },
    {
      alert_id: '2',
      alert_type: 'missing_register',
      priority: 2,
      entity_type: 'class',
      entity_id: 'class-1',
      message: 'Missing attendance register for Class B1',
      action_url: '/admin/attendance/class-1',
      created_at: new Date('2025-12-17T09:00:00Z'),
      acknowledged_at: null,
      acknowledged_by: null,
      acknowledged_by_name: null,
    },
  ];

  it('renders alerts correctly', () => {
    render(<AlertsPanel alerts={mockAlerts} />);

    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Alert count badge
    expect(screen.getByText('Student attendance below visa threshold')).toBeInTheDocument();
    expect(screen.getByText('Missing attendance register for Class B1')).toBeInTheDocument();
  });

  it('shows "All clear" message when no alerts', () => {
    render(<AlertsPanel alerts={[]} />);

    expect(screen.getByText('All clear!')).toBeInTheDocument();
    expect(screen.getByText('No active alerts at this time')).toBeInTheDocument();
  });

  it('acknowledges alert when button is clicked', async () => {
    (acknowledgeAlert as jest.Mock).mockResolvedValue({ success: true });

    render(<AlertsPanel alerts={mockAlerts} />);

    const acknowledgeButtons = screen.getAllByText('Acknowledge');
    fireEvent.click(acknowledgeButtons[0]);

    await waitFor(() => {
      expect(acknowledgeAlert).toHaveBeenCalledWith('1');
    });
  });

  it('shows action link for alerts with action_url', () => {
    render(<AlertsPanel alerts={mockAlerts} />);

    const viewButtons = screen.getAllByText('View');
    expect(viewButtons).toHaveLength(2);
  });

  it('displays priority badges correctly', () => {
    render(<AlertsPanel alerts={mockAlerts} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('filters out acknowledged alerts', () => {
    const alertsWithAcknowledged = [
      ...mockAlerts,
      {
        ...mockAlerts[0],
        alert_id: '3',
        acknowledged_at: new Date(),
        acknowledged_by: 'admin-1',
        acknowledged_by_name: 'Admin User',
      },
    ];

    render(<AlertsPanel alerts={alertsWithAcknowledged} />);

    // Should only show 2 unacknowledged alerts
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
