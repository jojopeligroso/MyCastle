import { render, screen } from '@testing-library/react';
import { RecentActivity } from '../RecentActivity';

describe('RecentActivity', () => {
  const mockEvents = [
    {
      id: 'event-1',
      action: 'create',
      resource_type: 'user',
      resource_id: 'user-123',
      changes: { name: 'John Doe' },
      timestamp: new Date('2025-12-17T10:30:00Z'),
      actor_name: 'Admin User',
      actor_email: 'admin@example.com',
      actor_role: 'admin',
    },
    {
      id: 'event-2',
      action: 'update',
      resource_type: 'class',
      resource_id: 'class-456',
      changes: { status: 'active' },
      timestamp: new Date('2025-12-17T09:15:00Z'),
      actor_name: 'Teacher User',
      actor_email: 'teacher@example.com',
      actor_role: 'teacher',
    },
    {
      id: 'event-3',
      action: 'delete',
      resource_type: 'assignment',
      resource_id: 'assignment-789',
      changes: {},
      timestamp: new Date('2025-12-17T08:00:00Z'),
      actor_name: null,
      actor_email: null,
      actor_role: null,
    },
  ];

  it('renders recent activity table correctly', () => {
    render(<RecentActivity events={mockEvents} />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Last 50 audit events')).toBeInTheDocument();

    expect(screen.getByText('create')).toBeInTheDocument();
    expect(screen.getByText('update')).toBeInTheDocument();
    expect(screen.getByText('delete')).toBeInTheDocument();
  });

  it('shows "No recent activity" when empty', () => {
    render(<RecentActivity events={[]} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByText('Audit events will appear here')).toBeInTheDocument();
  });

  it('displays resource information correctly', () => {
    render(<RecentActivity events={mockEvents} />);

    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('class')).toBeInTheDocument();
    expect(screen.getByText('assignment')).toBeInTheDocument();

    // Resource IDs should be truncated
    expect(screen.getByText('user-123...')).toBeInTheDocument();
  });

  it('displays actor information correctly', () => {
    render(<RecentActivity events={mockEvents} />);

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Teacher User')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument(); // For null actor
  });

  it('shows role badges correctly', () => {
    render(<RecentActivity events={mockEvents} />);

    const adminRoles = screen.getAllByText('admin');
    const teacherRoles = screen.getAllByText('teacher');

    expect(adminRoles.length).toBeGreaterThan(0);
    expect(teacherRoles.length).toBeGreaterThan(0);
  });

  it('displays timestamps in correct format', () => {
    render(<RecentActivity events={mockEvents} />);

    // Timestamps should be formatted as locale strings
    expect(screen.getByText(/12\/17\/2025/)).toBeInTheDocument();
  });
});
