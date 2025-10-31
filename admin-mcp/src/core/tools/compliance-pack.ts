import { z } from 'zod';
import type { AdminContext, MCPTool } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';
import { audit, generateCorrelationId } from '../audit/index.js';
import { createWriteStream } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

/**
 * Owner type for compliance documents
 */
const OwnerType = z.enum(['student', 'teacher', 'class']);

/**
 * Input schema for compliance-pack tool
 */
export const CompliancePackInputSchema = z.object({
  ownerType: OwnerType,
  ownerId: z.string().uuid('Valid owner ID is required'),
});

/**
 * Output schema for compliance-pack tool
 */
export const CompliancePackOutputSchema = z.object({
  zipUri: z.string(),
});

/**
 * Tool metadata for MCP registration
 */
export const compliancePackMetadata: MCPTool = {
  name: 'compliance-pack',
  description: 'Collect compliance documents for a student, teacher, or class and create a ZIP archive. Requires admin.read.compliance scope.',
  inputSchema: {
    type: 'object',
    properties: {
      ownerType: {
        type: 'string',
        enum: ['student', 'teacher', 'class'],
        description: 'Type of entity to collect documents for',
      },
      ownerId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the entity',
      },
    },
    required: ['ownerType', 'ownerId'],
  },
};

/**
 * Collect compliance documents for an owner
 *
 * @param supabase - Supabase client
 * @param ownerType - Type of owner
 * @param ownerId - ID of owner
 * @returns List of document records
 */
async function collectDocuments(
  supabase: ReturnType<typeof createSupabaseClient>,
  ownerType: string,
  ownerId: string
): Promise<Array<{ id: string; name: string; type: string; file_path: string }>> {
  const { data: documents, error } = await supabase
    .from('compliance_documents')
    .select('*')
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId)
    .eq('status', 'approved');

  if (error) {
    throw new Error(`Failed to fetch compliance documents: ${error.message}`);
  }

  return documents || [];
}

/**
 * Create ZIP archive from documents
 *
 * @param documents - List of documents to archive
 * @param outputPath - Path to write ZIP file
 * @returns Promise that resolves when ZIP is created
 */
function createZipArchive(
  documents: Array<{ id: string; name: string; type: string; file_path: string }>,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add documents to archive
    for (const doc of documents) {
      // In production, this would fetch files from storage (S3, etc.)
      // For now, we'll add document metadata
      archive.append(
        JSON.stringify({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          file_path: doc.file_path,
        }),
        { name: `${doc.type}_${doc.name}.json` }
      );
    }

    // Add manifest
    archive.append(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        document_count: documents.length,
        documents: documents.map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
        })),
      }, null, 2),
      { name: 'manifest.json' }
    );

    archive.finalize();
  });
}

/**
 * Generate compliance document pack
 *
 * @param context - Admin context with actor information and scopes
 * @param input - Compliance pack parameters
 * @returns URI of the generated ZIP file
 * @throws {AuthorizationError} If missing required scope
 * @throws {Error} If entity not found or pack creation fails
 */
export async function executeCompliancePack(
  context: AdminContext,
  input: z.infer<typeof CompliancePackInputSchema>
): Promise<z.infer<typeof CompliancePackOutputSchema>> {
  // 1. Validate input
  const validated = CompliancePackInputSchema.parse(input);

  // 2. Check required scope
  requireScope(context, SCOPES.ADMIN_READ_COMPLIANCE);

  // 3. Create Supabase client
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Verify owner exists
  let ownerTable = 'profiles';
  if (validated.ownerType === 'class') {
    ownerTable = 'classes';
  }

  const { data: owner, error: ownerError } = await supabase
    .from(ownerTable)
    .select('*')
    .eq('id', validated.ownerId)
    .single();

  if (ownerError || !owner) {
    throw new Error(`${validated.ownerType} not found: ${validated.ownerId}`);
  }

  // 5. Collect compliance documents
  const documents = await collectDocuments(
    supabase,
    validated.ownerType,
    validated.ownerId
  );

  if (documents.length === 0) {
    throw new Error(`No approved compliance documents found for ${validated.ownerType} ${validated.ownerId}`);
  }

  // 6. Create ZIP archive
  const tmpDir = process.env.MCP_FILES_DIR || '/tmp/mcp-files';
  const fileName = `compliance_${validated.ownerType}_${validated.ownerId}_${Date.now()}.zip`;
  const filePath = join(tmpDir, fileName);

  try {
    await createZipArchive(documents, filePath);
  } catch (err) {
    throw new Error(`Failed to create ZIP archive: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // 7. Generate Files MCP URI
  const zipUri = `file:///${filePath}`;

  // 8. Emit audit entry
  audit({
    actor: context.actorId,
    action: 'compliance.pack_generate',
    target: `${validated.ownerType}/${validated.ownerId}/compliance`,
    scope: SCOPES.ADMIN_READ_COMPLIANCE,
    before: undefined,
    after: {
      ownerType: validated.ownerType,
      ownerId: validated.ownerId,
      documentCount: documents.length,
      zipUri,
    },
    correlationId: generateCorrelationId(),
  });

  // 9. Return result
  return { zipUri };
}
