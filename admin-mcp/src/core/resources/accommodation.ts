import { z } from 'zod';
import { createHash } from 'crypto';
import type { AdminContext, MCPResource } from '../../types/index.js';
import { requireScope, SCOPES } from '../auth/scopes.js';
import { createSupabaseClient } from '../../lib/supabase.js';

/**
 * Input schema for accommodation occupancy (no params needed)
 */
export const AccommodationOccupancyParamsSchema = z.object({});

/**
 * Provider utilization schema
 */
export const ProviderUtilizationSchema = z.object({
  provider_id: z.string(),
  provider_name: z.string(),
  total_capacity: z.number(),
  occupied: z.number(),
  available: z.number(),
  utilization_percent: z.number(),
});

/**
 * Placement item schema
 */
export const PlacementItemSchema = z.object({
  placement_id: z.string(),
  student_id: z.string(),
  student_name: z.string(),
  provider_id: z.string(),
  provider_name: z.string(),
  room_number: z.string().nullable(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  status: z.string(),
});

/**
 * Gap schema (unoccupied spaces)
 */
export const GapSchema = z.object({
  provider_id: z.string(),
  provider_name: z.string(),
  available_rooms: z.number(),
  capacity: z.number(),
});

/**
 * Output data schema for accommodation occupancy
 */
export const AccommodationOccupancyDataSchema = z.object({
  summary: z.object({
    total_capacity: z.number(),
    total_occupied: z.number(),
    total_available: z.number(),
    overall_utilization_percent: z.number(),
    active_placements: z.number(),
  }),
  providers: z.array(ProviderUtilizationSchema),
  current_placements: z.array(PlacementItemSchema),
  gaps: z.array(GapSchema),
  timestamp: z.string(),
});

/**
 * Resource metadata
 */
export const accommodationOccupancyMetadata: MCPResource = {
  uri: 'res://admin/accommodation/occupancy',
  name: 'Accommodation Occupancy',
  description: 'Current accommodation placements, gaps, and provider utilization',
  mimeType: 'application/json',
};

/**
 * Get accommodation occupancy report
 *
 * @param context - Admin context with authentication
 * @returns Accommodation occupancy data with ETag and cache hint
 */
export async function getAccommodationOccupancyResource(
  context: AdminContext
): Promise<{
  data: z.infer<typeof AccommodationOccupancyDataSchema>;
  etag: string;
  cacheHint?: number;
}> {
  // 1. Validate params (none required)
  AccommodationOccupancyParamsSchema.parse({});

  // 2. Check scope
  requireScope(context, SCOPES.ADMIN_READ_SYSTEM);

  // 3. Create Supabase client with user token
  const supabase = createSupabaseClient(context.supabaseToken);

  // 4. Query accommodation providers
  const { data: providers, error: providersError } = await supabase
    .from('accommodation_providers')
    .select('id, name, capacity')
    .eq('active', true);

  if (providersError) {
    throw new Error(`Failed to fetch providers: ${providersError.message}`);
  }

  // 5. Query current placements (active and upcoming)
  const today = new Date().toISOString().split('T')[0];
  const { data: placements, error: placementsError } = await supabase
    .from('accommodation_placements')
    .select(`
      id,
      student_id,
      provider_id,
      room_number,
      start_date,
      end_date,
      status,
      profiles!accommodation_placements_student_id_fkey (
        full_name
      ),
      accommodation_providers!accommodation_placements_provider_id_fkey (
        name
      )
    `)
    .in('status', ['active', 'confirmed'])
    .or(`end_date.is.null,end_date.gte.${today}`);

  if (placementsError) {
    throw new Error(`Failed to fetch placements: ${placementsError.message}`);
  }

  // 6. Calculate occupancy per provider
  const providerOccupancy = (providers || []).map((provider: any) => {
    const occupied = (placements || []).filter(
      (p: any) => p.provider_id === provider.id && p.status === 'active'
    ).length;
    const available = provider.capacity - occupied;
    const utilization = provider.capacity > 0
      ? (occupied / provider.capacity) * 100
      : 0;

    return {
      provider_id: provider.id,
      provider_name: provider.name,
      total_capacity: provider.capacity,
      occupied,
      available,
      utilization_percent: Math.round(utilization * 100) / 100,
    };
  });

  // 7. Process placements
  const processedPlacements = (placements || []).map((placement: any) => ({
    placement_id: placement.id,
    student_id: placement.student_id,
    student_name: placement.profiles?.full_name || 'Unknown',
    provider_id: placement.provider_id,
    provider_name: placement.accommodation_providers?.name || 'Unknown',
    room_number: placement.room_number || null,
    start_date: placement.start_date,
    end_date: placement.end_date || null,
    status: placement.status,
  }));

  // 8. Identify gaps (providers with available capacity)
  const gaps = providerOccupancy
    .filter(p => p.available > 0)
    .map(p => ({
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      available_rooms: p.available,
      capacity: p.total_capacity,
    }));

  // 9. Calculate summary
  const totalCapacity = providerOccupancy.reduce((sum, p) => sum + p.total_capacity, 0);
  const totalOccupied = providerOccupancy.reduce((sum, p) => sum + p.occupied, 0);
  const totalAvailable = providerOccupancy.reduce((sum, p) => sum + p.available, 0);
  const overallUtilization = totalCapacity > 0
    ? (totalOccupied / totalCapacity) * 100
    : 0;

  const result = {
    summary: {
      total_capacity: totalCapacity,
      total_occupied: totalOccupied,
      total_available: totalAvailable,
      overall_utilization_percent: Math.round(overallUtilization * 100) / 100,
      active_placements: processedPlacements.filter(p => p.status === 'active').length,
    },
    providers: providerOccupancy.sort((a, b) => b.utilization_percent - a.utilization_percent),
    current_placements: processedPlacements.sort((a, b) =>
      a.provider_name.localeCompare(b.provider_name)
    ),
    gaps: gaps.sort((a, b) => b.available_rooms - a.available_rooms),
    timestamp: new Date().toISOString(),
  };

  // 10. Validate output
  const validatedResult = AccommodationOccupancyDataSchema.parse(result);

  // 11. Generate ETag
  const etag = generateETag(validatedResult);

  return { data: validatedResult, etag, cacheHint: 300 }; // 5 min cache
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
