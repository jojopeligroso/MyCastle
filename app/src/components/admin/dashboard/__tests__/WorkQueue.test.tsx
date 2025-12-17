import { render, screen } from '@testing-library/react';
import { WorkQueue } from '../WorkQueue';

describe('WorkQueue', () => {
  const mockItems = [
    {
      item_type: 'register_anomaly',
      item_label: 'Register Anomaly',
      entity_id: 'session-1',
      description: 'Missing attendance data for session on 2025-12-17',
      action_url: '/admin/attendance/session-1',
      created_at: new Date('2025-12-17T10:00:00Z'),
    },
    {
      item_type: 'pending_invite',
      item_label: 'Pending User Invite',
      entity_id: 'user-1',
      description: 'User invited but not yet activated: john@example.com',
      action_url: '/admin/users/user-1',
      created_at: new Date('2025-12-10T09:00:00Z'),
    },
  ];

  it('renders work queue items correctly', () => {
    render(<WorkQueue items={mockItems} />);

    expect(screen.getByText('Work Queue')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Item count badge
    expect(screen.getByText('Items requiring review')).toBeInTheDocument();

    expect(screen.getByText('Register Anomaly')).toBeInTheDocument();
    expect(screen.getByText('Missing attendance data for session on 2025-12-17')).toBeInTheDocument();

    expect(screen.getByText('Pending User Invite')).toBeInTheDocument();
    expect(screen.getByText('User invited but not yet activated: john@example.com')).toBeInTheDocument();
  });

  it('shows "All caught up" message when no items', () => {
    render(<WorkQueue items={[]} />);

    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText('No pending tasks at this time')).toBeInTheDocument();
  });

  it('renders review buttons for all items', () => {
    render(<WorkQueue items={mockItems} />);

    const reviewButtons = screen.getAllByText('Review');
    expect(reviewButtons).toHaveLength(2);
  });

  it('displays creation dates correctly', () => {
    render(<WorkQueue items={mockItems} />);

    expect(screen.getByText(/Created 12\/17\/2025/)).toBeInTheDocument();
    expect(screen.getByText(/Created 12\/10\/2025/)).toBeInTheDocument();
  });
});
