import {
  pgTable,
  char,
  text,
  index,
  uniqueIndex,
  foreignKey,
  unique,
  check,
  uuid,
  date,
  timestamp,
  integer,
  numeric,
  pgPolicy,
  varchar,
  jsonb,
  boolean,
  time,
  pgView,
  bigint,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const attendanceStatus = pgEnum('attendance_status', [
  'present',
  'absent',
  'late',
  'excused',
]);
export const paymentMethod = pgEnum('payment_method', [
  'cash',
  'card',
  'bank_transfer',
  'online',
  'other',
]);

export const country = pgTable('country', {
  iso2: char({ length: 2 }).primaryKey().notNull(),
  name: text().notNull(),
});

export const learner = pgTable(
  'learner',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    studentNumber: text('student_number').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dob: date().notNull(),
    // TODO: failed to parse database type 'citext'
    email: unknown('email'),
    phone: text(),
    citizenshipCode: char('citizenship_code', { length: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('ix_learner_name').using(
      'btree',
      table.lastName.asc().nullsLast().op('text_ops'),
      table.firstName.asc().nullsLast().op('text_ops')
    ),
    uniqueIndex('uq_learner_identity').using(
      'btree',
      table.firstName.asc().nullsLast().op('bpchar_ops'),
      table.lastName.asc().nullsLast().op('bpchar_ops'),
      table.dob.asc().nullsLast().op('bpchar_ops'),
      table.citizenshipCode.asc().nullsLast().op('date_ops')
    ),
    foreignKey({
      columns: [table.citizenshipCode],
      foreignColumns: [country.iso2],
      name: 'learner_citizenship_code_fkey',
    }),
    unique('learner_student_number_key').on(table.studentNumber),
    unique('learner_email_key').on(table.email),
    check('learner_dob_check', sql`dob <= CURRENT_DATE`),
    check('learner_first_name_check', sql`length(TRIM(BOTH FROM first_name)) > 0`),
    check('learner_last_name_check', sql`length(TRIM(BOTH FROM last_name)) > 0`),
  ]
);

export const course = pgTable(
  'course',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    code: text().notNull(),
    title: text().notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
  },
  table => [
    unique('course_code_key').on(table.code),
    check('course_check', sql`end_date >= start_date`),
  ]
);

export const booking = pgTable(
  'booking',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    learnerId: uuid('learner_id').notNull(),
    courseId: uuid('course_id').notNull(),
    saleDate: date('sale_date').notNull(),
    placementScore: integer('placement_score'),
    depositPaid: numeric('deposit_paid', { precision: 12, scale: 2 }).default('0').notNull(),
    courseFee: numeric('course_fee', { precision: 12, scale: 2 }).default('0').notNull(),
    accommodationFee: numeric('accommodation_fee', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    transferFee: numeric('transfer_fee', { precision: 12, scale: 2 }).default('0').notNull(),
    examFee: numeric('exam_fee', { precision: 12, scale: 2 }).default('0').notNull(),
    registrationFee: numeric('registration_fee', { precision: 12, scale: 2 })
      .default('0')
      .notNull(),
    learnerProtFee: numeric('learner_prot_fee', { precision: 12, scale: 2 }).default('0').notNull(),
    medicalInsFee: numeric('medical_ins_fee', { precision: 12, scale: 2 }).default('0').notNull(),
    totalBooking: numeric('total_booking', { precision: 12, scale: 2 }).generatedAlwaysAs(
      sql`(((((((deposit_paid + course_fee) + accommodation_fee) + transfer_fee) + exam_fee) + registration_fee) + learner_prot_fee) + medical_ins_fee)`
    ),
    totalDue: numeric('total_due', { precision: 12, scale: 2 }).generatedAlwaysAs(
      sql`(((((((course_fee + accommodation_fee) + transfer_fee) + exam_fee) + registration_fee) + learner_prot_fee) + medical_ins_fee) - deposit_paid)`
    ),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('ix_booking_course').using('btree', table.courseId.asc().nullsLast().op('uuid_ops')),
    index('ix_booking_learner').using('btree', table.learnerId.asc().nullsLast().op('uuid_ops')),
    index('ix_booking_sale_date').using('btree', table.saleDate.asc().nullsLast().op('date_ops')),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [course.id],
      name: 'booking_course_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.learnerId],
      foreignColumns: [learner.id],
      name: 'booking_learner_id_fkey',
    }).onDelete('cascade'),
  ]
);

export const currency = pgTable('currency', {
  code: char({ length: 3 }).primaryKey().notNull(),
  name: text().notNull(),
});

export const payments = pgTable(
  'payments',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    bookingId: uuid('booking_id').notNull(),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    currencyCode: char('currency_code', { length: 3 }).default('EUR').notNull(),
    method: paymentMethod().notNull(),
    paidOn: timestamp('paid_on', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    reference: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('ix_payments_booking').using('btree', table.bookingId.asc().nullsLast().op('uuid_ops')),
    index('ix_payments_date').using('btree', table.paidOn.asc().nullsLast().op('timestamptz_ops')),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [booking.id],
      name: 'payments_booking_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.currencyCode],
      foreignColumns: [currency.code],
      name: 'payments_currency_code_fkey',
    }),
    check('payments_amount_check', sql`amount > (0)::numeric`),
  ]
);

export const programmes = pgTable(
  'programmes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 50 }).notNull(),
    description: text(),
    levels: jsonb().default(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).notNull(),
    durationWeeks: integer('duration_weeks').default(12).notNull(),
    hoursPerWeek: integer('hours_per_week').default(15).notNull(),
    status: varchar({ length: 50 }).default('active').notNull(),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
  },
  table => [
    index('idx_programmes_deleted')
      .using('btree', table.deletedAt.asc().nullsLast().op('timestamp_ops'))
      .where(sql`(deleted_at IS NULL)`),
    index('idx_programmes_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
    index('idx_programmes_tenant').using('btree', table.tenantId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'programmes_tenant_id_fkey',
    }).onDelete('cascade'),
    unique('uk_programmes_tenant_code').on(table.tenantId, table.code),
    pgPolicy('programmes_delete_admin', {
      as: 'permissive',
      for: 'delete',
      to: ['public'],
      using: sql`((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND (current_setting('app.current_user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])))`,
    }),
    pgPolicy('programmes_insert_admin', { as: 'permissive', for: 'insert', to: ['public'] }),
    pgPolicy('programmes_select_tenant', { as: 'permissive', for: 'select', to: ['public'] }),
    pgPolicy('programmes_update_admin', { as: 'permissive', for: 'update', to: ['public'] }),
  ]
);

export const accommodation = pgTable(
  'accommodation',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    bookingId: uuid('booking_id').notNull(),
    type: text().notNull(),
    provider: text().notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    cost: numeric({ precision: 12, scale: 2 }).notNull(),
    currencyCode: char('currency_code', { length: 3 }).default('EUR').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('ix_accommodation_booking').using(
      'btree',
      table.bookingId.asc().nullsLast().op('uuid_ops')
    ),
    index('ix_accommodation_window').using(
      'btree',
      table.startDate.asc().nullsLast().op('date_ops'),
      table.endDate.asc().nullsLast().op('date_ops')
    ),
    foreignKey({
      columns: [table.bookingId],
      foreignColumns: [booking.id],
      name: 'accommodation_booking_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.currencyCode],
      foreignColumns: [currency.code],
      name: 'accommodation_currency_code_fkey',
    }),
    check('accommodation_check', sql`end_date >= start_date`),
    check('accommodation_cost_check', sql`cost >= (0)::numeric`),
  ]
);

export const attendanceDay = pgTable(
  'attendance_day',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    courseId: uuid('course_id').notNull(),
    classDate: date('class_date').notNull(),
  },
  table => [
    index('ix_att_day_course').using('btree', table.courseId.asc().nullsLast().op('uuid_ops')),
    index('ix_att_day_date').using('btree', table.classDate.asc().nullsLast().op('date_ops')),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [course.id],
      name: 'attendance_day_course_id_fkey',
    }).onDelete('cascade'),
    unique('attendance_day_course_id_class_date_key').on(table.courseId, table.classDate),
  ]
);

export const attendanceMark = pgTable(
  'attendance_mark',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    attendanceDayId: uuid('attendance_day_id').notNull(),
    learnerId: uuid('learner_id').notNull(),
    status: attendanceStatus().notNull(),
    comment: text(),
  },
  table => [
    index('ix_att_mark_day').using('btree', table.attendanceDayId.asc().nullsLast().op('uuid_ops')),
    index('ix_att_mark_student').using('btree', table.learnerId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.attendanceDayId],
      foreignColumns: [attendanceDay.id],
      name: 'attendance_mark_attendance_day_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.learnerId],
      foreignColumns: [learner.id],
      name: 'attendance_mark_learner_id_fkey',
    }).onDelete('cascade'),
    unique('attendance_mark_attendance_day_id_learner_id_key').on(
      table.attendanceDayId,
      table.learnerId
    ),
  ]
);

export const courses = pgTable(
  'courses',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tenantId: uuid('tenant_id').notNull(),
    programmeId: uuid('programme_id').notNull(),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 50 }).notNull(),
    description: text(),
    cefrLevel: varchar('cefr_level', { length: 2 }).notNull(),
    syllabusUrl: varchar('syllabus_url', { length: 500 }),
    syllabusVersion: varchar('syllabus_version', { length: 20 }),
    hoursPerWeek: integer('hours_per_week').default(15).notNull(),
    durationWeeks: integer('duration_weeks').default(12).notNull(),
    status: varchar({ length: 50 }).default('active').notNull(),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
  },
  table => [
    index('idx_courses_cefr').using('btree', table.cefrLevel.asc().nullsLast().op('text_ops')),
    index('idx_courses_deleted')
      .using('btree', table.deletedAt.asc().nullsLast().op('timestamp_ops'))
      .where(sql`(deleted_at IS NULL)`),
    index('idx_courses_programme').using(
      'btree',
      table.programmeId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_courses_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
    index('idx_courses_tenant').using('btree', table.tenantId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.programmeId],
      foreignColumns: [programmes.id],
      name: 'courses_programme_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'courses_tenant_id_fkey',
    }).onDelete('cascade'),
    unique('uk_courses_tenant_code').on(table.tenantId, table.code),
    pgPolicy('courses_delete_admin', {
      as: 'permissive',
      for: 'delete',
      to: ['public'],
      using: sql`((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND (current_setting('app.current_user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])))`,
    }),
    pgPolicy('courses_insert_admin', { as: 'permissive', for: 'insert', to: ['public'] }),
    pgPolicy('courses_select_tenant', { as: 'permissive', for: 'select', to: ['public'] }),
    pgPolicy('courses_update_admin', { as: 'permissive', for: 'update', to: ['public'] }),
    check(
      'check_cefr_level',
      sql`(cefr_level)::text = ANY ((ARRAY['A1'::character varying, 'A2'::character varying, 'B1'::character varying, 'B2'::character varying, 'C1'::character varying, 'C2'::character varying])::text[])`
    ),
  ]
);

export const adminUser = pgTable(
  'admin_user',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    supabaseUid: uuid('supabase_uid').notNull(),
    // TODO: failed to parse database type 'citext'
    email: unknown('email').notNull(),
    role: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  table => [
    index('ix_admin_email').using('btree', table.email.asc().nullsLast().op('citext_ops')),
    unique('admin_user_supabase_uid_key').on(table.supabaseUid),
    unique('admin_user_email_key').on(table.email),
    check('admin_user_role_check', sql`role = ANY (ARRAY['admin'::text, 'super_admin'::text])`),
  ]
);

export const users = pgTable(
  'users',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    email: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }),
    role: varchar({ length: 50 }).default('student').notNull(),
    avatarUrl: text('avatar_url'),
    metadata: jsonb().default({}),
    isActive: boolean('is_active').default(true).notNull(),
    lastLogin: timestamp('last_login', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    currentLevel: varchar('current_level', { length: 2 }),
    initialLevel: varchar('initial_level', { length: 2 }),
    levelStatus: varchar('level_status', { length: 20 }),
    visaType: varchar('visa_type', { length: 50 }),
    visaExpiry: date('visa_expiry'),
  },
  table => [
    index('idx_users_current_level')
      .using('btree', table.currentLevel.asc().nullsLast().op('text_ops'))
      .where(sql`((role)::text = 'student'::text)`),
    index('idx_users_level_status')
      .using('btree', table.levelStatus.asc().nullsLast().op('text_ops'))
      .where(sql`((role)::text = 'student'::text)`),
    index('idx_users_role').using('btree', table.role.asc().nullsLast().op('text_ops')),
    index('idx_users_tenant').using('btree', table.tenantId.asc().nullsLast().op('uuid_ops')),
    uniqueIndex('idx_users_tenant_email').using(
      'btree',
      table.tenantId.asc().nullsLast().op('uuid_ops'),
      table.email.asc().nullsLast().op('text_ops')
    ),
    index('idx_users_visa_expiry')
      .using('btree', table.visaExpiry.asc().nullsLast().op('date_ops'))
      .where(sql`(((role)::text = 'student'::text) AND (visa_expiry IS NOT NULL))`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'users_tenant_id_fkey',
    }),
    check(
      'check_current_level',
      sql`(current_level IS NULL) OR ((current_level)::text = ANY ((ARRAY['A1'::character varying, 'A2'::character varying, 'B1'::character varying, 'B2'::character varying, 'C1'::character varying, 'C2'::character varying])::text[]))`
    ),
    check(
      'check_initial_level',
      sql`(initial_level IS NULL) OR ((initial_level)::text = ANY ((ARRAY['A1'::character varying, 'A2'::character varying, 'B1'::character varying, 'B2'::character varying, 'C1'::character varying, 'C2'::character varying])::text[]))`
    ),
    check(
      'check_level_status',
      sql`(level_status IS NULL) OR ((level_status)::text = ANY ((ARRAY['confirmed'::character varying, 'provisional'::character varying, 'pending_approval'::character varying])::text[]))`
    ),
  ]
);

export const tenants = pgTable(
  'tenants',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    name: varchar({ length: 255 }).notNull(),
    subdomain: varchar({ length: 100 }),
    settings: jsonb().default({}),
    status: varchar({ length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_tenants_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
    index('idx_tenants_subdomain').using('btree', table.subdomain.asc().nullsLast().op('text_ops')),
    unique('tenants_subdomain_key').on(table.subdomain),
  ]
);

export const classes = pgTable(
  'classes',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 50 }),
    description: text(),
    level: varchar({ length: 50 }),
    subject: varchar({ length: 100 }),
    capacity: integer().default(20).notNull(),
    enrolledCount: integer('enrolled_count').default(0).notNull(),
    teacherId: uuid('teacher_id'),
    scheduleDescription: varchar('schedule_description', { length: 500 }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    status: varchar({ length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { mode: 'string' }),
  },
  table => [
    index('idx_classes_dates').using(
      'btree',
      table.startDate.asc().nullsLast().op('date_ops'),
      table.endDate.asc().nullsLast().op('date_ops')
    ),
    index('idx_classes_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
    index('idx_classes_teacher').using('btree', table.teacherId.asc().nullsLast().op('uuid_ops')),
    index('idx_classes_tenant').using('btree', table.tenantId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.teacherId],
      foreignColumns: [users.id],
      name: 'classes_teacher_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'classes_tenant_id_fkey',
    }),
  ]
);

export const classSessions = pgTable(
  'class_sessions',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    sessionDate: date('session_date').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    topic: varchar({ length: 500 }),
    notes: text(),
    status: varchar({ length: 50 }).default('scheduled').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_sessions_class_date').using(
      'btree',
      table.classId.asc().nullsLast().op('date_ops'),
      table.sessionDate.asc().nullsLast().op('date_ops')
    ),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'class_sessions_class_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'class_sessions_tenant_id_fkey',
    }),
  ]
);

export const attendance = pgTable(
  'attendance',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    classSessionId: uuid('class_session_id').notNull(),
    studentId: uuid('student_id').notNull(),
    status: varchar({ length: 50 }).notNull(),
    notes: text(),
    recordedBy: uuid('recorded_by'),
    recordedAt: timestamp('recorded_at', { mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('idx_attendance_session_student').using(
      'btree',
      table.classSessionId.asc().nullsLast().op('uuid_ops'),
      table.studentId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.classSessionId],
      foreignColumns: [classSessions.id],
      name: 'attendance_class_session_id_fkey',
    }),
    foreignKey({
      columns: [table.recordedBy],
      foreignColumns: [users.id],
      name: 'attendance_recorded_by_fkey',
    }),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.id],
      name: 'attendance_student_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'attendance_tenant_id_fkey',
    }),
  ]
);

export const assignments = pgTable(
  'assignments',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    classId: uuid('class_id').notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    type: varchar({ length: 50 }).notNull(),
    assignedDate: date('assigned_date').notNull(),
    dueDate: date('due_date').notNull(),
    maxScore: integer('max_score'),
    content: jsonb(),
    attachments: jsonb(),
    status: varchar({ length: 50 }).default('active').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'assignments_class_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'assignments_tenant_id_fkey',
    }),
  ]
);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    assignmentId: uuid('assignment_id').notNull(),
    studentId: uuid('student_id').notNull(),
    submittedAt: timestamp('submitted_at', { mode: 'string' }).defaultNow().notNull(),
    content: jsonb(),
    attachments: jsonb(),
    status: varchar({ length: 50 }).default('submitted').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.assignmentId],
      foreignColumns: [assignments.id],
      name: 'submissions_assignment_id_fkey',
    }),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.id],
      name: 'submissions_student_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'submissions_tenant_id_fkey',
    }),
  ]
);

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    studentId: uuid('student_id').notNull(),
    classId: uuid('class_id').notNull(),
    enrollmentDate: date('enrollment_date')
      .default(sql`CURRENT_DATE`)
      .notNull(),
    completionDate: date('completion_date'),
    status: varchar({ length: 50 }).default('active').notNull(),
    attendanceRate: numeric('attendance_rate', { precision: 5, scale: 2 }),
    currentGrade: varchar('current_grade', { length: 10 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
    expectedEndDate: date('expected_end_date'),
    bookedWeeks: integer('booked_weeks'),
    originalCourseId: uuid('original_course_id'),
    extensionsCount: integer('extensions_count').default(0),
    isAmended: boolean('is_amended').default(false),
  },
  table => [
    uniqueIndex('idx_enrollments_student_class').using(
      'btree',
      table.studentId.asc().nullsLast().op('uuid_ops'),
      table.classId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'enrollments_class_id_fkey',
    }),
    foreignKey({
      columns: [table.originalCourseId],
      foreignColumns: [courses.id],
      name: 'enrollments_original_course_id_fkey',
    }),
    foreignKey({
      columns: [table.studentId],
      foreignColumns: [users.id],
      name: 'enrollments_student_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'enrollments_tenant_id_fkey',
    }),
  ]
);

export const grades = pgTable(
  'grades',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    submissionId: uuid('submission_id').notNull(),
    score: numeric({ precision: 10, scale: 2 }),
    grade: varchar({ length: 10 }),
    feedback: text(),
    gradedBy: uuid('graded_by'),
    gradedAt: timestamp('graded_at', { mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    foreignKey({
      columns: [table.gradedBy],
      foreignColumns: [users.id],
      name: 'grades_graded_by_fkey',
    }),
    foreignKey({
      columns: [table.submissionId],
      foreignColumns: [submissions.id],
      name: 'grades_submission_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'grades_tenant_id_fkey',
    }),
    unique('grades_submission_id_key').on(table.submissionId),
  ]
);

export const enrollmentAmendments = pgTable(
  'enrollment_amendments',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    tenantId: uuid('tenant_id').notNull(),
    enrollmentId: uuid('enrollment_id').notNull(),
    amendmentType: varchar('amendment_type', { length: 50 }).notNull(),
    amendmentDate: date('amendment_date')
      .default(sql`CURRENT_DATE`)
      .notNull(),
    previousEndDate: date('previous_end_date'),
    previousWeeks: integer('previous_weeks'),
    previousClassId: uuid('previous_class_id'),
    newEndDate: date('new_end_date'),
    newWeeks: integer('new_weeks'),
    newClassId: uuid('new_class_id'),
    feeAdjustment: numeric('fee_adjustment', { precision: 10, scale: 2 }),
    reason: text(),
    requestedBy: uuid('requested_by'),
    approvedBy: uuid('approved_by'),
    status: varchar({ length: 50 }).default('pending').notNull(),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_enrollment_amendments_date').using(
      'btree',
      table.amendmentDate.asc().nullsLast().op('date_ops')
    ),
    index('idx_enrollment_amendments_enrollment').using(
      'btree',
      table.enrollmentId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_enrollment_amendments_status').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops')
    ),
    index('idx_enrollment_amendments_tenant').using(
      'btree',
      table.tenantId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_enrollment_amendments_type').using(
      'btree',
      table.amendmentType.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [users.id],
      name: 'enrollment_amendments_approved_by_fkey',
    }),
    foreignKey({
      columns: [table.enrollmentId],
      foreignColumns: [enrollments.id],
      name: 'enrollment_amendments_enrollment_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.newClassId],
      foreignColumns: [classes.id],
      name: 'enrollment_amendments_new_class_id_fkey',
    }),
    foreignKey({
      columns: [table.previousClassId],
      foreignColumns: [classes.id],
      name: 'enrollment_amendments_previous_class_id_fkey',
    }),
    foreignKey({
      columns: [table.requestedBy],
      foreignColumns: [users.id],
      name: 'enrollment_amendments_requested_by_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'enrollment_amendments_tenant_id_fkey',
    }).onDelete('cascade'),
    pgPolicy('enrollment_amendments_insert_admin', {
      as: 'permissive',
      for: 'insert',
      to: ['public'],
      withCheck: sql`((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND (current_setting('app.current_user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])))`,
    }),
    pgPolicy('enrollment_amendments_select_admin', {
      as: 'permissive',
      for: 'select',
      to: ['public'],
    }),
    pgPolicy('enrollment_amendments_select_student', {
      as: 'permissive',
      for: 'select',
      to: ['public'],
    }),
    pgPolicy('enrollment_amendments_update_admin', {
      as: 'permissive',
      for: 'update',
      to: ['public'],
    }),
    check(
      'check_amendment_type',
      sql`(amendment_type)::text = ANY ((ARRAY['extension'::character varying, 'reduction'::character varying, 'transfer'::character varying, 'level_change'::character varying, 'cancellation'::character varying])::text[])`
    ),
  ]
);

export const cefrDescriptors = pgTable(
  'cefr_descriptors',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    level: varchar({ length: 2 }).notNull(),
    category: varchar({ length: 100 }).notNull(),
    subcategory: varchar({ length: 100 }),
    descriptor: text().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_cefr_category').using('btree', table.category.asc().nullsLast().op('text_ops')),
    index('idx_cefr_level').using('btree', table.level.asc().nullsLast().op('text_ops')),
  ]
);

export const lessonPlans = pgTable(
  'lesson_plans',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    teacherId: uuid('teacher_id').notNull(),
    classId: uuid('class_id'),
    title: varchar({ length: 255 }).notNull(),
    cefrLevel: varchar('cefr_level', { length: 2 }),
    skill: varchar({ length: 50 }),
    durationMinutes: integer('duration_minutes'),
    content: jsonb().notNull(),
    status: varchar({ length: 50 }).default('draft').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_lesson_plans_cefr').using('btree', table.cefrLevel.asc().nullsLast().op('text_ops')),
    index('idx_lesson_plans_class').using('btree', table.classId.asc().nullsLast().op('uuid_ops')),
    index('idx_lesson_plans_teacher').using(
      'btree',
      table.teacherId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.classId],
      foreignColumns: [classes.id],
      name: 'lesson_plans_class_id_fkey',
    }),
    foreignKey({
      columns: [table.teacherId],
      foreignColumns: [users.id],
      name: 'lesson_plans_teacher_id_fkey',
    }),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'lesson_plans_tenant_id_fkey',
    }),
  ]
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id'),
    action: varchar({ length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: uuid('resource_id'),
    metadata: jsonb().default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('idx_audit_created').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamp_ops')
    ),
    index('idx_audit_tenant').using('btree', table.tenantId.asc().nullsLast().op('uuid_ops')),
    index('idx_audit_user').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'audit_log_tenant_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'audit_log_user_id_fkey',
    }),
  ]
);

export const feedback = pgTable(
  'feedback',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id'),
    type: varchar({ length: 50 }).notNull(),
    message: text().notNull(),
    metadata: jsonb().default({}),
    status: varchar({ length: 50 }).default('new').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { mode: 'string' }),
  },
  table => [
    index('idx_feedback_status').using('btree', table.status.asc().nullsLast().op('text_ops')),
    index('idx_feedback_tenant').using('btree', table.tenantId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.id],
      name: 'feedback_tenant_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'feedback_user_id_fkey',
    }),
  ]
);
export const vStudentsWithMetadata = pgView('v_students_with_metadata', {
  id: uuid(),
  tenantId: uuid('tenant_id'),
  email: varchar({ length: 255 }),
  name: varchar({ length: 255 }),
  avatarUrl: text('avatar_url'),
  currentLevel: varchar('current_level', { length: 2 }),
  initialLevel: varchar('initial_level', { length: 2 }),
  levelStatus: varchar('level_status', { length: 20 }),
  visaType: varchar('visa_type', { length: 50 }),
  visaExpiry: date('visa_expiry'),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
  lastLogin: timestamp('last_login', { mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  activeEnrollments: bigint('active_enrollments', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  completedEnrollments: bigint('completed_enrollments', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalEnrollments: bigint('total_enrollments', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  attendancePresent: bigint('attendance_present', { mode: 'number' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  attendanceTotal: bigint('attendance_total', { mode: 'number' }),
  attendanceRate: numeric('attendance_rate'),
  lastEnrollmentDate: date('last_enrollment_date'),
  lastAttendanceDate: time('last_attendance_date'),
  visaExpiringSoon: boolean('visa_expiring_soon'),
  visaExpired: boolean('visa_expired'),
  atRiskAttendance: boolean('at_risk_attendance'),
}).as(
  sql`SELECT u.id, u.tenant_id, u.email, u.name, u.avatar_url, u.current_level, u.initial_level, u.level_status, u.visa_type, u.visa_expiry, u.metadata, u.created_at, u.updated_at, u.last_login, count(DISTINCT e.id) FILTER (WHERE e.status::text = 'active'::text) AS active_enrollments, count(DISTINCT e.id) FILTER (WHERE e.status::text = 'completed'::text) AS completed_enrollments, count(DISTINCT e.id) AS total_enrollments, count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text) AS attendance_present, count(DISTINCT a.id) AS attendance_total, CASE WHEN count(DISTINCT a.id) > 0 THEN round(count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text)::numeric / count(DISTINCT a.id)::numeric * 100::numeric, 2) ELSE NULL::numeric END AS attendance_rate, max(e.enrollment_date) AS last_enrollment_date, max(cs.start_time) FILTER (WHERE a.status::text = 'present'::text) AS last_attendance_date, CASE WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < (CURRENT_DATE + '30 days'::interval) THEN true ELSE false END AS visa_expiring_soon, CASE WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < CURRENT_DATE THEN true ELSE false END AS visa_expired, CASE WHEN count(DISTINCT a.id) > 0 AND (count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text)::numeric / count(DISTINCT a.id)::numeric) < 0.75 THEN true ELSE false END AS at_risk_attendance FROM users u LEFT JOIN enrollments e ON e.student_id = u.id LEFT JOIN attendance a ON a.student_id = u.id LEFT JOIN class_sessions cs ON cs.id = a.class_session_id WHERE u.role::text = 'student'::text GROUP BY u.id ORDER BY u.created_at DESC`
);

export const vStudentRegistry = pgView('v_student_registry', {
  id: uuid(),
  tenantId: uuid('tenant_id'),
  email: varchar({ length: 255 }),
  name: varchar({ length: 255 }),
  avatarUrl: text('avatar_url'),
  currentLevel: varchar('current_level', { length: 2 }),
  visaType: varchar('visa_type', { length: 50 }),
  visaExpiry: date('visa_expiry'),
  createdAt: timestamp('created_at', { mode: 'string' }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  activeEnrollments: bigint('active_enrollments', { mode: 'number' }),
  attendanceRate: numeric('attendance_rate'),
  visaStatus: text('visa_status'),
}).as(
  sql`SELECT u.id, u.tenant_id, u.email, u.name, u.avatar_url, u.current_level, u.visa_type, u.visa_expiry, u.created_at, count(DISTINCT e.id) FILTER (WHERE e.status::text = 'active'::text) AS active_enrollments, CASE WHEN count(DISTINCT a.id) > 0 THEN round(count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text)::numeric / count(DISTINCT a.id)::numeric * 100::numeric, 2) ELSE NULL::numeric END AS attendance_rate, CASE WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < CURRENT_DATE THEN 'expired'::text WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < (CURRENT_DATE + '30 days'::interval) THEN 'expiring_soon'::text ELSE 'valid'::text END AS visa_status FROM users u LEFT JOIN enrollments e ON e.student_id = u.id LEFT JOIN attendance a ON a.student_id = u.id WHERE u.role::text = 'student'::text GROUP BY u.id ORDER BY u.created_at DESC`
);

export const vStudentCourseHistory = pgView('v_student_course_history', {
  studentId: uuid('student_id'),
  studentName: varchar('student_name', { length: 255 }),
  studentEmail: varchar('student_email', { length: 255 }),
  enrollmentId: uuid('enrollment_id'),
  enrollmentDate: date('enrollment_date'),
  completionDate: date('completion_date'),
  enrollmentStatus: varchar('enrollment_status', { length: 50 }),
  classId: uuid('class_id'),
  className: varchar('class_name', { length: 255 }),
  classLevel: varchar('class_level', { length: 50 }),
  classStartDate: date('class_start_date'),
  classEndDate: date('class_end_date'),
  attendanceRate: numeric('attendance_rate', { precision: 5, scale: 2 }),
  currentGrade: varchar('current_grade', { length: 10 }),
}).as(
  sql`SELECT u.id AS student_id, u.name AS student_name, u.email AS student_email, e.id AS enrollment_id, e.enrollment_date, e.completion_date, e.status AS enrollment_status, c.id AS class_id, c.name AS class_name, c.level AS class_level, c.start_date AS class_start_date, c.end_date AS class_end_date, e.attendance_rate, e.current_grade FROM users u JOIN enrollments e ON e.student_id = u.id JOIN classes c ON c.id = e.class_id WHERE u.role::text = 'student'::text AND c.deleted_at IS NULL ORDER BY u.name, e.enrollment_date DESC`
);
