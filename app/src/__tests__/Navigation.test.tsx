/**
 * Navigation Component Tests
 * Tests role-based filtering, mobile menu, and navigation rendering
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Navigation } from '@/components/layout/Navigation';

describe('Navigation Component', () => {
  describe('Basic Rendering', () => {
    it('should render navigation with user email', () => {
      render(
        <Navigation userEmail="teacher@example.com" userRole="teacher" currentPath="/dashboard" />
      );

      expect(screen.getByText('teacher@example.com')).toBeInTheDocument();
    });

    it('should display user role badge', () => {
      render(
        <Navigation userEmail="admin@example.com" userRole="admin" currentPath="/dashboard" />
      );

      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('should highlight current page in navigation', () => {
      render(
        <Navigation userEmail="teacher@example.com" userRole="teacher" currentPath="/dashboard" />
      );

      const dashboardLink = screen.getByRole('link', { name: /^dashboard$/i });
      expect(dashboardLink.className).toContain('border-blue-500');
      expect(dashboardLink.className).toContain('text-gray-900');
    });
  });

  describe('Role-Based Navigation', () => {
    it('should show teacher-only links for teacher role', () => {
      render(
        <Navigation userEmail="teacher@example.com" userRole="teacher" currentPath="/dashboard" />
      );

      expect(screen.getByText('Lesson Planner')).toBeInTheDocument();
      expect(screen.getByText('My Timetable')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
    });

    it('should show admin links for admin role', () => {
      render(
        <Navigation userEmail="admin@example.com" userRole="admin" currentPath="/dashboard" />
      );

      expect(screen.getByText('Lesson Planner')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
    });

    it('should not show teacher links for student role', () => {
      render(
        <Navigation userEmail="student@example.com" userRole="student" currentPath="/dashboard" />
      );

      expect(screen.queryByText('Lesson Planner')).not.toBeInTheDocument();
      expect(screen.queryByText('My Timetable')).not.toBeInTheDocument();
      expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
    });

    it('should show dashboard link for all roles', () => {
      const roles = ['student', 'teacher', 'admin'];

      roles.forEach(role => {
        const { unmount } = render(
          <Navigation userEmail={`${role}@example.com`} userRole={role} currentPath="/dashboard" />
        );

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Mobile Menu', () => {
    it('should toggle mobile menu when hamburger button is clicked', () => {
      render(
        <Navigation userEmail="teacher@example.com" userRole="teacher" currentPath="/dashboard" />
      );

      const menuButton = screen.getByRole('button', { name: /open main menu/i });

      // Menu should be closed initially - mobile nav links should not be visible
      expect(screen.queryByText('Lesson Planner')).toBeInTheDocument(); // Desktop version

      // Click to open mobile menu
      fireEvent.click(menuButton);

      // Now there should be 2 instances of each link (desktop + mobile)
      const lessonPlannerLinks = screen.getAllByText('Lesson Planner');
      expect(lessonPlannerLinks.length).toBeGreaterThan(1);

      // Click to close
      fireEvent.click(menuButton);

      // Mobile menu closed - only desktop link remains
      expect(screen.getByText('Lesson Planner')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should render correct href for navigation items', () => {
      render(
        <Navigation userEmail="teacher@example.com" userRole="teacher" currentPath="/dashboard" />
      );

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');

      const lessonPlannerLink = screen.getByRole('link', { name: /lesson planner/i });
      expect(lessonPlannerLink).toHaveAttribute('href', '/teacher/lesson-planner');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined userRole gracefully', () => {
      render(
        <Navigation userEmail="user@example.com" userRole={undefined} currentPath="/dashboard" />
      );

      // Should show dashboard but not role-specific items
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should handle missing userEmail', () => {
      render(<Navigation userEmail={undefined} userRole="teacher" currentPath="/dashboard" />);

      // Should still render navigation structure
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
