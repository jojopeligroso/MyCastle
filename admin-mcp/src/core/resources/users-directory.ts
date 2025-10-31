import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES, hasPIIAccess } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for users directory
 */
export const DirectoryParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(500).default(50),
  role: z.string().optional(), // Filter by role
  status: z.string().optional(), // Filter by status (active, inactive)
  search: z.string().optional(), // Search by name or email
});

/**
 * User item schema
 */
export const UserItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string().nullable(),
  role: z.string(),
  status: z.string().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  created_at: z.string(),
  last_login: z.string().nullable().optional(),
});

/**
 * Output data schema for users directory
 */
export const UsersDirectoryDataSchema = z.object({
  users: z.array(UserItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
  pii_masked: z.boolean(),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const usersDirectoryMetadata: MCPResource = {
  uri: 'res://admin/directory/users',
  name: 'User Directory',
  description: 'Paginated user directory with optional PII masking',
  mimeType: 'application/json',
};

/**
 * Get users directory with pagination
 *
 * @param context - Admin context with authentication
 * @param params - Directory parameters (page, limit, filters)
 * @returns Users directory data with ETag and cache hint
 */
export async function getUsersDirectoryResource(
  context: AdminContext,
  params: z.infer<typeof DirectoryParamsSchema>
): Promise<{
  data: z.infer<typeof UsersDirectoryDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params
  const validated = DirectoryParamsSchema.parse(params);

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_USER);

  // 3. Check if PII access is available
  const showPII = hasPIIAccess(context);

  // 4. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 5. Build query
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  // Apply filters
  if (validated.role) {
    query = query.eq('role', validated.role);
  }

  if (validated.status) {
    query = query.eq('status', validated.status);
  }

  if (validated.search) {
    query = query.or(`full_name.ilike.%${validated.search}%,email.ilike.%${validated.search}%`);
  }

  // 6. Get total count first
  const { count: totalCount, error: countError } = await query;

  if (countError) {
    throw new Error(`Failed to count users: ${countError.message}`);
  }

  // 7. Apply pagination
  const offset = (validated.page - 1) * validated.limit;
  query = query
    .range(offset, offset + validated.limit - 1)
    .order('created_at', { ascending: false });

  // 8. Execute query
  const { data: users, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  // 9. Mask PII if needed
  const processedUsers = users?.map((user: any) => {
    const userItem: any = {
      id: user.id,
      email: showPII ? user.email : maskEmail(user.email),
      full_name: user.full_name,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      last_login: user.last_login || null,
    };

    // Include phone and address only if PII access
    if (showPII) {
      userItem.phone = user.phone || null;
      userItem.address = user.address || null;
    } else {
      userItem.phone = user.phone ? '***-***-****' : null;
      userItem.address = user.address ? '[MASKED]' : null;
    }

    return userItem;
  }) || [];

  // 10. Build result
  const total = totalCount || 0;
  const totalPages = Math.ceil(total / validated.limit);

  const result = {
    users: processedUsers,
    pagination: {
      page: validated.page,
      limit: validated.limit,
      total,
      total_pages: totalPages,
    },
    pii_masked: !showPII,
    timestamp: new Date().toISOString(),
  };

  // 11. Validate output
  const validatedResult = UsersDirectoryDataSchema.parse(result);

  // 12. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 120 }; // 2 min cache
}

/**
 * Mask email address for privacy
 */
function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***@***';

  const maskedLocal = local.length > 2
    ? `${local[0]}***${local[local.length - 1]}`
    : '***';

  return `${maskedLocal}@${domain}`;
}

/**
 * Generate ETag from data
 */
function generateETag(data: any): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .slice(0, 16);
}
