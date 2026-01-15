import { relations } from 'drizzle-orm/relations';
import {
  country,
  learner,
  course,
  booking,
  payments,
  currency,
  tenants,
  programmes,
  accommodation,
  attendanceDay,
  attendanceMark,
  courses,
  users,
  classes,
  classSessions,
  attendance,
  assignments,
  submissions,
  enrollments,
  grades,
  enrollmentAmendments,
  lessonPlans,
  auditLog,
  feedback,
} from './schema';

export const learnerRelations = relations(learner, ({ one, many }) => ({
  country: one(country, {
    fields: [learner.citizenshipCode],
    references: [country.iso2],
  }),
  bookings: many(booking),
  attendanceMarks: many(attendanceMark),
}));

export const countryRelations = relations(country, ({ many }) => ({
  learners: many(learner),
}));

export const bookingRelations = relations(booking, ({ one, many }) => ({
  course: one(course, {
    fields: [booking.courseId],
    references: [course.id],
  }),
  learner: one(learner, {
    fields: [booking.learnerId],
    references: [learner.id],
  }),
  payments: many(payments),
  accommodations: many(accommodation),
}));

export const courseRelations = relations(course, ({ many }) => ({
  bookings: many(booking),
  attendanceDays: many(attendanceDay),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(booking, {
    fields: [payments.bookingId],
    references: [booking.id],
  }),
  currency: one(currency, {
    fields: [payments.currencyCode],
    references: [currency.code],
  }),
}));

export const currencyRelations = relations(currency, ({ many }) => ({
  payments: many(payments),
  accommodations: many(accommodation),
}));

export const programmesRelations = relations(programmes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [programmes.tenantId],
    references: [tenants.id],
  }),
  courses: many(courses),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  programmes: many(programmes),
  courses: many(courses),
  users: many(users),
  classes: many(classes),
  classSessions: many(classSessions),
  attendances: many(attendance),
  assignments: many(assignments),
  submissions: many(submissions),
  enrollments: many(enrollments),
  grades: many(grades),
  enrollmentAmendments: many(enrollmentAmendments),
  lessonPlans: many(lessonPlans),
  auditLogs: many(auditLog),
  feedbacks: many(feedback),
}));

export const accommodationRelations = relations(accommodation, ({ one }) => ({
  booking: one(booking, {
    fields: [accommodation.bookingId],
    references: [booking.id],
  }),
  currency: one(currency, {
    fields: [accommodation.currencyCode],
    references: [currency.code],
  }),
}));

export const attendanceDayRelations = relations(attendanceDay, ({ one, many }) => ({
  course: one(course, {
    fields: [attendanceDay.courseId],
    references: [course.id],
  }),
  attendanceMarks: many(attendanceMark),
}));

export const attendanceMarkRelations = relations(attendanceMark, ({ one }) => ({
  attendanceDay: one(attendanceDay, {
    fields: [attendanceMark.attendanceDayId],
    references: [attendanceDay.id],
  }),
  learner: one(learner, {
    fields: [attendanceMark.learnerId],
    references: [learner.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  programme: one(programmes, {
    fields: [courses.programmeId],
    references: [programmes.id],
  }),
  tenant: one(tenants, {
    fields: [courses.tenantId],
    references: [tenants.id],
  }),
  enrollments: many(enrollments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  classes: many(classes),
  attendances_recordedBy: many(attendance, {
    relationName: 'attendance_recordedBy_users_id',
  }),
  attendances_studentId: many(attendance, {
    relationName: 'attendance_studentId_users_id',
  }),
  submissions: many(submissions),
  enrollments: many(enrollments),
  grades: many(grades),
  enrollmentAmendments_approvedBy: many(enrollmentAmendments, {
    relationName: 'enrollmentAmendments_approvedBy_users_id',
  }),
  enrollmentAmendments_requestedBy: many(enrollmentAmendments, {
    relationName: 'enrollmentAmendments_requestedBy_users_id',
  }),
  lessonPlans: many(lessonPlans),
  auditLogs: many(auditLog),
  feedbacks: many(feedback),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  user: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [classes.tenantId],
    references: [tenants.id],
  }),
  classSessions: many(classSessions),
  assignments: many(assignments),
  enrollments: many(enrollments),
  enrollmentAmendments_newClassId: many(enrollmentAmendments, {
    relationName: 'enrollmentAmendments_newClassId_classes_id',
  }),
  enrollmentAmendments_previousClassId: many(enrollmentAmendments, {
    relationName: 'enrollmentAmendments_previousClassId_classes_id',
  }),
  lessonPlans: many(lessonPlans),
}));

export const classSessionsRelations = relations(classSessions, ({ one, many }) => ({
  class: one(classes, {
    fields: [classSessions.classId],
    references: [classes.id],
  }),
  tenant: one(tenants, {
    fields: [classSessions.tenantId],
    references: [tenants.id],
  }),
  attendances: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  classSession: one(classSessions, {
    fields: [attendance.classSessionId],
    references: [classSessions.id],
  }),
  user_recordedBy: one(users, {
    fields: [attendance.recordedBy],
    references: [users.id],
    relationName: 'attendance_recordedBy_users_id',
  }),
  user_studentId: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
    relationName: 'attendance_studentId_users_id',
  }),
  tenant: one(tenants, {
    fields: [attendance.tenantId],
    references: [tenants.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assignments.classId],
    references: [classes.id],
  }),
  tenant: one(tenants, {
    fields: [assignments.tenantId],
    references: [tenants.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  user: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [submissions.tenantId],
    references: [tenants.id],
  }),
  grades: many(grades),
}));

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
  course: one(courses, {
    fields: [enrollments.originalCourseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [enrollments.tenantId],
    references: [tenants.id],
  }),
  enrollmentAmendments: many(enrollmentAmendments),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  user: one(users, {
    fields: [grades.gradedBy],
    references: [users.id],
  }),
  submission: one(submissions, {
    fields: [grades.submissionId],
    references: [submissions.id],
  }),
  tenant: one(tenants, {
    fields: [grades.tenantId],
    references: [tenants.id],
  }),
}));

export const enrollmentAmendmentsRelations = relations(enrollmentAmendments, ({ one }) => ({
  user_approvedBy: one(users, {
    fields: [enrollmentAmendments.approvedBy],
    references: [users.id],
    relationName: 'enrollmentAmendments_approvedBy_users_id',
  }),
  enrollment: one(enrollments, {
    fields: [enrollmentAmendments.enrollmentId],
    references: [enrollments.id],
  }),
  class_newClassId: one(classes, {
    fields: [enrollmentAmendments.newClassId],
    references: [classes.id],
    relationName: 'enrollmentAmendments_newClassId_classes_id',
  }),
  class_previousClassId: one(classes, {
    fields: [enrollmentAmendments.previousClassId],
    references: [classes.id],
    relationName: 'enrollmentAmendments_previousClassId_classes_id',
  }),
  user_requestedBy: one(users, {
    fields: [enrollmentAmendments.requestedBy],
    references: [users.id],
    relationName: 'enrollmentAmendments_requestedBy_users_id',
  }),
  tenant: one(tenants, {
    fields: [enrollmentAmendments.tenantId],
    references: [tenants.id],
  }),
}));

export const lessonPlansRelations = relations(lessonPlans, ({ one }) => ({
  class: one(classes, {
    fields: [lessonPlans.classId],
    references: [classes.id],
  }),
  user: one(users, {
    fields: [lessonPlans.teacherId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [lessonPlans.tenantId],
    references: [tenants.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLog.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  tenant: one(tenants, {
    fields: [feedback.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));
