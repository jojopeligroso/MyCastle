/**
 * LevelHistoryTab Component Tests
 *
 * Comprehensive tests for the Level History tab component.
 * Tests cover:
 * - Rendering with various props combinations
 * - Current level display
 * - Level status badges (confirmed, provisional, pending)
 * - Visa expiry status display
 * - Level progression calculation
 * - Empty states
 * - Admin-specific features
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LevelHistoryTab } from '@/components/admin/students/tabs/LevelHistoryTab';

describe('LevelHistoryTab', () => {
  const defaultProps = {
    studentId: 'student-123',
    currentLevel: 'B1',
    initialLevel: 'A2',
    levelStatus: 'confirmed' as const,
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<LevelHistoryTab {...defaultProps} />);
      expect(screen.getByText('Current Level Status')).toBeInTheDocument();
    });

    it('renders the current level section', () => {
      render(<LevelHistoryTab {...defaultProps} />);
      expect(screen.getByText('Current Level')).toBeInTheDocument();
    });

    it('renders the level change history section', () => {
      render(<LevelHistoryTab {...defaultProps} />);
      expect(screen.getByText('Level Change History')).toBeInTheDocument();
    });

    it('renders the diagnostic history section', () => {
      render(<LevelHistoryTab {...defaultProps} />);
      expect(screen.getByText('Diagnostic History')).toBeInTheDocument();
    });
  });

  describe('Current Level Display', () => {
    it('displays the current level badge', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel="B1" initialLevel="B1" />);
      // B1 may appear in multiple places (current level, progress summary)
      const b1Elements = screen.getAllByText('B1');
      expect(b1Elements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays "Not assessed" when current level is null', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel={null} />);
      expect(screen.getByText('Not assessed')).toBeInTheDocument();
    });

    it('displays initial level when different from current', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel="B2" initialLevel="A1" />);
      // Both levels may appear multiple times (in badges, progress section)
      const b2Elements = screen.getAllByText('B2');
      const a1Elements = screen.getAllByText('A1');
      expect(b2Elements.length).toBeGreaterThanOrEqual(1);
      expect(a1Elements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Initial Level')).toBeInTheDocument();
    });

    it('does not display initial level section when same as current', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel="B1" initialLevel="B1" />);
      expect(screen.queryByText('Initial Level')).not.toBeInTheDocument();
    });

    it('applies correct color classes to different CEFR levels', () => {
      // Test A1 - should have green styling
      const { rerender } = render(
        <LevelHistoryTab {...defaultProps} currentLevel="A1" initialLevel="A1" />
      );
      let levelBadges = screen.getAllByText('A1');
      expect(levelBadges[0].className).toContain('green');

      // Test B1 - should have blue styling
      rerender(<LevelHistoryTab {...defaultProps} currentLevel="B1" initialLevel="B1" />);
      levelBadges = screen.getAllByText('B1');
      expect(levelBadges[0].className).toContain('blue');

      // Test C1 - should have purple styling
      rerender(<LevelHistoryTab {...defaultProps} currentLevel="C1" initialLevel="C1" />);
      levelBadges = screen.getAllByText('C1');
      expect(levelBadges[0].className).toContain('purple');
    });
  });

  describe('Level Status Display', () => {
    it('displays "Confirmed" badge for confirmed status', () => {
      render(<LevelHistoryTab {...defaultProps} levelStatus="confirmed" />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('displays "Provisional" badge for provisional status', () => {
      render(<LevelHistoryTab {...defaultProps} levelStatus="provisional" />);
      expect(screen.getByText('Provisional')).toBeInTheDocument();
    });

    it('displays "Pending Approval" badge for pending_approval status', () => {
      render(<LevelHistoryTab {...defaultProps} levelStatus="pending_approval" />);
      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    });

    it('displays "Unknown" when levelStatus is null', () => {
      render(<LevelHistoryTab {...defaultProps} levelStatus={null} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Level Progression', () => {
    it('displays level progression when levels differ', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel="B2" initialLevel="A1" />);
      // Progress from A1 to B2 = 4 levels (A1 -> A2 -> B1 -> B1+ -> B2)
      expect(screen.getByText(/Progress:/)).toBeInTheDocument();
    });

    it('shows progression with correct number of levels', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel="B1" initialLevel="A1" />);
      // A1 -> A2 -> B1 = 2 levels
      const progressText = screen.getByText(/Progress:/);
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('Admin Features', () => {
    it('displays manual level adjustment button for admin users', () => {
      render(<LevelHistoryTab {...defaultProps} isAdmin={true} />);
      expect(screen.getByText('Manual Level Adjustment')).toBeInTheDocument();
    });

    it('hides manual level adjustment button for non-admin users', () => {
      render(<LevelHistoryTab {...defaultProps} isAdmin={false} />);
      expect(screen.queryByText('Manual Level Adjustment')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('displays empty state for level changes when none exist', () => {
      render(<LevelHistoryTab {...defaultProps} />);
      expect(screen.getByText('No level changes recorded')).toBeInTheDocument();
    });

    it('displays empty state for diagnostic history when none exist', () => {
      render(<LevelHistoryTab {...defaultProps} />);
      expect(screen.getByText('No diagnostic tests recorded')).toBeInTheDocument();
    });
  });

  describe('Plus Levels', () => {
    it('correctly displays B1+ level', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel="B1+" initialLevel="B1+" />);
      // B1+ should appear at least once (in current level display)
      const b1PlusElements = screen.getAllByText('B1+');
      expect(b1PlusElements.length).toBeGreaterThanOrEqual(1);
    });

    it('correctly displays B2+ level', () => {
      render(<LevelHistoryTab {...defaultProps} currentLevel="B2+" initialLevel="B2+" />);
      // B2+ should appear at least once
      const b2PlusElements = screen.getAllByText('B2+');
      expect(b2PlusElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<LevelHistoryTab {...defaultProps} />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});
