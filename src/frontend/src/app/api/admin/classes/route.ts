import { NextResponse } from 'next/server';
import { adminMCP } from '@/lib/mcp-client';

/**
 * GET /api/admin/classes
 * List all classes (mock data for now)
 */
export async function GET() {
  try {
    // TODO: Call Admin MCP to fetch classes
    // For now, return mock data
    const classes = [
      {
        id: '1',
        name: 'Intermediate A2',
        level: 'A2',
        teacher: 'Sarah Johnson',
        students: 18,
        capacity: 20,
        schedule: 'Mon/Wed 10:00-12:00',
        startDate: '2025-01-15',
        status: 'active',
      },
      {
        id: '2',
        name: 'Advanced B2',
        level: 'B2',
        teacher: 'Michael Chen',
        students: 15,
        capacity: 18,
        schedule: 'Tue/Thu 14:00-16:00',
        startDate: '2025-01-16',
        status: 'active',
      },
    ];

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/classes
 * Create a new class via Admin MCP
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, level, schedule, capacity } = body;

    if (!name || !level || !schedule || !capacity) {
      return NextResponse.json(
        { error: 'Missing required fields: name, level, schedule, capacity' },
        { status: 400 }
      );
    }

    // Call Admin MCP create-class tool
    const result = await adminMCP.callTool('create-class', {
      name,
      level,
      schedule,
      capacity,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create class' },
      { status: 500 }
    );
  }
}
