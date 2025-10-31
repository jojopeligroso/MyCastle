/**
 * Database Type Definitions
 * Auto-generated TypeScript types for ESL Learning Platform database schema
 *
 * These types match the PostgreSQL schema defined in the migration files.
 * Keep this file in sync with database migrations.
 */

// ================================================
// ENUMS
// ================================================

export type UserRole = 'student' | 'teacher' | 'admin';

export type EnrollmentStatus = 'active' | 'completed' | 'dropped';

export type AssignmentType = 'quiz' | 'homework' | 'exam' | 'practice';

export type MasteryLevel = 'not_started' | 'struggling' | 'learning' | 'mastered';

export type MessageRole = 'user' | 'assistant' | 'system';

export type ContentType = 'textbook' | 'reference' | 'worksheet' | 'lesson_plan' | 'quiz_template';

export type FeedbackCategory = 'bug' | 'feature_request' | 'content_feedback' | 'ai_response' | 'other';

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type FeedbackPriority = 'low' | 'medium' | 'high';

export type AnnouncementAudience = 'all' | 'course_students' | 'specific_users';

// ================================================
// TABLE TYPES
// ================================================

export interface User {
  id: string; // UUID
  email: string;
  role: UserRole;
  full_name: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface Course {
  id: string; // UUID
  title: string;
  description: string | null;
  curriculum: CourseCurriculum | null;
  grade_level: string | null;
  is_published: boolean;
  created_by: string; // UUID (references users.id)
  created_at: Date;
  updated_at: Date;
}

export interface Lesson {
  id: string; // UUID
  course_id: string; // UUID (references courses.id)
  title: string;
  content: LessonContent | null;
  order: number;
  duration_minutes: number | null;
  learning_objectives: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface Enrollment {
  id: string; // UUID
  student_id: string; // UUID (references users.id)
  course_id: string; // UUID (references courses.id)
  enrolled_at: Date;
  status: EnrollmentStatus;
  progress_percentage: number; // Decimal (0.00 to 100.00)
}

export interface Assignment {
  id: string; // UUID
  course_id: string; // UUID (references courses.id)
  lesson_id: string | null; // UUID (references lessons.id)
  title: string;
  description: string | null;
  type: AssignmentType;
  questions: AssignmentQuestion[];
  answer_key: AssignmentAnswerKey[] | null;
  max_score: number;
  due_date: Date | null;
  created_by: string; // UUID (references users.id)
  created_at: Date;
  updated_at: Date;
}

export interface Submission {
  id: string; // UUID
  assignment_id: string; // UUID (references assignments.id)
  student_id: string; // UUID (references users.id)
  answers: StudentAnswer[];
  score: number | null; // Decimal
  feedback: string | null;
  submitted_at: Date;
  graded_at: Date | null;
  graded_by: string | null; // UUID (references users.id)
}

export interface StudentProgress {
  id: string; // UUID
  student_id: string; // UUID (references users.id)
  course_id: string; // UUID (references courses.id)
  lesson_id: string | null; // UUID (references lessons.id)
  topic: string;
  mastery_level: MasteryLevel;
  attempts: number;
  last_activity: Date;
  metadata: StudentProgressMetadata | null;
}

export interface ConversationSession {
  id: string; // UUID
  user_id: string; // UUID (references users.id)
  role_context: UserRole;
  started_at: Date;
  ended_at: Date | null;
  metadata: ConversationSessionMetadata | null;
}

export interface ConversationMessage {
  id: string; // UUID
  session_id: string; // UUID (references conversation_sessions.id)
  role: MessageRole;
  content: string;
  metadata: ConversationMessageMetadata | null;
  created_at: Date;
}

export interface ContentLibrary {
  id: string; // UUID
  title: string;
  content_type: ContentType;
  content: ContentLibraryContent;
  tags: string[];
  course_id: string | null; // UUID (references courses.id)
  is_public: boolean;
  created_by: string; // UUID (references users.id)
  created_at: Date;
  updated_at: Date;
}

export interface Feedback {
  id: string; // UUID
  user_id: string; // UUID (references users.id)
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  created_at: Date;
  updated_at: Date;
}

export interface Announcement {
  id: string; // UUID
  course_id: string | null; // UUID (references courses.id)
  author_id: string; // UUID (references users.id)
  title: string;
  message: string;
  target_audience: AnnouncementAudience;
  created_at: Date;
  is_published: boolean;
}

export interface SystemLog {
  id: string; // UUID
  event_type: string;
  user_id: string | null; // UUID (references users.id)
  metadata: Record<string, any> | null;
  created_at: Date;
}

// ================================================
// JSONB FIELD TYPES
// ================================================

// Course Curriculum Structure
export interface CourseCurriculum {
  objectives: string[];
  standards?: string[];
  [key: string]: any; // Allow additional fields
}

// Lesson Content Structure
export interface LessonContent {
  slides?: Array<{
    title: string;
    content: string;
  }>;
  exercises?: string[];
  dialogues?: Array<{
    topic?: string;
    speakers?: string[];
    lines?: string[];
    vocabulary?: string[];
  }>;
  examples?: Array<{
    weak?: string;
    strong?: string;
  }>;
  guidelines?: string[];
  [key: string]: any; // Allow additional fields
}

// Assignment Question Structure
export interface AssignmentQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'recording' | string;
  question: string;
  options?: string[]; // For multiple choice
  points: number;
  [key: string]: any; // Allow additional fields
}

// Assignment Answer Key Structure
export interface AssignmentAnswerKey {
  id: string; // Matches question id
  correct_answer?: string;
  sample_answer?: string;
  rubric?: string;
  [key: string]: any; // Allow additional fields
}

// Student Answer Structure
export interface StudentAnswer {
  id: string; // Matches question id
  answer: string | number | boolean | string[];
  [key: string]: any; // Allow additional fields
}

// Student Progress Metadata
export interface StudentProgressMetadata {
  hints_used?: number;
  time_spent_minutes?: number;
  common_mistakes?: string[];
  recommended_resources?: string[];
  [key: string]: any; // Allow additional fields
}

// Conversation Session Metadata
export interface ConversationSessionMetadata {
  session_type?: string;
  course_context?: string;
  [key: string]: any; // Allow additional fields
}

// Conversation Message Metadata
export interface ConversationMessageMetadata {
  tool_calls?: Array<{
    tool: string;
    params?: Record<string, any>;
    result?: any;
  }>;
  tokens_used?: number;
  model?: string;
  [key: string]: any; // Allow additional fields
}

// Content Library Content Structure
export interface ContentLibraryContent {
  sections?: Array<{
    title: string;
    content: string;
  }>;
  categories?: Array<{
    name: string;
    phrases?: string[];
    items?: string[];
  }>;
  structure?: Record<string, string>;
  [key: string]: any; // Allow additional fields
}

// ================================================
// DATABASE INSERT TYPES (without auto-generated fields)
// ================================================

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type LessonInsert = Omit<Lesson, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type EnrollmentInsert = Omit<Enrollment, 'id' | 'enrolled_at'> & {
  id?: string;
  enrolled_at?: Date;
};

export type AssignmentInsert = Omit<Assignment, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type SubmissionInsert = Omit<Submission, 'id' | 'submitted_at'> & {
  id?: string;
  submitted_at?: Date;
};

export type StudentProgressInsert = Omit<StudentProgress, 'id' | 'last_activity'> & {
  id?: string;
  last_activity?: Date;
};

export type ConversationSessionInsert = Omit<ConversationSession, 'id' | 'started_at'> & {
  id?: string;
  started_at?: Date;
};

export type ConversationMessageInsert = Omit<ConversationMessage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type ContentLibraryInsert = Omit<ContentLibrary, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type FeedbackInsert = Omit<Feedback, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type SystemLogInsert = Omit<SystemLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

// ================================================
// DATABASE UPDATE TYPES
// ================================================

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>>;

export type CourseUpdate = Partial<Omit<Course, 'id' | 'created_at' | 'created_by'>>;

export type LessonUpdate = Partial<Omit<Lesson, 'id' | 'created_at' | 'course_id'>>;

export type EnrollmentUpdate = Partial<Omit<Enrollment, 'id' | 'student_id' | 'course_id' | 'enrolled_at'>>;

export type AssignmentUpdate = Partial<Omit<Assignment, 'id' | 'created_at' | 'created_by'>>;

export type SubmissionUpdate = Partial<Omit<Submission, 'id' | 'assignment_id' | 'student_id' | 'submitted_at'>>;

export type StudentProgressUpdate = Partial<Omit<StudentProgress, 'id' | 'student_id' | 'course_id'>>;

export type ConversationSessionUpdate = Partial<Omit<ConversationSession, 'id' | 'user_id' | 'started_at'>>;

export type ContentLibraryUpdate = Partial<Omit<ContentLibrary, 'id' | 'created_at' | 'created_by'>>;

export type FeedbackUpdate = Partial<Omit<Feedback, 'id' | 'user_id' | 'created_at'>>;

export type AnnouncementUpdate = Partial<Omit<Announcement, 'id' | 'author_id' | 'created_at'>>;

// ================================================
// QUERY RESULT TYPES
// ================================================

// Course with creator information
export interface CourseWithCreator extends Course {
  creator: Pick<User, 'id' | 'full_name' | 'email'>;
}

// Enrollment with course and student information
export interface EnrollmentWithDetails extends Enrollment {
  course: Pick<Course, 'id' | 'title' | 'grade_level'>;
  student: Pick<User, 'id' | 'full_name' | 'email'>;
}

// Assignment with submission status
export interface AssignmentWithSubmission extends Assignment {
  submission?: Pick<Submission, 'id' | 'score' | 'submitted_at' | 'graded_at'>;
}

// Course statistics (returned by get_course_statistics function)
export interface CourseStatistics {
  total_students: number;
  active_students: number;
  completed_students: number;
  average_progress: number;
  total_assignments: number;
  total_submissions: number;
  average_score: number;
}

// Student performance (returned by get_student_performance function)
export interface StudentPerformance {
  course_title: string;
  progress_percentage: number;
  assignments_completed: number;
  assignments_total: number;
  average_score: number;
  mastered_topics: number;
  struggling_topics: number;
}

// Upcoming assignment (returned by get_upcoming_assignments function)
export interface UpcomingAssignment {
  assignment_id: string;
  assignment_title: string;
  course_title: string;
  due_date: Date;
  max_score: number;
  is_submitted: boolean;
}

// Content library search result (returned by search_content_library function)
export interface ContentSearchResult {
  id: string;
  title: string;
  content_type: ContentType;
  tags: string[];
  relevance: number;
}

// ================================================
// UTILITY TYPES
// ================================================

// Type guard to check if user is student
export function isStudent(user: User): boolean {
  return user.role === 'student';
}

// Type guard to check if user is teacher
export function isTeacher(user: User): boolean {
  return user.role === 'teacher';
}

// Type guard to check if user is admin
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

// Database table names (useful for dynamic queries)
export const TableNames = {
  USERS: 'users',
  COURSES: 'courses',
  LESSONS: 'lessons',
  ENROLLMENTS: 'enrollments',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  STUDENT_PROGRESS: 'student_progress',
  CONVERSATION_SESSIONS: 'conversation_sessions',
  CONVERSATION_MESSAGES: 'conversation_messages',
  CONTENT_LIBRARY: 'content_library',
  FEEDBACK: 'feedback',
  ANNOUNCEMENTS: 'announcements',
  SYSTEM_LOGS: 'system_logs',
} as const;

// Type for table names
export type TableName = typeof TableNames[keyof typeof TableNames];
