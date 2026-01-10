import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCHEMA_CONTEXT = `
Database Schema (Drizzle ORM with PostgreSQL):

Tables:
- users (id, email, name, role, status, current_level, target_level, date_of_birth, phone, address, visa_type, visa_expiry, created_at, updated_at, deleted_at)
- classes (id, name, code, level, start_date, end_date, status, teacher_id, capacity, created_at)
- enrollments (id, student_id, class_id, status, start_date, end_date, expected_end_date, booked_weeks, created_at)
- courses (id, programme_id, name, code, level, description, duration_weeks, objectives, created_at)
- programmes (id, name, code, description, duration_weeks, levels, created_at)
- enrollment_amendments (id, enrollment_id, amendment_type, amendment_date, previous_end_date, new_end_date, status, reason, created_at)

Common queries:
- "Show all students" → SELECT * FROM users WHERE role='student' AND deleted_at IS NULL
- "Active students in B1" → SELECT * FROM users WHERE role='student' AND status='active' AND current_level='B1'
- "Visa expiring soon" → SELECT * FROM users WHERE visa_expiry BETWEEN NOW() AND NOW() + INTERVAL '30 days'
- "Students by class" → SELECT u.* FROM users u JOIN enrollments e ON u.id=e.student_id WHERE e.class_id='...'
`;

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Use OpenAI to translate natural language to SQL
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a SQL expert that translates natural language queries to PostgreSQL SQL.

${SCHEMA_CONTEXT}

Rules:
1. Generate ONLY SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Always include WHERE deleted_at IS NULL for users table
3. Use proper JOINs when referencing multiple tables
4. Return valid PostgreSQL SQL
5. Use LIMIT to prevent huge result sets (default 100)

Return a JSON object with:
{
  "sql": "SELECT ... (the SQL query)",
  "explanation": "A brief explanation of what this query does"
}`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    if (!result.sql) {
      return NextResponse.json(
        { error: 'Failed to generate SQL query' },
        { status: 500 }
      );
    }

    // Basic SQL injection prevention - check for dangerous keywords
    const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
    const upperSQL = result.sql.toUpperCase();

    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        return NextResponse.json(
          { error: `Query contains forbidden keyword: ${keyword}. Only SELECT queries are allowed.` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      sql: result.sql,
      explanation: result.explanation || 'Query generated successfully',
    });

  } catch (error) {
    console.error('Error translating query:', error);
    return NextResponse.json(
      { error: 'Failed to translate query. Please try again.' },
      { status: 500 }
    );
  }
}
