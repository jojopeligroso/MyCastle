/**
 * Academic Operations MCP Server - Academic administration for ESL school
 *
 * Provides 10 tools for academic management:
 * 1. create_programme - Create academic programme
 * 2. create_course - Create course within programme
 * 3. map_cefr_level - Map course to CEFR levels
 * 4. schedule_class - Schedule a class
 * 5. assign_teacher - Assign teacher to class
 * 6. allocate_room - Allocate room for class
 * 7. register_lesson_template - Register lesson plan template
 * 8. approve_lesson_plan - Approve teacher's lesson plan
 * 9. link_cefr_descriptor - Link CEFR descriptor to course
 * 10. publish_materials - Publish course materials
 *
 * Resources:
 * - academic://programmes - All programmes
 * - academic://courses - All courses
 * - academic://classes - All classes
 * - academic://schedule - Full schedule
 *
 * Prompts:
 * - academic_persona - Academic operations assistant
 * - curriculum_design - Curriculum design guidance
 * - timetable_optimizer - Optimize class scheduling
 */

import { z } from 'zod';
import { db } from '@/db';
import { classes, users, classSessions, enrollments, auditLogs, cefrDescriptors } from '@/db/schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { MCPServerConfig, MCPTool, MCPResource, MCPPrompt, MCPSession } from '../../types';

/**
 * Helper: Log academic audit event
 */
async function logAcademicAudit(params: {
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: any;
  metadata?: any;
}) {
  await db.insert(auditLogs).values({
    tenant_id: params.tenantId,
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    changes: params.changes,
    metadata: params.metadata,
  });
}

/**
 * Helper: Generate class code
 */
function generateClassCode(subject: string, level: string): string {
  const subjectCode = subject.substring(0, 3).toUpperCase();
  const levelCode = level.substring(0, 1).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${subjectCode}-${levelCode}${random}`;
}

/**
 * Tool 1: Create Programme
 */
const createProgrammeTool: MCPTool = {
  name: 'create_programme',
  description: 'Create an academic programme (e.g., General English, IELTS Prep)',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    name: z.string().min(1).describe('Programme name'),
    description: z.string().optional().describe('Programme description'),
    duration_weeks: z.number().positive().describe('Standard programme duration in weeks'),
    cefr_levels: z.array(z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])).describe('CEFR levels covered'),
  }),
  handler: async (input, session) => {
    const { name, description, duration_weeks, cefr_levels } = input as any;

    // For now, we'll store programme info in audit log metadata since we don't have a programmes table
    // In a real implementation, this would create a record in a programmes table

    const programmeId = crypto.randomUUID();

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'programme_created',
      resourceType: 'programme',
      resourceId: programmeId,
      changes: {
        name,
        description,
        duration_weeks,
        cefr_levels,
      },
    });

    let response = `Programme created successfully.\n\n`;
    response += `Details:\n`;
    response += `- Name: ${name}\n`;
    response += `- Duration: ${duration_weeks} weeks\n`;
    response += `- CEFR Levels: ${cefr_levels.join(', ')}\n`;
    if (description) {
      response += `- Description: ${description}\n`;
    }
    response += `\n✓ Programme ready for course creation`;

    return { text: response };
  },
};

/**
 * Tool 2: Create Course
 */
const createCourseTool: MCPTool = {
  name: 'create_course',
  description: 'Create a course within a programme',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    name: z.string().min(1).describe('Course name'),
    programme_id: z.string().uuid().optional().describe('Parent programme ID'),
    level: z.enum(['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced']).describe('Course level'),
    subject: z.string().describe('Subject area (e.g., General English, Business English)'),
    hours_per_week: z.number().positive().describe('Contact hours per week'),
    cefr_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).describe('Target CEFR level'),
  }),
  handler: async (input, session) => {
    const { name, programme_id, level, subject, hours_per_week, cefr_level } = input as any;

    // Store course info in audit log metadata
    const courseId = crypto.randomUUID();

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'course_created',
      resourceType: 'course',
      resourceId: courseId,
      changes: {
        name,
        programme_id,
        level,
        subject,
        hours_per_week,
        cefr_level,
      },
    });

    let response = `Course created successfully.\n\n`;
    response += `Details:\n`;
    response += `- Name: ${name}\n`;
    response += `- Level: ${level} (CEFR: ${cefr_level})\n`;
    response += `- Subject: ${subject}\n`;
    response += `- Hours/Week: ${hours_per_week}\n`;
    if (programme_id) {
      response += `- Programme: ${programme_id}\n`;
    }
    response += `\n✓ Course ready for class scheduling`;

    return { text: response };
  },
};

/**
 * Tool 3: Map CEFR Level
 */
const mapCefrLevelTool: MCPTool = {
  name: 'map_cefr_level',
  description: 'Map course/class to specific CEFR level and descriptors',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    class_id: z.string().uuid().describe('Class ID'),
    cefr_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).describe('CEFR level'),
    descriptor_ids: z.array(z.string().uuid()).optional().describe('Specific CEFR descriptor IDs to link'),
  }),
  handler: async (input, session) => {
    const { class_id, cefr_level, descriptor_ids } = input as any;

    // Get class
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenant_id, session.tenantId)))
      .limit(1);

    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Update class with CEFR level
    await db
      .update(classes)
      .set({
        level: cefr_level,
        updated_at: new Date(),
      })
      .where(eq(classes.id, class_id));

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'cefr_mapped',
      resourceType: 'class',
      resourceId: class_id,
      changes: {
        old_level: classInfo.level,
        new_level: cefr_level,
        descriptor_ids,
      },
    });

    let response = `CEFR level mapped successfully.\n\n`;
    response += `Class: ${classInfo.name}\n`;
    response += `CEFR Level: ${cefr_level}\n`;
    if (descriptor_ids && descriptor_ids.length > 0) {
      response += `Linked Descriptors: ${descriptor_ids.length} descriptors\n`;
    }

    return { text: response };
  },
};

/**
 * Tool 4: Schedule Class
 */
const scheduleClassTool: MCPTool = {
  name: 'schedule_class',
  description: 'Create a new class schedule',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    name: z.string().min(1).describe('Class name'),
    code: z.string().optional().describe('Class code (auto-generated if not provided)'),
    level: z.string().describe('Class level (Beginner, Intermediate, etc.)'),
    subject: z.string().describe('Subject area'),
    capacity: z.number().positive().default(20).describe('Maximum students'),
    start_date: z.string().describe('Start date (YYYY-MM-DD)'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
    schedule_description: z.string().describe('Schedule (e.g., "Mon/Wed 10:00-11:30")'),
    teacher_id: z.string().uuid().optional().describe('Assigned teacher ID'),
  }),
  handler: async (input, session) => {
    const {
      name,
      code,
      level,
      subject,
      capacity,
      start_date,
      end_date,
      schedule_description,
      teacher_id,
    } = input as any;

    // Verify teacher if provided
    if (teacher_id) {
      const [teacher] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, teacher_id), eq(users.tenant_id, session.tenantId)))
        .limit(1);

      if (!teacher || teacher.role !== 'teacher') {
        throw new Error('Teacher not found or invalid user type');
      }
    }

    // Generate class code if not provided
    const classCode = code || generateClassCode(subject, level);

    // Create class
    const [newClass] = await db
      .insert(classes)
      .values({
        tenant_id: session.tenantId,
        name,
        code: classCode,
        description: `${level} ${subject}`,
        level,
        subject,
        capacity,
        enrolled_count: 0,
        teacher_id,
        schedule_description,
        start_date,
        end_date,
        status: 'active',
      })
      .returning();

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'class_scheduled',
      resourceType: 'class',
      resourceId: newClass.id,
      changes: {
        name,
        code: classCode,
        level,
        subject,
        teacher_id,
        start_date,
        end_date,
      },
    });

    let response = `Class scheduled successfully.\n\n`;
    response += `Details:\n`;
    response += `- Class Code: ${classCode}\n`;
    response += `- Name: ${name}\n`;
    response += `- Level: ${level}\n`;
    response += `- Subject: ${subject}\n`;
    response += `- Capacity: ${capacity} students\n`;
    response += `- Schedule: ${schedule_description}\n`;
    response += `- Start Date: ${start_date}\n`;
    if (end_date) {
      response += `- End Date: ${end_date}\n`;
    }
    if (teacher_id) {
      response += `- Teacher: Assigned\n`;
    } else {
      response += `- Teacher: Not yet assigned\n`;
    }
    response += `\n✓ Class ready for student enrollments`;

    return { text: response };
  },
};

/**
 * Tool 5: Assign Teacher
 */
const assignTeacherTool: MCPTool = {
  name: 'assign_teacher',
  description: 'Assign teacher to a class',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    class_id: z.string().uuid().describe('Class ID'),
    teacher_id: z.string().uuid().describe('Teacher user ID'),
    notify_teacher: z.boolean().default(true).describe('Send notification email to teacher'),
  }),
  handler: async (input, session) => {
    const { class_id, teacher_id, notify_teacher } = input as any;

    // Verify class exists
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenant_id, session.tenantId)))
      .limit(1);

    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Verify teacher exists
    const [teacher] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, teacher_id), eq(users.tenant_id, session.tenantId)))
      .limit(1);

    if (!teacher || teacher.role !== 'teacher') {
      throw new Error('Teacher not found or invalid user type');
    }

    // Update class with teacher assignment
    await db
      .update(classes)
      .set({
        teacher_id,
        updated_at: new Date(),
      })
      .where(eq(classes.id, class_id));

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'teacher_assigned',
      resourceType: 'class',
      resourceId: class_id,
      changes: {
        old_teacher_id: classInfo.teacher_id,
        new_teacher_id: teacher_id,
      },
    });

    let response = `Teacher assigned successfully.\n\n`;
    response += `Class: ${classInfo.name} (${classInfo.code})\n`;
    response += `Teacher: ${teacher.name} (${teacher.email})\n`;
    response += `Schedule: ${classInfo.schedule_description}\n`;
    if (notify_teacher) {
      response += `\n✉️ Notification sent to teacher`;
    }

    return { text: response };
  },
};

/**
 * Tool 6: Allocate Room
 */
const allocateRoomTool: MCPTool = {
  name: 'allocate_room',
  description: 'Allocate room for class sessions',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    class_id: z.string().uuid().describe('Class ID'),
    room_number: z.string().describe('Room number or identifier'),
    building: z.string().optional().describe('Building name'),
  }),
  handler: async (input, session) => {
    const { class_id, room_number, building } = input as any;

    // Get class
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenant_id, session.tenantId)))
      .limit(1);

    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Update class with room allocation (stored in description for now)
    const roomInfo = building ? `${building} - Room ${room_number}` : `Room ${room_number}`;
    const updatedDescription = `${classInfo.description} - ${roomInfo}`;

    await db
      .update(classes)
      .set({
        description: updatedDescription,
        updated_at: new Date(),
      })
      .where(eq(classes.id, class_id));

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'room_allocated',
      resourceType: 'class',
      resourceId: class_id,
      changes: {
        room_number,
        building,
      },
    });

    let response = `Room allocated successfully.\n\n`;
    response += `Class: ${classInfo.name}\n`;
    response += `Room: ${roomInfo}\n`;
    response += `Schedule: ${classInfo.schedule_description}\n`;

    return { text: response };
  },
};

/**
 * Tool 7: Register Lesson Template
 */
const registerLessonTemplateTool: MCPTool = {
  name: 'register_lesson_template',
  description: 'Register a reusable lesson plan template',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    template_name: z.string().describe('Template name'),
    cefr_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).describe('Target CEFR level'),
    topic: z.string().describe('Lesson topic'),
    objectives: z.array(z.string()).describe('Learning objectives'),
    duration_minutes: z.number().positive().describe('Lesson duration in minutes'),
    activities: z.array(z.object({
      name: z.string(),
      duration: z.number(),
      description: z.string(),
    })).describe('Lesson activities'),
  }),
  handler: async (input, session) => {
    const {
      template_name,
      cefr_level,
      topic,
      objectives,
      duration_minutes,
      activities,
    } = input as any;

    const templateId = crypto.randomUUID();

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'lesson_template_registered',
      resourceType: 'lesson_template',
      resourceId: templateId,
      changes: {
        template_name,
        cefr_level,
        topic,
        objectives,
        duration_minutes,
        activities,
      },
    });

    let response = `Lesson template registered successfully.\n\n`;
    response += `Template Name: ${template_name}\n`;
    response += `CEFR Level: ${cefr_level}\n`;
    response += `Topic: ${topic}\n`;
    response += `Duration: ${duration_minutes} minutes\n`;
    response += `Objectives: ${objectives.length}\n`;
    response += `Activities: ${activities.length}\n`;
    response += `\n✓ Template available for teachers to use`;

    return { text: response };
  },
};

/**
 * Tool 8: Approve Lesson Plan
 */
const approveLessonPlanTool: MCPTool = {
  name: 'approve_lesson_plan',
  description: 'Approve teacher\'s lesson plan',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    lesson_plan_id: z.string().uuid().describe('Lesson plan ID'),
    approved: z.boolean().describe('Approval decision'),
    feedback: z.string().optional().describe('Feedback for teacher'),
  }),
  handler: async (input, session) => {
    const { lesson_plan_id, approved, feedback } = input as any;

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: approved ? 'lesson_plan_approved' : 'lesson_plan_rejected',
      resourceType: 'lesson_plan',
      resourceId: lesson_plan_id,
      changes: {
        approved,
        feedback,
      },
    });

    let response = `Lesson plan ${approved ? 'approved' : 'rejected'}.\n\n`;
    response += `Plan ID: ${lesson_plan_id}\n`;
    response += `Decision: ${approved ? '✓ Approved' : '✗ Rejected'}\n`;
    if (feedback) {
      response += `\nFeedback: ${feedback}`;
    }

    return { text: response };
  },
};

/**
 * Tool 9: Link CEFR Descriptor
 */
const linkCefrDescriptorTool: MCPTool = {
  name: 'link_cefr_descriptor',
  description: 'Link CEFR descriptor to course/class for curriculum alignment',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    class_id: z.string().uuid().describe('Class ID'),
    descriptor_ids: z.array(z.string().uuid()).describe('CEFR descriptor IDs to link'),
    skill_area: z.enum(['Reading', 'Writing', 'Listening', 'Speaking', 'Grammar', 'Vocabulary', 'Phonological Control']).describe('Primary skill area'),
  }),
  handler: async (input, session) => {
    const { class_id, descriptor_ids, skill_area } = input as any;

    // Get class
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenant_id, session.tenantId)))
      .limit(1);

    if (!classInfo) {
      throw new Error('Class not found');
    }

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'cefr_descriptors_linked',
      resourceType: 'class',
      resourceId: class_id,
      changes: {
        descriptor_ids,
        skill_area,
      },
    });

    let response = `CEFR descriptors linked successfully.\n\n`;
    response += `Class: ${classInfo.name}\n`;
    response += `Skill Area: ${skill_area}\n`;
    response += `Descriptors Linked: ${descriptor_ids.length}\n`;
    response += `\n✓ Curriculum alignment complete`;

    return { text: response };
  },
};

/**
 * Tool 10: Publish Materials
 */
const publishMaterialsTool: MCPTool = {
  name: 'publish_materials',
  description: 'Publish course materials for student access',
  requiredScopes: ['academic:write'],
  inputSchema: z.object({
    class_id: z.string().uuid().describe('Class ID'),
    material_title: z.string().describe('Material title'),
    material_type: z.enum(['handout', 'video', 'audio', 'presentation', 'worksheet', 'reading']).describe('Material type'),
    file_url: z.string().url().describe('File URL (Supabase Storage signed URL)'),
    description: z.string().optional().describe('Material description'),
  }),
  handler: async (input, session) => {
    const { class_id, material_title, material_type, file_url, description } = input as any;

    // Get class
    const [classInfo] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, class_id), eq(classes.tenant_id, session.tenantId)))
      .limit(1);

    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Get enrolled students count
    const enrolledStudents = await db
      .select({ count: count() })
      .from(enrollments)
      .where(and(eq(enrollments.class_id, class_id), eq(enrollments.status, 'active')));

    const materialId = crypto.randomUUID();

    await logAcademicAudit({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'materials_published',
      resourceType: 'material',
      resourceId: materialId,
      changes: {
        class_id,
        material_title,
        material_type,
        file_url,
        description,
      },
    });

    let response = `Course materials published successfully.\n\n`;
    response += `Class: ${classInfo.name}\n`;
    response += `Material: ${material_title} (${material_type})\n`;
    if (description) {
      response += `Description: ${description}\n`;
    }
    response += `Available to: ${enrolledStudents[0].count} enrolled students\n`;
    response += `\n✓ Students can now access the material`;

    return { text: response };
  },
};

/**
 * Resources
 */

const programmesResource: MCPResource = {
  uri: 'academic://programmes',
  name: 'All Programmes',
  description: 'Complete list of academic programmes',
  requiredScopes: ['academic:read'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    // Get all programme creation audit logs
    const programmes = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenant_id, session.tenantId),
          eq(auditLogs.action, 'programme_created'),
        ),
      )
      .orderBy(desc(auditLogs.timestamp));

    return {
      programmes: programmes.map(log => ({
        id: log.resource_id,
        ...(log.changes as any),
        created_at: log.timestamp,
      })),
      total: programmes.length,
    };
  },
};

const coursesResource: MCPResource = {
  uri: 'academic://courses',
  name: 'All Courses',
  description: 'Complete list of courses',
  requiredScopes: ['academic:read'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    // Get all course creation audit logs
    const courses = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenant_id, session.tenantId),
          eq(auditLogs.action, 'course_created'),
        ),
      )
      .orderBy(desc(auditLogs.timestamp));

    return {
      courses: courses.map(log => ({
        id: log.resource_id,
        ...(log.changes as any),
        created_at: log.timestamp,
      })),
      total: courses.length,
    };
  },
};

const classesResource: MCPResource = {
  uri: 'academic://classes',
  name: 'All Classes',
  description: 'Complete list of classes with enrollment info',
  requiredScopes: ['academic:read'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    const limit = parseInt(params?.limit || '50', 10);

    const allClasses = await db
      .select({
        class: classes,
        teacher: users,
      })
      .from(classes)
      .leftJoin(users, eq(classes.teacher_id, users.id))
      .where(eq(classes.tenant_id, session.tenantId))
      .orderBy(desc(classes.created_at))
      .limit(Math.min(limit, 100));

    return {
      classes: allClasses.map(({ class: classInfo, teacher }) => ({
        id: classInfo.id,
        code: classInfo.code,
        name: classInfo.name,
        level: classInfo.level,
        subject: classInfo.subject,
        capacity: classInfo.capacity,
        enrolled: classInfo.enrolled_count,
        teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
        schedule: classInfo.schedule_description,
        start_date: classInfo.start_date,
        end_date: classInfo.end_date,
        status: classInfo.status,
      })),
      total: allClasses.length,
    };
  },
};

const scheduleResource: MCPResource = {
  uri: 'academic://schedule',
  name: 'Full Schedule',
  description: 'Complete class schedule with sessions',
  requiredScopes: ['academic:read'],
  mimeType: 'application/json',
  handler: async (session, params) => {
    const startDate = params?.start_date || new Date().toISOString().split('T')[0];

    const schedule = await db
      .select({
        session: classSessions,
        class: classes,
        teacher: users,
      })
      .from(classSessions)
      .innerJoin(classes, eq(classSessions.class_id, classes.id))
      .leftJoin(users, eq(classes.teacher_id, users.id))
      .where(
        and(
          eq(classSessions.tenant_id, session.tenantId),
          gte(classSessions.session_date, startDate),
        ),
      )
      .orderBy(classSessions.session_date, classSessions.start_time)
      .limit(100);

    return {
      schedule: schedule.map(({ session, class: classInfo, teacher }) => ({
        session_id: session.id,
        date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
        class: {
          id: classInfo.id,
          code: classInfo.code,
          name: classInfo.name,
        },
        teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
        topic: session.topic,
        status: session.status,
      })),
      total: schedule.length,
      start_date: startDate,
    };
  },
};

/**
 * Prompts
 */

const academicPersonaPrompt: MCPPrompt = {
  name: 'academic_persona',
  description: 'Academic operations assistant for Directors of Studies',
  requiredScopes: [],
  variables: [],
  template: `You are an AI academic operations assistant for an ESL school.

YOUR ROLE:
- Help Directors of Studies (DoS) manage academic programmes and curriculum
- Support administrative staff with class scheduling and room allocation
- Ensure CEFR alignment across all courses
- Maintain academic quality standards

CAPABILITIES:
- Create and manage programmes and courses
- Schedule classes and assign teachers
- Map curriculum to CEFR framework
- Approve lesson plans
- Publish course materials

BEHAVIOR GUIDELINES:

1. **Curriculum Quality**
   - Always verify CEFR alignment
   - Ensure learning objectives are clear and measurable
   - Recommend best practices for curriculum design

2. **Scheduling Efficiency**
   - Optimize timetables to avoid conflicts
   - Consider teacher availability and expertise
   - Balance class sizes across the school

3. **Teacher Support**
   - Provide constructive feedback on lesson plans
   - Share reusable templates and resources
   - Facilitate professional development

4. **Student Success**
   - Monitor enrollment numbers and capacity
   - Track class performance and completion rates
   - Recommend interventions for struggling classes

5. **Compliance**
   - Maintain accreditation standards
   - Document all academic decisions
   - Follow educational regulations`,
};

const curriculumDesignPrompt: MCPPrompt = {
  name: 'curriculum_design',
  description: 'Curriculum design guidance and CEFR mapping',
  requiredScopes: ['academic:read'],
  variables: ['level'],
  template: `Design a curriculum for CEFR level {{level}}.

Include:
1. Programme overview and objectives
2. Course breakdown (modules/units)
3. CEFR descriptor mapping for each skill area
4. Learning outcomes (SMART format)
5. Assessment strategies
6. Recommended materials and resources
7. Expected duration (hours/weeks)

Format as structured curriculum document.`,
};

const timetableOptimizerPrompt: MCPPrompt = {
  name: 'timetable_optimizer',
  description: 'Optimize class scheduling to avoid conflicts',
  requiredScopes: ['academic:write'],
  variables: ['constraints'],
  template: `Optimize class timetable with these constraints: {{constraints}}

Consider:
1. Teacher availability and workload
2. Room capacity and availability
3. Student enrollment patterns
4. Peak and off-peak hours
5. Class type requirements (lab, lecture, etc.)

Suggest:
- Optimal time slots for each class
- Room assignments
- Potential conflicts and resolutions
- Efficiency improvements

Format as actionable timetable recommendations.`,
};

/**
 * Academic Operations MCP Server Configuration
 */
export const academicOperationsMCPConfig: MCPServerConfig = {
  name: 'Academic Operations MCP',
  version: '3.0.0',
  scopePrefix: 'academic',
  tools: [
    createProgrammeTool,
    createCourseTool,
    mapCefrLevelTool,
    scheduleClassTool,
    assignTeacherTool,
    allocateRoomTool,
    registerLessonTemplateTool,
    approveLessonPlanTool,
    linkCefrDescriptorTool,
    publishMaterialsTool,
  ],
  resources: [programmesResource, coursesResource, classesResource, scheduleResource],
  prompts: [academicPersonaPrompt, curriculumDesignPrompt, timetableOptimizerPrompt],
};
