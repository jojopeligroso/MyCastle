import { NextResponse } from 'next/server';
import { adminMCP } from '@/lib/mcp-client';

/**
 * GET /api/admin/users
 * List all users (mock data for now, will integrate with MCP)
 */
export async function GET() {
  try {
    // TODO: Call Admin MCP search-directory tool
    // For now, return mock data
    const users = [
      { id: '1', name: 'Sarah Johnson', email: 'sarah.j@mycastle.com', role: 'teacher', status: 'active' },
      { id: '2', name: 'Michael Chen', email: 'michael.c@mycastle.com', role: 'teacher', status: 'active' },
      { id: '3', name: 'Emma Williams', email: 'emma.w@mycastle.com', role: 'teacher', status: 'active' },
    ];

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user via Admin MCP
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fullName, role } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, fullName, role' },
        { status: 400 }
      );
    }

    // Call Admin MCP create-user tool
    const result = await adminMCP.callTool('create-user', {
      email,
      fullName,
      role,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    );
  }
}
