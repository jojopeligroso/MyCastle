/**
 * FeatureCard Component Tests
 * Tests card rendering, colors, icons, and badges
 */

import { render, screen } from '@testing-library/react';
import { FeatureCard } from '@/components/dashboard/FeatureCard';

describe('FeatureCard Component', () => {
  describe('Basic Rendering', () => {
    it('should render card with title and description', () => {
      render(
        <FeatureCard
          title="Test Feature"
          description="This is a test feature description"
          href="/test"
        />
      );

      expect(screen.getByText('Test Feature')).toBeInTheDocument();
      expect(screen.getByText('This is a test feature description')).toBeInTheDocument();
    });

    it('should render as a clickable link', () => {
      render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test-route"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test-route');
    });

    it('should render "Get started" call-to-action', () => {
      render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
        />
      );

      expect(screen.getByText('Get started')).toBeInTheDocument();
    });
  });

  describe('Color Variants', () => {
    it('should apply blue color class by default', () => {
      const { container } = render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
        />
      );

      const colorBar = container.querySelector('.bg-blue-500');
      expect(colorBar).toBeInTheDocument();
    });

    it('should apply green color class when specified', () => {
      const { container } = render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
          color="green"
        />
      );

      const colorBar = container.querySelector('.bg-green-500');
      expect(colorBar).toBeInTheDocument();
    });

    it('should apply purple color class when specified', () => {
      const { container } = render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
          color="purple"
        />
      );

      const colorBar = container.querySelector('.bg-purple-500');
      expect(colorBar).toBeInTheDocument();
    });

    it('should apply orange color class when specified', () => {
      const { container } = render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
          color="orange"
        />
      );

      const colorBar = container.querySelector('.bg-orange-500');
      expect(colorBar).toBeInTheDocument();
    });
  });

  describe('Badge Support', () => {
    it('should render badge when provided', () => {
      render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
          badge="AI Powered"
        />
      );

      expect(screen.getByText('AI Powered')).toBeInTheDocument();
    });

    it('should not render badge when not provided', () => {
      const { container } = render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
        />
      );

      const badge = container.querySelector('.bg-blue-100');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Icon Support', () => {
    it('should render icon when provided', () => {
      const testIcon = (
        <svg data-testid="test-icon" className="w-8 h-8">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );

      render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
          icon={testIcon}
        />
      );

      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });

    it('should not render icon container when icon not provided', () => {
      const { container } = render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
        />
      );

      // Icon container has specific classes
      const iconContainer = container.querySelector('.flex-shrink-0.ml-4');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('Complete Card Examples', () => {
    it('should render AI Lesson Planner card correctly', () => {
      render(
        <FeatureCard
          title="AI Lesson Planner"
          description="Generate CEFR-aligned lesson plans with AI assistance in seconds"
          href="/teacher/lesson-planner"
          badge="AI Powered"
          color="purple"
          icon={
            <svg className="w-8 h-8" data-testid="lesson-icon">
              <path d="M12 12" />
            </svg>
          }
        />
      );

      expect(screen.getByText('AI Lesson Planner')).toBeInTheDocument();
      expect(screen.getByText(/Generate CEFR-aligned lesson plans/)).toBeInTheDocument();
      expect(screen.getByText('AI Powered')).toBeInTheDocument();
      expect(screen.getByTestId('lesson-icon')).toBeInTheDocument();

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/teacher/lesson-planner');
    });

    it('should render Attendance card correctly', () => {
      render(
        <FeatureCard
          title="Attendance Register"
          description="Mark attendance with keyboard shortcuts and hash-chain verification"
          href="/teacher/attendance"
          color="green"
          icon={
            <svg className="w-8 h-8" data-testid="attendance-icon">
              <path d="M9 5" />
            </svg>
          }
        />
      );

      expect(screen.getByText('Attendance Register')).toBeInTheDocument();
      expect(screen.getByText(/Mark attendance with keyboard shortcuts/)).toBeInTheDocument();
      expect(screen.getByTestId('attendance-icon')).toBeInTheDocument();

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/teacher/attendance');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
        />
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href');
    });

    it('should have proper semantic structure', () => {
      render(
        <FeatureCard
          title="Test Feature"
          description="Test description"
          href="/test"
        />
      );

      // Title should be in heading structure
      const title = screen.getByText('Test Feature');
      expect(title.tagName).toBe('H3');
    });
  });
});
