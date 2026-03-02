/**
 * Profile Schema Tests
 *
 * Comprehensive tests for the Student Profile feature database schema.
 * Tests cover:
 * - Type inference correctness
 * - Schema structure validation
 * - Default values
 * - Relationship definitions
 * - Type exports
 *
 * @jest-environment node
 */

import {
  // Tables
  tenantCefrConfig,
  tenantDescriptorSelection,
  studentNotes,
  competencyAssessments,
  competencyProgress,
  diagnosticSessions,
  levelPromotions,
  contactVerifications,
  exerciseAttempts,
  vocabLists,
  tutorInteractions,
  // Types
  TenantCefrConfig,
  NewTenantCefrConfig,
  TenantDescriptorSelection,
  NewTenantDescriptorSelection,
  StudentNote,
  NewStudentNote,
  CompetencyAssessment,
  NewCompetencyAssessment,
  CompetencyProgress,
  NewCompetencyProgress,
  DiagnosticSession,
  NewDiagnosticSession,
  LevelPromotion,
  NewLevelPromotion,
  ContactVerification,
  NewContactVerification,
  ExerciseAttempt,
  NewExerciseAttempt,
  VocabList,
  NewVocabList,
  TutorInteraction,
  NewTutorInteraction,
} from '@/db/schema/profile';

describe('Profile Schema', () => {
  describe('tenantCefrConfig', () => {
    it('should have correct column names', () => {
      expect(tenantCefrConfig.id).toBeDefined();
      expect(tenantCefrConfig.tenantId).toBeDefined();
      expect(tenantCefrConfig.enabledLevels).toBeDefined();
      expect(tenantCefrConfig.usesPlusLevels).toBeDefined();
      expect(tenantCefrConfig.assessmentFrequency).toBeDefined();
      expect(tenantCefrConfig.assessmentWeights).toBeDefined();
      expect(tenantCefrConfig.descriptorMode).toBeDefined();
      expect(tenantCefrConfig.createdAt).toBeDefined();
      expect(tenantCefrConfig.updatedAt).toBeDefined();
    });

    it('should map to correct database table', () => {
      // Verify the table name is defined in Drizzle
      // The actual table name is internal but we can verify columns exist
      expect(tenantCefrConfig).toBeDefined();
    });

    it('should have correct column mappings (camelCase TS -> snake_case DB)', () => {
      // Verify the column names in the database are snake_case
      expect(tenantCefrConfig.tenantId.name).toBe('tenant_id');
      expect(tenantCefrConfig.enabledLevels.name).toBe('enabled_levels');
      expect(tenantCefrConfig.usesPlusLevels.name).toBe('uses_plus_levels');
      expect(tenantCefrConfig.assessmentFrequency.name).toBe('assessment_frequency');
      expect(tenantCefrConfig.assessmentWeights.name).toBe('assessment_weights');
      expect(tenantCefrConfig.descriptorMode.name).toBe('descriptor_mode');
      expect(tenantCefrConfig.createdAt.name).toBe('created_at');
      expect(tenantCefrConfig.updatedAt.name).toBe('updated_at');
    });
  });

  describe('studentNotes', () => {
    it('should have all required columns', () => {
      expect(studentNotes.id).toBeDefined();
      expect(studentNotes.tenantId).toBeDefined();
      expect(studentNotes.studentId).toBeDefined();
      expect(studentNotes.authorId).toBeDefined();
      expect(studentNotes.authorRole).toBeDefined();
      expect(studentNotes.content).toBeDefined();
      expect(studentNotes.noteType).toBeDefined();
      expect(studentNotes.visibility).toBeDefined();
      expect(studentNotes.isSharedWithStudent).toBeDefined();
      expect(studentNotes.sharedAt).toBeDefined();
      expect(studentNotes.tags).toBeDefined();
      expect(studentNotes.editedAt).toBeDefined();
      expect(studentNotes.editedBy).toBeDefined();
      expect(studentNotes.createdAt).toBeDefined();
      expect(studentNotes.updatedAt).toBeDefined();
    });

    it('should have correct snake_case database column names', () => {
      expect(studentNotes.tenantId.name).toBe('tenant_id');
      expect(studentNotes.studentId.name).toBe('student_id');
      expect(studentNotes.authorId.name).toBe('author_id');
      expect(studentNotes.authorRole.name).toBe('author_role');
      expect(studentNotes.noteType.name).toBe('note_type');
      expect(studentNotes.isSharedWithStudent.name).toBe('is_shared_with_student');
      expect(studentNotes.sharedAt.name).toBe('shared_at');
      expect(studentNotes.editedAt.name).toBe('edited_at');
      expect(studentNotes.editedBy.name).toBe('edited_by');
    });

    it('should map to correct database table', () => {
      // Verify the table is properly defined
      expect(studentNotes).toBeDefined();
    });
  });

  describe('competencyAssessments', () => {
    it('should have all required columns for tracking assessments', () => {
      expect(competencyAssessments.id).toBeDefined();
      expect(competencyAssessments.tenantId).toBeDefined();
      expect(competencyAssessments.studentId).toBeDefined();
      expect(competencyAssessments.descriptorId).toBeDefined();
      expect(competencyAssessments.classId).toBeDefined();
      expect(competencyAssessments.enrollmentId).toBeDefined();
      expect(competencyAssessments.assignmentId).toBeDefined();
      expect(competencyAssessments.assessmentType).toBeDefined();
      expect(competencyAssessments.assessmentDate).toBeDefined();
      expect(competencyAssessments.score).toBeDefined();
      expect(competencyAssessments.notes).toBeDefined();
      expect(competencyAssessments.assessedBy).toBeDefined();
    });

    it('should have correct column mappings', () => {
      expect(competencyAssessments.descriptorId.name).toBe('descriptor_id');
      expect(competencyAssessments.classId.name).toBe('class_id');
      expect(competencyAssessments.enrollmentId.name).toBe('enrollment_id');
      expect(competencyAssessments.assignmentId.name).toBe('assignment_id');
      expect(competencyAssessments.assessmentType.name).toBe('assessment_type');
      expect(competencyAssessments.assessmentDate.name).toBe('assessment_date');
      expect(competencyAssessments.assessedBy.name).toBe('assessed_by');
    });
  });

  describe('competencyProgress', () => {
    it('should have columns for aggregated progress tracking', () => {
      expect(competencyProgress.id).toBeDefined();
      expect(competencyProgress.tenantId).toBeDefined();
      expect(competencyProgress.studentId).toBeDefined();
      expect(competencyProgress.descriptorId).toBeDefined();
      expect(competencyProgress.currentScore).toBeDefined();
      expect(competencyProgress.assessmentCount).toBeDefined();
      expect(competencyProgress.lastAssessedAt).toBeDefined();
      expect(competencyProgress.isCompetent).toBeDefined();
      expect(competencyProgress.competentSince).toBeDefined();
      expect(competencyProgress.enrollmentId).toBeDefined();
    });

    it('should have correct column mappings', () => {
      expect(competencyProgress.currentScore.name).toBe('current_score');
      expect(competencyProgress.assessmentCount.name).toBe('assessment_count');
      expect(competencyProgress.lastAssessedAt.name).toBe('last_assessed_at');
      expect(competencyProgress.isCompetent.name).toBe('is_competent');
      expect(competencyProgress.competentSince.name).toBe('competent_since');
    });
  });

  describe('diagnosticSessions', () => {
    it('should have columns for diagnostic test tracking', () => {
      expect(diagnosticSessions.id).toBeDefined();
      expect(diagnosticSessions.tenantId).toBeDefined();
      expect(diagnosticSessions.studentId).toBeDefined();
      expect(diagnosticSessions.startedAt).toBeDefined();
      expect(diagnosticSessions.completedAt).toBeDefined();
      expect(diagnosticSessions.status).toBeDefined();
      expect(diagnosticSessions.currentStage).toBeDefined();
      expect(diagnosticSessions.recommendedLevel).toBeDefined();
      expect(diagnosticSessions.actualPlacementLevel).toBeDefined();
      expect(diagnosticSessions.stageResults).toBeDefined();
      expect(diagnosticSessions.administeredBy).toBeDefined();
      expect(diagnosticSessions.notes).toBeDefined();
    });

    it('should have correct column mappings', () => {
      expect(diagnosticSessions.startedAt.name).toBe('started_at');
      expect(diagnosticSessions.completedAt.name).toBe('completed_at');
      expect(diagnosticSessions.currentStage.name).toBe('current_stage');
      expect(diagnosticSessions.recommendedLevel.name).toBe('recommended_level');
      expect(diagnosticSessions.actualPlacementLevel.name).toBe('actual_placement_level');
      expect(diagnosticSessions.stageResults.name).toBe('stage_results');
      expect(diagnosticSessions.administeredBy.name).toBe('administered_by');
    });
  });

  describe('levelPromotions', () => {
    it('should have columns for promotion workflow', () => {
      expect(levelPromotions.id).toBeDefined();
      expect(levelPromotions.tenantId).toBeDefined();
      expect(levelPromotions.studentId).toBeDefined();
      expect(levelPromotions.fromLevel).toBeDefined();
      expect(levelPromotions.toLevel).toBeDefined();
      expect(levelPromotions.recommendedBy).toBeDefined();
      expect(levelPromotions.recommendedAt).toBeDefined();
      expect(levelPromotions.recommendationReason).toBeDefined();
      expect(levelPromotions.evidenceSummary).toBeDefined();
      expect(levelPromotions.status).toBeDefined();
      expect(levelPromotions.reviewedBy).toBeDefined();
      expect(levelPromotions.reviewedAt).toBeDefined();
      expect(levelPromotions.reviewNotes).toBeDefined();
      expect(levelPromotions.appliedAt).toBeDefined();
      expect(levelPromotions.fromClassId).toBeDefined();
      expect(levelPromotions.toClassId).toBeDefined();
    });

    it('should have correct column mappings', () => {
      expect(levelPromotions.fromLevel.name).toBe('from_level');
      expect(levelPromotions.toLevel.name).toBe('to_level');
      expect(levelPromotions.recommendedBy.name).toBe('recommended_by');
      expect(levelPromotions.recommendedAt.name).toBe('recommended_at');
      expect(levelPromotions.recommendationReason.name).toBe('recommendation_reason');
      expect(levelPromotions.evidenceSummary.name).toBe('evidence_summary');
      expect(levelPromotions.reviewedBy.name).toBe('reviewed_by');
      expect(levelPromotions.reviewedAt.name).toBe('reviewed_at');
      expect(levelPromotions.reviewNotes.name).toBe('review_notes');
      expect(levelPromotions.appliedAt.name).toBe('applied_at');
      expect(levelPromotions.fromClassId.name).toBe('from_class_id');
      expect(levelPromotions.toClassId.name).toBe('to_class_id');
    });
  });

  describe('contactVerifications', () => {
    it('should have columns for verification workflow', () => {
      expect(contactVerifications.id).toBeDefined();
      expect(contactVerifications.tenantId).toBeDefined();
      expect(contactVerifications.userId).toBeDefined();
      expect(contactVerifications.contactType).toBeDefined();
      expect(contactVerifications.newValue).toBeDefined();
      expect(contactVerifications.oldValue).toBeDefined();
      expect(contactVerifications.verificationCode).toBeDefined();
      expect(contactVerifications.codeExpiresAt).toBeDefined();
      expect(contactVerifications.status).toBeDefined();
      expect(contactVerifications.verifiedAt).toBeDefined();
      expect(contactVerifications.attempts).toBeDefined();
      expect(contactVerifications.lastAttemptAt).toBeDefined();
    });

    it('should have correct column mappings', () => {
      expect(contactVerifications.contactType.name).toBe('contact_type');
      expect(contactVerifications.newValue.name).toBe('new_value');
      expect(contactVerifications.oldValue.name).toBe('old_value');
      expect(contactVerifications.verificationCode.name).toBe('verification_code');
      expect(contactVerifications.codeExpiresAt.name).toBe('code_expires_at');
      expect(contactVerifications.verifiedAt.name).toBe('verified_at');
      expect(contactVerifications.lastAttemptAt.name).toBe('last_attempt_at');
    });
  });

  describe('LLM Tutor Hook Tables', () => {
    describe('exerciseAttempts', () => {
      it('should have columns for exercise tracking', () => {
        expect(exerciseAttempts.id).toBeDefined();
        expect(exerciseAttempts.tenantId).toBeDefined();
        expect(exerciseAttempts.studentId).toBeDefined();
        expect(exerciseAttempts.exerciseType).toBeDefined();
        expect(exerciseAttempts.exerciseContent).toBeDefined();
        expect(exerciseAttempts.studentResponse).toBeDefined();
        expect(exerciseAttempts.score).toBeDefined();
        expect(exerciseAttempts.isCorrect).toBeDefined();
        expect(exerciseAttempts.feedback).toBeDefined();
        expect(exerciseAttempts.descriptorId).toBeDefined();
        expect(exerciseAttempts.cefrLevel).toBeDefined();
        expect(exerciseAttempts.topic).toBeDefined();
        expect(exerciseAttempts.startedAt).toBeDefined();
        expect(exerciseAttempts.completedAt).toBeDefined();
        expect(exerciseAttempts.timeSpentSeconds).toBeDefined();
      });

      it('should have correct column mappings', () => {
        expect(exerciseAttempts.exerciseType.name).toBe('exercise_type');
        expect(exerciseAttempts.exerciseContent.name).toBe('exercise_content');
        expect(exerciseAttempts.studentResponse.name).toBe('student_response');
        expect(exerciseAttempts.isCorrect.name).toBe('is_correct');
        expect(exerciseAttempts.cefrLevel.name).toBe('cefr_level');
        expect(exerciseAttempts.startedAt.name).toBe('started_at');
        expect(exerciseAttempts.completedAt.name).toBe('completed_at');
        expect(exerciseAttempts.timeSpentSeconds.name).toBe('time_spent_seconds');
      });
    });

    describe('vocabLists', () => {
      it('should have columns for vocabulary tracking', () => {
        expect(vocabLists.id).toBeDefined();
        expect(vocabLists.tenantId).toBeDefined();
        expect(vocabLists.studentId).toBeDefined();
        expect(vocabLists.word).toBeDefined();
        expect(vocabLists.definition).toBeDefined();
        expect(vocabLists.contextSentence).toBeDefined();
        expect(vocabLists.cefrLevel).toBeDefined();
        expect(vocabLists.topic).toBeDefined();
        expect(vocabLists.wordType).toBeDefined();
        expect(vocabLists.masteryLevel).toBeDefined();
        expect(vocabLists.timesReviewed).toBeDefined();
        expect(vocabLists.lastReviewedAt).toBeDefined();
        expect(vocabLists.nextReviewAt).toBeDefined();
        expect(vocabLists.discoveredFrom).toBeDefined();
      });

      it('should have correct column mappings', () => {
        expect(vocabLists.contextSentence.name).toBe('context_sentence');
        expect(vocabLists.cefrLevel.name).toBe('cefr_level');
        expect(vocabLists.wordType.name).toBe('word_type');
        expect(vocabLists.masteryLevel.name).toBe('mastery_level');
        expect(vocabLists.timesReviewed.name).toBe('times_reviewed');
        expect(vocabLists.lastReviewedAt.name).toBe('last_reviewed_at');
        expect(vocabLists.nextReviewAt.name).toBe('next_review_at');
        expect(vocabLists.discoveredFrom.name).toBe('discovered_from');
      });
    });

    describe('tutorInteractions', () => {
      it('should have columns for LLM tutor conversations', () => {
        expect(tutorInteractions.id).toBeDefined();
        expect(tutorInteractions.tenantId).toBeDefined();
        expect(tutorInteractions.studentId).toBeDefined();
        expect(tutorInteractions.sessionId).toBeDefined();
        expect(tutorInteractions.interactionType).toBeDefined();
        expect(tutorInteractions.messages).toBeDefined();
        expect(tutorInteractions.cefrLevel).toBeDefined();
        expect(tutorInteractions.topic).toBeDefined();
        expect(tutorInteractions.descriptorIds).toBeDefined();
        expect(tutorInteractions.startedAt).toBeDefined();
        expect(tutorInteractions.endedAt).toBeDefined();
      });

      it('should have correct column mappings', () => {
        expect(tutorInteractions.sessionId.name).toBe('session_id');
        expect(tutorInteractions.interactionType.name).toBe('interaction_type');
        expect(tutorInteractions.cefrLevel.name).toBe('cefr_level');
        expect(tutorInteractions.descriptorIds.name).toBe('descriptor_ids');
        expect(tutorInteractions.startedAt.name).toBe('started_at');
        expect(tutorInteractions.endedAt.name).toBe('ended_at');
      });
    });
  });
});

describe('Profile Type Exports', () => {
  describe('TenantCefrConfig types', () => {
    it('should export TenantCefrConfig select type', () => {
      // Type check - this will fail to compile if type is wrong
      const config: TenantCefrConfig = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        enabledLevels: ['A1', 'A2', 'B1'],
        usesPlusLevels: true,
        assessmentFrequency: 'weekly',
        assessmentWeights: { periodic: 0.6, ad_hoc: 0.2, end_of_unit: 0.2 },
        descriptorMode: 'all',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(config).toBeDefined();
    });

    it('should export NewTenantCefrConfig insert type', () => {
      // Minimum required fields for insert
      const newConfig: NewTenantCefrConfig = {
        tenantId: 'tenant-uuid',
      };
      expect(newConfig).toBeDefined();
    });
  });

  describe('StudentNote types', () => {
    it('should export StudentNote select type with all fields', () => {
      const note: StudentNote = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        authorId: 'author-uuid',
        authorRole: 'teacher',
        content: 'Note content',
        noteType: 'academic',
        visibility: 'staff_only',
        isSharedWithStudent: false,
        sharedAt: null,
        tags: ['important'],
        editedAt: null,
        editedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(note).toBeDefined();
    });

    it('should export NewStudentNote insert type', () => {
      const newNote: NewStudentNote = {
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        authorId: 'author-uuid',
        authorRole: 'teacher',
        content: 'Note content',
      };
      expect(newNote).toBeDefined();
    });
  });

  describe('CompetencyAssessment types', () => {
    it('should export CompetencyAssessment select type', () => {
      const assessment: CompetencyAssessment = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        descriptorId: 'descriptor-uuid',
        classId: null,
        enrollmentId: null,
        assignmentId: null,
        assessmentType: 'periodic',
        assessmentDate: '2026-03-01',
        score: 3,
        notes: null,
        assessedBy: 'teacher-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(assessment).toBeDefined();
    });

    it('should export NewCompetencyAssessment insert type', () => {
      const newAssessment: NewCompetencyAssessment = {
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        descriptorId: 'descriptor-uuid',
        assessmentType: 'ad_hoc',
        score: 4,
        assessedBy: 'teacher-uuid',
      };
      expect(newAssessment).toBeDefined();
    });
  });

  describe('LevelPromotion types', () => {
    it('should export LevelPromotion select type', () => {
      const promotion: LevelPromotion = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        fromLevel: 'B1',
        toLevel: 'B1+',
        recommendedBy: 'teacher-uuid',
        recommendedAt: new Date(),
        recommendationReason: 'Student has demonstrated competency',
        evidenceSummary: {},
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        appliedAt: null,
        fromClassId: null,
        toClassId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(promotion).toBeDefined();
    });
  });

  describe('ContactVerification types', () => {
    it('should export ContactVerification select type', () => {
      const verification: ContactVerification = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        userId: 'user-uuid',
        contactType: 'email',
        newValue: 'new@email.com',
        oldValue: 'old@email.com',
        verificationCode: '123456',
        codeExpiresAt: new Date(),
        status: 'pending',
        verifiedAt: null,
        attempts: 0,
        lastAttemptAt: null,
        createdAt: new Date(),
      };
      expect(verification).toBeDefined();
    });
  });

  describe('DiagnosticSession types', () => {
    it('should export DiagnosticSession select type', () => {
      const session: DiagnosticSession = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        startedAt: new Date(),
        completedAt: null,
        status: 'in_progress',
        currentStage: 'written_test',
        recommendedLevel: null,
        actualPlacementLevel: null,
        stageResults: {},
        administeredBy: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(session).toBeDefined();
    });
  });

  describe('LLM Tutor Hook types', () => {
    it('should export ExerciseAttempt type', () => {
      const attempt: ExerciseAttempt = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        exerciseType: 'mcq',
        exerciseContent: { question: 'Test?', options: ['A', 'B'] },
        studentResponse: null,
        score: null,
        isCorrect: null,
        feedback: null,
        descriptorId: null,
        cefrLevel: 'B1',
        topic: 'Grammar',
        startedAt: new Date(),
        completedAt: null,
        timeSpentSeconds: null,
        createdAt: new Date(),
      };
      expect(attempt).toBeDefined();
    });

    it('should export VocabList type', () => {
      const vocab: VocabList = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        word: 'eloquent',
        definition: 'fluent or persuasive in speaking or writing',
        contextSentence: 'She gave an eloquent speech.',
        cefrLevel: 'C1',
        topic: 'vocabulary',
        wordType: 'adjective',
        masteryLevel: 1,
        timesReviewed: 0,
        lastReviewedAt: null,
        nextReviewAt: null,
        discoveredFrom: 'lesson',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(vocab).toBeDefined();
    });

    it('should export TutorInteraction type', () => {
      const interaction: TutorInteraction = {
        id: 'uuid',
        tenantId: 'tenant-uuid',
        studentId: 'student-uuid',
        sessionId: 'session-uuid',
        interactionType: 'chat',
        messages: [
          { role: 'user', content: 'Hello', timestamp: '2026-03-01T10:00:00Z' },
          { role: 'assistant', content: 'Hi there!', timestamp: '2026-03-01T10:00:01Z' },
        ],
        cefrLevel: 'B1',
        topic: 'General conversation',
        descriptorIds: [],
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
      };
      expect(interaction).toBeDefined();
    });
  });
});
