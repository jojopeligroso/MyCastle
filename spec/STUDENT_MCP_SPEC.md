# Student MCP Specification

**Status:** Architecture Hooks Only (No Implementation)
**Created:** 2026-03-03
**Ref:** STUDENT_PROFILE_ROADMAP.md Task #10

---

## Overview

This document defines the future Student MCP server architecture for AI tutor integration. The current implementation provides **hooks only** - database tables, API endpoints, and UI placeholders - without actual LLM integration.

## MCP Server Identity

```yaml
Name: student
Namespace: mycastle.student
Version: 1.0.0 (planned)
Transport: JSON-RPC 2.0 over stdio
Max Tools: 10 (per domain principle)
```

## Domain Boundaries

The Student MCP handles student-facing AI interactions:

| Capability | Description |
|------------|-------------|
| Tutor Sessions | Conversational AI practice |
| Exercises | Skill-targeted practice (grammar, vocab, etc.) |
| Vocabulary | Personalized word lists with spaced repetition |
| Progress Context | Profile data for LLM prompt construction |

**Out of Scope** (handled by other MCPs):
- Attendance tracking → Attendance MCP
- Grades/assessments → Academic MCP
- User authentication → Identity MCP
- Financial data → Finance MCP

---

## Tool Signatures (Planned)

### 1. start_tutor_session

Initiates a new AI tutor session.

```typescript
interface StartTutorSessionInput {
  sessionType: 'conversation' | 'exercise' | 'vocabulary' | 'pronunciation';
  targetLevel?: string; // CEFR level (default: student's current level)
  topic?: string; // Optional topic focus
  learningObjectiveId?: string; // Optional CEFR descriptor to practice
}

interface StartTutorSessionOutput {
  sessionId: string;
  greeting: string; // Initial AI message
  suggestedTopics?: string[]; // Based on student's gaps
}
```

### 2. send_message

Sends a message to the AI tutor within an active session.

```typescript
interface SendMessageInput {
  sessionId: string;
  content: string;
  audioUrl?: string; // For pronunciation practice
}

interface SendMessageOutput {
  response: string; // AI response
  analysis?: {
    grammarErrors?: Array<{
      text: string;
      correction: string;
      explanation: string;
    }>;
    vocabularyNotes?: Array<{
      word: string;
      definition: string;
      level: string;
    }>;
    pronunciationFeedback?: string;
  };
  suggestedVocab?: string[]; // Words to add to vocab list
}
```

### 3. end_tutor_session

Ends a tutor session and generates summary.

```typescript
interface EndTutorSessionInput {
  sessionId: string;
}

interface EndTutorSessionOutput {
  summary: {
    duration: number; // seconds
    messageCount: number;
    vocabIntroduced: string[];
    errorsCorrepted: number;
    skillsAssessed: string[];
  };
  recommendedNextSteps?: string[];
}
```

### 4. generate_exercise

Generates a targeted exercise for the student.

```typescript
interface GenerateExerciseInput {
  exerciseType: 'fill_blank' | 'multiple_choice' | 'matching' | 'ordering' | 'speaking' | 'writing';
  skillFocus: 'grammar' | 'vocabulary' | 'listening' | 'speaking' | 'reading' | 'writing';
  targetLevel: string; // CEFR level
  topic?: string;
  grammarPoint?: string;
  vocabularyList?: string[]; // Specific words to include
}

interface GenerateExerciseOutput {
  exerciseId: string;
  instructions: string;
  content: unknown; // Exercise-type-specific structure
  estimatedTime: number; // seconds
}
```

### 5. submit_exercise

Submits exercise answers for grading.

```typescript
interface SubmitExerciseInput {
  exerciseId: string;
  answers: unknown; // Exercise-type-specific structure
  timeSpent: number; // seconds
}

interface SubmitExerciseOutput {
  score: number; // 0-100
  correct: number;
  total: number;
  feedback: Array<{
    questionIndex: number;
    isCorrect: boolean;
    explanation?: string;
  }>;
  overallFeedback: string;
}
```

### 6. get_vocabulary_review

Gets vocabulary items due for review (spaced repetition).

```typescript
interface GetVocabularyReviewInput {
  limit?: number; // Max items (default: 20)
  includeNew?: boolean; // Include new items (default: true)
}

interface GetVocabularyReviewOutput {
  items: Array<{
    id: string;
    word: string;
    definition: string;
    exampleSentence?: string;
    level: string;
    status: 'new' | 'learning' | 'mastered';
    lastReviewed?: string;
  }>;
  stats: {
    total: number;
    new: number;
    learning: number;
    mastered: number;
    dueToday: number;
  };
}
```

### 7. record_vocabulary_review

Records the result of a vocabulary review.

```typescript
interface RecordVocabularyReviewInput {
  itemId: string;
  correct: boolean;
  confidence: 1 | 2 | 3 | 4 | 5; // Self-reported
}

interface RecordVocabularyReviewOutput {
  newStatus: 'new' | 'learning' | 'mastered';
  nextReviewDate: string;
  streakCount?: number;
}
```

### 8. add_vocabulary

Adds a new word to the student's vocabulary list.

```typescript
interface AddVocabularyInput {
  word: string;
  definition?: string; // Auto-generated if not provided
  exampleSentence?: string;
  source: 'tutor_session' | 'lesson' | 'manual';
  sourceId?: string;
}

interface AddVocabularyOutput {
  id: string;
  word: string;
  definition: string;
  level: string; // Auto-detected CEFR level
  partOfSpeech: string;
}
```

### 9. get_student_context

Gets comprehensive student context for LLM prompts.

```typescript
interface GetStudentContextInput {
  includeProgress?: boolean;
  includeRecentAssessments?: boolean;
  includeVocabularyStats?: boolean;
  includeLearningObjectives?: boolean;
}

interface GetStudentContextOutput {
  profile: {
    name: string;
    currentLevel: string;
    initialLevel: string;
    memberSince: string;
  };
  progress?: {
    competencyRate: number;
    skillBreakdown: Record<string, number>;
    recentGaps: string[];
  };
  recentAssessments?: Array<{
    descriptor: string;
    progress: string;
    date: string;
  }>;
  vocabularyStats?: {
    total: number;
    mastered: number;
    learning: number;
    recentlyAdded: string[];
  };
  currentObjectives?: Array<{
    descriptor: string;
    level: string;
    source: string;
  }>;
}
```

### 10. get_recommendations

Gets personalized recommendations based on student profile.

```typescript
interface GetRecommendationsInput {
  type: 'exercises' | 'topics' | 'vocabulary' | 'all';
}

interface GetRecommendationsOutput {
  exercises?: Array<{
    type: string;
    topic: string;
    reason: string;
  }>;
  topics?: Array<{
    topic: string;
    level: string;
    reason: string;
  }>;
  vocabulary?: Array<{
    word: string;
    reason: string;
  }>;
}
```

---

## Database Tables

The following tables support LLM tutor features:

### From FRESH_0027 (Base)

| Table | Purpose |
|-------|---------|
| `exercise_attempts` | Track exercise completion and scoring |
| `vocab_lists` | Student vocabulary with spaced repetition |
| `tutor_interactions` | Conversation history |

### From FRESH_0032 (Extended)

| Table | Purpose |
|-------|---------|
| `tutor_sessions` | Session metadata and summaries |
| `tutor_messages` | Individual messages with analysis |
| `student_vocabulary` | Enhanced vocab with SM-2 algorithm |
| `exercise_templates` | Reusable exercise definitions |
| `exercise_attempts` | Extended attempt tracking |

---

## API Endpoints (Current Hooks)

### GET /api/student/tutor-context

Returns student context for LLM prompt construction.

**Response:**
```json
{
  "profile": {
    "name": "Student Name",
    "currentLevel": "B1",
    "initialLevel": "A2",
    "memberSince": "2025-09-01"
  },
  "currentClass": {
    "name": "General English B1",
    "level": "B1"
  },
  "progress": {
    "competencyRate": 65,
    "skillBreakdown": {
      "reading": 70,
      "writing": 55,
      "listening": 75,
      "speaking": 60
    },
    "recentGaps": ["conditional sentences", "reported speech"]
  },
  "recentAssessments": [...],
  "vocabularyStats": {
    "total": 150,
    "mastered": 45,
    "learning": 80,
    "new": 25
  },
  "currentObjectives": [...]
}
```

---

## UI Components (Current Hooks)

### StudentProfilePage - TutorTab

Located: `app/src/components/student/StudentProfilePage.tsx`

Current implementation shows "Coming Soon" placeholder with:
- Feature preview cards (Speaking Practice, Vocabulary Builder, Smart Exercises)
- "In Development" badge
- Polished gradient UI

### Future Components (Not Yet Built)

| Component | Purpose |
|-----------|---------|
| `TutorChat` | Real-time conversation interface |
| `ExercisePlayer` | Exercise rendering and submission |
| `VocabReviewCard` | Spaced repetition flashcard UI |
| `ProgressRadar` | Skill progress visualization |

---

## Integration Points

### LLM Provider

The Student MCP is designed to be LLM-agnostic:

```typescript
interface LLMProvider {
  generateResponse(prompt: string, context: StudentContext): Promise<string>;
  generateExercise(params: ExerciseParams): Promise<Exercise>;
  analyzeText(text: string, level: string): Promise<TextAnalysis>;
}
```

Supported providers (future):
- Claude (Anthropic)
- GPT-4 (OpenAI)
- Custom fine-tuned models

### Audio Processing

For pronunciation features:
- Speech-to-text for student input
- Text-to-speech for AI responses
- Pronunciation analysis

---

## Security Considerations

### Data Isolation

- All tutor data is tenant-scoped via RLS
- Students can only access their own data
- Teachers can view (not modify) student tutor data
- Admin has full read access for analytics

### Content Safety

- All LLM responses should be filtered for appropriateness
- Exercise generation should avoid sensitive topics
- Vocabulary auto-definitions should be verified

### Rate Limiting

- Tutor sessions: 10 per day per student
- Exercises: 50 per day per student
- Vocabulary additions: 100 per day per student

---

## Metrics & Analytics

### Student-Level

- Session duration and frequency
- Exercise completion rate
- Vocabulary retention rate
- Skill improvement over time

### Tenant-Level

- Total tutor usage
- Most practiced topics
- Common error patterns
- Exercise effectiveness

---

## Implementation Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Database schema, UI placeholders | ✅ Complete |
| Phase 2 | Tutor context API, basic recommendations | ✅ Complete |
| Phase 3 | LLM integration, conversation flow | 🔮 Planned |
| Phase 4 | Exercise generation, vocabulary features | 🔮 Planned |
| Phase 5 | Pronunciation, audio features | 🔮 Planned |

---

## References

- MCP Architecture: `/app/docs/MCP_ARCHITECTURE.md`
- Student Profile Feature: `/STUDENT_PROFILE_ROADMAP.md`
- Database Migrations: `/app/migrations/FRESH_0027_student_profile_feature.sql`
- Extended Hooks: `/app/migrations/FRESH_0032_llm_tutor_hooks.sql`
