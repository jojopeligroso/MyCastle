import { NextResponse } from 'next/server';
import { adminMCP } from '@/lib/mcp-client';

/**
 * GET /api/admin/attendance
 * Fetch attendance records (mock data for now)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const classId = searchParams.get('classId');

    // TODO: Call Admin MCP to fetch attendance
    // For now, return mock data
    const records = [
      {
        classId: '1',
        className: 'Intermediate A2',
        date: date || '2025-01-20',
        students: [
          { id: '1', name: 'John Smith', status: 'present' },
          { id: '2', name: 'Maria Garcia', status: 'present' },
          { id: '3', name: 'Li Wei', status: 'late' },
        ],
      },
    ];

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/attendance
 * Record attendance via Admin MCP
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registerDate, classId, entries } = body;

    if (!registerDate || !classId || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Missing required fields: registerDate, classId, entries' },
        { status: 400 }
      );
    }

    // Call Admin MCP record-attendance tool
    const result = await adminMCP.callTool('record-attendance', {
      registerDate,
      classId,
      entries,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording attendance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record attendance' },
      { status: 500 }
    );
  }
}
