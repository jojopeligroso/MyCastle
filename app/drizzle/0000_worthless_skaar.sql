-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late', 'excused');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'bank_transfer', 'online', 'other');--> statement-breakpoint
CREATE TABLE "country" (
	"iso2" char(2) PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learner" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"student_number" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"dob" date NOT NULL,
	"email" "citext",
	"phone" text,
	"citizenship_code" char(2),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "learner_student_number_key" UNIQUE("student_number"),
	CONSTRAINT "learner_email_key" UNIQUE("email"),
	CONSTRAINT "learner_dob_check" CHECK (dob <= CURRENT_DATE),
	CONSTRAINT "learner_first_name_check" CHECK (length(TRIM(BOTH FROM first_name)) > 0),
	CONSTRAINT "learner_last_name_check" CHECK (length(TRIM(BOTH FROM last_name)) > 0)
);
--> statement-breakpoint
ALTER TABLE "learner" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "course" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	CONSTRAINT "course_code_key" UNIQUE("code"),
	CONSTRAINT "course_check" CHECK (end_date >= start_date)
);
--> statement-breakpoint
ALTER TABLE "course" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "booking" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"learner_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"sale_date" date NOT NULL,
	"placement_score" integer,
	"deposit_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"course_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"accommodation_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"transfer_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"exam_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"registration_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"learner_prot_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"medical_ins_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_booking" numeric(12, 2) GENERATED ALWAYS AS ((((((((deposit_paid + course_fee) + accommodation_fee) + transfer_fee) + exam_fee) + registration_fee) + learner_prot_fee) + medical_ins_fee)) STORED,
	"total_due" numeric(12, 2) GENERATED ALWAYS AS ((((((((course_fee + accommodation_fee) + transfer_fee) + exam_fee) + registration_fee) + learner_prot_fee) + medical_ins_fee) - deposit_paid)) STORED,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "currency" (
	"code" char(3) PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"booking_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'EUR' NOT NULL,
	"method" "payment_method" NOT NULL,
	"paid_on" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"levels" jsonb DEFAULT '["A1","A2","B1","B2","C1","C2"]'::jsonb NOT NULL,
	"duration_weeks" integer DEFAULT 12 NOT NULL,
	"hours_per_week" integer DEFAULT 15 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "uk_programmes_tenant_code" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
ALTER TABLE "programmes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "accommodation" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"cost" numeric(12, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "accommodation_check" CHECK (end_date >= start_date),
	CONSTRAINT "accommodation_cost_check" CHECK (cost >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "accommodation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_day" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"course_id" uuid NOT NULL,
	"class_date" date NOT NULL,
	CONSTRAINT "attendance_day_course_id_class_date_key" UNIQUE("course_id","class_date")
);
--> statement-breakpoint
ALTER TABLE "attendance_day" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_mark" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"attendance_day_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"comment" text,
	CONSTRAINT "attendance_mark_attendance_day_id_learner_id_key" UNIQUE("attendance_day_id","learner_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_mark" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"programme_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"cefr_level" varchar(2) NOT NULL,
	"syllabus_url" varchar(500),
	"syllabus_version" varchar(20),
	"hours_per_week" integer DEFAULT 15 NOT NULL,
	"duration_weeks" integer DEFAULT 12 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "uk_courses_tenant_code" UNIQUE("tenant_id","code"),
	CONSTRAINT "check_cefr_level" CHECK ((cefr_level)::text = ANY ((ARRAY['A1'::character varying, 'A2'::character varying, 'B1'::character varying, 'B2'::character varying, 'C1'::character varying, 'C2'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_user" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"supabase_uid" uuid NOT NULL,
	"email" "citext" NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "admin_user_supabase_uid_key" UNIQUE("supabase_uid"),
	CONSTRAINT "admin_user_email_key" UNIQUE("email"),
	CONSTRAINT "admin_user_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text]))
);
--> statement-breakpoint
ALTER TABLE "admin_user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"role" varchar(50) DEFAULT 'student' NOT NULL,
	"avatar_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"current_level" varchar(2),
	"initial_level" varchar(2),
	"level_status" varchar(20),
	"visa_type" varchar(50),
	"visa_expiry" date,
	CONSTRAINT "check_current_level" CHECK ((current_level IS NULL) OR ((current_level)::text = ANY ((ARRAY['A1'::character varying, 'A2'::character varying, 'B1'::character varying, 'B2'::character varying, 'C1'::character varying, 'C2'::character varying])::text[]))),
	CONSTRAINT "check_initial_level" CHECK ((initial_level IS NULL) OR ((initial_level)::text = ANY ((ARRAY['A1'::character varying, 'A2'::character varying, 'B1'::character varying, 'B2'::character varying, 'C1'::character varying, 'C2'::character varying])::text[]))),
	CONSTRAINT "check_level_status" CHECK ((level_status IS NULL) OR ((level_status)::text = ANY ((ARRAY['confirmed'::character varying, 'provisional'::character varying, 'pending_approval'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(100),
	"settings" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_subdomain_key" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"description" text,
	"level" varchar(50),
	"subject" varchar(100),
	"capacity" integer DEFAULT 20 NOT NULL,
	"enrolled_count" integer DEFAULT 0 NOT NULL,
	"teacher_id" uuid,
	"schedule_description" varchar(500),
	"start_date" date NOT NULL,
	"end_date" date,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"session_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"topic" varchar(500),
	"notes" text,
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" varchar(50) NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"assigned_date" date NOT NULL,
	"due_date" date NOT NULL,
	"max_score" integer,
	"content" jsonb,
	"attachments" jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"content" jsonb,
	"attachments" jsonb,
	"status" varchar(50) DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"enrollment_date" date DEFAULT CURRENT_DATE NOT NULL,
	"completion_date" date,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"attendance_rate" numeric(5, 2),
	"current_grade" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expected_end_date" date,
	"booked_weeks" integer,
	"original_course_id" uuid,
	"extensions_count" integer DEFAULT 0,
	"is_amended" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"score" numeric(10, 2),
	"grade" varchar(10),
	"feedback" text,
	"graded_by" uuid,
	"graded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grades_submission_id_key" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "enrollment_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"amendment_type" varchar(50) NOT NULL,
	"amendment_date" date DEFAULT CURRENT_DATE NOT NULL,
	"previous_end_date" date,
	"previous_weeks" integer,
	"previous_class_id" uuid,
	"new_end_date" date,
	"new_weeks" integer,
	"new_class_id" uuid,
	"fee_adjustment" numeric(10, 2),
	"reason" text,
	"requested_by" uuid,
	"approved_by" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "check_amendment_type" CHECK ((amendment_type)::text = ANY ((ARRAY['extension'::character varying, 'reduction'::character varying, 'transfer'::character varying, 'level_change'::character varying, 'cancellation'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "enrollment_amendments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cefr_descriptors" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"level" varchar(2) NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"descriptor" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"class_id" uuid,
	"title" varchar(255) NOT NULL,
	"cefr_level" varchar(2),
	"skill" varchar(50),
	"duration_minutes" integer,
	"content" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"type" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "learner" ADD CONSTRAINT "learner_citizenship_code_fkey" FOREIGN KEY ("citizenship_code") REFERENCES "public"."country"("iso2") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currency"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accommodation" ADD CONSTRAINT "accommodation_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accommodation" ADD CONSTRAINT "accommodation_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currency"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_day" ADD CONSTRAINT "attendance_day_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_mark" ADD CONSTRAINT "attendance_mark_attendance_day_id_fkey" FOREIGN KEY ("attendance_day_id") REFERENCES "public"."attendance_day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_mark" ADD CONSTRAINT "attendance_mark_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_session_id_fkey" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_original_course_id_fkey" FOREIGN KEY ("original_course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_amendments" ADD CONSTRAINT "enrollment_amendments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_amendments" ADD CONSTRAINT "enrollment_amendments_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_amendments" ADD CONSTRAINT "enrollment_amendments_new_class_id_fkey" FOREIGN KEY ("new_class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_amendments" ADD CONSTRAINT "enrollment_amendments_previous_class_id_fkey" FOREIGN KEY ("previous_class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_amendments" ADD CONSTRAINT "enrollment_amendments_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_amendments" ADD CONSTRAINT "enrollment_amendments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_learner_name" ON "learner" USING btree ("last_name" text_ops,"first_name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_learner_identity" ON "learner" USING btree ("first_name" bpchar_ops,"last_name" bpchar_ops,"dob" bpchar_ops,"citizenship_code" date_ops);--> statement-breakpoint
CREATE INDEX "ix_booking_course" ON "booking" USING btree ("course_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_booking_learner" ON "booking" USING btree ("learner_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_booking_sale_date" ON "booking" USING btree ("sale_date" date_ops);--> statement-breakpoint
CREATE INDEX "ix_payments_booking" ON "payments" USING btree ("booking_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_payments_date" ON "payments" USING btree ("paid_on" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_programmes_deleted" ON "programmes" USING btree ("deleted_at" timestamp_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_programmes_status" ON "programmes" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_programmes_tenant" ON "programmes" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_accommodation_booking" ON "accommodation" USING btree ("booking_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_accommodation_window" ON "accommodation" USING btree ("start_date" date_ops,"end_date" date_ops);--> statement-breakpoint
CREATE INDEX "ix_att_day_course" ON "attendance_day" USING btree ("course_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_att_day_date" ON "attendance_day" USING btree ("class_date" date_ops);--> statement-breakpoint
CREATE INDEX "ix_att_mark_day" ON "attendance_mark" USING btree ("attendance_day_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_att_mark_student" ON "attendance_mark" USING btree ("learner_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_courses_cefr" ON "courses" USING btree ("cefr_level" text_ops);--> statement-breakpoint
CREATE INDEX "idx_courses_deleted" ON "courses" USING btree ("deleted_at" timestamp_ops) WHERE (deleted_at IS NULL);--> statement-breakpoint
CREATE INDEX "idx_courses_programme" ON "courses" USING btree ("programme_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_courses_status" ON "courses" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_courses_tenant" ON "courses" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ix_admin_email" ON "admin_user" USING btree ("email" citext_ops);--> statement-breakpoint
CREATE INDEX "idx_users_current_level" ON "users" USING btree ("current_level" text_ops) WHERE ((role)::text = 'student'::text);--> statement-breakpoint
CREATE INDEX "idx_users_level_status" ON "users" USING btree ("level_status" text_ops) WHERE ((role)::text = 'student'::text);--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "users" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_tenant_email" ON "users" USING btree ("tenant_id" uuid_ops,"email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_visa_expiry" ON "users" USING btree ("visa_expiry" date_ops) WHERE (((role)::text = 'student'::text) AND (visa_expiry IS NOT NULL));--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "tenants" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tenants_subdomain" ON "tenants" USING btree ("subdomain" text_ops);--> statement-breakpoint
CREATE INDEX "idx_classes_dates" ON "classes" USING btree ("start_date" date_ops,"end_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_classes_status" ON "classes" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_classes_teacher" ON "classes" USING btree ("teacher_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_classes_tenant" ON "classes" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_class_date" ON "class_sessions" USING btree ("class_id" date_ops,"session_date" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attendance_session_student" ON "attendance" USING btree ("class_session_id" uuid_ops,"student_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_enrollments_student_class" ON "enrollments" USING btree ("student_id" uuid_ops,"class_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollment_amendments_date" ON "enrollment_amendments" USING btree ("amendment_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollment_amendments_enrollment" ON "enrollment_amendments" USING btree ("enrollment_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollment_amendments_status" ON "enrollment_amendments" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollment_amendments_tenant" ON "enrollment_amendments" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_enrollment_amendments_type" ON "enrollment_amendments" USING btree ("amendment_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cefr_category" ON "cefr_descriptors" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_cefr_level" ON "cefr_descriptors" USING btree ("level" text_ops);--> statement-breakpoint
CREATE INDEX "idx_lesson_plans_cefr" ON "lesson_plans" USING btree ("cefr_level" text_ops);--> statement-breakpoint
CREATE INDEX "idx_lesson_plans_class" ON "lesson_plans" USING btree ("class_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_lesson_plans_teacher" ON "lesson_plans" USING btree ("teacher_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_log" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_tenant" ON "audit_log" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_log" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_feedback_status" ON "feedback" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_feedback_tenant" ON "feedback" USING btree ("tenant_id" uuid_ops);--> statement-breakpoint
CREATE VIEW "public"."v_students_with_metadata" AS (SELECT u.id, u.tenant_id, u.email, u.name, u.avatar_url, u.current_level, u.initial_level, u.level_status, u.visa_type, u.visa_expiry, u.metadata, u.created_at, u.updated_at, u.last_login, count(DISTINCT e.id) FILTER (WHERE e.status::text = 'active'::text) AS active_enrollments, count(DISTINCT e.id) FILTER (WHERE e.status::text = 'completed'::text) AS completed_enrollments, count(DISTINCT e.id) AS total_enrollments, count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text) AS attendance_present, count(DISTINCT a.id) AS attendance_total, CASE WHEN count(DISTINCT a.id) > 0 THEN round(count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text)::numeric / count(DISTINCT a.id)::numeric * 100::numeric, 2) ELSE NULL::numeric END AS attendance_rate, max(e.enrollment_date) AS last_enrollment_date, max(cs.start_time) FILTER (WHERE a.status::text = 'present'::text) AS last_attendance_date, CASE WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < (CURRENT_DATE + '30 days'::interval) THEN true ELSE false END AS visa_expiring_soon, CASE WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < CURRENT_DATE THEN true ELSE false END AS visa_expired, CASE WHEN count(DISTINCT a.id) > 0 AND (count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text)::numeric / count(DISTINCT a.id)::numeric) < 0.75 THEN true ELSE false END AS at_risk_attendance FROM users u LEFT JOIN enrollments e ON e.student_id = u.id LEFT JOIN attendance a ON a.student_id = u.id LEFT JOIN class_sessions cs ON cs.id = a.class_session_id WHERE u.role::text = 'student'::text GROUP BY u.id ORDER BY u.created_at DESC);--> statement-breakpoint
CREATE VIEW "public"."v_student_registry" AS (SELECT u.id, u.tenant_id, u.email, u.name, u.avatar_url, u.current_level, u.visa_type, u.visa_expiry, u.created_at, count(DISTINCT e.id) FILTER (WHERE e.status::text = 'active'::text) AS active_enrollments, CASE WHEN count(DISTINCT a.id) > 0 THEN round(count(DISTINCT a.id) FILTER (WHERE a.status::text = 'present'::text)::numeric / count(DISTINCT a.id)::numeric * 100::numeric, 2) ELSE NULL::numeric END AS attendance_rate, CASE WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < CURRENT_DATE THEN 'expired'::text WHEN u.visa_expiry IS NOT NULL AND u.visa_expiry < (CURRENT_DATE + '30 days'::interval) THEN 'expiring_soon'::text ELSE 'valid'::text END AS visa_status FROM users u LEFT JOIN enrollments e ON e.student_id = u.id LEFT JOIN attendance a ON a.student_id = u.id WHERE u.role::text = 'student'::text GROUP BY u.id ORDER BY u.created_at DESC);--> statement-breakpoint
CREATE VIEW "public"."v_student_course_history" AS (SELECT u.id AS student_id, u.name AS student_name, u.email AS student_email, e.id AS enrollment_id, e.enrollment_date, e.completion_date, e.status AS enrollment_status, c.id AS class_id, c.name AS class_name, c.level AS class_level, c.start_date AS class_start_date, c.end_date AS class_end_date, e.attendance_rate, e.current_grade FROM users u JOIN enrollments e ON e.student_id = u.id JOIN classes c ON c.id = e.class_id WHERE u.role::text = 'student'::text AND c.deleted_at IS NULL ORDER BY u.name, e.enrollment_date DESC);--> statement-breakpoint
CREATE POLICY "programmes_delete_admin" ON "programmes" AS PERMISSIVE FOR DELETE TO public USING (((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND (current_setting('app.current_user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text]))));--> statement-breakpoint
CREATE POLICY "programmes_insert_admin" ON "programmes" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "programmes_select_tenant" ON "programmes" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "programmes_update_admin" ON "programmes" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "courses_delete_admin" ON "courses" AS PERMISSIVE FOR DELETE TO public USING (((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND (current_setting('app.current_user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text]))));--> statement-breakpoint
CREATE POLICY "courses_insert_admin" ON "courses" AS PERMISSIVE FOR INSERT TO public;--> statement-breakpoint
CREATE POLICY "courses_select_tenant" ON "courses" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "courses_update_admin" ON "courses" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "enrollment_amendments_insert_admin" ON "enrollment_amendments" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((tenant_id = (current_setting('app.current_tenant_id'::text))::uuid) AND (current_setting('app.current_user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text]))));--> statement-breakpoint
CREATE POLICY "enrollment_amendments_select_admin" ON "enrollment_amendments" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "enrollment_amendments_select_student" ON "enrollment_amendments" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "enrollment_amendments_update_admin" ON "enrollment_amendments" AS PERMISSIVE FOR UPDATE TO public;
*/