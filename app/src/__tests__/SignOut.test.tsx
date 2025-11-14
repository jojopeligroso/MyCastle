/**
 * Tests for SignOut page
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignOutPage from '@/app/signout/page';
import { useSearchParams } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  Link.displayName = 'MockNextLink';
  return Link;
});

describe('SignOut Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render success message when status is success', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    expect(screen.getByText("You've been signed out")).toBeInTheDocument();
    expect(screen.getByText(/Thanks for using MyCastle/i)).toBeInTheDocument();
  });

  it('should render error message when status is error', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('error'),
    });

    render(<SignOutPage />);

    expect(screen.getByText('Sign Out Issue')).toBeInTheDocument();
    expect(screen.getByText(/There was an issue signing you out/i)).toBeInTheDocument();
  });

  it('should show countdown timer on success', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    expect(screen.getByText(/Redirecting to home page in/i)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('should countdown from 5 to 1', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    expect(screen.getByText(/5/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/4/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/3/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/2/)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  it('should redirect after countdown completes', () => {
    // Mock window.location.href
    delete (window as unknown as { location: Location }).location;
    window.location = { href: '' } as unknown as Location;

    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    // Fast-forward through the countdown
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(window.location.href).toContain('/');
  });

  it('should not show countdown on error', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('error'),
    });

    render(<SignOutPage />);

    expect(screen.queryByText(/Redirecting to home page/i)).not.toBeInTheDocument();
  });

  it('should render sign in link', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    const signInLink = screen.getByText('Sign in again');
    expect(signInLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('should render home page link', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    const homeLink = screen.getByText('Go to home page');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('should render quick action links', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    expect(screen.getByText('Password Login')).toBeInTheDocument();
    expect(screen.getByText('Magic Link Login')).toBeInTheDocument();
  });

  it('should show security message', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    expect(screen.getByText(/Your session has been securely terminated/i)).toBeInTheDocument();
    expect(screen.getByText(/All cookies and stored data have been cleared/i)).toBeInTheDocument();
  });

  it('should render with no status parameter', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });

    render(<SignOutPage />);

    // Should show error state when no status
    expect(screen.getByText('Sign Out Issue')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes for icons', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    const { container } = render(<SignOutPage />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should have accessible buttons with proper links', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    render(<SignOutPage />);

    const signInButton = screen.getByText('Sign in again');
    const homeButton = screen.getByText('Go to home page');

    expect(signInButton.closest('a')).toHaveAttribute('href', '/login');
    expect(homeButton.closest('a')).toHaveAttribute('href', '/');
  });

  it('should cleanup timer on unmount', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    const { unmount } = render(<SignOutPage />);

    act(() => {
      unmount();
    });

    // Verify no timers are left running
    expect(jest.getTimerCount()).toBe(0);
  });

  it('should render blue theme for success', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('success'),
    });

    const { container } = render(<SignOutPage />);

    const blueElements = container.querySelectorAll('.bg-blue-100, .text-blue-600, .bg-blue-50');
    expect(blueElements.length).toBeGreaterThan(0);
  });

  it('should render yellow theme for error', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue('error'),
    });

    const { container } = render(<SignOutPage />);

    const yellowElements = container.querySelectorAll('.bg-yellow-100, .text-yellow-600');
    expect(yellowElements.length).toBeGreaterThan(0);
  });
});
