import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES, hasPIIAccess } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';

/**
 * User result schema
 */
const UserResultSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.string(),
  status: z.string().optional(),
  createdAt: z.string(),
});

/**
 * Input schema for search-directory tool
 */
export const SearchDirectoryInputSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  role: z.string().optional(),
  status: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

/**
 * Output schema for search-directory tool
 */
export const SearchDirectoryOutputSchema = z.object({
  results: z.array(UserResultSchema),
  nextPage: z.number().int().positive().optional(),
});

/**
 * Tool metadata for MCP registration
 */
export const searchDirectoryMetadata: MCPTool = {
  name: 'search-directory',
  description: 'Search user directory with filters for role and status. Masks PII unless admin.read.pii scope is present. Requires admin.read.user scope.',
  inputSchema: {
    type: 'object',
    properties: {
      q: {
        type: 'string',
        description: 'Search query (searches name and email)',
      },
      role: {
        type: 'string',
        description: 'Filter by role (optional)',
      },
      status: {
        type: 'string',
        description: 'Filter by status (optional)',
      },
      page: {
        type: 'number',
        minimum: 1,
        description: 'Page number (default: 1)',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Results per page (default: 20, max: 100)',
      },
    },
    required: ['q'],
  },
};

/**
 * Mask PII in a string
 *
 * @param value - Value to mask
 * @returns Masked value
 */
function maskPII(value: string | null | undefined): string {
  if (!value) return '***';

  // Mask email
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.charAt(0)}***@${domain}`;
  }

  // Mask name (show first letter only)
  const parts = value.split(' ');
  return parts.map(p => `${p.charAt(0)}***`).join(' ');
}

/**
 * Search user directory
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Search parameters
 * @returns Search results with optional next page
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If search fails
 */
export async function executeSearchDirectory(
  context: AdminContext,
  input: z.infer<typeof SearchDirectoryInputSchema>
): Promise<z.infer<typeof SearchDirectoryOutputSchema>> {
  // 1. Validate input
  const validated = SearchDirectoryInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_READ_USER);

  // 3. Check PII access
  const canSeePII = hasPIIAccess(context);

  // 4. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Build query
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  // Search in full_name and email
  if (validated.q) {
    query = query.or(`full_name.ilike.%${validated.q}%,email.ilike.%${validated.q}%`);
  }

  // Filter by role
  if (validated.role) {
    query = query.eq('role', validated.role);
  }

  // Filter by status (if status column exists)
  if (validated.status) {
    query = query.eq('status', validated.status);
  }

  // Pagination
  const offset = (validated.page - 1) * validated.limit;
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + validated.limit - 1);

  // 6. Execute query
  const { data: users, error: searchError, count } = await query;

  if (searchError) {
    throw new Error(`Failed to search directory: ${searchError.message}`);
  }

  // 7. Format results
  const results = (users || []).map(user => ({
    id: user.id,
    email: canSeePII ? user.email : maskPII(user.email),
    fullName: canSeePII ? (user.full_name || 'Unknown') : maskPII(user.full_name),
    role: user.role,
    status: user.status || 'active',
    createdAt: user.created_at,
  }));

  // 8. Calculate next page
  const totalResults = count || 0;
  const hasNextPage = offset + validated.limit < totalResults;
  const nextPage = hasNextPage ? validated.page + 1 : undefined;

  // 9. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'directory.search',
    target: 'directory/search',
    scope: SCOPES.ADMIN_READ_USER,
    before: undefined,
    after: {
      query: validated.q,
      filters: {
        role: validated.role,
        status: validated.status,
      },
      page: validated.page,
      resultCount: results.length,
      piiMasked: !canSeePII,
    },
    correlationId: generateCorrelationId(),
  });

  // 10. Return result
  return {
    results,
    nextPage,
  };
}
