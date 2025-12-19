/**
 * Tests for LessonPlannerForm component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LessonPlannerForm } from '@/components/lessons/LessonPlannerForm';
import type { LessonPlan } from '@/lib/lessons/schemas';

// Mock fetch globally
global.fetch = jest.fn();

describe('LessonPlannerForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form with all required fields', () => {
    render(<LessonPlannerForm />);

    expect(screen.getByText('AI-Assisted Lesson Planner')).toBeInTheDocument();
    expect(screen.getByLabelText('CEFR Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Lesson Topic')).toBeInTheDocument();
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/additional context/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate lesson plan/i })).toBeInTheDocument();
  });

  it('should have default values set correctly', () => {
    render(<LessonPlannerForm />);

    const cefrSelect = screen.getByLabelText('CEFR Level') as HTMLSelectElement;
    const durationInput = screen.getByLabelText(/duration/i) as HTMLInputElement;

    expect(cefrSelect.value).toBe('B1');
    expect(durationInput.value).toBe('60');
  });

  it('should update CEFR level when changed', () => {
    render(<LessonPlannerForm />);

    const cefrSelect = screen.getByLabelText('CEFR Level') as HTMLSelectElement;

    fireEvent.change(cefrSelect, { target: { value: 'C1' } });

    expect(cefrSelect.value).toBe('C1');
  });

  it('should update topic when changed', () => {
    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;

    fireEvent.change(topicInput, { target: { value: 'Travel and Tourism' } });

    expect(topicInput.value).toBe('Travel and Tourism');
  });

  it('should update duration when changed', () => {
    render(<LessonPlannerForm />);

    const durationInput = screen.getByLabelText(/duration/i) as HTMLInputElement;

    fireEvent.change(durationInput, { target: { value: '90' } });

    expect(durationInput.value).toBe('90');
  });

  it('should update additional context when changed', () => {
    render(<LessonPlannerForm />);

    const contextInput = screen.getByLabelText(/additional context/i) as HTMLTextAreaElement;

    fireEvent.change(contextInput, { target: { value: 'Focus on business vocabulary' } });

    expect(contextInput.value).toBe('Focus on business vocabulary');
  });

  it('should submit form with correct data', async () => {
    const mockPlan: LessonPlan = {
      title: 'Daily Routines',
      topic: 'Daily Routines',
      cefr_level: 'B1',
      duration_minutes: 60,
      objectives: [{ description: 'Learn daily routine vocabulary' }],
      activities: [
        {
          name: 'Warm-up',
          description: 'Discuss daily routines',
          duration_minutes: 10,
          materials: [],
        },
      ],
      materials: ['Worksheet', 'Flashcards'],
      assessment: [{ type: 'formative', description: 'Role play' }],
      homework: 'Write about your daily routine',
      notes: 'Adjust timing as needed',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: mockPlan,
        generation_time_ms: 1500,
      }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Daily Routines' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/lessons/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cefr_level: 'B1',
            topic: 'Daily Routines',
            duration_minutes: 60,
          }),
        })
      );
    });
  });

  it('should include additional context in request when provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: { id: 'plan-123', title: 'Test', cefr_level: 'B1', duration_minutes: 60 },
        generation_time_ms: 1000,
      }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const contextInput = screen.getByLabelText(/additional context/i) as HTMLTextAreaElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Business English' } });
    fireEvent.change(contextInput, { target: { value: 'Focus on email writing' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/lessons/generate',
        expect.objectContaining({
          body: JSON.stringify({
            cefr_level: 'B1',
            topic: 'Business English',
            duration_minutes: 60,
            additional_context: 'Focus on email writing',
          }),
        })
      );
    });
  });

  it('should show loading state during generation', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              plan: { id: 'plan-123', title: 'Test', cefr_level: 'B1', duration_minutes: 60 },
              generation_time_ms: 1000,
            }),
          });
        }, 100);
      })
    );

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test Topic' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/generating lesson plan/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate lesson plan/i })).not.toBeDisabled();
    });
  });

  it('should display generated lesson plan', async () => {
    const mockPlan: LessonPlan = {
      title: 'Food and Cooking',
      topic: 'Food and Cooking',
      cefr_level: 'A2',
      duration_minutes: 60,
      objectives: [
        { description: 'Learn food vocabulary' },
        { description: 'Practice ordering at a restaurant' },
      ],
      activities: [
        {
          name: 'Vocabulary Introduction',
          description: 'Introduce food-related vocabulary',
          duration_minutes: 15,
          materials: ['Flashcards', 'Picture cards'],
        },
      ],
      materials: ['Flashcards', 'Menu samples'],
      assessment: [{ type: 'formative', description: 'Role play ordering food' }],
      homework: 'Write a recipe',
      notes: 'Bring real menus if possible',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: mockPlan,
        generation_time_ms: 2500,
      }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Food and Cooking' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Generated Lesson Plan')).toBeInTheDocument();
      expect(screen.getByText('Food and Cooking')).toBeInTheDocument();
      expect(screen.getByText(/a2 • 60 minutes/i)).toBeInTheDocument();
      expect(screen.getByText('Learn food vocabulary')).toBeInTheDocument();
      expect(screen.getByText('Vocabulary Introduction')).toBeInTheDocument();
      expect(screen.getByText(/15 min/i)).toBeInTheDocument();
      expect(screen.getByText('Write a recipe')).toBeInTheDocument();
      expect(screen.getByText('Bring real menus if possible')).toBeInTheDocument();
    });
  });

  it('should display generation time', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: { id: 'plan-123', title: 'Test', cefr_level: 'B1', duration_minutes: 60 },
        generation_time_ms: 3500,
      }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/generated in 3\.50s/i)).toBeInTheDocument();
    });
  });

  it('should display error message when generation fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API rate limit exceeded' }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/api rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/network failure/i)).toBeInTheDocument();
    });
  });

  it('should call onPlanGenerated callback when provided', async () => {
    const mockPlan: LessonPlan = {
      title: 'Test Plan',
      topic: 'Test Topic',
      cefr_level: 'B1',
      duration_minutes: 60,
      objectives: [{ description: 'Test objective' }],
      activities: [{ name: 'Test activity', description: 'Test description', duration_minutes: 10 }],
    };

    const onPlanGenerated = jest.fn();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: mockPlan,
        generation_time_ms: 1000,
      }),
    });

    render(<LessonPlannerForm onPlanGenerated={onPlanGenerated} />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onPlanGenerated).toHaveBeenCalledWith(mockPlan);
    });
  });

  it('should render all CEFR levels', () => {
    render(<LessonPlannerForm />);

    expect(screen.getByText('A1 - Beginner')).toBeInTheDocument();
    expect(screen.getByText('A2 - Elementary')).toBeInTheDocument();
    expect(screen.getByText('B1 - Intermediate')).toBeInTheDocument();
    expect(screen.getByText('B2 - Upper Intermediate')).toBeInTheDocument();
    expect(screen.getByText('C1 - Advanced')).toBeInTheDocument();
    expect(screen.getByText('C2 - Proficiency')).toBeInTheDocument();
  });

  it('should have correct duration constraints', () => {
    render(<LessonPlannerForm />);

    const durationInput = screen.getByLabelText(/duration/i) as HTMLInputElement;

    expect(durationInput.min).toBe('30');
    expect(durationInput.max).toBe('240');
    expect(durationInput.step).toBe('15');
  });

  it('should clear error when new generation starts', async () => {
    // First request fails
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'First error' }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test 1' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first error/i)).toBeInTheDocument();
    });

    // Second request succeeds
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: { id: 'plan-123', title: 'Test', cefr_level: 'B1', duration_minutes: 60 },
        generation_time_ms: 1000,
      }),
    });

    fireEvent.change(topicInput, { target: { value: 'Test 2' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/first error/i)).not.toBeInTheDocument();
    });
  });

  it('should display materials list when present', async () => {
    const mockPlan: LessonPlan = {
      title: 'Test Plan',
      topic: 'Test Topic',
      cefr_level: 'B1',
      duration_minutes: 60,
      objectives: [{ description: 'Test objective' }],
      activities: [{ name: 'Test activity', description: 'Test description', duration_minutes: 10 }],
      materials: ['Whiteboard', 'Markers', 'Handouts', 'Audio player'],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: mockPlan,
        generation_time_ms: 1000,
      }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Materials Needed')).toBeInTheDocument();
      expect(screen.getByText('Whiteboard')).toBeInTheDocument();
      expect(screen.getByText('Markers')).toBeInTheDocument();
      expect(screen.getByText('Handouts')).toBeInTheDocument();
      expect(screen.getByText('Audio player')).toBeInTheDocument();
    });
  });

  it('should display assessment methods when present', async () => {
    const mockPlan: LessonPlan = {
      title: 'Test Plan',
      topic: 'Test Topic',
      cefr_level: 'B1',
      duration_minutes: 60,
      objectives: [{ description: 'Test objective' }],
      activities: [{ name: 'Test activity', description: 'Test description', duration_minutes: 10 }],
      assessment: [
        { type: 'formative', description: 'Peer evaluation' },
        { type: 'summative', description: 'Written quiz' },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        plan: mockPlan,
        generation_time_ms: 1000,
      }),
    });

    render(<LessonPlannerForm />);

    const topicInput = screen.getByLabelText('Lesson Topic') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /generate lesson plan/i });

    fireEvent.change(topicInput, { target: { value: 'Test' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Assessment')).toBeInTheDocument();
      expect(screen.getByText(/formative:/i)).toBeInTheDocument();
      expect(screen.getByText(/peer evaluation/i)).toBeInTheDocument();
      expect(screen.getByText(/summative:/i)).toBeInTheDocument();
      expect(screen.getByText(/written quiz/i)).toBeInTheDocument();
    });
  });
});
