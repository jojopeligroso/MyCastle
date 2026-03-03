/**
 * StudentProfilePage Component Tests
 * Tests for the student self-view profile page
 *
 * Ref: STUDENT_PROFILE_ROADMAP.md Task #5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Import after mocking
import { StudentProfilePage } from '@/components/student/StudentProfilePage';
import useSWR from 'swr';

const mockUseSWR = useSWR as jest.MockedFunction<typeof useSWR>;

describe('StudentProfilePage', () => {
  const mockProfileData = {
    profile: {
      id: 'user-123',
      name: 'Test Student',
      email: 'test@example.com',
      phone: '+353871234567',
      avatarUrl: null,
      studentNumber: 'STU-2025-001',
      currentLevel: 'B1',
      initialLevel: 'A2',
      levelStatus: 'active',
      memberSince: '2025-09-01T00:00:00.000Z',
    },
    currentClass: {
      id: 'enroll-1',
      classId: 'class-1',
      className: 'General English B1',
      classLevel: 'B1',
      enrollmentDate: '2025-09-01',
      status: 'active',
    },
    attendance: {
      summary: { present: 20, absent: 2, late: 3, excused: 1 },
      rate: 88,
      total: 26,
    },
    progress: {
      competencyRate: 65,
      total: 100,
      achieved: 65,
    },
    diagnosticHistory: [],
    levelHistory: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // Look for loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should display profile header with student info', () => {
    mockUseSWR.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    expect(screen.getByText('Test Student')).toBeInTheDocument();
    // Email and B1 appear in multiple places, use getAllByText
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('B1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('General English B1').length).toBeGreaterThan(0);
  });

  it('should display all navigation tabs', () => {
    mockUseSWR.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // Use getAllByText since some tab names may appear elsewhere in the content
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Assessments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AI Tutor').length).toBeGreaterThan(0);
  });

  it('should display quick stats in overview tab', () => {
    mockUseSWR.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // Quick stats are displayed - use getAllByText since values may appear multiple times
    const attendanceRates = screen.getAllByText('88%');
    expect(attendanceRates.length).toBeGreaterThan(0);

    const progressRates = screen.getAllByText('65%');
    expect(progressRates.length).toBeGreaterThan(0);

    // Total sessions
    const sessions = screen.getAllByText('26');
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('should switch tabs when clicked', async () => {
    mockUseSWR.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // Click on Progress tab - get all elements with "Progress" and click the tab (first one in nav)
    const progressElements = screen.getAllByText('Progress');
    // The first one is the tab button in the nav
    fireEvent.click(progressElements[0]);

    // Check that Progress tab content is shown
    await waitFor(() => {
      expect(screen.getByText('Competency Progress')).toBeInTheDocument();
    });
  });

  it('should show AI Tutor placeholder when tab clicked', async () => {
    mockUseSWR.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // Click on AI Tutor tab
    const tutorTab = screen.getByText('AI Tutor');
    fireEvent.click(tutorTab);

    // Check for Coming Soon content
    await waitFor(() => {
      expect(screen.getByText('AI Tutor Coming Soon')).toBeInTheDocument();
      expect(screen.getByText('Speaking Practice')).toBeInTheDocument();
      expect(screen.getByText('Vocabulary Builder')).toBeInTheDocument();
      expect(screen.getByText('Smart Exercises')).toBeInTheDocument();
    });
  });

  it('should display error state when profile fails to load', () => {
    mockUseSWR.mockReturnValue({
      data: { profile: null },
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    expect(screen.getByText(/unable to load your profile/i)).toBeInTheDocument();
  });

  it('should display level badge with correct color for B1', () => {
    mockUseSWR.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // B1 appears in multiple places - get all and check the level badge (first one in header)
    const levelBadges = screen.getAllByText('B1');
    expect(levelBadges.length).toBeGreaterThan(0);

    // The first B1 is the level badge in the header with green coloring
    const levelBadge = levelBadges[0];
    expect(levelBadge.className).toContain('green');
  });

  it('should show contact edit buttons', () => {
    mockUseSWR.mockReturnValue({
      data: mockProfileData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // Look for Change buttons (email and phone)
    const changeButtons = screen.getAllByText('Change');
    expect(changeButtons.length).toBe(2);
  });
});

describe('StudentProfilePage - Attendance Display', () => {
  it('should show attendance breakdown in Progress tab', async () => {
    const mockData = {
      profile: {
        id: 'user-123',
        name: 'Test Student',
        email: 'test@example.com',
        phone: null,
        avatarUrl: null,
        studentNumber: 'STU-2025-001',
        currentLevel: 'B1',
        initialLevel: 'A2',
        levelStatus: 'active',
        memberSince: '2025-09-01T00:00:00.000Z',
      },
      currentClass: null,
      attendance: {
        summary: { present: 15, absent: 3, late: 2, excused: 1 },
        rate: 81,
        total: 21,
      },
      progress: {
        competencyRate: 50,
        total: 20,
        achieved: 10,
      },
      diagnosticHistory: [],
      levelHistory: [],
    };

    mockUseSWR.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
      isValidating: false,
    } as ReturnType<typeof useSWR>);

    render(<StudentProfilePage />);

    // Navigate to Progress tab - get all "Progress" elements and click the tab (first one)
    const progressElements = screen.getAllByText('Progress');
    fireEvent.click(progressElements[0]);

    await waitFor(() => {
      // Check attendance breakdown - values may appear multiple times
      const presentCount = screen.getAllByText('15');
      expect(presentCount.length).toBeGreaterThan(0);

      const absentCount = screen.getAllByText('3');
      expect(absentCount.length).toBeGreaterThan(0);

      const lateCount = screen.getAllByText('2');
      expect(lateCount.length).toBeGreaterThan(0);

      const excusedCount = screen.getAllByText('1');
      expect(excusedCount.length).toBeGreaterThan(0);
    });
  });
});
