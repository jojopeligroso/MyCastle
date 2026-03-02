/**
 * Lesson Planner Chat Types
 * TypeScript types for the lesson planner wizard and chat interface
 */

import { z } from 'zod';

/**
 * Teacher Intent - how they want to use Speakout
 */
export const TeacherIntent = z.enum(['follow', 'deviate', 'supplement']);
export type TeacherIntent = z.infer<typeof TeacherIntent>;

/**
 * Speakout Selection Context
 */
export interface SpeakoutContext {
  book: string;
  unit: string;
  lesson: string;
  page?: number;
  level: string;
  descriptors: SpeakoutDescriptor[];
}

export interface SpeakoutDescriptor {
  id: string;
  level: string;
  skillFocus: string;
  descriptorText: string;
  cefrDescriptorId?: string;
  cefrText?: string;
  cefrCategory?: string;
  cefrScale?: string;
}

/**
 * Chat Message Types
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Chat Context - passed to AI for each message
 */
export interface ChatContext {
  speakout: SpeakoutContext | null;
  intent: TeacherIntent | null;
  messages: ChatMessage[];
  classInfo?: {
    id: string;
    name: string;
    level: string;
    studentCount?: number;
  };
  additionalContext?: string;
}

/**
 * Field Trip Extension
 */
export const FieldTripSchema = z.object({
  location: z.string().min(1),
  venueName: z.string().min(1),
  date: z.string(), // ISO date string
  departureTime: z.string(),
  returnTime: z.string(),
  educationalObjectives: z.array(z.string()),
  cefrAlignment: z.array(z.string()),
  riskAssessment: z.string(),
  permissionsRequired: z.array(z.string()),
  transport: z.string(),
  emergencyContact: z.string(),
  notes: z.string().optional(),
});

export type FieldTrip = z.infer<typeof FieldTripSchema>;

/**
 * Lesson Plan with Approval Status
 */
export const ApprovalStatus = z.enum(['draft', 'pending_approval', 'approved', 'rejected']);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

export interface LessonPlanWithApproval {
  id: string;
  title: string;
  topic: string;
  cefrLevel: string;
  status: string;
  approvalStatus: ApprovalStatus;
  submittedForApprovalAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  approvalComments?: string;
  speakoutBook?: string;
  speakoutUnit?: string;
  speakoutLesson?: string;
  teacherIntent?: TeacherIntent;
  jsonPlan: Record<string, unknown>;
  fieldTrip?: FieldTrip;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Chat Request/Response Types
 */
export interface ChatRequest {
  message: string;
  context: ChatContext;
}

export interface ChatResponse {
  message: string;
  suggestedActions?: string[];
}

/**
 * Approval Request Types
 */
export interface ApprovalRequest {
  lessonPlanId: string;
  notes?: string;
}

export interface ApprovalDecision {
  lessonPlanId: string;
  decision: 'approved' | 'rejected';
  comments?: string;
}
