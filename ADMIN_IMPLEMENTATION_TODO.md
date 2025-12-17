# Admin Pages Implementation TODO
**Status**: 2/21 pages complete
**Last Updated**: 2025-12-17

## ✅ Completed Pages (2/21)

### Page 1: Admin Dashboard ✅
- **Route**: `/admin`
- **Components**:
  - ✅ AlertsPanel
  - ✅ KPIGrid
  - ✅ WorkQueue
  - ✅ RecentActivity
- **Database**:
  - ✅ alerts table
  - ✅ v_admin_alerts view
  - ✅ v_admin_kpis_daily view
  - ✅ v_admin_work_queue view
  - ✅ v_audit_events_recent view
- **Tests**: 20 test cases across 4 component suites

### Page 2: User Management ✅
- **Route**: `/admin/users`
- **Components**:
  - ✅ UserList
  - ✅ UserActions
  - ⚠️ UserDetailDrawer (to add)
  - ⚠️ CreateUserModal (exists at /admin/users/create)
- **Database**:
  - ✅ user_role_audit table
  - ✅ v_users_with_metadata view
  - ✅ v_orphaned_auth_users view
- **Server Actions**:
  - ✅ changeUserRole
  - ✅ deactivateUser
  - ✅ reactivateUser
  - ✅ revokeUserSessions
  - ✅ resetUserMFA
  - ✅ getOrphanedAuthUsers
  - ✅ repairOrphanedUser
- **Tests**: 6 test cases

---

## 🚧 Pages To Implement (19/21)

### Page 3: Student Registry
- **Route**: `/admin/students`
- **Spec**: `docs/spec/admin/03-student-registry.md` (to create)
- **Components to build**:
  - [ ] StudentList (with saved views: "Active", "Visa", "New this week", "At risk")
  - [ ] StudentFilters
  - [ ] StudentDetailDrawer
    - [ ] PersonalInfoTab
    - [ ] CourseHistoryTab
    - [ ] AttendanceSummaryTab
    - [ ] AssessmentsTab
    - [ ] NotesTab (safeguarding gated)
    - [ ] DocumentsTab
  - [ ] CreateStudentModal
  - [ ] MergeDuplicatesDialog
- **Database views to create**:
  - [ ] v_students_with_metadata
  - [ ] v_student_duplicate_candidates
  - [ ] v_student_visa_status
- **Server actions to create**:
  - [ ] getStudentsWithMetadata
  - [ ] createStudent
  - [ ] updateStudent
  - [ ] mergeStudents (super_admin only)
  - [ ] assignToCohort
  - [ ] tagStudent
- **Tests to write**: ~8-10 test cases

---

### Page 4: Teacher Registry
- **Route**: `/admin/teachers`
- **Spec**: `docs/spec/admin/04-teacher-registry.md` (to create)
- **Components to build**:
  - [ ] TeacherList
  - [ ] TeacherFilters
  - [ ] TeacherDetailDrawer
    - [ ] QualificationsTab
    - [ ] PermissionsTab
    - [ ] TimetableTab
    - [ ] NotesTab
  - [ ] AvailabilityManager
  - [ ] CreateTeacherModal
- **Database views to create**:
  - [ ] v_teachers_with_metadata (classes count, hours this week)
  - [ ] v_teacher_availability
  - [ ] v_scheduling_conflicts
- **Server actions to create**:
  - [ ] getTeachersWithMetadata
  - [ ] createTeacher
  - [ ] updateTeacher
  - [ ] setAvailability
  - [ ] assignToClass
  - [ ] checkSchedulingConflicts
- **Tests to write**: ~8 test cases

---

### Page 5: Class and Cohort Management
- **Route**: `/admin/classes`
- **Spec**: `docs/spec/admin/05-class-cohort-management.md` (to create)
- **Components to build**:
  - [ ] ClassList
  - [ ] CohortList
  - [ ] ClassBuilder
    - [ ] BasicInfoStep
    - [ ] CapacityStep
    - [ ] ScheduleStep
    - [ ] TeacherAssignmentStep
  - [ ] ClassDetailView
  - [ ] EnrolmentManager
  - [ ] CloneClassDialog
- **Database views to create**:
  - [ ] v_classes_with_capacity
  - [ ] v_cohorts_active
  - [ ] v_scheduling_conflicts
- **Server actions to create**:
  - [ ] createClass
  - [ ] updateClass
  - [ ] assignTeacher
  - [ ] enrollStudent
  - [ ] removeStudent
  - [ ] cloneClass
  - [ ] checkCapacity
  - [ ] detectConflicts
- **Tests to write**: ~10 test cases

---

### Page 6: Timetable Overview
- **Route**: `/admin/timetable`
- **Spec**: `docs/spec/admin/06-timetable-overview.md` (to create)
- **Components to build**:
  - [ ] TimetableCalendar (week/day views)
  - [ ] TimetableTable
  - [ ] TimetableFilters (teacher, class, room, level)
  - [ ] SessionMoveDialog (drag/drop validation)
  - [ ] BulkRescheduleDialog (admin only)
  - [ ] ConflictIndicator
- **Database views to create**:
  - [ ] v_timetable_sessions
  - [ ] v_timetable_conflicts
  - [ ] v_teacher_schedule
  - [ ] v_room_schedule
- **Server actions to create**:
  - [ ] getTimetableSessions
  - [ ] moveSession (with validation)
  - [ ] bulkReschedule
  - [ ] detectConflicts
- **Tests to write**: ~10 test cases

---

### Page 7: Attendance and Registers
- **Route**: `/admin/attendance`
- **Spec**: `docs/spec/admin/07-attendance-registers.md` (to create)
- **Components to build**:
  - [ ] RegisterList (by date/class/teacher)
  - [ ] AnomaliesView (missing, suspicious, late)
  - [ ] RegisterDetailView
  - [ ] AdminCorrectionDialog (with reason required)
  - [ ] RegisterLockDialog
  - [ ] VersionHistoryView
- **Database views to create**:
  - [ ] v_register_anomalies
  - [ ] v_missing_registers
  - [ ] v_attendance_versions
- **Server actions to create**:
  - [ ] getRegisterAnomalies
  - [ ] requestCorrection
  - [ ] adminCorrect (restricted, requires reason)
  - [ ] lockRegister
  - [ ] unlockRegister (super_admin only)
  - [ ] getVersionHistory
- **Tests to write**: ~10 test cases

---

### Page 8: Progress and CEFR Tracking
- **Route**: `/admin/progress`
- **Spec**: `docs/spec/admin/08-progress-cefr-tracking.md` (to create)
- **Components to build**:
  - [ ] StudentProgressTimeline
  - [ ] CohortDistributionChart
  - [ ] AssessmentEntryForm
  - [ ] LevelChangeDialog (with reason)
  - [ ] ProgressReportExporter
  - [ ] CEFRDescriptorReference
- **Database views to create**:
  - [ ] v_student_progress
  - [ ] v_cohort_distribution
  - [ ] v_assessment_history
  - [ ] v_level_changes
- **Server actions to create**:
  - [ ] getStudentProgress
  - [ ] getCohortDistribution
  - [ ] recordAssessment
  - [ ] changeLevel (with reason)
  - [ ] exportProgressReport
- **Tests to write**: ~8 test cases

---

### Page 9: Visa and Immigration Compliance
- **Route**: `/admin/compliance/visa`
- **Spec**: `docs/spec/admin/09-visa-immigration-compliance.md` (to create)
- **Components to build**:
  - [ ] VisaDashboard (at-risk list, thresholds, streaks)
  - [ ] StudentComplianceProfile
  - [ ] ExcusedAbsenceDialog (with evidence reference)
  - [ ] CompliancePackGenerator
  - [ ] ThresholdConfigPanel
- **Database views to create**:
  - [ ] v_visa_students_at_risk
  - [ ] v_visa_compliance_status
  - [ ] v_attendance_thresholds
  - [ ] v_excused_absences
- **Server actions to create**:
  - [ ] getVisaAtRiskStudents
  - [ ] getComplianceStatus
  - [ ] markExcusedAbsence
  - [ ] generateCompliancePack
  - [ ] updateThresholds
- **Tests to write**: ~10 test cases

---

### Page 10: Regulatory Reporting
- **Route**: `/admin/compliance/regulatory`
- **Spec**: `docs/spec/admin/10-regulatory-reporting.md` (to create)
- **Components to build**:
  - [ ] ReportCatalogue (weekly, monthly, ad-hoc)
  - [ ] ReportRunHistory
  - [ ] ReportParametersForm
  - [ ] ReportPreview
  - [ ] DownloadLink (time-limited)
- **Database views to create**:
  - [ ] v_report_templates
  - [ ] v_report_runs
  - [ ] v_report_snapshots
- **Server actions to create**:
  - [ ] getReportCatalogue
  - [ ] runReport (creates immutable run record)
  - [ ] downloadReport
  - [ ] scheduleReport
- **Tests to write**: ~6 test cases

---

### Page 11: Audit Log
- **Route**: `/admin/audit-log`
- **Spec**: `docs/spec/admin/11-audit-log.md` (to create)
- **Components to build**:
  - [ ] AuditLogTable (filterable)
  - [ ] AuditFilters (actor, action, entity, date range, request_id)
  - [ ] EventDetailDrawer (diff view: before/after)
  - [ ] ExportAuditLog
- **Database**: Uses existing `audit_logs` table and `v_audit_events_recent` view
- **Server actions to create**:
  - [ ] getAuditLogs (with filters)
  - [ ] getEventDetail
  - [ ] exportAuditLog
- **Tests to write**: ~6 test cases

---

### Page 12: Advanced Search and Query Builder
- **Route**: `/admin/search`
- **Spec**: `docs/spec/admin/12-advanced-search.md` (to create)
- **Components to build**:
  - [ ] TableSelector (allow-list)
  - [ ] ColumnChooser
  - [ ] FilterBuilder (AND/OR groups)
  - [ ] SavedViewsManager
  - [ ] QueryResults
  - [ ] SaveViewDialog
  - [ ] ShareViewDialog
- **Backend constraints**:
  - [ ] Column allow-list per table/view
  - [ ] Parameterized query builder
  - [ ] Row limits + pagination hard cap
- **Server actions to create**:
  - [ ] executeQuery (with allow-list validation)
  - [ ] saveView
  - [ ] loadView
  - [ ] shareView
- **Tests to write**: ~12 test cases (security critical)

---

### Page 13: Bulk Uploads (ETL)
- **Route**: `/admin/data/bulk-upload`
- **Spec**: `docs/spec/admin/13-bulk-uploads.md` (to create)
- **Components to build**:
  - [ ] FileUploader (CSV/XLSX)
  - [ ] ColumnMapper
  - [ ] ValidationSummary (errors/warnings)
  - [ ] DryRunPreview
  - [ ] CommitDialog (with job tracking)
  - [ ] UploadHistory
- **Server actions to create**:
  - [ ] uploadFile
  - [ ] mapColumns
  - [ ] validateData
  - [ ] previewImport
  - [ ] commitImport (creates audit record)
  - [ ] getUploadHistory
- **Tests to write**: ~10 test cases

---

### Page 14: Data Exports
- **Route**: `/admin/data/exports`
- **Spec**: `docs/spec/admin/14-data-exports.md` (to create)
- **Components to build**:
  - [ ] ExportPresets (students, attendance, classes)
  - [ ] RedactionToggles (role-based)
  - [ ] ExportHistory
  - [ ] DownloadLink (time-limited)
- **Server actions to create**:
  - [ ] createExport (scoped, logged, with redaction)
  - [ ] getExportHistory
  - [ ] downloadExport
- **Tests to write**: ~6 test cases

---

### Page 15: Notifications and Messaging
- **Route**: `/admin/communications/notifications`
- **Spec**: `docs/spec/admin/15-notifications-messaging.md` (to create)
- **Components to build**:
  - [ ] MessageComposer
  - [ ] TargetingSelector (role, cohort, class, tag)
  - [ ] DeliveryStatusDashboard
  - [ ] MessagePreview
  - [ ] ScheduledMessagesQueue
- **Database tables to create**:
  - [ ] notifications table
  - [ ] notification_deliveries table
- **Server actions to create**:
  - [ ] composeMessage
  - [ ] selectTargets
  - [ ] sendMessage
  - [ ] getDeliveryStatus
  - [ ] scheduleMessage
- **Tests to write**: ~8 test cases

---

### Page 16: Email Logs
- **Route**: `/admin/communications/email-logs`
- **Spec**: `docs/spec/admin/16-email-logs.md` (to create)
- **Components to build**:
  - [ ] EmailLogTable
  - [ ] EmailFilters (recipient, type, status, time window)
  - [ ] EmailDetailDrawer
  - [ ] ResendEmailButton
- **Database**: Uses existing email logging (if exists) or create:
  - [ ] email_logs table
- **Server actions to create**:
  - [ ] getEmailLogs
  - [ ] getEmailDetail
  - [ ] resendEmail
- **Tests to write**: ~5 test cases

---

### Page 17: System Settings
- **Route**: `/admin/settings`
- **Spec**: `docs/spec/admin/17-system-settings.md` (to create)
- **Components to build**:
  - [ ] AttendanceRulesConfig
  - [ ] AcademicCalendarConfig
  - [ ] LevelTaxonomyConfig
  - [ ] CEFRMappingConfig
  - [ ] ReportSchedulesConfig
  - [ ] SettingsHistory (versioned, audited)
- **Database tables to create**:
  - [ ] system_settings table (versioned)
  - [ ] settings_history table
- **Server actions to create**:
  - [ ] getSettings
  - [ ] updateSettings (versioned, audited)
  - [ ] getSettingsHistory
- **Tests to write**: ~8 test cases

---

### Page 18: Integrations
- **Route**: `/admin/integrations`
- **Spec**: `docs/spec/admin/18-integrations.md` (to create)
- **Components to build**:
  - [ ] IntegrationsList (Supabase, Email, LLM, future MCP)
  - [ ] HealthChecks
  - [ ] ConfigStatus (masked secrets)
  - [ ] WebhookEventLog
  - [ ] TestConnectionButton
- **Server actions to create**:
  - [ ] getIntegrations
  - [ ] testConnection
  - [ ] getWebhookEvents
  - [ ] updateIntegrationConfig (masked)
- **Tests to write**: ~6 test cases

---

### Page 19: Access Policies (Admin Abstraction)
- **Route**: `/admin/policies`
- **Spec**: `docs/spec/admin/19-access-policies.md` (to create)
- **Components to build**:
  - [ ] RolePermissionMatrix (read-only view)
  - [ ] FeatureFlagsPanel
  - [ ] PolicyStatusHealthView
- **Note**: Changes here map to controlled backend configuration, not arbitrary SQL
- **Server actions to create**:
  - [ ] getRolePermissions
  - [ ] getFeatureFlags
  - [ ] updateFeatureFlag (admin only)
  - [ ] getPolicyStatus
- **Tests to write**: ~5 test cases

---

### Page 20: Profile and Security
- **Route**: `/admin/profile`
- **Spec**: `docs/spec/admin/20-profile-security.md` (to create)
- **Components to build**:
  - [ ] ProfileForm
  - [ ] MFASetupWizard
  - [ ] ActiveSessionsTable
  - [ ] RevokeSessionButton
  - [ ] PasswordChangeForm
- **Server actions to create**:
  - [ ] updateProfile
  - [ ] setupMFA
  - [ ] getActiveSessions
  - [ ] revokeSession (immediate)
  - [ ] changePassword
- **Tests to write**: ~8 test cases

---

### Page 21: Help and Diagnostics
- **Route**: `/admin/help`
- **Spec**: `docs/spec/admin/21-help-diagnostics.md` (to create)
- **Components to build**:
  - [ ] StatusPage (DB, auth, email, jobs)
  - [ ] ErrorLogs (sanitised)
  - [ ] DiagnosticBundleExporter
  - [ ] ReportProblemForm (captures request_id + context)
  - [ ] DocumentationLinks
- **Server actions to create**:
  - [ ] getSystemStatus
  - [ ] getErrorLogs (sanitised, no PII)
  - [ ] exportDiagnosticBundle
  - [ ] reportProblem
- **Tests to write**: ~5 test cases

---

## Summary Statistics

### Component Count
- **Total Components to Build**: ~150 components
- **Database Tables to Create**: ~15 new tables
- **Database Views to Create**: ~35 new views
- **Server Actions to Create**: ~95 server actions
- **Test Suites to Write**: ~150-180 test cases

### By Priority (from BUSINESS_VALUE_PRIORITIES.md)

#### Tier 1: CRITICAL - MVP Blockers (Must Build Now)
- Page 3: Student Registry
- Page 4: Teacher Registry
- Page 5: Class and Cohort Management
- Page 6: Timetable Overview

#### Tier 2: HIGH VALUE - Compliance & Operations
- Page 7: Attendance and Registers (enhance existing)
- Page 8: Progress and CEFR Tracking
- Page 9: Visa and Immigration Compliance (enhance existing)

#### Tier 3: MEDIUM VALUE - Operational Efficiency
- Page 13: Bulk Uploads (ETL)
- Page 14: Data Exports
- Page 10: Regulatory Reporting
- Page 11: Audit Log (enhance existing)

#### Tier 4: LOWER PRIORITY - Nice to Have
- Page 12: Advanced Search and Query Builder
- Page 15: Notifications and Messaging
- Page 16: Email Logs
- Page 17: System Settings
- Page 18: Integrations
- Page 19: Access Policies
- Page 20: Profile and Security
- Page 21: Help and Diagnostics

---

## Recommended Implementation Order

### Sprint 1 (Week 1): Academic Foundation
1. Page 3: Student Registry
2. Page 4: Teacher Registry

### Sprint 2 (Week 2): Class Operations
3. Page 5: Class and Cohort Management
4. Page 6: Timetable Overview

### Sprint 3 (Week 3): Attendance & Compliance
5. Page 7: Attendance and Registers (enhancements)
6. Page 8: Progress and CEFR Tracking

### Sprint 4 (Week 4): Compliance & Risk
7. Page 9: Visa and Immigration Compliance (enhancements)
8. Page 10: Regulatory Reporting

### Sprint 5 (Week 5): Data Operations
9. Page 13: Bulk Uploads (ETL)
10. Page 14: Data Exports
11. Page 11: Audit Log (enhancements)

### Sprint 6 (Week 6): Advanced Features
12. Page 12: Advanced Search and Query Builder
13. Page 15: Notifications and Messaging

### Sprint 7 (Week 7): System & Admin
14. Page 16: Email Logs
15. Page 17: System Settings
16. Page 18: Integrations

### Sprint 8 (Week 8): Polish & Support
17. Page 19: Access Policies
18. Page 20: Profile and Security
19. Page 21: Help and Diagnostics

---

## Next Steps

1. **Review priorities** with stakeholders
2. **Confirm Sprint 1 scope**: Student Registry + Teacher Registry
3. **Database schema prep**: Create migrations for students/teachers metadata views
4. **Component library**: Standardize table/form/filter patterns from Pages 1-2
5. **Begin Page 3**: Student Registry implementation

---

**Generated**: 2025-12-17
**Progress**: 2/21 pages (10%) complete
**Estimated Total Effort**: 8-10 weeks for all 21 pages
