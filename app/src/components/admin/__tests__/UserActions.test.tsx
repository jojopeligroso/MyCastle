import { render, screen, fireEvent } from '@testing-library/react';
import { UserActions } from '../UserActions';
import {
  changeUserRole,
  deactivateUser,
  reactivateUser,
  revokeUserSessions,
  resetUserMFA,
} from '@/app/admin/users/_actions/userActions';

jest.mock('@/app/admin/users/_actions/userActions', () => ({
  changeUserRole: jest.fn(),
  deactivateUser: jest.fn(),
  reactivateUser: jest.fn(),
  revokeUserSessions: jest.fn(),
  resetUserMFA: jest.fn(),
}));

describe('UserActions', () => {
  const mockProps = {
    userId: 'user-1',
    currentRole: 'student',
    currentStatus: 'active',
    userName: 'John Doe',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all action buttons', () => {
    render(<UserActions {...mockProps} />);

    expect(screen.getByText('Change Role')).toBeInTheDocument();
    expect(screen.getByText('Deactivate')).toBeInTheDocument();
    expect(screen.getByText('Revoke Sessions')).toBeInTheDocument();
    expect(screen.getByText('Reset MFA')).toBeInTheDocument();
  });

  it('shows Reactivate button when user is inactive', () => {
    render(<UserActions {...mockProps} currentStatus="inactive" />);

    expect(screen.getByText('Reactivate')).toBeInTheDocument();
    expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
  });

  it('opens role change dialog when Change Role is clicked', () => {
    render(<UserActions {...mockProps} />);

    fireEvent.click(screen.getByText('Change Role'));

    expect(screen.getByText('New Role')).toBeInTheDocument();
    expect(screen.getByText('Reason for Change *')).toBeInTheDocument();
  });

  it('validates reason is provided before role change', async () => {
    global.alert = jest.fn();
    render(<UserActions {...mockProps} />);

    fireEvent.click(screen.getByText('Change Role'));

    const submitButton = screen.getByText('Change Role', { selector: 'button' });
    fireEvent.click(submitButton);

    expect(global.alert).toHaveBeenCalledWith('Please provide a reason for the role change');
    expect(changeUserRole).not.toHaveBeenCalled();
  });

  it('requires confirmation before deactivating user', () => {
    global.prompt = jest.fn(() => null); // User cancels prompt
    render(<UserActions {...mockProps} />);

    fireEvent.click(screen.getByText('Deactivate'));

    expect(deactivateUser).not.toHaveBeenCalled();
  });

  it('requires confirmation before revoking sessions', () => {
    global.confirm = jest.fn(() => false); // User cancels
    render(<UserActions {...mockProps} />);

    fireEvent.click(screen.getByText('Revoke Sessions'));

    expect(revokeUserSessions).not.toHaveBeenCalled();
  });
});
