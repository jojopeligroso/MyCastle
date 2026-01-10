import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/utils';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const { sql: sqlQuery } = await request.json();

    if (!sqlQuery || typeof sqlQuery !== 'string') {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    // Validate that it's a SELECT query only
    const trimmed = sqlQuery.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT')) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed' },
        { status: 400 }
      );
    }

    // Check for dangerous keywords
    const dangerousKeywords = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE'];
    for (const keyword of dangerousKeywords) {
      if (trimmed.includes(keyword)) {
        return NextResponse.json(
          { error: `Query contains forbidden keyword: ${keyword}` },
          { status: 400 }
        );
      }
    }

    // Add timeout and row limit for safety
    const safeSqlQuery = `
      SET statement_timeout = '5s';
      ${sqlQuery.includes('LIMIT') ? sqlQuery : `${sqlQuery} LIMIT 1000`}
    `;

    // Execute query with RLS enforced
    const result = await db.execute(sql.raw(safeSqlQuery));

    return NextResponse.json({
      data: result.rows || [],
      rowCount: result.rows?.length || 0,
    });

  } catch (error: any) {
    console.error('Error executing query:', error);

    // Handle specific database errors
    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Query timed out. Please refine your query to be more specific.' },
        { status: 400 }
      );
    }

    if (error.message?.includes('syntax error')) {
      return NextResponse.json(
        { error: `SQL syntax error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to execute query. Please check your SQL syntax.' },
      { status: 500 }
    );
  }
}
