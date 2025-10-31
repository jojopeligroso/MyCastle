/**
 * Common type definitions for the frontend
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSession {
  id: string;
  userId: string;
  type: 'grammar' | 'vocabulary' | 'conversation' | 'writing';
  startedAt: string;
  completedAt?: string;
  score?: number;
}

export interface Exercise {
  id: string;
  type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: unknown;
}

// Add more shared types as needed
